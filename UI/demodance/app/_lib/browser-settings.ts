export const OPENAI_API_KEY_STORAGE_KEY = "demodance.openaiApiKey";
export const GEMINI_API_KEY_STORAGE_KEY = "demodance.geminiApiKey";

export function readBrowserOpenAIApiKey() {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(OPENAI_API_KEY_STORAGE_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

export function writeBrowserOpenAIApiKey(value: string) {
  if (typeof window === "undefined") return;
  try {
    const normalized = value.trim();
    if (!normalized) {
      window.localStorage.removeItem(OPENAI_API_KEY_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(OPENAI_API_KEY_STORAGE_KEY, normalized);
  } catch {
    // ignore storage errors
  }
}

export function readBrowserGeminiApiKey() {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

export function writeBrowserGeminiApiKey(value: string) {
  if (typeof window === "undefined") return;
  try {
    const normalized = value.trim();
    if (!normalized) {
      window.localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, normalized);
  } catch {
    // ignore storage errors
  }
}

export function maskApiKey(value: string) {
  if (!value) return "";
  if (value.length <= 8) return `${value.slice(0, 2)}...`;
  return `${value.slice(0, 4)}${"•".repeat(Math.max(4, value.length - 8))}${value.slice(-4)}`;
}
