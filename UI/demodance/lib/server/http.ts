import { NextResponse } from "next/server";

export function jsonError(message: string, status: number, details?: string) {
  const body: { error: string; details?: string } = { error: message };
  if (details) {
    body.details = details;
  }
  return NextResponse.json(body, { status });
}

export async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    return body ?? {};
  } catch {
    return {};
  }
}

export async function readResponseDetails(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}
