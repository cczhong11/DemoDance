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

export function getIonRouterConfig(): IonRouterConfig {
  return {
    apiKey: process.env.IONROUTER_API_KEY ?? "",
    baseUrl: (process.env.IONROUTER_BASE_URL ?? "https://api.ionrouter.io/v1").replace(/\/$/, ""),
    defaultTextModel: process.env.IONROUTER_TEXT_MODEL ?? "qwen3-30b-a3b",
    defaultTtsModel: process.env.IONROUTER_TTS_MODEL ?? "orpheus-3b",
    defaultTtsVoice: process.env.IONROUTER_TTS_VOICE ?? "tara",
    defaultSttModel: process.env.IONROUTER_STT_MODEL ?? "whisper-1",
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
    defaultVideoUnderstandModel: process.env.BYTEPLUS_VIDEO_UNDERSTAND_MODEL ?? "seed-2-0-lite-260228",
    defaultImageModel: process.env.BYTEPLUS_IMAGE_MODEL ?? "seedream-5-0-260128",
  };
}
