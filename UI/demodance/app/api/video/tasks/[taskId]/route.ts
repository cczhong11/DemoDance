import { NextResponse } from "next/server";

import { getBytePlusConfig, readSeedanceApiKeyOverride } from "@/lib/server/config";
import { jsonError, readResponseDetails } from "@/lib/server/http";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const config = getBytePlusConfig();
  const seedanceApiKey = readSeedanceApiKeyOverride(request) || config.apiKey;
  if (!seedanceApiKey) {
    return jsonError("BYTEPLUS_ARK_API_KEY is not set", 500);
  }

  const { taskId } = await context.params;

  try {
    const response = await fetch(`${config.baseUrl}/contents/generations/tasks/${taskId}`, {
      headers: {
        Authorization: `Bearer ${seedanceApiKey}`,
      },
    });

    if (!response.ok) {
      const details = await readResponseDetails(response);
      return jsonError("BytePlus video API request failed", response.status, details);
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    return jsonError("BytePlus video API unavailable", 502, details);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const config = getBytePlusConfig();
  const seedanceApiKey = readSeedanceApiKeyOverride(request) || config.apiKey;
  if (!seedanceApiKey) {
    return jsonError("BYTEPLUS_ARK_API_KEY is not set", 500);
  }

  const { taskId } = await context.params;

  try {
    const response = await fetch(`${config.baseUrl}/contents/generations/tasks/${taskId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${seedanceApiKey}`,
      },
    });

    if (!response.ok) {
      const details = await readResponseDetails(response);
      return jsonError("BytePlus video API request failed", response.status, details);
    }

    const text = await response.text();
    if (!text.trim()) {
      return NextResponse.json({ ok: true, task_id: taskId, action: "deleted_or_cancelled" });
    }

    try {
      const result = JSON.parse(text) as unknown;
      return NextResponse.json(result);
    } catch {
      return NextResponse.json({ ok: true, task_id: taskId, action: "deleted_or_cancelled", raw: text });
    }
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    return jsonError("BytePlus video API unavailable", 502, details);
  }
}
