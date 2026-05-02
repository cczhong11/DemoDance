import { promises as fs } from "node:fs";
import path from "node:path";

import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "recordings", "after.mp4");
    const file = await fs.readFile(filePath);

    return new NextResponse(file, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(file.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Failed to load demo recording", details }, { status: 404 });
  }
}
