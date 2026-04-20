import { NextResponse } from "next/server";

import { jsonError, readJsonBody } from "@/lib/server/http";

export const runtime = "nodejs";

type SourceEngine = "byteplus" | "ffmpeg";

type NormalizedSegment = {
  start: number;
  end: number;
  label: string;
  caption: string;
  confidence: number;
};

type AnalyzeResult = {
  ok: true;
  source_engine: SourceEngine;
  confidence: number;
  features: string[];
  segments: NormalizedSegment[];
  fallback_used: boolean;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function extractJsonObject(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    // continue
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1]) as Record<string, unknown>;
    } catch {
      // continue
    }
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
    } catch {
      // continue
    }
  }

  return null;
}

function readMaybeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function pickResponseText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const root = payload as Record<string, unknown>;

  if (typeof root.output_text === "string" && root.output_text.trim()) {
    return root.output_text.trim();
  }

  const output = root.output;
  if (Array.isArray(output)) {
    const chunks: string[] = [];
    for (const item of output) {
      if (!item || typeof item !== "object") continue;
      const content = (item as Record<string, unknown>).content;
      if (!Array.isArray(content)) continue;
      for (const c of content) {
        if (!c || typeof c !== "object") continue;
        const rec = c as Record<string, unknown>;
        const text = readMaybeString(rec.text);
        if (text) chunks.push(text);
      }
    }
    if (chunks.length > 0) return chunks.join("\n");
  }

  return "";
}

function normalizeByteplus(parsed: Record<string, unknown>): { features: string[]; segments: NormalizedSegment[] } | null {
  const rawFeatures = Array.isArray(parsed.features)
    ? parsed.features.map((v) => readMaybeString(v)).filter(Boolean)
    : [];

  const rawSegments = Array.isArray(parsed.segments) ? parsed.segments : [];

  const segments: NormalizedSegment[] = rawSegments
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const start = Number.parseFloat(String(row.start ?? row.start_time ?? row.t0 ?? ""));
      const end = Number.parseFloat(String(row.end ?? row.end_time ?? row.t1 ?? ""));
      const label = readMaybeString(row.label) || "Feature Segment";
      const caption = readMaybeString(row.caption) || readMaybeString(row.summary);
      const confidence = clamp(Number.parseFloat(String(row.confidence ?? 0.7)) || 0.7, 0, 1);

      if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
      if (end <= start) return null;
      if (!caption) return null;

      return {
        start: Math.max(0, Math.round(start * 1000) / 1000),
        end: Math.max(0, Math.round(end * 1000) / 1000),
        label,
        caption,
        confidence,
      };
    })
    .filter((v): v is NormalizedSegment => Boolean(v))
    .sort((a, b) => a.start - b.start)
    .slice(0, 3);

  const features = (rawFeatures.length > 0
    ? rawFeatures
    : segments.map((seg) => seg.caption))
    .slice(0, 3);

  if (features.length === 0 && segments.length === 0) {
    return null;
  }

  return { features, segments };
}

function summarizeFrames(payload: unknown): { features: string[]; segments: NormalizedSegment[] } | null {
  if (!payload || typeof payload !== "object") return null;
  const frames = (payload as { frames?: unknown }).frames;
  if (!Array.isArray(frames) || frames.length === 0) return null;

  const normalized = frames
    .map((f) => {
      if (!f || typeof f !== "object") return null;
      const row = f as Record<string, unknown>;
      const second = Number.parseFloat(String(row.second ?? ""));
      const summary = readMaybeString(row.summary);
      if (!Number.isFinite(second) || !summary) return null;
      return { second, summary };
    })
    .filter((v): v is { second: number; summary: string } => Boolean(v));

  if (normalized.length === 0) return null;

  const pickCount = Math.min(3, normalized.length);
  const picks: { second: number; summary: string }[] = [];

  for (let i = 0; i < pickCount; i += 1) {
    const idx = Math.floor((i * (normalized.length - 1)) / Math.max(1, pickCount - 1));
    picks.push(normalized[idx]);
  }

  const segments: NormalizedSegment[] = picks.map((p, idx) => ({
    start: Math.max(0, Math.round((p.second - 2) * 1000) / 1000),
    end: Math.max(0, Math.round((p.second + 4) * 1000) / 1000),
    label: `Feature ${idx + 1}`,
    caption: p.summary,
    confidence: 0.55,
  }));

  const features = segments.map((s) => s.caption).slice(0, 3);
  return { features, segments };
}

