import { readResponseDetails } from "@/lib/server/http";

export type ButterbaseConfig = {
  apiBaseUrl: string;
  apiToken: string;
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

async function butterbaseFetch(path: string, init: RequestInit = {}) {
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

export async function checkButterbaseConnection() {
  const response = await butterbaseFetch("/schema", {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  const raw = await readResponseDetails(response);
  let parsed: unknown = raw;
  try {
    parsed = raw ? JSON.parse(raw) : {};
  } catch {
    // keep raw text
  }

  if (!response.ok) {
    const message = typeof parsed === "object" && parsed && "message" in parsed ? String((parsed as { message: string }).message) : `Butterbase request failed (${response.status})`;
    const error = new Error(message);
    (error as Error & { status?: number; details?: unknown }).status = response.status;
    (error as Error & { status?: number; details?: unknown }).details = parsed;
    throw error;
  }

  return {
    ok: true,
    status: response.status,
    schema: parsed,
  };
}
