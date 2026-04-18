import { NextResponse } from "next/server";

import { getIonRouterConfig } from "@/lib/server/config";
import { jsonError, readJsonBody, readResponseDetails } from "@/lib/server/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const data = await readJsonBody(request);
  const config = getIonRouterConfig();

  if (!config.apiKey) {
    return jsonError("IONROUTER_API_KEY is not set", 500);
  }

  const input = typeof data.input === "string" ? data.input : "";
  if (!input) {
    return jsonError("'input' is required", 400);
  }

  const payload: Record<string, unknown> = {
    model: (data.model as string | undefined) ?? config.defaultTtsModel,
    input,
    voice: (data.voice as string | undefined) ?? config.defaultTtsVoice,
  };

  for (const key of ["ref_audio", "ref_text"]) {
    if (typeof data[key] === "string" && data[key]) {
      payload[key] = data[key];
    }
  }

  try {
    const response = await fetch(`${config.baseUrl}/audio/speech`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const details = await readResponseDetails(response);
      return jsonError("IonRouter audio API request failed", response.status, details);
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") ?? "audio/wav";

    if (data.base64 === true) {
      return NextResponse.json({
        audio_base64: audioBuffer.toString("base64"),
        mime_type: contentType,
      });
    }

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
      },
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    return jsonError("IonRouter audio API unavailable", 502, details);
  }
}
