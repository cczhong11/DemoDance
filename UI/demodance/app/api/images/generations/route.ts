import { NextResponse } from "next/server";

import { getBytePlusConfig } from "@/lib/server/config";
import { jsonError, readJsonBody, readResponseDetails } from "@/lib/server/http";

export const runtime = "nodejs";

function buildImageGenerationPayload(data: Record<string, unknown>, defaultModel: string) {
  const model = typeof data.model === "string" && data.model.trim() ? data.model.trim() : defaultModel;
  const prompt = typeof data.prompt === "string" ? data.prompt.trim() : "";

  if (!prompt) {
    return { error: jsonError("'prompt' is required", 400) };
  }

  const payload: Record<string, unknown> = {
    model,
    prompt,
  };

  const image = data.image;
  if (typeof image === "string") {
    const cleaned = image.trim();
    if (!cleaned) {
      return { error: jsonError("'image' must not be empty", 400) };
    }
    payload.image = cleaned;
  } else if (Array.isArray(image)) {
    const normalized = image
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter(Boolean);

    if (normalized.length === 0) {
      return { error: jsonError("'image' array must contain at least one valid item", 400) };
    }

    payload.image = normalized;
  } else if (image !== undefined && image !== null) {
    return { error: jsonError("'image' must be a string URL/Base64 or string array", 400) };
  }

  const optionalKeys = [
    "size",
    "response_format",
    "output_format",
    "watermark",
    "seed",
    "stream",
    "sequential_image_generation",
    "sequential_image_generation_options",
  ] as const;

  for (const key of optionalKeys) {
    const value = data[key];
    if (value !== undefined && value !== null) {
      payload[key] = value;
    }
  }

  return { payload };
}

export async function POST(request: Request) {
  const config = getBytePlusConfig();
  if (!config.apiKey) {
    return jsonError("BYTEPLUS_ARK_API_KEY is not set", 500);
  }

  const data = await readJsonBody(request);
  const built = buildImageGenerationPayload(data, config.defaultImageModel);
  if (built.error) {
    return built.error;
  }

  try {
    const response = await fetch(`${config.baseUrl}/images/generations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(built.payload),
    });

    if (!response.ok) {
      const details = await readResponseDetails(response);
      return jsonError("BytePlus image generation API request failed", response.status, details);
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    return jsonError("BytePlus image generation API unavailable", 502, details);
  }
}
