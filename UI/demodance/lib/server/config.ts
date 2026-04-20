export type IonRouterConfig = {
  apiKey: string;
  baseUrl: string;
  defaultTextModel: string;
  defaultTtsModel: string;
  defaultTtsVoice: string;
  defaultSttModel: string;
};

export type BytePlusConfig = {
  apiKey: string;
  baseUrl: string;
  defaultVideoModel: string;
  defaultVideoUnderstandModel: string;
  defaultImageModel: string;
};

export type GoogleGenAIConfig = {
  apiKey: string;
  defaultImageModel: string;
};

export function getIonRouterConfig(): IonRouterConfig {
  return {
    apiKey: process.env.IONROUTER_API_KEY ?? "",
    baseUrl: (process.env.IONROUTER_BASE_URL ?? "https://api.ionrouter.io/v1").replace(/\/$/, ""),
    defaultTextModel: process.env.IONROUTER_TEXT_MODEL ?? "kimi-k2.5",
    defaultTtsModel: process.env.IONROUTER_TTS_MODEL ?? "orpheus-3b",
    defaultTtsVoice: process.env.IONROUTER_TTS_VOICE ?? "tara",
    defaultSttModel: process.env.IONROUTER_STT_MODEL ?? "whisper-1",
  };
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
    defaultImageModel: process.env.BYTEPLUS_IMAGE_MODEL ?? "seedream-5-0-260128",
  };
}

export function getGoogleGenAIConfig(): GoogleGenAIConfig {
  return {
    apiKey: process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? "",
    defaultImageModel: process.env.GEMINI_IMAGE_MODEL ?? "gemini-3.1-flash-image-preview",
  };
}
