import { readBrowserGeminiApiKey, readBrowserOpenAIApiKey } from "./browser-settings";

type ApiErrorPayload = {
  error?: unknown;
  details?: unknown;
};

function readErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "error" in data) {
    const payload = data as ApiErrorPayload;
    const maybe = payload.error;
    const details = payload.details;
    if (typeof maybe === "string" && maybe.trim()) {
      if (typeof details === "string" && details.trim()) {
        return `${maybe}: ${details.trim()}`;
      }
      return maybe;
    }
  }
  return fallback;
}

export async function postJson<TResponse>(url: string, body: unknown, fallbackError: string): Promise<TResponse> {
  const openaiApiKey = readBrowserOpenAIApiKey();
  const geminiApiKey = readBrowserGeminiApiKey();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(openaiApiKey ? { "x-openai-api-key": openaiApiKey } : {}),
      ...(geminiApiKey ? { "x-gemini-api-key": geminiApiKey } : {}),
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
  const response = await fetch(url);
  const data = (await response.json()) as unknown;
  if (!response.ok) {
    throw new Error(readErrorMessage(data, fallbackError));
  }
  return data as TResponse;
}
