"use client";

import { FormEvent, useMemo, useState } from "react";
import Image from "next/image";
import { readBrowserOpenAIApiKey } from "../_lib/browser-settings";
import { useLocale } from "../locale-provider";

type ApiResult = {
  status: number;
  body: unknown;
  rawText: string;
};

async function callJsonApi(method: string, url: string, body?: unknown): Promise<ApiResult> {
  const openaiApiKey = readBrowserOpenAIApiKey();
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(openaiApiKey ? { "x-openai-api-key": openaiApiKey } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const rawText = await response.text();
  let parsed: unknown = rawText;
  try {
    parsed = rawText ? JSON.parse(rawText) : {};
  } catch {
    // keep raw text
  }

  return {
    status: response.status,
    body: parsed,
    rawText,
  };
}

export default function ApiTestPage() {
  const { locale, setLocale, tr } = useLocale();
  const [healthResult, setHealthResult] = useState<ApiResult | null>(null);
  const [textPrompt, setTextPrompt] = useState("Reply with exactly: pong");
  const [textResult, setTextResult] = useState<ApiResult | null>(null);

  const [audioInput, setAudioInput] = useState("Welcome to DemoDance");
  const [audioBase64, setAudioBase64] = useState(true);
  const [audioResult, setAudioResult] = useState<ApiResult | null>(null);
  const [audioPreviewSrc, setAudioPreviewSrc] = useState<string>("");
  const [srtFile, setSrtFile] = useState<File | null>(null);
  const [srtModel, setSrtModel] = useState("whisper-1");
  const [srtResult, setSrtResult] = useState<ApiResult | null>(null);

  const [videoPrompt, setVideoPrompt] = useState("meta engineer write code");
  const [videoDuration, setVideoDuration] = useState(5);
  const [videoCreateResult, setVideoCreateResult] = useState<ApiResult | null>(null);

  const [taskId, setTaskId] = useState("");
  const [videoStatusResult, setVideoStatusResult] = useState<ApiResult | null>(null);

  const [pageNum, setPageNum] = useState(1);
  const [pageSize, setPageSize] = useState(3);
  const [listStatus, setListStatus] = useState("succeeded");
  const [videoListResult, setVideoListResult] = useState<ApiResult | null>(null);
  const [understandVideoFile, setUnderstandVideoFile] = useState<File | null>(null);
  const [understandPreprocessFps, setUnderstandPreprocessFps] = useState("0.3");
  const [videoUploadResult, setVideoUploadResult] = useState<ApiResult | null>(null);
  const [understandInputType, setUnderstandInputType] = useState<"file_id" | "video_url">("file_id");
  const [understandFileId, setUnderstandFileId] = useState("");
  const [understandVideoUrl, setUnderstandVideoUrl] = useState("");
  const [understandPrompt, setUnderstandPrompt] = useState("Please describe the movement sequence in this video.");
  const [understandFps, setUnderstandFps] = useState("1");
  const [videoUnderstandResult, setVideoUnderstandResult] = useState<ApiResult | null>(null);
  const [imageMode, setImageMode] = useState<"text" | "image" | "multi">("text");
  const [imagePrompt, setImagePrompt] = useState(
    "Vibrant close-up editorial portrait, model with piercing gaze, rich color blocking, dramatic studio lighting.",
  );
  const [imageInputUrl, setImageInputUrl] = useState("");
  const [imageInputUrlsText, setImageInputUrlsText] = useState("");
  const [imageSize, setImageSize] = useState("2K");
  const [imageOutputFormat, setImageOutputFormat] = useState("png");
  const [imageWatermark, setImageWatermark] = useState(false);
  const [imageResponseFormat, setImageResponseFormat] = useState("url");
  const [imageGenerationResult, setImageGenerationResult] = useState<ApiResult | null>(null);
  const [logoProjectName, setLogoProjectName] = useState("DemoDance");
  const [logoTagline, setLogoTagline] = useState("Make Ideas Dance.");
  const [logoAudience, setLogoAudience] = useState("hackathon builders");
  const [smallLogoResult, setSmallLogoResult] = useState<ApiResult | null>(null);
  const [ffmpegInputType, setFfmpegInputType] = useState<"video_url" | "file">("video_url");
  const [ffmpegVideoUrl, setFfmpegVideoUrl] = useState("https://ark-doc.tos-ap-southeast-1.bytepluses.com/video_understanding.mp4");
  const [ffmpegFile, setFfmpegFile] = useState<File | null>(null);
  const [ffmpegPrompt, setFfmpegPrompt] = useState("Describe key actions and risks per second");
  const [ffmpegFps, setFfmpegFps] = useState("1");
  const [ffmpegBatchSize, setFfmpegBatchSize] = useState("8");
  const [ffmpegModel, setFfmpegModel] = useState("Qwen3-VL-8B");
  const [ffmpegMaxTokens, setFfmpegMaxTokens] = useState("1600");
  const [ffmpegUnderstandResult, setFfmpegUnderstandResult] = useState<ApiResult | null>(null);

  const pretty = (value: unknown) => JSON.stringify(value, null, 2);

  const detectedVideoUrl = useMemo(() => {
    const body = videoStatusResult?.body as { content?: { video_url?: string } } | undefined;
    return body?.content?.video_url ?? "";
  }, [videoStatusResult]);

  async function testHealth() {
    const result = await callJsonApi("GET", "/api/health");
    setHealthResult(result);
  }

  async function testText(event: FormEvent) {
    event.preventDefault();
    const result = await callJsonApi("POST", "/api/text/chat", { prompt: textPrompt });
    setTextResult(result);
  }

  async function testAudio(event: FormEvent) {
    event.preventDefault();
    setAudioPreviewSrc("");

    const result = await callJsonApi("POST", "/api/audio/speech", {
      input: audioInput,
      base64: audioBase64,
    });

    setAudioResult(result);

    if (audioBase64) {
      const body = result.body as { audio_base64?: string; mime_type?: string } | undefined;
      if (body?.audio_base64) {
        const mime = body.mime_type ?? "audio/wav";
        setAudioPreviewSrc(`data:${mime};base64,${body.audio_base64}`);
      }
    }
  }

  async function createVideoTask(event: FormEvent) {
    event.preventDefault();
    const result = await callJsonApi("POST", "/api/video/tasks", {
      prompt: videoPrompt,
      resolution: "720p",
      ratio: "16:9",
      duration: videoDuration,
      generate_audio: true,
    });
    setVideoCreateResult(result);

    const body = result.body as { id?: string } | undefined;
    if (body?.id) {
      setTaskId(body.id);
    }
  }

  async function testAudioToSrt(event: FormEvent) {
    event.preventDefault();
    if (!srtFile) {
      setSrtResult({
        status: 400,
        body: { error: "Please choose an audio file first." },
        rawText: JSON.stringify({ error: "Please choose an audio file first." }),
      });
      return;
    }

    const form = new FormData();
    form.append("file", srtFile);
    if (srtModel.trim()) {
      form.append("model", srtModel.trim());
    }

    const openaiApiKey = readBrowserOpenAIApiKey();
    const response = await fetch("/api/audio/srt", {
      method: "POST",
      headers: openaiApiKey ? { "x-openai-api-key": openaiApiKey } : undefined,
      body: form,
    });

    const rawText = await response.text();
    setSrtResult({
      status: response.status,
      body: rawText,
      rawText,
    });
  }

  async function getVideoTaskStatus(event: FormEvent) {
    event.preventDefault();
    if (!taskId.trim()) return;
    const result = await callJsonApi("GET", `/api/video/tasks/${taskId.trim()}`);
    setVideoStatusResult(result);
  }

  async function listVideoTasks(event: FormEvent) {
    event.preventDefault();
    const search = new URLSearchParams({
      page_num: String(pageNum),
      page_size: String(pageSize),
      "filter.status": listStatus,
    });
    const result = await callJsonApi("GET", `/api/video/tasks?${search.toString()}`);
    setVideoListResult(result);
  }

  async function uploadVideoFileForUnderstanding(event: FormEvent) {
    event.preventDefault();
    if (!understandVideoFile) {
      setVideoUploadResult({
        status: 400,
        body: { error: "Please choose a video file first." },
        rawText: JSON.stringify({ error: "Please choose a video file first." }),
      });
      return;
    }

    const form = new FormData();
    form.append("file", understandVideoFile);
    form.append("purpose", "user_data");
    if (understandPreprocessFps.trim()) {
      form.append("preprocess_fps", understandPreprocessFps.trim());
    }

    const response = await fetch("/api/video/files", {
      method: "POST",
      body: form,
    });

    const rawText = await response.text();
    let parsed: unknown = rawText;
    try {
      parsed = rawText ? JSON.parse(rawText) : {};
    } catch {
      // keep raw text
    }

    setVideoUploadResult({
      status: response.status,
      body: parsed,
      rawText,
    });

    const body = parsed as { id?: string } | undefined;
    if (body?.id) {
      setUnderstandFileId(body.id);
      setUnderstandInputType("file_id");
    }
  }

  async function testVideoUnderstand(event: FormEvent) {
    event.preventDefault();

    const payload: Record<string, unknown> = {
      prompt: understandPrompt,
    };

    if (understandInputType === "file_id") {
      if (!understandFileId.trim()) {
        setVideoUnderstandResult({
          status: 400,
          body: { error: "file_id is required when using file_id mode." },
          rawText: JSON.stringify({ error: "file_id is required when using file_id mode." }),
        });
        return;
      }
      payload.file_id = understandFileId.trim();
    } else {
      if (!understandVideoUrl.trim()) {
        setVideoUnderstandResult({
          status: 400,
          body: { error: "video_url is required when using video_url mode." },
          rawText: JSON.stringify({ error: "video_url is required when using video_url mode." }),
        });
        return;
      }
      payload.video_url = understandVideoUrl.trim();
      if (understandFps.trim()) {
        payload.fps = Number.parseFloat(understandFps.trim());
      }
    }

    const result = await callJsonApi("POST", "/api/video/understand", payload);
    setVideoUnderstandResult(result);
  }

  async function testImageGeneration(event: FormEvent) {
    event.preventDefault();

    const payload: Record<string, unknown> = {
      prompt: imagePrompt,
      size: imageSize,
      output_format: imageOutputFormat,
      response_format: imageResponseFormat,
      watermark: imageWatermark,
    };

    if (imageMode === "image") {
      if (!imageInputUrl.trim()) {
        setImageGenerationResult({
          status: 400,
          body: { error: "image URL/Base64 is required for image-to-image mode." },
          rawText: JSON.stringify({ error: "image URL/Base64 is required for image-to-image mode." }),
        });
        return;
      }
      payload.image = imageInputUrl.trim();
    }

    if (imageMode === "multi") {
      const imageList = imageInputUrlsText
        .split(/\n|,/)
        .map((value) => value.trim())
        .filter(Boolean);

      if (imageList.length < 2) {
        setImageGenerationResult({
          status: 400,
          body: { error: "Provide at least 2 image URLs/Base64 items for multi-image mode." },
          rawText: JSON.stringify({ error: "Provide at least 2 image URLs/Base64 items for multi-image mode." }),
        });
        return;
      }

      payload.image = imageList;
      payload.sequential_image_generation = "disabled";
    }

    const result = await callJsonApi("POST", "/api/images/generations", payload);
    setImageGenerationResult(result);
  }

  async function testSmallLogoGeneration(event: FormEvent) {
    event.preventDefault();

    const prompt = [
      `Create a clean, modern app logo for a product named "${logoProjectName.trim() || "DemoDance"}".`,
      logoTagline.trim() ? `Tagline/context: ${logoTagline.trim()}.` : "",
      logoAudience.trim() ? `Target users: ${logoAudience.trim()}.` : "",
      "Style: minimal, bold, high contrast, icon-first mark with transparent-like simple background.",
      "No complex text blocks. Avoid photorealism.",
      "Square composition, suitable for product launch page.",
    ]
      .filter(Boolean)
      .join(" ");

    const result = await callJsonApi("POST", "/api/images/generations", {
      prompt,
      model: "gpt-image-2",
      size: "1024x1024",
      quality: "low",
      output_format: "webp",
      n: 1,
    });

    setSmallLogoResult(result);
  }

  async function testFfmpegUnderstand(event: FormEvent) {
    event.preventDefault();

    if (ffmpegInputType === "video_url") {
      if (!ffmpegVideoUrl.trim()) {
        setFfmpegUnderstandResult({
          status: 400,
          body: { error: "video_url is required in video_url mode." },
          rawText: JSON.stringify({ error: "video_url is required in video_url mode." }),
        });
        return;
      }

      const payload: Record<string, unknown> = {
        video_url: ffmpegVideoUrl.trim(),
        prompt: ffmpegPrompt,
        fps: Number.parseFloat(ffmpegFps) || 1,
        batch_size: Number.parseInt(ffmpegBatchSize, 10) || 8,
        model: ffmpegModel.trim() || "Qwen3-VL-8B",
        max_tokens: Number.parseInt(ffmpegMaxTokens, 10) || 1600,
      };

      const result = await callJsonApi("POST", "/api/ffmpeg_understand", payload);
      setFfmpegUnderstandResult(result);
      return;
    }

    if (!ffmpegFile) {
      setFfmpegUnderstandResult({
        status: 400,
        body: { error: "Please choose a video file first." },
        rawText: JSON.stringify({ error: "Please choose a video file first." }),
      });
      return;
    }

    const form = new FormData();
    form.append("file", ffmpegFile);
    form.append("prompt", ffmpegPrompt);
    form.append("fps", ffmpegFps);
    form.append("batch_size", ffmpegBatchSize);
    form.append("model", ffmpegModel.trim() || "Qwen3-VL-8B");
    form.append("max_tokens", ffmpegMaxTokens);

    const response = await fetch("/api/ffmpeg_understand", {
      method: "POST",
      body: form,
    });
    const rawText = await response.text();
    let parsed: unknown = rawText;
    try {
      parsed = rawText ? JSON.parse(rawText) : {};
    } catch {
      // keep raw text
    }
    setFfmpegUnderstandResult({
      status: response.status,
      body: parsed,
      rawText,
    });
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-6 py-10">
      <div className="mx-auto max-w-5xl space-y-10">
        <header className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-zinc-400 text-sm">{tr("DemoDance Backend Tester", "DemoDance 后端测试器")}</p>
              <h1 className="text-3xl font-semibold tracking-tight">{tr("API Test Page", "API 测试页")}</h1>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setLocale("en")}
                className={`text-xs px-2 py-1 rounded ${locale === "en" ? "bg-zinc-100 text-zinc-900" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`}
              >
                EN
              </button>
              <button
                onClick={() => setLocale("zh")}
                className={`text-xs px-2 py-1 rounded ${locale === "zh" ? "bg-zinc-100 text-zinc-900" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`}
              >
                中文
              </button>
            </div>
          </div>
          <p className="text-zinc-300">{tr("Use this page to verify all Next.js backend APIs without curl.", "用这个页面直接验证所有 Next.js 后端 API，无需 curl。")}</p>
        </header>

        <section className="rounded-xl border border-zinc-800 p-5 space-y-4">
          <h2 className="text-xl font-medium">{tr("Health", "健康检查")}</h2>
          <button onClick={testHealth} className="rounded-md bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-4 py-2 font-medium">
            Test GET /api/health
          </button>
          {healthResult && (
            <pre className="bg-zinc-900 border border-zinc-800 rounded-md p-3 text-xs overflow-x-auto">
{`status: ${healthResult.status}\n${pretty(healthResult.body)}`}
            </pre>
          )}
        </section>

        <section className="rounded-xl border border-zinc-800 p-5 space-y-4">
          <h2 className="text-xl font-medium">{tr("Text Chat", "文本对话")}</h2>
          <form onSubmit={testText} className="space-y-3">
            <input
              value={textPrompt}
              onChange={(e) => setTextPrompt(e.target.value)}
              className="w-full rounded-md bg-zinc-900 border border-zinc-700 px-3 py-2"
            />
            <button type="submit" className="rounded-md bg-sky-500 hover:bg-sky-400 text-zinc-950 px-4 py-2 font-medium">
              Test POST /api/text/chat
            </button>
          </form>
          {textResult && (
            <pre className="bg-zinc-900 border border-zinc-800 rounded-md p-3 text-xs overflow-x-auto">
{`status: ${textResult.status}\n${pretty(textResult.body)}`}
            </pre>
          )}
        </section>

        <section className="rounded-xl border border-zinc-800 p-5 space-y-4">
          <h2 className="text-xl font-medium">{tr("Audio Speech", "语音合成")}</h2>
          <form onSubmit={testAudio} className="space-y-3">
            <input
              value={audioInput}
              onChange={(e) => setAudioInput(e.target.value)}
              className="w-full rounded-md bg-zinc-900 border border-zinc-700 px-3 py-2"
            />
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={audioBase64}
                onChange={(e) => setAudioBase64(e.target.checked)}
              />
              {tr("Request base64 response", "返回 base64")}
            </label>
            <button type="submit" className="rounded-md bg-fuchsia-500 hover:bg-fuchsia-400 text-zinc-950 px-4 py-2 font-medium">
              Test POST /api/audio/speech
            </button>
          </form>
          {audioPreviewSrc && <audio controls src={audioPreviewSrc} className="w-full" />}
          {audioResult && (
            <pre className="bg-zinc-900 border border-zinc-800 rounded-md p-3 text-xs overflow-x-auto">
{`status: ${audioResult.status}\n${audioResult.rawText.slice(0, 4000)}`}
            </pre>
          )}
        </section>

        <section className="rounded-xl border border-zinc-800 p-5 space-y-4">
          <h2 className="text-xl font-medium">{tr("Audio to SRT", "音频转 SRT")}</h2>
          <form onSubmit={testAudioToSrt} className="space-y-3">
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => setSrtFile(e.target.files?.[0] ?? null)}
              className="w-full rounded-md bg-zinc-900 border border-zinc-700 px-3 py-2"
            />
            <input
              value={srtModel}
              onChange={(e) => setSrtModel(e.target.value)}
              className="w-full rounded-md bg-zinc-900 border border-zinc-700 px-3 py-2"
              placeholder={tr("STT model (default whisper-1)", "STT 模型（默认 whisper-1）")}
            />
            <button type="submit" className="rounded-md bg-violet-500 hover:bg-violet-400 text-zinc-950 px-4 py-2 font-medium">
              Test POST /api/audio/srt
            </button>
          </form>
          {srtResult && (
            <pre className="bg-zinc-900 border border-zinc-800 rounded-md p-3 text-xs overflow-x-auto whitespace-pre-wrap">
{`status: ${srtResult.status}\n${srtResult.rawText.slice(0, 8000)}`}
            </pre>
          )}
        </section>

        <section className="rounded-xl border border-zinc-800 p-5 space-y-4">
          <h2 className="text-xl font-medium">{tr("Video Create + Status + List", "视频创建 + 状态 + 列表")}</h2>

          <form onSubmit={createVideoTask} className="space-y-3">
            <input
              value={videoPrompt}
              onChange={(e) => setVideoPrompt(e.target.value)}
              className="w-full rounded-md bg-zinc-900 border border-zinc-700 px-3 py-2"
              placeholder={tr("Video prompt", "视频提示词")}
            />
            <input
              type="number"
              min={4}
              max={15}
              value={videoDuration}
              onChange={(e) => setVideoDuration(Number(e.target.value))}
              className="w-32 rounded-md bg-zinc-900 border border-zinc-700 px-3 py-2"
            />
            <button type="submit" className="rounded-md bg-amber-500 hover:bg-amber-400 text-zinc-950 px-4 py-2 font-medium">
              Test POST /api/video/tasks
            </button>
          </form>

          {videoCreateResult && (
            <pre className="bg-zinc-900 border border-zinc-800 rounded-md p-3 text-xs overflow-x-auto">
{`status: ${videoCreateResult.status}\n${pretty(videoCreateResult.body)}`}
            </pre>
          )}

          <form onSubmit={getVideoTaskStatus} className="space-y-3">
            <input
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              className="w-full rounded-md bg-zinc-900 border border-zinc-700 px-3 py-2"
              placeholder={tr("Task ID (cgt-...)", "任务 ID（cgt-...）")}
            />
            <button type="submit" className="rounded-md bg-lime-500 hover:bg-lime-400 text-zinc-950 px-4 py-2 font-medium">
              Test GET /api/video/tasks/:taskId
            </button>
          </form>

          {detectedVideoUrl && (
            <p className="text-sm text-zinc-300">
              {tr("Video URL:", "视频地址：")} <a className="text-sky-300 underline break-all" href={detectedVideoUrl} target="_blank" rel="noreferrer">{tr("open", "打开")}</a>
            </p>
          )}

          {videoStatusResult && (
            <pre className="bg-zinc-900 border border-zinc-800 rounded-md p-3 text-xs overflow-x-auto">
{`status: ${videoStatusResult.status}\n${pretty(videoStatusResult.body)}`}
            </pre>
          )}

          <form onSubmit={listVideoTasks} className="flex flex-wrap items-end gap-3">
            <label className="text-sm text-zinc-300">
              page_num
              <input
                type="number"
                min={1}
                max={500}
                value={pageNum}
                onChange={(e) => setPageNum(Number(e.target.value))}
                className="ml-2 w-24 rounded-md bg-zinc-900 border border-zinc-700 px-2 py-1"
              />
            </label>
            <label className="text-sm text-zinc-300">
              page_size
              <input
                type="number"
                min={1}
                max={500}
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="ml-2 w-24 rounded-md bg-zinc-900 border border-zinc-700 px-2 py-1"
              />
            </label>
            <label className="text-sm text-zinc-300">
              status
              <select
                value={listStatus}
                onChange={(e) => setListStatus(e.target.value)}
                className="ml-2 rounded-md bg-zinc-900 border border-zinc-700 px-2 py-1"
              >
                <option value="queued">queued</option>
                <option value="running">running</option>
                <option value="cancelled">cancelled</option>
                <option value="succeeded">succeeded</option>
                <option value="failed">failed</option>
              </select>
            </label>
            <button type="submit" className="rounded-md bg-cyan-500 hover:bg-cyan-400 text-zinc-950 px-4 py-2 font-medium">
              Test GET /api/video/tasks
            </button>
          </form>

          {videoListResult && (
            <pre className="bg-zinc-900 border border-zinc-800 rounded-md p-3 text-xs overflow-x-auto">
{`status: ${videoListResult.status}\n${pretty(videoListResult.body)}`}
            </pre>
          )}
        </section>

        <section className="rounded-xl border border-zinc-800 p-5 space-y-4">
          <h2 className="text-xl font-medium">{tr("Video Understand", "视频理解")}</h2>

          <form onSubmit={uploadVideoFileForUnderstanding} className="space-y-3">
            <p className="text-sm text-zinc-300">{tr("1) Optional: Upload local video file to get a reusable file_id.", "1）可选：上传本地视频获取可复用的 file_id。")}</p>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setUnderstandVideoFile(e.target.files?.[0] ?? null)}
              className="w-full rounded-md bg-zinc-900 border border-zinc-700 px-3 py-2"
            />
            <input
              value={understandPreprocessFps}
              onChange={(e) => setUnderstandPreprocessFps(e.target.value)}
              className="w-40 rounded-md bg-zinc-900 border border-zinc-700 px-3 py-2"
              placeholder={tr("preprocess_fps (e.g. 0.3)", "preprocess_fps（例如 0.3）")}
            />
            <button type="submit" className="rounded-md bg-indigo-500 hover:bg-indigo-400 text-zinc-950 px-4 py-2 font-medium">
              Test POST /api/video/files
            </button>
          </form>

          {videoUploadResult && (
            <pre className="bg-zinc-900 border border-zinc-800 rounded-md p-3 text-xs overflow-x-auto">
{`status: ${videoUploadResult.status}\n${pretty(videoUploadResult.body)}`}
            </pre>
          )}

          <form onSubmit={testVideoUnderstand} className="space-y-3">
            <p className="text-sm text-zinc-300">{tr("2) Run video understanding via Responses API.", "2）通过 Responses API 执行视频理解。")}</p>
            <label className="text-sm text-zinc-300">
              {tr("input type", "输入类型")}
              <select
                value={understandInputType}
                onChange={(e) => setUnderstandInputType(e.target.value as "file_id" | "video_url")}
                className="ml-2 rounded-md bg-zinc-900 border border-zinc-700 px-2 py-1"
              >
                <option value="file_id">file_id (recommended)</option>
                <option value="video_url">video_url / base64 data URL</option>
              </select>
            </label>

            {understandInputType === "file_id" ? (
              <input
                value={understandFileId}
                onChange={(e) => setUnderstandFileId(e.target.value)}
                className="w-full rounded-md bg-zinc-900 border border-zinc-700 px-3 py-2"
                placeholder="file-2026xxxx"
              />
            ) : (
              <>
                <input
                  value={understandVideoUrl}
                  onChange={(e) => setUnderstandVideoUrl(e.target.value)}
                  className="w-full rounded-md bg-zinc-900 border border-zinc-700 px-3 py-2"
                  placeholder={tr("https://...mp4 or data:video/mp4;base64,...", "https://...mp4 或 data:video/mp4;base64,...")}
                />
                <input
                  value={understandFps}
                  onChange={(e) => setUnderstandFps(e.target.value)}
                  className="w-40 rounded-md bg-zinc-900 border border-zinc-700 px-3 py-2"
                  placeholder={tr("fps (0.2~5)", "fps（0.2~5）")}
                />
              </>
            )}

            <textarea
              value={understandPrompt}
              onChange={(e) => setUnderstandPrompt(e.target.value)}
              className="w-full min-h-24 rounded-md bg-zinc-900 border border-zinc-700 px-3 py-2"
              placeholder={tr("Understanding prompt", "理解提示词")}
            />
            <button type="submit" className="rounded-md bg-rose-500 hover:bg-rose-400 text-zinc-950 px-4 py-2 font-medium">
              Test POST /api/video/understand
            </button>
          </form>

          {videoUnderstandResult && (
            <pre className="bg-zinc-900 border border-zinc-800 rounded-md p-3 text-xs overflow-x-auto">
{`status: ${videoUnderstandResult.status}\n${pretty(videoUnderstandResult.body)}`}
            </pre>
          )}
        </section>

        <section className="rounded-xl border border-zinc-800 p-5 space-y-4">
          <h2 className="text-xl font-medium">{tr("Image Generation", "图片生成")}</h2>
          <form onSubmit={testImageGeneration} className="space-y-3">
            <label className="text-sm text-zinc-300">
              {tr("mode", "模式")}
              <select
                value={imageMode}
                onChange={(e) => setImageMode(e.target.value as "text" | "image" | "multi")}
                className="ml-2 rounded-md bg-zinc-900 border border-zinc-700 px-2 py-1"
              >
                <option value="text">text-to-image</option>
                <option value="image">image-to-image</option>
                <option value="multi">multi-image blending</option>
              </select>
            </label>

            <textarea
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              className="w-full min-h-24 rounded-md bg-zinc-900 border border-zinc-700 px-3 py-2"
              placeholder={tr("Image generation prompt", "图片生成提示词")}
            />

            {imageMode === "image" && (
              <input
                value={imageInputUrl}
                onChange={(e) => setImageInputUrl(e.target.value)}
                className="w-full rounded-md bg-zinc-900 border border-zinc-700 px-3 py-2"
                placeholder={tr("Input image URL or data:image/...;base64,...", "输入图片 URL 或 data:image/...;base64,...")}
              />
            )}

            {imageMode === "multi" && (
              <textarea
                value={imageInputUrlsText}
                onChange={(e) => setImageInputUrlsText(e.target.value)}
                className="w-full min-h-24 rounded-md bg-zinc-900 border border-zinc-700 px-3 py-2"
                placeholder={tr("Enter 2+ image URLs/Base64, separated by comma or newline", "输入 2 个以上图片 URL/Base64，用逗号或换行分隔")}
              />
            )}

            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm text-zinc-300">
                {tr("size", "尺寸")}
                <input
                  value={imageSize}
                  onChange={(e) => setImageSize(e.target.value)}
                  className="ml-2 w-24 rounded-md bg-zinc-900 border border-zinc-700 px-2 py-1"
                />
              </label>
              <label className="text-sm text-zinc-300">
                {tr("output_format", "输出格式")}
                <input
                  value={imageOutputFormat}
                  onChange={(e) => setImageOutputFormat(e.target.value)}
                  className="ml-2 w-24 rounded-md bg-zinc-900 border border-zinc-700 px-2 py-1"
                />
              </label>
              <label className="text-sm text-zinc-300">
                {tr("response_format", "返回格式")}
                <input
                  value={imageResponseFormat}
                  onChange={(e) => setImageResponseFormat(e.target.value)}
                  className="ml-2 w-24 rounded-md bg-zinc-900 border border-zinc-700 px-2 py-1"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={imageWatermark}
                  onChange={(e) => setImageWatermark(e.target.checked)}
                />
                {tr("watermark", "水印")}
              </label>
            </div>

            <button type="submit" className="rounded-md bg-orange-500 hover:bg-orange-400 text-zinc-950 px-4 py-2 font-medium">
              Test POST /api/images/generations
            </button>
          </form>

          {imageGenerationResult && (
            <>
              {(() => {
                const body = imageGenerationResult.body as {
                  data?: Array<{ url?: string; b64_json?: string; mime_type?: string }>;
                } | undefined;
                const previews = (body?.data ?? [])
                  .map((item) => {
                    if (typeof item.url === "string" && item.url.trim()) return item.url.trim();
                    if (typeof item.b64_json === "string" && item.b64_json.trim()) {
                      const mime = typeof item.mime_type === "string" && item.mime_type.trim() ? item.mime_type : "image/png";
                      return `data:${mime};base64,${item.b64_json.trim()}`;
                    }
                    return "";
                  })
                  .filter(Boolean);

                if (previews.length === 0) return null;
                return (
                  <div className="rounded-md border border-zinc-800 bg-zinc-900 p-3">
                    <p className="text-xs text-zinc-400 mb-2">{tr("Preview", "预览")}</p>
                    <div className="flex flex-wrap gap-3">
                      {previews.map((src, idx) => (
                        <Image
                          key={`${idx}-${src.slice(0, 24)}`}
                          src={src}
                          alt={`generated image ${idx + 1}`}
                          width={120}
                          height={120}
                          unoptimized
                          className="h-[120px] w-[120px] rounded-md border border-zinc-700 bg-zinc-800 object-cover"
                        />
                      ))}
                    </div>
                  </div>
                );
              })()}
              <pre className="bg-zinc-900 border border-zinc-800 rounded-md p-3 text-xs overflow-x-auto">
{`status: ${imageGenerationResult.status}\n${pretty(imageGenerationResult.body)}`}
              </pre>
            </>
          )}
        </section>

        <section className="rounded-xl border border-zinc-800 p-5 space-y-4">
          <h2 className="text-xl font-medium">{tr("Small Logo (OpenAI)", "小尺寸 Logo（OpenAI）")}</h2>
          <form onSubmit={testSmallLogoGeneration} className="space-y-3">
            <input
              value={logoProjectName}
              onChange={(e) => setLogoProjectName(e.target.value)}
              className="w-full rounded-md bg-zinc-900 border border-zinc-700 px-3 py-2"
              placeholder={tr("Project name", "项目名")}
            />
            <input
              value={logoTagline}
              onChange={(e) => setLogoTagline(e.target.value)}
              className="w-full rounded-md bg-zinc-900 border border-zinc-700 px-3 py-2"
              placeholder={tr("Tagline (optional)", "标语（可选）")}
            />
            <input
              value={logoAudience}
              onChange={(e) => setLogoAudience(e.target.value)}
              className="w-full rounded-md bg-zinc-900 border border-zinc-700 px-3 py-2"
              placeholder={tr("Target audience (optional)", "目标用户（可选）")}
            />
            <p className="text-xs text-zinc-400">
              {tr("Fixed payload: model=gpt-image-2, size=1024x1024, quality=low, output_format=webp", "固定参数：model=gpt-image-2, size=1024x1024, quality=low, output_format=webp")}
            </p>
            <button type="submit" className="rounded-md bg-violet-500 hover:bg-violet-400 text-zinc-950 px-4 py-2 font-medium">
              {tr("Test small logo API", "测试小尺寸 Logo API")}
            </button>
          </form>

          {smallLogoResult && (
            <>
              {(() => {
                const body = smallLogoResult.body as { data?: Array<{ url?: string }> } | undefined;
                const previewUrl = body?.data?.[0]?.url ?? "";
                if (!previewUrl) return null;
                return (
                  <div className="rounded-md border border-zinc-800 bg-zinc-900 p-3">
                    <p className="text-xs text-zinc-400 mb-2">{tr("Preview", "预览")}</p>
                    <Image
                      src={previewUrl}
                      alt="small logo preview"
                      width={64}
                      height={64}
                      unoptimized
                      className="h-16 w-16 rounded-md border border-zinc-700 bg-zinc-800 object-contain"
                    />
                  </div>
                );
              })()}
              <pre className="bg-zinc-900 border border-zinc-800 rounded-md p-3 text-xs overflow-x-auto">
{`status: ${smallLogoResult.status}\n${pretty(smallLogoResult.body)}`}
              </pre>
            </>
          )}
        </section>

        <section className="rounded-xl border border-zinc-800 p-5 space-y-4">
          <h2 className="text-xl font-medium">{tr("FFmpeg Understand", "FFmpeg 视频理解")}</h2>
          <form onSubmit={testFfmpegUnderstand} className="space-y-3">
            <label className="text-sm text-zinc-300">
              {tr("input type", "输入类型")}
              <select
                value={ffmpegInputType}
                onChange={(e) => setFfmpegInputType(e.target.value as "video_url" | "file")}
                className="ml-2 rounded-md bg-zinc-900 border border-zinc-700 px-2 py-1"
              >
                <option value="video_url">{tr("video_url", "视频 URL")}</option>
                <option value="file">{tr("file upload", "文件上传")}</option>
              </select>
            </label>

            {ffmpegInputType === "video_url" ? (
              <input
                value={ffmpegVideoUrl}
                onChange={(e) => setFfmpegVideoUrl(e.target.value)}
                className="w-full rounded-md bg-zinc-900 border border-zinc-700 px-3 py-2"
                placeholder={tr("https://...mp4", "https://...mp4")}
              />
            ) : (
              <input
                type="file"
                accept="video/*"
                onChange={(e) => setFfmpegFile(e.target.files?.[0] ?? null)}
                className="w-full rounded-md bg-zinc-900 border border-zinc-700 px-3 py-2"
              />
            )}

            <textarea
              value={ffmpegPrompt}
              onChange={(e) => setFfmpegPrompt(e.target.value)}
              className="w-full min-h-24 rounded-md bg-zinc-900 border border-zinc-700 px-3 py-2"
              placeholder={tr("Describe key actions and risks per second", "按秒描述关键动作与风险")}
            />

            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm text-zinc-300">
                {tr("fps", "fps")}
                <input
                  value={ffmpegFps}
                  onChange={(e) => setFfmpegFps(e.target.value)}
                  className="ml-2 w-20 rounded-md bg-zinc-900 border border-zinc-700 px-2 py-1"
                />
              </label>
              <label className="text-sm text-zinc-300">
                {tr("batch_size", "批大小")}
                <input
                  value={ffmpegBatchSize}
                  onChange={(e) => setFfmpegBatchSize(e.target.value)}
                  className="ml-2 w-20 rounded-md bg-zinc-900 border border-zinc-700 px-2 py-1"
                />
              </label>
              <label className="text-sm text-zinc-300">
                {tr("model", "模型")}
                <input
                  value={ffmpegModel}
                  onChange={(e) => setFfmpegModel(e.target.value)}
                  className="ml-2 w-44 rounded-md bg-zinc-900 border border-zinc-700 px-2 py-1"
                />
              </label>
              <label className="text-sm text-zinc-300">
                {tr("max_tokens", "最大 tokens")}
                <input
                  value={ffmpegMaxTokens}
                  onChange={(e) => setFfmpegMaxTokens(e.target.value)}
                  className="ml-2 w-24 rounded-md bg-zinc-900 border border-zinc-700 px-2 py-1"
                />
              </label>
            </div>

            <button type="submit" className="rounded-md bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-4 py-2 font-medium">
              Test POST /api/ffmpeg_understand
            </button>
          </form>

          {ffmpegUnderstandResult && (
            <pre className="bg-zinc-900 border border-zinc-800 rounded-md p-3 text-xs overflow-x-auto">
{`status: ${ffmpegUnderstandResult.status}\n${pretty(ffmpegUnderstandResult.body)}`}
            </pre>
          )}
        </section>
      </div>
    </main>
  );
}
