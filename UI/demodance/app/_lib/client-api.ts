import { readBrowserGeminiApiKey, readBrowserOpenAIApiKey, readBrowserSeedanceApiKey } from "./browser-settings";

type ApiErrorPayload = {
  error?: unknown;
  details?: unknown;
};

function parseNestedDetailsMessage(details: unknown): string | null {
  if (typeof details !== "string" || !details.trim()) {
    return null;
  }

  const raw = details.trim();
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return raw;
    }

    if ("error" in parsed) {
      const nestedError = (parsed as { error?: unknown }).error;
      if (nestedError && typeof nestedError === "object" && "message" in nestedError) {
        const nestedMessage = (nestedError as { message?: unknown }).message;
        if (typeof nestedMessage === "string" && nestedMessage.trim()) {
          return nestedMessage.trim();
        }
      }
    }
  } catch {
    return raw;
  }

  return raw;
}

function readErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "error" in data) {
    const payload = data as ApiErrorPayload;
    const maybe = payload.error;
    const details = payload.details;
    if (typeof maybe === "string" && maybe.trim()) {
      const detailMessage = parseNestedDetailsMessage(details);
      if (detailMessage) {
        return `${maybe}: ${detailMessage}`;
      }
      return maybe;
    }
  }
  return fallback;
}

export async function postJson<TResponse>(url: string, body: unknown, fallbackError: string): Promise<TResponse> {
  const openaiApiKey = readBrowserOpenAIApiKey();
  const geminiApiKey = readBrowserGeminiApiKey();
  const seedanceApiKey = readBrowserSeedanceApiKey();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(openaiApiKey ? { "x-openai-api-key": openaiApiKey } : {}),
      ...(geminiApiKey ? { "x-gemini-api-key": geminiApiKey } : {}),
      ...(seedanceApiKey ? { "x-seedance-api-key": seedanceApiKey } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as unknown;
  if (!response.ok) {
    throw new Error(readErrorMessage(data, fallbackError));
  }
  return data as TResponse;
}

export async function getJson<TResponse>(url: string, fallbackError: string): Promise<TResponse> {
  const openaiApiKey = readBrowserOpenAIApiKey();
  const geminiApiKey = readBrowserGeminiApiKey();
  const seedanceApiKey = readBrowserSeedanceApiKey();
  const response = await fetch(url, {
    headers: {
      ...(openaiApiKey ? { "x-openai-api-key": openaiApiKey } : {}),
      ...(geminiApiKey ? { "x-gemini-api-key": geminiApiKey } : {}),
      ...(seedanceApiKey ? { "x-seedance-api-key": seedanceApiKey } : {}),
    },
  });
  const data = (await response.json()) as unknown;
  if (!response.ok) {
    throw new Error(readErrorMessage(data, fallbackError));
  }
  return data as TResponse;
}
