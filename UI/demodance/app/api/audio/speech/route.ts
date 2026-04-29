import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

import { jsonError, readJsonBody } from "@/lib/server/http";

export const runtime = "nodejs";

const DEFAULT_TRANSCRIPT_MODEL = "gemini-3-flash-preview";
const DEFAULT_TTS_MODEL = "gemini-3.1-flash-tts-preview";
const DEFAULT_VOICE = "Kore";
const DEFAULT_LANGUAGE_CODE = "en-US";
const DEFAULT_TRANSCRIPT_PROMPT =
  "Generate a short transcript around 100 words that reads like it was clipped from a podcast by excited herpetologists. The hosts names are Dr. Anya and Liam.";
const DEFAULT_SPEAKERS: SpeakerVoiceInput[] = [
  { speaker: "Dr. Anya", voiceName: "Kore" },
  { speaker: "Liam", voiceName: "Puck" },
] as const;

const geminiApiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? "";
const ai = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;

type SpeakerVoiceInput = {
  speaker: string;
  voiceName: string;
};

type PcmAudioFormat = {
  channels: number;
  mimeType: string;
  sampleRate: number;
  sampleWidth: number;
};

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getSpeakerVoiceConfigs(data: Record<string, unknown>) {
  const raw = Array.isArray(data.speakers) ? data.speakers : [];
  const speakers = raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const speaker = readString((item as Record<string, unknown>).speaker);
      const voiceName = readString((item as Record<string, unknown>).voiceName);
      if (!speaker || !voiceName) return null;
      return { speaker, voiceName };
    })
    .filter((item): item is SpeakerVoiceInput => item !== null);

  if (speakers.length === 2) {
    return speakers;
  }

  return undefined;
}

function extractAudioInlineData(response: {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: {
          data?: string;
          mimeType?: string;
        };
      }>;
    };
  }>;
}) {
  for (const candidate of response.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      const data = part.inlineData?.data;
      if (data) {
        return {
          data,
          mimeType: part.inlineData?.mimeType ?? "audio/wav",
        };
      }
    }
  }

  return null;
}

function parsePcmAudioFormat(mimeType: string): PcmAudioFormat | null {
  const normalized = mimeType.trim().toLowerCase();
  if (!normalized.startsWith("audio/l16")) {
    return null;
  }

  const rateMatch = normalized.match(/rate=(\d+)/i);
  const channelsMatch = normalized.match(/channels=(\d+)/i);

  return {
    channels: Number.parseInt(channelsMatch?.[1] ?? "1", 10) || 1,
    mimeType: "audio/wav",
    sampleRate: Number.parseInt(rateMatch?.[1] ?? "24000", 10) || 24000,
    sampleWidth: 2,
  };
}

function createWavBuffer(pcmBuffer: Buffer, format: PcmAudioFormat): Buffer {
  const blockAlign = format.channels * format.sampleWidth;
  const byteRate = format.sampleRate * blockAlign;
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcmBuffer.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(format.channels, 22);
  header.writeUInt32LE(format.sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(format.sampleWidth * 8, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcmBuffer.length, 40);

  return Buffer.concat([header, pcmBuffer]);
}

export async function POST(request: Request) {
  const data = await readJsonBody(request);

  if (!ai) {
    return jsonError("GEMINI_API_KEY or GOOGLE_API_KEY is not set", 500);
  }

  const input = readString(data.input);
  const transcriptPrompt = readString(data.transcriptPrompt);
  const transcriptModel = readString(data.transcriptModel) || DEFAULT_TRANSCRIPT_MODEL;
  const ttsModel = readString(data.model) || DEFAULT_TTS_MODEL;
  const voice = readString(data.voice) || DEFAULT_VOICE;
  const languageCode = readString(data.languageCode) || DEFAULT_LANGUAGE_CODE;
  const shouldGenerateTranscript = data.generateTranscript === true || (!input && !transcriptPrompt);
  const speakerVoiceConfigs = (getSpeakerVoiceConfigs(data) ?? (shouldGenerateTranscript ? DEFAULT_SPEAKERS : undefined))?.map(
    ({ speaker, voiceName }) => ({
      speaker,
      voiceConfig: {
        prebuiltVoiceConfig: { voiceName },
      },
    }),
  );

  try {
    let transcript = input;

    if (shouldGenerateTranscript || transcriptPrompt) {
      const transcriptResponse = await ai.models.generateContent({
        model: transcriptModel,
        contents: transcriptPrompt || DEFAULT_TRANSCRIPT_PROMPT,
      });

      transcript = transcriptResponse.text?.trim() ?? "";
    }

    if (!transcript) {
      return jsonError("'input' is required when transcript generation returns empty output", 400);
    }

    const response = await ai.models.generateContent({
      model: ttsModel,
      contents: transcript,
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: speakerVoiceConfigs
          ? {
              languageCode,
              multiSpeakerVoiceConfig: {
                speakerVoiceConfigs,
              },
            }
          : {
              languageCode,
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voice },
              },
            },
      },
    });

    const audio = extractAudioInlineData(response);
    if (!audio) {
      return jsonError("Gemini TTS response did not include audio data", 502);
    }

    const rawAudioBuffer = Buffer.from(audio.data, "base64");
    const pcmFormat = parsePcmAudioFormat(audio.mimeType);
    const outputAudioBuffer = pcmFormat ? createWavBuffer(rawAudioBuffer, pcmFormat) : rawAudioBuffer;
    const outputMimeType = pcmFormat?.mimeType ?? audio.mimeType;

    if (data.base64 === true) {
      return NextResponse.json({
        audio_base64: outputAudioBuffer.toString("base64"),
        mime_type: outputMimeType,
        transcript,
      });
    }

    return new Response(new Uint8Array(outputAudioBuffer), {
      status: 200,
      headers: {
        "Content-Disposition": 'attachment; filename="voiceover.wav"',
        "Content-Type": outputMimeType,
      },
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    return jsonError("Gemini audio API unavailable", 502, details);
  }
}
