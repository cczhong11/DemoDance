"use client";

import { FormEvent, useMemo, useState } from "react";

type ApiResult = {
  status: number;
  body: unknown;
  rawText: string;
};

async function callJsonApi(method: string, url: string, body?: unknown): Promise<ApiResult> {
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
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

    const response = await fetch("/api/audio/srt", {
      method: "POST",
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

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-6 py-10">
      <div className="mx-auto max-w-5xl space-y-10">
        <header className="space-y-2">
          <p className="text-zinc-400 text-sm">DemoDance Backend Tester</p>
          <h1 className="text-3xl font-semibold tracking-tight">API Test Page</h1>
          <p className="text-zinc-300">Use this page to verify all Next.js backend APIs without curl.</p>
        </header>

        <section className="rounded-xl border border-zinc-800 p-5 space-y-4">
          <h2 className="text-xl font-medium">Health</h2>
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
          <h2 className="text-xl font-medium">Text Chat</h2>
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
          <h2 className="text-xl font-medium">Audio Speech</h2>
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
              Request base64 response
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
          <h2 className="text-xl font-medium">Audio to SRT</h2>
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
              placeholder="STT model (default whisper-1)"
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
          <h2 className="text-xl font-medium">Video Create + Status + List</h2>

          <form onSubmit={createVideoTask} className="space-y-3">
            <input
              value={videoPrompt}
              onChange={(e) => setVideoPrompt(e.target.value)}
              className="w-full rounded-md bg-zinc-900 border border-zinc-700 px-3 py-2"
              placeholder="Video prompt"
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
              placeholder="Task ID (cgt-...)"
            />
            <button type="submit" className="rounded-md bg-lime-500 hover:bg-lime-400 text-zinc-950 px-4 py-2 font-medium">
              Test GET /api/video/tasks/:taskId
            </button>
          </form>

          {detectedVideoUrl && (
            <p className="text-sm text-zinc-300">
              Video URL: <a className="text-sky-300 underline break-all" href={detectedVideoUrl} target="_blank" rel="noreferrer">open</a>
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
          <h2 className="text-xl font-medium">Video Understand</h2>

          <form onSubmit={uploadVideoFileForUnderstanding} className="space-y-3">
            <p className="text-sm text-zinc-300">1) Optional: Upload local video file to get a reusable file_id.</p>
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
              placeholder="preprocess_fps (e.g. 0.3)"
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
            <p className="text-sm text-zinc-300">2) Run video understanding via Responses API.</p>
            <label className="text-sm text-zinc-300">
              input type
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
                  placeholder="https://...mp4 or data:video/mp4;base64,..."
                />
                <input
                  value={understandFps}
                  onChange={(e) => setUnderstandFps(e.target.value)}
                  className="w-40 rounded-md bg-zinc-900 border border-zinc-700 px-3 py-2"
                  placeholder="fps (0.2~5)"
                />
              </>
            )}

            <textarea
              value={understandPrompt}
              onChange={(e) => setUnderstandPrompt(e.target.value)}
              className="w-full min-h-24 rounded-md bg-zinc-900 border border-zinc-700 px-3 py-2"
              placeholder="Understanding prompt"
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
          <h2 className="text-xl font-medium">Image Generation</h2>
          <form onSubmit={testImageGeneration} className="space-y-3">
            <label className="text-sm text-zinc-300">
              mode
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
              placeholder="Image generation prompt"
            />

            {imageMode === "image" && (
              <input
                value={imageInputUrl}
                onChange={(e) => setImageInputUrl(e.target.value)}
                className="w-full rounded-md bg-zinc-900 border border-zinc-700 px-3 py-2"
                placeholder="Input image URL or data:image/...;base64,..."
              />
            )}

            {imageMode === "multi" && (
              <textarea
                value={imageInputUrlsText}
                onChange={(e) => setImageInputUrlsText(e.target.value)}
                className="w-full min-h-24 rounded-md bg-zinc-900 border border-zinc-700 px-3 py-2"
                placeholder="Enter 2+ image URLs/Base64, separated by comma or newline"
              />
            )}

            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm text-zinc-300">
                size
                <input
                  value={imageSize}
                  onChange={(e) => setImageSize(e.target.value)}
                  className="ml-2 w-24 rounded-md bg-zinc-900 border border-zinc-700 px-2 py-1"
                />
              </label>
              <label className="text-sm text-zinc-300">
                output_format
                <input
                  value={imageOutputFormat}
                  onChange={(e) => setImageOutputFormat(e.target.value)}
                  className="ml-2 w-24 rounded-md bg-zinc-900 border border-zinc-700 px-2 py-1"
                />
              </label>
              <label className="text-sm text-zinc-300">
                response_format
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
                watermark
              </label>
            </div>

            <button type="submit" className="rounded-md bg-orange-500 hover:bg-orange-400 text-zinc-950 px-4 py-2 font-medium">
              Test POST /api/images/generations
            </button>
          </form>

          {imageGenerationResult && (
            <pre className="bg-zinc-900 border border-zinc-800 rounded-md p-3 text-xs overflow-x-auto">
{`status: ${imageGenerationResult.status}\n${pretty(imageGenerationResult.body)}`}
            </pre>
          )}
        </section>
      </div>
    </main>
  );
}
