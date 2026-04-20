import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { NextResponse } from "next/server";

import { getIonRouterConfig, resolveIonRouterBaseUrlByModel } from "@/lib/server/config";
import { jsonError, readJsonBody, readResponseDetails } from "@/lib/server/http";

export const runtime = "nodejs";

type ParsedInput = {
  videoUrl?: string;
  file?: File;
  prompt: string;
  fps: number;
  batchSize: number;
  model: string;
  maxTokens: number;
};

type FrameInsight = {
  second: number;
  summary: string;
  tags?: string[];
  danger?: "low" | "medium" | "high";
};

function coerceNumber(value: unknown, fallback: number) {
  const n = Number.parseFloat(String(value));
  return Number.isFinite(n) ? n : fallback;
}

function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    // continue
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1]);
    } catch {
      // continue
    }
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      // continue
    }
  }

  return null;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

async function runCommand(cmd: string, args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${cmd} failed with code ${code}: ${stderr.trim()}`));
    });
  });
}

async function saveRemoteVideo(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download video (${response.status})`);
  }
  const data = await response.arrayBuffer();
  await fs.writeFile(outputPath, Buffer.from(data));
}

async function saveUploadedVideo(file: File, outputPath: string): Promise<void> {
  const data = await file.arrayBuffer();
  await fs.writeFile(outputPath, Buffer.from(data));
}

function normalizeInsights(payload: unknown): FrameInsight[] {
  if (!payload || typeof payload !== "object") return [];
  const frames = (payload as { frames?: unknown }).frames;
  if (!Array.isArray(frames)) return [];

  return frames
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const second = Number.parseInt(String((item as { second?: unknown }).second), 10);
      const summary = String((item as { summary?: unknown }).summary ?? "").trim();
      if (Number.isNaN(second) || !summary) return null;
      const tagsRaw = (item as { tags?: unknown }).tags;
      const dangerRaw = String((item as { danger?: unknown }).danger ?? "").toLowerCase();
      const danger = dangerRaw === "low" || dangerRaw === "medium" || dangerRaw === "high" ? dangerRaw : undefined;
      return {
        second,
        summary,
        tags: Array.isArray(tagsRaw) ? tagsRaw.map((t) => String(t)).filter(Boolean) : undefined,
        danger,
      } as FrameInsight;
    })
    .filter((x): x is FrameInsight => Boolean(x));
}

