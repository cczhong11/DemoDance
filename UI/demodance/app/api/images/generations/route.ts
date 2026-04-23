import { NextResponse } from "next/server";

import { jsonError, readJsonBody, readResponseDetails } from "@/lib/server/http";

export const runtime = "nodejs";

function normalizeModel(value: unknown, fallback: string): string {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return fallback;
  const lower = raw.toLowerCase();
  if (lower === "image2" || lower === "image-2") return "gpt-image-2";
  return raw;
}

function mapImageSize(rawSize: unknown, rawAspectRatio: unknown): string | undefined {
  const size = typeof rawSize === "string" ? rawSize.trim().toUpperCase() : "";
  const aspectRatio = typeof rawAspectRatio === "string" ? rawAspectRatio.trim() : "";

  if (typeof rawSize === "string" && /^\d+x\d+$/i.test(rawSize.trim())) {
    const normalized = rawSize.trim().toLowerCase();
    const [w, h] = normalized.split("x").map((v) => Number.parseInt(v, 10));
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
      return undefined;
    }
    // gpt-image-2 rejects very small resolutions; upscale tiny requests to a safe minimum.
    if (w < 1024 || h < 1024) {
      if (w > h) return "1536x1024";
      if (h > w) return "1024x1536";
      return "1024x1024";
    }
    return normalized;
  }

  const isPortrait = aspectRatio === "9:16";
  const isLandscape = aspectRatio === "16:9";

  if (size === "1K" || size === "1024" || size === "") {
    if (isPortrait) return "1024x1536";
    if (isLandscape) return "1536x1024";
    return "1024x1024";
  }

  if (size === "2K" || size === "2048" || size === "4K" || size === "4096") {
    if (isPortrait) return "1024x1536";
    if (isLandscape) return "1536x1024";
    return "1536x1024";
  }

  return undefined;
}

function getMimeTypeFromOutputFormat(value: unknown): string {
  const format = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (format === "jpeg" || format === "jpg") return "image/jpeg";
  if (format === "webp") return "image/webp";
  return "image/png";
}

export async function POST(request: Request) {
  const openaiApiKey = process.env.OPENAI_API_KEY ?? "";
  const defaultImageModel = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2";

  if (!openaiApiKey) {
    return jsonError("OPENAI_API_KEY is not set", 500);
  }

  const data = await readJsonBody(request);
  const prompt = typeof data.prompt === "string" ? data.prompt.trim() : "";
  if (!prompt) {
    return jsonError("'prompt' is required", 400);
  }

  const model = normalizeModel(data.model, defaultImageModel);
  const size = mapImageSize(data.size, data.aspect_ratio);
  const quality = typeof data.quality === "string" && data.quality.trim() ? data.quality.trim() : undefined;
  const background = typeof data.background === "string" && data.background.trim() ? data.background.trim() : undefined;
  const outputFormat =
    typeof data.output_format === "string" && data.output_format.trim() ? data.output_format.trim() : undefined;
  const nRaw = Number.parseInt(String(data.n ?? "1"), 10);
  const n = Number.isFinite(nRaw) && nRaw > 0 ? Math.min(nRaw, 10) : 1;

  const images = Array.isArray(data.image) ? data.image : data.image ? [data.image] : [];
  const ignoredImageInputs = images.filter((img) => Boolean(img)).length;

  const upstreamPayload: Record<string, unknown> = {
    model,
    prompt,
    n,
  };
  if (size) upstreamPayload.size = size;
  if (quality) upstreamPayload.quality = quality;
  if (background) upstreamPayload.background = background;
  if (outputFormat) upstreamPayload.output_format = outputFormat;

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify(upstreamPayload),
    });

    if (!response.ok) {
      const details = await readResponseDetails(response);
      return jsonError("OpenAI image generation API request failed", response.status, details);
    }

    const raw = (await response.json()) as {
      created?: number;
      data?: Array<{ b64_json?: string; url?: string }>;
      model?: string;
    };
    const mimeType = getMimeTypeFromOutputFormat(outputFormat);
    const mappedData = Array.isArray(raw.data)
      ? raw.data.flatMap((item) => {
          const b64 = typeof item.b64_json === "string" ? item.b64_json : "";
          const url = typeof item.url === "string" ? item.url : b64 ? `data:${mimeType};base64,${b64}` : "";
          if (!url && !b64) return [];
          return [
            {
              b64_json: b64 || undefined,
              mime_type: mimeType,
              url,
            },
          ];
        })
      : [];

    if (mappedData.length === 0) {
      return jsonError("OpenAI did not return image data", 502);
    }

    return NextResponse.json({
      created: typeof raw.created === "number" ? raw.created : Math.floor(Date.now() / 1000),
      model: typeof raw.model === "string" ? raw.model : model,
      data: mappedData,
      warnings:
        ignoredImageInputs > 0
          ? [
              `Ignored ${ignoredImageInputs} image input(s): OpenAI text-to-image endpoint does not accept image edit inputs.`,
            ]
          : undefined,
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    return jsonError("OpenAI image generation API unavailable", 502, details);
  }
}
