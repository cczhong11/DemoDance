import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/server/http";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return jsonError("Missing url parameter", 400);
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return jsonError("Failed to fetch upstream URL", response.status);
    }

    // Forward the response body as a stream
    const headers = new Headers(response.headers);
    // Overwrite CORS headers
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    
    // Some headers like content-encoding might cause issues if we just pass them through
    // but Next.js usually handles this.
    headers.delete("content-encoding");

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    return jsonError("Proxy request failed", 500, details);
  }
}

export async function OPTIONS() {
  const headers = new Headers();
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  return new NextResponse(null, { status: 204, headers });
}
