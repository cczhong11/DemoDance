import { NextResponse } from "next/server";

import { checkButterbaseConnection } from "@/lib/server/butterbase/client";
import { jsonError } from "@/lib/server/http";

export const runtime = "nodejs";

export async function GET() {
  try {
    const info = await checkButterbaseConnection();
    return NextResponse.json(info);
  } catch (error) {
    const details =
      error && typeof error === "object" && "details" in error
        ? JSON.stringify((error as { details?: unknown }).details)
        : error instanceof Error
          ? error.message
          : String(error);

    const status =
      error && typeof error === "object" && "status" in error
        ? Number((error as { status?: number }).status) || 500
        : 500;

    return jsonError("Butterbase connection failed", status, details);
  }
}
