export type IonRouterConfig = {
  apiKey: string;
  baseUrl: string;
  defaultTtsModel: string;
  defaultTtsVoice: string;
  defaultSttModel: string;
};

export type OpenAIConfig = {
  apiKey: string;
  baseUrl: string;
  defaultTextModel: string;
};

export type BytePlusConfig = {
  apiKey: string;
  baseUrl: string;
  defaultVideoModel: string;
  defaultVideoUnderstandModel: string;
};

export function getIonRouterConfig(): IonRouterConfig {
  return {
    apiKey: process.env.IONROUTER_API_KEY ?? "",
    baseUrl: (process.env.IONROUTER_BASE_URL ?? "https://api.ionrouter.io/v1").replace(/\/$/, ""),
    defaultTtsModel: process.env.IONROUTER_TTS_MODEL ?? "orpheus-3b",
    defaultTtsVoice: process.env.IONROUTER_TTS_VOICE ?? "tara",
    defaultSttModel: process.env.IONROUTER_STT_MODEL ?? "whisper-1",
  };
}

export function getOpenAIConfig(): OpenAIConfig {
  return {
    apiKey: process.env.OPENAI_API_KEY ?? "",
    baseUrl: (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, ""),
    defaultTextModel: process.env.OPENAI_TEXT_MODEL ?? "gpt-5.4-mini",
  };
}

export function readOpenAIApiKeyOverride(request: Request): string {
  const headerValue = request.headers.get("x-openai-api-key") ?? "";
  return headerValue.trim();
}

export function readGeminiApiKeyOverride(request: Request): string {
  const headerValue = request.headers.get("x-gemini-api-key") ?? "";
  return headerValue.trim();
}

export function readSeedanceApiKeyOverride(request: Request): string {
  const headerValue = request.headers.get("x-seedance-api-key") ?? "";
  return headerValue.trim();
}

const KIMI_K25_BASE_URL = "https://kimi.ionrouter.io/v1";

export function resolveIonRouterBaseUrlByModel(model: string | undefined, fallbackBaseUrl: string): string {
  const normalized = (model ?? "").trim().toLowerCase();
  if (normalized.startsWith("kimi-k2.5")) {
    return KIMI_K25_BASE_URL;
  }
  return fallbackBaseUrl;
}

export function getBytePlusConfig(): BytePlusConfig {
  return {
    apiKey: process.env.BYTEPLUS_ARK_API_KEY ?? process.env.ARK_API_KEY ?? "",
    baseUrl: (process.env.BYTEPLUS_ARK_BASE_URL ?? "https://ark.ap-southeast.bytepluses.com/api/v3").replace(
      /\/$/,
      "",
    ),
    defaultVideoModel: process.env.BYTEPLUS_VIDEO_MODEL ?? "dreamina-seedance-2-0-260128",
    defaultVideoUnderstandModel: process.env.BYTEPLUS_VIDEO_UNDERSTAND_MODEL ?? "seed-2-0-lite-260228",
  };
}
