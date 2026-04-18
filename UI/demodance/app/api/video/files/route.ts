import { NextResponse } from "next/server";

import { getBytePlusConfig } from "@/lib/server/config";
import { jsonError, readResponseDetails } from "@/lib/server/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const config = getBytePlusConfig();
  if (!config.apiKey) {
    return jsonError("BYTEPLUS_ARK_API_KEY is not set", 500);
  }

  let incomingForm: FormData;
  try {
    incomingForm = await request.formData();
  } catch {
    return jsonError("Expected multipart/form-data request", 400);
  }

  const file = incomingForm.get("file");
  if (!(file instanceof File)) {
    return jsonError("'file' is required as multipart file", 400);
  }

  const purposeValue = incomingForm.get("purpose");
  const preprocessFpsValue = incomingForm.get("preprocess_fps");

  const purpose = typeof purposeValue === "string" && purposeValue.trim() ? purposeValue.trim() : "user_data";

  const upstreamForm = new FormData();
  upstreamForm.append("file", file, file.name || "video.mp4");
  upstreamForm.append("purpose", purpose);

  if (typeof preprocessFpsValue === "string" && preprocessFpsValue.trim()) {
    const fps = Number.parseFloat(preprocessFpsValue);
    if (Number.isNaN(fps) || fps <= 0) {
      return jsonError("'preprocess_fps' must be a positive number", 400);
    }
    upstreamForm.append("preprocess_configs[video][fps]", String(fps));
  }

  try {
    const response = await fetch(`${config.baseUrl}/files`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: upstreamForm,
    });

    if (!response.ok) {
      const details = await readResponseDetails(response);
      return jsonError("BytePlus Files API request failed", response.status, details);
    }

    const result = await response.json();
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    return jsonError("BytePlus Files API unavailable", 502, details);
  }
}
