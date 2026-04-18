export type IonRouterConfig = {
  apiKey: string;
  baseUrl: string;
  defaultTextModel: string;
  defaultTtsModel: string;
  defaultTtsVoice: string;
};

export type BytePlusConfig = {
  apiKey: string;
  baseUrl: string;
  defaultVideoModel: string;
};

export function getIonRouterConfig(): IonRouterConfig {
  return {
    apiKey: process.env.IONROUTER_API_KEY ?? "",
    baseUrl: (process.env.IONROUTER_BASE_URL ?? "https://api.ionrouter.io/v1").replace(/\/$/, ""),
    defaultTextModel: process.env.IONROUTER_TEXT_MODEL ?? "qwen3-30b-a3b",
    defaultTtsModel: process.env.IONROUTER_TTS_MODEL ?? "orpheus-3b",
    defaultTtsVoice: process.env.IONROUTER_TTS_VOICE ?? "tara",
  };
}

export function getBytePlusConfig(): BytePlusConfig {
  return {
    apiKey: process.env.BYTEPLUS_ARK_API_KEY ?? process.env.ARK_API_KEY ?? "",
    baseUrl: (process.env.BYTEPLUS_ARK_BASE_URL ?? "https://ark.ap-southeast.bytepluses.com/api/v3").replace(
      /\/$/,
      "",
    ),
    defaultVideoModel: process.env.BYTEPLUS_VIDEO_MODEL ?? "dreamina-seedance-2-0-260128",
  };
}
