import { NextResponse } from "next/server";

import { getBytePlusConfig } from "@/lib/server/config";
import { jsonError, readResponseDetails } from "@/lib/server/http";

export const runtime = "nodejs";

export async function GET(_: Request, context: { params: Promise<{ taskId: string }> }) {
  const config = getBytePlusConfig();
  if (!config.apiKey) {
    return jsonError("BYTEPLUS_ARK_API_KEY is not set", 500);
  }

  const { taskId } = await context.params;

  try {
    const response = await fetch(`${config.baseUrl}/contents/generations/tasks/${taskId}`, {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
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
