import { NextResponse } from "next/server";

import { jsonError, readJsonBody } from "@/lib/server/http";

export const runtime = "nodejs";

type SourceEngine = "ffmpeg";

type NormalizedSegment = {
  start: number;
  end: number;
  label: string;
  caption: string;
  confidence: number;
  dataUrl?: string;
};

type AnalyzeResult = {
  ok: true;
  source_engine: SourceEngine;
  confidence: number;
  features: string[];
  segments: NormalizedSegment[];
  fallback_used: boolean;
};

function readMaybeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
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
      const dataUrl = readMaybeString(row.dataUrl);
      if (!Number.isFinite(second) || !summary) return null;
      return { second, summary, dataUrl };
    })
    .filter((v): v is { second: number; summary: string; dataUrl: string } => Boolean(v));

  if (normalized.length === 0) return null;

  const pickCount = Math.min(3, normalized.length);
  const picks: { second: number; summary: string; dataUrl: string }[] = [];

  for (let i = 0; i < pickCount; i += 1) {
    const idx = Math.floor((i * (normalized.length - 1)) / Math.max(1, pickCount - 1));
    picks.push(normalized[idx]);
  }

  const segments: NormalizedSegment[] = picks.map((p, idx) => ({
    start: Math.max(0, Math.round((p.second - 2) * 1000) / 1000),
    end: Math.max(0, Math.round((p.second + 4) * 1000) / 1000),
    label: `Feature ${idx + 1}`,
    caption: p.summary,
    confidence: 0.6,
    dataUrl: p.dataUrl,
  }));

  return {
    features: segments.map((s) => s.caption).slice(0, 3),
    segments,
  };
}

async function callInternalJson(origin: string, path: string, body: Record<string, unknown>, request: Request) {
  const openaiApiKey = request.headers.get("x-openai-api-key");
  const res = await fetch(`${origin}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(openaiApiKey ? { "x-openai-api-key": openaiApiKey } : {}),
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false as const, status: res.status, data };
  }

  return { ok: true as const, data };
}

async function callInternalForm(origin: string, path: string, form: FormData, request: Request) {
  const openaiApiKey = request.headers.get("x-openai-api-key");
  const res = await fetch(`${origin}${path}`, {
    method: "POST",
    headers: openaiApiKey ? { "x-openai-api-key": openaiApiKey } : undefined,
    body: form,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false as const, status: res.status, data };
  }

  return { ok: true as const, data };
}

export async function POST(request: Request) {
  const origin = new URL(request.url).origin;

  const contentType = request.headers.get("content-type") ?? "";
  let result:
    | { ok: true; data: unknown }
    | { ok: false; status: number; data: unknown };

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    const videoUrl = readMaybeString(form.get("video_url"));
    const prompt = readMaybeString(form.get("prompt")) || "Extract key product demo moments and what each moment demonstrates.";

    if (!(file instanceof File) && !videoUrl) {
      return jsonError("Provide one of 'file' or 'video_url'", 400);
    }

    const ffmpegForm = new FormData();
    if (file instanceof File) {
      ffmpegForm.append("file", file, file.name || "video.mp4");
    }
    if (videoUrl) {
      ffmpegForm.append("video_url", videoUrl);
    }
    ffmpegForm.append("prompt", prompt);
    ffmpegForm.append("fps", "1");
    ffmpegForm.append("batch_size", "8");

    result = await callInternalForm(origin, "/api/ffmpeg_understand", ffmpegForm, request);
  } else {
    const data = await readJsonBody(request);
    const videoUrl = readMaybeString(data.video_url);
    const prompt = readMaybeString(data.prompt) || "Extract key product demo moments and what each moment demonstrates.";

    if (!videoUrl) {
      return jsonError("When using JSON body, 'video_url' is required", 400);
    }

    result = await callInternalJson(
      origin,
      "/api/ffmpeg_understand",
      {
        video_url: videoUrl,
        prompt,
        fps: 1,
        batch_size: 8,
      },
      request,
    );
  }

  if (!result.ok) {
    return jsonError("ffmpeg understand failed", result.status, JSON.stringify(result.data));
  }

  const normalized = summarizeFrames(result.data);
  if (!normalized) {
    return jsonError("ffmpeg output did not contain usable frames", 502, JSON.stringify(result.data));
  }

  const confidence =
    normalized.segments.length > 0
      ? normalized.segments.reduce((sum, s) => sum + s.confidence, 0) / normalized.segments.length
      : 0.6;

  const body: AnalyzeResult = {
    ok: true,
    source_engine: "ffmpeg",
    confidence: Math.round(confidence * 1000) / 1000,
    features: normalized.features.slice(0, 3),
    segments: normalized.segments.slice(0, 3),
    fallback_used: false,
  };

  return NextResponse.json(body);
}