async function callInternalJson(origin: string, path: string, body: Record<string, unknown>) {
  const res = await fetch(`${origin}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false as const, status: res.status, data };
  }

  return { ok: true as const, data };
}

async function callInternalForm(origin: string, path: string, form: FormData) {
  const res = await fetch(`${origin}${path}`, {
    method: "POST",
    body: form,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false as const, status: res.status, data };
  }

  return { ok: true as const, data };
}

function buildUnderstandPrompt(userPrompt?: string) {
  return [
    "Analyze this product demo video for feature extraction.",
    "Return strict JSON only with schema:",
    '{"features":["..."],"segments":[{"start":0,"end":5,"label":"...","caption":"...","confidence":0.8}]}',
    "Rules:",
    "- Return 1 to 3 features.",
    "- Segment times must be in seconds.",
    "- Segment caption should describe the demonstrated product behavior and user value.",
    userPrompt ? `Task focus: ${userPrompt}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function runByteplusAnalysis(args: {
  origin: string;
  prompt?: string;
  file?: File;
  fileId?: string;
  videoUrl?: string;
}): Promise<{ normalized: { features: string[]; segments: NormalizedSegment[] } | null; usedFileId?: string; raw?: unknown; error?: string }> {
  let fileId = args.fileId?.trim() || "";
  const uploadedInThisCall = Boolean(args.file && !fileId);

  if (args.file && !fileId) {
    const uploadForm = new FormData();
    uploadForm.append("file", args.file, args.file.name || "video.mp4");
    uploadForm.append("purpose", "user_data");
    uploadForm.append("preprocess_fps", "0.5");

    const upload = await callInternalForm(args.origin, "/api/video/files", uploadForm);
    if (!upload.ok) {
      return { normalized: null, error: "video upload for byteplus understand failed", raw: upload.data };
    }

    const possibleId = readMaybeString((upload.data as Record<string, unknown>).id);
    if (!possibleId) {
      return { normalized: null, error: "byteplus files API returned no file_id", raw: upload.data };
    }
    fileId = possibleId;
  }

  const payload: Record<string, unknown> = {
    prompt: buildUnderstandPrompt(args.prompt),
  };

  if (fileId) payload.file_id = fileId;
  else if (args.videoUrl) payload.video_url = args.videoUrl;

  if (!payload.file_id && !payload.video_url) {
    return { normalized: null, error: "byteplus analyze requires file_id or video_url" };
  }
  const attempts = uploadedInThisCall ? 4 : 1;
  let lastError = "byteplus understand failed";
  let lastRaw: unknown = undefined;

  for (let i = 0; i < attempts; i += 1) {
    if (i > 0) {
      // New uploads may still be preprocessing; give BytePlus a short buffer.
      await sleep(2000);
    }

    const understand = await callInternalJson(args.origin, "/api/video/understand", payload);
    if (!understand.ok) {
      lastError = "byteplus understand failed";
      lastRaw = understand.data;
      continue;
    }

    const rawText = pickResponseText(understand.data);
    const parsed = extractJsonObject(rawText);
    if (!parsed) {
      lastError = "byteplus understand returned no parseable JSON";
      lastRaw = understand.data;
      continue;
    }

    const normalized = normalizeByteplus(parsed);
    if (!normalized) {
      lastError = "byteplus JSON did not contain usable features/segments";
      lastRaw = parsed;
      continue;
    }

    return {
      normalized,
      usedFileId: fileId || undefined,
      raw: parsed,
    };
  }

  return { normalized: null, error: lastError, raw: lastRaw };
}

async function runFfmpegFallback(args: {
  origin: string;
  prompt?: string;
  file?: File;
  videoUrl?: string;
}): Promise<{ normalized: { features: string[]; segments: NormalizedSegment[] } | null; raw?: unknown; error?: string }> {
  if (!args.file && !args.videoUrl) {
    return { normalized: null, error: "ffmpeg analyze requires file or video_url" };
  }

  let result:
    | { ok: true; data: unknown }
    | { ok: false; status: number; data: unknown };

  if (args.file) {
    const form = new FormData();
    form.append("file", args.file, args.file.name || "video.mp4");
    form.append("prompt", args.prompt || "Extract key product demo moments and what each moment demonstrates.");
    form.append("fps", "1");
    form.append("batch_size", "8");
    result = await callInternalForm(args.origin, "/api/ffmpeg_understand", form);
  } else {
    result = await callInternalJson(args.origin, "/api/ffmpeg_understand", {
      video_url: args.videoUrl,
      prompt: args.prompt || "Extract key product demo moments and what each moment demonstrates.",
      fps: 1,
      batch_size: 8,
    });
  }

  if (!result.ok) {
    return { normalized: null, error: "ffmpeg understand failed", raw: result.data };
  }

  const normalized = summarizeFrames(result.data);
  if (!normalized) {
    return { normalized: null, error: "ffmpeg output did not contain usable frames", raw: result.data };
  }

  return { normalized, raw: result.data };
}

export async function POST(request: Request) {
  const origin = new URL(request.url).origin;

  const contentType = request.headers.get("content-type") ?? "";
  let file: File | undefined;
  let fileId = "";
  let videoUrl = "";
  let prompt = "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const maybeFile = form.get("file");
    file = maybeFile instanceof File ? maybeFile : undefined;
    fileId = readMaybeString(form.get("file_id"));
    videoUrl = readMaybeString(form.get("video_url"));
    prompt = readMaybeString(form.get("prompt"));
  } else {
    const data = await readJsonBody(request);
    fileId = readMaybeString(data.file_id);
    videoUrl = readMaybeString(data.video_url);
    prompt = readMaybeString(data.prompt);
  }

  if (!file && !fileId && !videoUrl) {
    return jsonError("Provide one of 'file', 'file_id', or 'video_url'", 400);
  }

  const byteplus = await runByteplusAnalysis({
    origin,
    prompt,
    file,
    fileId,
    videoUrl,
  });

  if (byteplus.normalized) {
    const confidence =
      byteplus.normalized.segments.length > 0
        ? byteplus.normalized.segments.reduce((sum, s) => sum + s.confidence, 0) / byteplus.normalized.segments.length
        : 0.75;

    const body: AnalyzeResult = {
      ok: true,
      source_engine: "byteplus",
      confidence: Math.round(confidence * 1000) / 1000,
      features: byteplus.normalized.features.slice(0, 3),
      segments: byteplus.normalized.segments.slice(0, 3),
      fallback_used: false,
    };

    return NextResponse.json(body);
  }

  const ffmpeg = await runFfmpegFallback({
    origin,
    prompt,
    file,
    videoUrl,
  });

  if (ffmpeg.normalized) {
    const confidence =
      ffmpeg.normalized.segments.length > 0
        ? ffmpeg.normalized.segments.reduce((sum, s) => sum + s.confidence, 0) / ffmpeg.normalized.segments.length
        : 0.55;

    const body: AnalyzeResult = {
      ok: true,
      source_engine: "ffmpeg",
      confidence: Math.round(confidence * 1000) / 1000,
      features: ffmpeg.normalized.features.slice(0, 3),
      segments: ffmpeg.normalized.segments.slice(0, 3),
      fallback_used: true,
    };

    return NextResponse.json(body);
  }

  return jsonError(
    "Video analyze failed in both engines",
    502,
    [byteplus.error, ffmpeg.error].filter(Boolean).join(" | "),
  );
}
