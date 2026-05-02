import { readOpenAIApiKeyOverride } from "@/lib/server/config";
import { jsonError, readResponseDetails } from "@/lib/server/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const openaiApiKey = readOpenAIApiKeyOverride(request) || (process.env.OPENAI_API_KEY ?? "");
  const defaultModel = process.env.OPENAI_STT_MODEL ?? "whisper-1";

  if (!openaiApiKey) {
    return jsonError("OPENAI_API_KEY is not set", 500);
  }

  let incomingForm: FormData;
  try {
    incomingForm = await request.formData();
  } catch {
    return jsonError("Expected multipart/form-data request", 400);
  }

  const audioFile = incomingForm.get("file");
  if (!(audioFile instanceof File)) {
    return jsonError("'file' is required as multipart file", 400);
  }

  const modelValue = incomingForm.get("model");
  const languageValue = incomingForm.get("language");
  const promptValue = incomingForm.get("prompt");
  const temperatureValue = incomingForm.get("temperature");

  const model = typeof modelValue === "string" && modelValue.trim() ? modelValue : defaultModel;
  const language = typeof languageValue === "string" ? languageValue : "";
  const prompt = typeof promptValue === "string" ? promptValue : "";
  const temperatureRaw = typeof temperatureValue === "string" ? temperatureValue : "";

  const upstreamForm = new FormData();
  upstreamForm.append("file", audioFile, audioFile.name || "audio.wav");
  upstreamForm.append("model", model);
  upstreamForm.append("response_format", "srt");

  if (language.trim()) {
    upstreamForm.append("language", language.trim());
  }
  if (prompt.trim()) {
    upstreamForm.append("prompt", prompt.trim());
  }
  if (temperatureRaw.trim()) {
    const temperature = Number.parseFloat(temperatureRaw);
    if (Number.isNaN(temperature)) {
      return jsonError("'temperature' must be a number", 400);
    }
    upstreamForm.append("temperature", String(temperature));
  }

  try {
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: upstreamForm,
    });

    if (!response.ok) {
      const details = await readResponseDetails(response);
      return jsonError("OpenAI audio transcription API request failed", response.status, details);
    }

    const srtText = await response.text();
    return new Response(srtText, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    return jsonError("OpenAI audio transcription API unavailable", 502, details);
  }
}
