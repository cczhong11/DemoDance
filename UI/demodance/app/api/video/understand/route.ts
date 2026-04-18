import { NextResponse } from "next/server";

import { getBytePlusConfig } from "@/lib/server/config";
import { jsonError, readJsonBody, readResponseDetails } from "@/lib/server/http";

export const runtime = "nodejs";

type UnderstandPayloadResult =
  | { payload: Record<string, unknown> }
  | { error: ReturnType<typeof jsonError> };

function buildUnderstandPayload(data: Record<string, unknown>, defaultModel: string): UnderstandPayloadResult {
  const model = typeof data.model === "string" && data.model.trim() ? data.model.trim() : defaultModel;
  const prompt =
    typeof data.prompt === "string" && data.prompt.trim()
      ? data.prompt.trim()
      : "Please describe what is happening in this video.";

  if (Array.isArray(data.input)) {
    const payload: Record<string, unknown> = {
      model,
      input: data.input,
    };

    if (data.stream !== undefined) {
      payload.stream = Boolean(data.stream);
    }

    return { payload };
  }

  const fileId = typeof data.file_id === "string" ? data.file_id.trim() : "";
  const videoUrl = typeof data.video_url === "string" ? data.video_url.trim() : "";

  if (!fileId && !videoUrl) {
    return {
      error: jsonError("Provide either 'file_id', 'video_url', or full 'input' array", 400),
    };
  }

  if (fileId && videoUrl) {
    return {
      error: jsonError("Use only one of 'file_id' or 'video_url'", 400),
    };
  }

  const videoContent: Record<string, unknown> = { type: "input_video" };

  if (fileId) {
    videoContent.file_id = fileId;
  }

  if (videoUrl) {
    videoContent.video_url = videoUrl;

    if (data.fps !== undefined && data.fps !== null) {
      const fps = Number.parseFloat(String(data.fps));
      if (Number.isNaN(fps) || fps < 0.2 || fps > 5) {
        return { error: jsonError("'fps' must be a number in range [0.2, 5]", 400) };
      }
      videoContent.fps = fps;
    }
  }

  const content: Record<string, unknown>[] = [videoContent, { type: "input_text", text: prompt }];

  const input = [
    {
      role: "user",
      content,
    },
  ];

  const payload: Record<string, unknown> = {
    model,
    input,
  };

  if (data.stream !== undefined) {
    payload.stream = Boolean(data.stream);
  }

  return { payload };
}

export async function POST(request: Request) {
  const config = getBytePlusConfig();
  if (!config.apiKey) {
    return jsonError("BYTEPLUS_ARK_API_KEY is not set", 500);
  }

  const data = await readJsonBody(request);
  const built = buildUnderstandPayload(data, config.defaultVideoUnderstandModel);
  if ("error" in built) {
    return built.error;
  }

  try {
    const response = await fetch(`${config.baseUrl}/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(built.payload),
    });

    if (!response.ok) {
      const details = await readResponseDetails(response);
      return jsonError("BytePlus video understand API request failed", response.status, details);
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    return jsonError("BytePlus video understand API unavailable", 502, details);
  }
}
