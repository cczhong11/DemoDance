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

  const [videoPrompt, setVideoPrompt] = useState("meta engineer write code");
  const [videoDuration, setVideoDuration] = useState(5);
  const [videoCreateResult, setVideoCreateResult] = useState<ApiResult | null>(null);

  const [taskId, setTaskId] = useState("");
  const [videoStatusResult, setVideoStatusResult] = useState<ApiResult | null>(null);

  const [pageNum, setPageNum] = useState(1);
  const [pageSize, setPageSize] = useState(3);
  const [listStatus, setListStatus] = useState("succeeded");
  const [videoListResult, setVideoListResult] = useState<ApiResult | null>(null);

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
      </div>
    </main>
  );
}
