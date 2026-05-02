import { readResponseDetails } from "@/lib/server/http";

export type ButterbaseConfig = {
  apiBaseUrl: string;
  apiToken: string;
};

type ButterbaseStorageUploadResponse = {
  uploadUrl: string;
  objectId: string;
  objectKey?: string;
  expiresIn?: number;
};

type ButterbaseStorageDownloadResponse = {
  downloadUrl: string;
  filename?: string;
  expiresIn?: number;
};

export function getButterbaseConfig(): ButterbaseConfig {
  const appBase = process.env.BUTTERBASE_API_BASE_URL ?? "";
  const appId = process.env.BUTTERBASE_APP_ID ?? "";
  const derivedBase = appId ? `https://api.butterbase.ai/v1/${appId}` : "";

  return {
    apiBaseUrl: (appBase || derivedBase).replace(/\/$/, ""),
    apiToken: process.env.BUTTERBASE_API_TOKEN ?? process.env.BUTTERBASE_API_KEY ?? "",
  };
}

export function requireButterbaseConfig(): ButterbaseConfig {
  const cfg = getButterbaseConfig();
  if (!cfg.apiBaseUrl) {
    throw new Error("BUTTERBASE_API_BASE_URL is not set");
  }
  return cfg;
}

export async function butterbaseFetch(path: string, init: RequestInit = {}) {
  const cfg = requireButterbaseConfig();

  const headers = new Headers(init.headers);
  if (cfg.apiToken) {
    headers.set("Authorization", `Bearer ${cfg.apiToken}`);
  }

  const url = path.startsWith("http://") || path.startsWith("https://") ? path : `${cfg.apiBaseUrl}${path}`;
  return fetch(url, {
    ...init,
    headers,
  });
}

function getButterbaseControlBaseUrl(apiBaseUrl: string) {
  const parsed = new URL(apiBaseUrl);
  return parsed.origin;
}

export function getButterbaseAppId() {
  const explicit = process.env.BUTTERBASE_APP_ID?.trim();
  if (explicit) return explicit;

  const cfg = requireButterbaseConfig();
  const segments = new URL(cfg.apiBaseUrl).pathname.split("/").filter(Boolean);
  const appId = segments.at(-1);
  if (!appId) {
    throw new Error("Unable to derive Butterbase app id");
  }
  return appId;
}

async function butterbaseControlRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const cfg = requireButterbaseConfig();
  const headers = new Headers(init.headers);
  if (cfg.apiToken) {
    headers.set("Authorization", `Bearer ${cfg.apiToken}`);
  }
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  const baseUrl = getButterbaseControlBaseUrl(cfg.apiBaseUrl);
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
  });
  const raw = await readResponseDetails(response);

  let parsed: unknown = raw;
  try {
    parsed = raw ? JSON.parse(raw) : {};
  } catch {
    // keep raw text
  }

  if (!response.ok) {
    const message =
      typeof parsed === "object" && parsed && "message" in parsed
        ? String((parsed as { message: string }).message)
        : `Butterbase request failed (${response.status})`;
    const error = new Error(message);
    (error as Error & { status?: number; details?: unknown }).status = response.status;
    (error as Error & { status?: number; details?: unknown }).details = parsed;
    throw error;
  }

  return parsed as T;
}

export async function butterbaseRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await butterbaseFetch(path, init);
  const raw = await readResponseDetails(response);

  let parsed: unknown = raw;
  try {
    parsed = raw ? JSON.parse(raw) : {};
  } catch {
    // keep raw text
  }

  if (!response.ok) {
    const message =
      typeof parsed === "object" && parsed && "message" in parsed
        ? String((parsed as { message: string }).message)
        : `Butterbase request failed (${response.status})`;
    const error = new Error(message);
    (error as Error & { status?: number; details?: unknown }).status = response.status;
    (error as Error & { status?: number; details?: unknown }).details = parsed;
    throw error;
  }

  return parsed as T;
}

export async function createButterbaseRow<T>(table: string, body: Record<string, unknown>) {
  return butterbaseRequest<T>(`/${table}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
}

export async function updateButterbaseRow<T>(table: string, id: string, body: Record<string, unknown>) {
  return butterbaseRequest<T>(`/${table}/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
}

export async function getButterbaseRow<T>(table: string, id: string) {
  return butterbaseRequest<T>(`/${table}/${id}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });
}

export async function listButterbaseRows<T>(table: string) {
  return butterbaseRequest<T>(`/${table}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });
}

export async function upsertButterbaseRow<T>(table: string, id: string, body: Record<string, unknown>) {
  try {
    await getButterbaseRow<unknown>(table, id);
    return await updateButterbaseRow<T>(table, id, body);
  } catch (error) {
    const status =
      error && typeof error === "object" && "status" in error
        ? Number((error as { status?: number }).status) || 500
        : 500;

    if (status !== 404) {
      throw error;
    }

    return createButterbaseRow<T>(table, { id, ...body });
  }
}

export async function checkButterbaseConnection() {
  const parsed = await butterbaseRequest<unknown>("/schema", {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  return {
    ok: true,
    status: 200,
    schema: parsed,
  };
}

export async function createButterbaseStorageUpload(input: {
  filename: string;
  contentType: string;
  sizeBytes: number;
  public?: boolean;
}) {
  const appId = getButterbaseAppId();
  return butterbaseControlRequest<ButterbaseStorageUploadResponse>(`/storage/${appId}/upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(input),
  });
}

export async function uploadButterbaseObject(uploadUrl: string, contentType: string, body: BodyInit) {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
    },
    body,
  });

  if (!response.ok) {
    const details = await readResponseDetails(response);
    const error = new Error(`Butterbase storage upload failed (${response.status})`);
    (error as Error & { status?: number; details?: unknown }).status = response.status;
    (error as Error & { status?: number; details?: unknown }).details = details;
    throw error;
  }
}

export async function createButterbaseDownloadUrl(objectId: string) {
  const appId = getButterbaseAppId();
  return butterbaseControlRequest<ButterbaseStorageDownloadResponse>(`/storage/${appId}/download/${objectId}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });
}
