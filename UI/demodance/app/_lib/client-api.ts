type ApiErrorPayload = {
  error?: unknown;
};

function readErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "error" in data) {
    const maybe = (data as ApiErrorPayload).error;
    if (typeof maybe === "string" && maybe.trim()) return maybe;
  }
  return fallback;
}

export async function postJson<TResponse>(url: string, body: unknown, fallbackError: string): Promise<TResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
