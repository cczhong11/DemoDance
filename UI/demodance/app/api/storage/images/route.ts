import { NextResponse } from "next/server";

import {
  createButterbaseDownloadUrl,
  createButterbaseStorageUpload,
  uploadButterbaseObject,
} from "@/lib/server/butterbase/client";
import { jsonError, readJsonBody } from "@/lib/server/http";

export const runtime = "nodejs";

type UploadImageBody = {
  sourceUrl?: unknown;
  fileName?: unknown;
};

function trimText(value: unknown, limit: number) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > limit ? text.slice(0, limit) : text;
}

function parseDataUrl(input: string) {
  const match = input.match(/^data:([^;,]+)?(;base64)?,([\s\S]*)$/);
  if (!match) return null;
  const mimeType = match[1] || "application/octet-stream";
  const payload = match[3] || "";
  const bytes = match[2] ? Buffer.from(payload, "base64") : Buffer.from(decodeURIComponent(payload), "utf8");
  return { mimeType, bytes };
}

function guessExtension(mimeType: string) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/gif") return "gif";
  return "bin";
}

function normalizeFileName(baseName: string, mimeType: string) {
  const clean = baseName.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "generated-image";
  if (/\.[a-zA-Z0-9]+$/.test(clean)) {
    return clean;
  }
  return `${clean}.${guessExtension(mimeType)}`;
}

export async function POST(request: Request) {
  const body = (await readJsonBody(request)) as UploadImageBody;
  const sourceUrl = trimText(body.sourceUrl, 4_000_000);
  const requestedName = trimText(body.fileName, 200) || "generated-image";

  if (!sourceUrl) {
    return jsonError("Image source is required", 400);
  }

  try {
    let bytes: Buffer;
    let contentType = "application/octet-stream";

    const parsedDataUrl = parseDataUrl(sourceUrl);
    if (parsedDataUrl) {
      bytes = parsedDataUrl.bytes;
      contentType = parsedDataUrl.mimeType;
    } else {
      const upstream = await fetch(sourceUrl);
      if (!upstream.ok) {
        throw new Error(`Failed to fetch source image (${upstream.status})`);
      }
      const arrayBuffer = await upstream.arrayBuffer();
      bytes = Buffer.from(arrayBuffer);
      contentType = upstream.headers.get("content-type") || contentType;
    }

    const fileName = normalizeFileName(requestedName, contentType);
    const upload = await createButterbaseStorageUpload({
      filename: fileName,
      contentType,
      sizeBytes: bytes.byteLength,
      public: false,
    });
    await uploadButterbaseObject(upload.uploadUrl, contentType, new Uint8Array(bytes));
    const download = await createButterbaseDownloadUrl(upload.objectId);

    return NextResponse.json({
      ok: true,
      objectId: upload.objectId,
      objectKey: upload.objectKey,
      fileName: download.filename || fileName,
      contentType,
      sizeBytes: bytes.byteLength,
      url: download.downloadUrl,
    });
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

    return jsonError("Failed to store generated image", status, details);
  }
}