async function analyzeBatchWithVisionModel(input: {
  apiKey: string;
  baseUrl: string;
  model: string;
  prompt: string;
  maxTokens: number;
  batch: { second: number; dataUrl: string }[];
}): Promise<FrameInsight[]> {
  const instructions = [
    "You are a video understanding assistant.",
    "You will receive a sequence of timestamped frames sampled from a video.",
    "Summarize each frame independently.",
    "Return strict JSON with this exact schema:",
    '{"frames":[{"second":0,"summary":"...","tags":["..."],"danger":"low|medium|high"}]}',
    "Do not include markdown.",
    `Task focus: ${input.prompt}`,
  ].join("\n");

  const content: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> = [
    { type: "text", text: instructions },
  ];

  for (const frame of input.batch) {
    content.push({ type: "text", text: `frame_second=${frame.second}` });
    content.push({ type: "image_url", image_url: { url: frame.dataUrl } });
  }

  const response = await fetch(`${input.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      temperature: 0,
      max_tokens: input.maxTokens,
      messages: [{ role: "user", content }],
    }),
  });

  if (!response.ok) {
    const details = await readResponseDetails(response);
    throw new Error(`Vision model request failed (${response.status}): ${details}`);
  }

  const result = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const text = result.choices?.[0]?.message?.content ?? "";
  const parsed = extractJsonObject(text);
  return normalizeInsights(parsed);
}

async function parseInput(request: Request, defaultModel: string): Promise<ParsedInput | { error: ReturnType<typeof jsonError> }> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return { error: jsonError("Expected multipart/form-data request", 400) };
    }

    const file = form.get("file");
    const videoUrl = typeof form.get("video_url") === "string" ? String(form.get("video_url")).trim() : "";
    const prompt = typeof form.get("prompt") === "string" ? String(form.get("prompt")) : "Describe key events in this video.";
    const fps = coerceNumber(form.get("fps"), 1);
    const batchSize = Math.floor(coerceNumber(form.get("batch_size"), 8));
    const maxTokens = Math.floor(coerceNumber(form.get("max_tokens"), 1600));
    const model = typeof form.get("model") === "string" && String(form.get("model")).trim() ? String(form.get("model")).trim() : defaultModel;

    if (!(file instanceof File) && !videoUrl) {
      return { error: jsonError("Provide either multipart 'file' or 'video_url'", 400) };
    }

    return {
      file: file instanceof File ? file : undefined,
      videoUrl: videoUrl || undefined,
      prompt,
      fps: Math.min(Math.max(fps, 0.2), 5),
      batchSize: Math.min(Math.max(batchSize, 1), 20),
      model,
      maxTokens: Math.min(Math.max(maxTokens, 256), 4096),
    };
  }

  const data = await readJsonBody(request);
  const videoUrl = typeof data.video_url === "string" ? data.video_url.trim() : "";
  if (!videoUrl) {
    return { error: jsonError("When using JSON body, 'video_url' is required", 400) };
  }

  const prompt = typeof data.prompt === "string" ? data.prompt : "Describe key events in this video.";
  const fps = coerceNumber(data.fps, 1);
  const batchSize = Math.floor(coerceNumber(data.batch_size, 8));
  const maxTokens = Math.floor(coerceNumber(data.max_tokens, 1600));
  const model = typeof data.model === "string" && data.model.trim() ? data.model.trim() : defaultModel;

  return {
    videoUrl,
    prompt,
    fps: Math.min(Math.max(fps, 0.2), 5),
    batchSize: Math.min(Math.max(batchSize, 1), 20),
    model,
    maxTokens: Math.min(Math.max(maxTokens, 256), 4096),
  };
}

export async function POST(request: Request) {
  const ion = getIonRouterConfig();
  if (!ion.apiKey) {
    return jsonError("IONROUTER_API_KEY is not set", 500);
  }

  const defaultModel = process.env.FFMPEG_UNDERSTAND_MODEL ?? "Qwen3-VL-8B";
  const parsed = await parseInput(request, defaultModel);
  if ("error" in parsed) {
    return parsed.error;
  }

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "ffmpeg-understand-"));
  const inputPath = path.join(workDir, "input.mp4");
  const framesDir = path.join(workDir, "frames");

  try {
    await fs.mkdir(framesDir, { recursive: true });

    if (parsed.file) {
      await saveUploadedVideo(parsed.file, inputPath);
    } else if (parsed.videoUrl) {
      await saveRemoteVideo(parsed.videoUrl, inputPath);
    }

    await runCommand("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      inputPath,
      "-vf",
      `fps=${parsed.fps}`,
      "-q:v",
      "2",
      path.join(framesDir, "frame_%06d.jpg"),
    ]);

    const files = (await fs.readdir(framesDir)).filter((f) => f.endsWith(".jpg")).sort((a, b) => a.localeCompare(b));

    if (files.length === 0) {
      return jsonError("No frames extracted from video", 400);
    }

    const frames = await Promise.all(
      files.map(async (name, idx) => {
        const full = path.join(framesDir, name);
        const bytes = await fs.readFile(full);
        return {
          second: Math.round((idx / parsed.fps) * 1000) / 1000,
          dataUrl: `data:image/jpeg;base64,${bytes.toString("base64")}`,
        };
      }),
    );

    const batches = chunkArray(frames, parsed.batchSize);
    const frameInsights: FrameInsight[] = [];
    const baseUrl = resolveIonRouterBaseUrlByModel(parsed.model, ion.baseUrl);

    for (const batch of batches) {
      const insights = await analyzeBatchWithVisionModel({
        apiKey: ion.apiKey,
        baseUrl,
        model: parsed.model,
        prompt: parsed.prompt,
        maxTokens: parsed.maxTokens,
        batch,
      });

      if (insights.length === 0) {
        for (const frame of batch) {
          frameInsights.push({
            second: frame.second,
            summary: "No structured summary returned for this frame.",
            danger: "low",
          });
        }
      } else {
        frameInsights.push(...insights);
      }
    }

    frameInsights.sort((a, b) => a.second - b.second);

    return NextResponse.json({
      ok: true,
      model: parsed.model,
      fps: parsed.fps,
      batch_size: parsed.batchSize,
      total_frames: files.length,
      total_batches: batches.length,
      prompt: parsed.prompt,
      frames: frameInsights,
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    if (details.includes("ffmpeg") && details.includes("not found")) {
      return jsonError("ffmpeg is not installed on server", 500, details);
    }
    return jsonError("FFmpeg video understand API failed", 502, details);
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
}
