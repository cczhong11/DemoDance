import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

import { getGoogleGenAIConfig } from "@/lib/server/config";
import { jsonError, readJsonBody } from "@/lib/server/http";

export const runtime = "nodejs";

type InlineImage = {
  mimeType: string;
  data: string;
};

function parseDataUrl(value: string): InlineImage | null {
  const trimmed = value.trim();
  const match = trimmed.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;
  return {
    mimeType: match[1],
    data: match[2],
  };
}

function extractInlineImagesFromResponse(response: unknown): Array<{ mimeType: string; data: string }> {
  const candidates = (response as { candidates?: Array<{ content?: { parts?: Array<Record<string, unknown>> } }> })
    ?.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return [];

  const parts = candidates[0]?.content?.parts;
  if (!Array.isArray(parts)) return [];

  return parts
    .map((part) => {
      const inlineData = part.inlineData as { mimeType?: unknown; data?: unknown } | undefined;
      if (!inlineData) return null;
      if (typeof inlineData.mimeType !== "string" || typeof inlineData.data !== "string") return null;
      return { mimeType: inlineData.mimeType, data: inlineData.data };
    })
    .filter((item): item is { mimeType: string; data: string } => Boolean(item));
}

function extractTextFromResponse(response: unknown): string {
  const candidates = (response as { candidates?: Array<{ content?: { parts?: Array<Record<string, unknown>> } }> })
    ?.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return "";
  const parts = candidates[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .filter(Boolean)
    .join("\n")
    .trim();
}

export async function POST(request: Request) {
  const config = getGoogleGenAIConfig();
  if (!config.apiKey) {
    return jsonError("GEMINI_API_KEY (or GOOGLE_API_KEY) is not set", 500);
  }

  const data = await readJsonBody(request);
  const prompt = typeof data.prompt === "string" ? data.prompt.trim() : "";
  if (!prompt) {
    return jsonError("'prompt' is required", 400);
  }

  const model = typeof data.model === "string" && data.model.trim() ? data.model.trim() : config.defaultImageModel;
  const aspectRatio = typeof data.aspect_ratio === "string" ? data.aspect_ratio.trim() : undefined;
  const imageSize = typeof data.size === "string" ? data.size.trim() : undefined;
  const images = Array.isArray(data.image) ? data.image : data.image ? [data.image] : [];

  const contentParts: Array<Record<string, unknown>> = [{ text: prompt }];
  let droppedImageInputs = 0;
  for (const image of images) {
    if (typeof image !== "string") continue;
    const parsed = parseDataUrl(image);
    if (parsed) {
      contentParts.push({
        inlineData: {
          mimeType: parsed.mimeType,
          data: parsed.data,
        },
      });
    } else {
      droppedImageInputs += 1;
    }
  }

  try {
    const ai = new GoogleGenAI({ apiKey: config.apiKey });
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: contentParts }],
      config: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: {
          ...(aspectRatio ? { aspectRatio } : {}),
          ...(imageSize ? { imageSize } : {}),
        },
      },
    });

    const inlineImages = extractInlineImagesFromResponse(response);
    if (inlineImages.length === 0) {
      return jsonError("Google GenAI did not return image data", 502, extractTextFromResponse(response) || undefined);
    }

    const text = extractTextFromResponse(response);
    return NextResponse.json({
      created: Math.floor(Date.now() / 1000),
      model,
      data: inlineImages.map((img) => ({
        b64_json: img.data,
        mime_type: img.mimeType,
        url: `data:${img.mimeType};base64,${img.data}`,
      })),
      text,
      warnings:
        droppedImageInputs > 0
          ? [`Ignored ${droppedImageInputs} image input(s) that were not Base64 data URLs.`]
          : undefined,
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    return jsonError("Google GenAI image generation request failed", 502, details);
  }
}

