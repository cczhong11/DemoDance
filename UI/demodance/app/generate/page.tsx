"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { AppShell } from "../_components/app-shell";
import { useLocale } from "../locale-provider";
import { useWorkflowStore } from "../_state/workflow-store";

function toStrictArrayBuffer(data: unknown): ArrayBuffer {
  const bytes = data instanceof Uint8Array ? Uint8Array.from(data) : new TextEncoder().encode(String(data));
  const arrayBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(arrayBuffer).set(bytes);
  return arrayBuffer;
}

export default function GeneratePage() {
  const { tr, locale, setLocale } = useLocale();
  const { projectName, steps, renderSections, setRenderSections } = useWorkflowStore();
  const [renderingAll, setRenderingAll] = useState(false);
  const [combining, setCombining] = useState(false);
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [exportName, setExportName] = useState<string | null>(null);

  const allDone = useMemo(() => renderSections.every((s) => s.status === "done"), [renderSections]);

  function summarizeStep(stepId: string): string {
    const step = steps.find((s) => s.id === stepId);
    if (!step) return "";
    return step.fields
      .map((field) => `${field.label}: ${field.value}`)
      .filter((line) => !line.endsWith(": "))
      .join("\n");
  }

  function buildPrompt(sectionId: string): string {
    const summary = summarizeStep(sectionId);
    return [
      "Create a short launch-video section.",
      `Section: ${sectionId}`,
      "Use this context:",
      summary,
      "Cinematic, crisp, professional product launch style.",
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  async function generateSection(sectionId: string) {
    setRenderSections((prev) =>
      prev.map((item) =>
        item.id === sectionId
          ? { ...item, status: "generating", summary: summarizeStep(sectionId), apiState: "queued" }
          : item,
      ),
    );

    try {
      const response = await fetch("/api/video/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: buildPrompt(sectionId) }),
      });

      if (!response.ok) {
        const raw = await response.text();
        throw new Error(raw || "Failed to create video task");
      }

      const created = await response.json();
      const taskId = created.data?.task_id || created.task_id || created.data?.id || created.id;
      if (!taskId) {
        throw new Error("No task_id returned");
      }

      setRenderSections((prev) => prev.map((item) => (item.id === sectionId ? { ...item, taskId } : item)));

      while (true) {
        await new Promise((resolve) => setTimeout(resolve, 3000));

        const statusRes = await fetch(`/api/video/tasks/${taskId}`);
        const statusData = await statusRes.json();

        const state = statusData.data?.status || statusData.data?.state || statusData.status || statusData.state;
        const rawProgress = statusData.data?.progress ?? statusData.progress;
        const progress = typeof rawProgress === "number" ? rawProgress : Number.parseFloat(String(rawProgress));
        const videoUrl =
          statusData.data?.content?.video_url ||
          statusData.content?.video_url ||
          statusData.data?.video_url ||
          statusData.video_url;

        setRenderSections((prev) =>
          prev.map((item) =>
            item.id === sectionId
              ? {
                  ...item,
                  apiState: state,
                  progress: Number.isFinite(progress) ? progress : item.progress,
                  videoUrl: typeof videoUrl === "string" ? videoUrl : item.videoUrl,
                  rawResponse: statusData,
                }
              : item,
          ),
        );

        if (state === "succeeded") {
          setRenderSections((prev) =>
            prev.map((item) =>
              item.id === sectionId
                ? { ...item, status: "done", version: item.version + 1, apiState: "succeeded" }
                : item,
            ),
          );
          break;
        }

        if (state === "failed" || state === "cancelled") {
          throw new Error(`Task ${state}`);
        }
      }
    } catch (e) {
      const details = e instanceof Error ? e.message : String(e);
      setRenderSections((prev) =>
        prev.map((item) => (item.id === sectionId ? { ...item, status: "idle", apiState: `error: ${details}` } : item)),
      );
    }
  }

  async function startGenerateAll() {
    if (renderingAll) return;
    setRenderingAll(true);

    for (const section of renderSections) {
      await generateSection(section.id);
    }

    setRenderingAll(false);
  }

  async function manualRefresh(sectionId: string) {
    const section = renderSections.find((item) => item.id === sectionId);
    if (!section?.taskId) return;

    const res = await fetch(`/api/video/tasks/${section.taskId}`);
    const statusData = await res.json();
    const state = statusData.data?.status || statusData.data?.state || statusData.status || statusData.state;
    const rawProgress = statusData.data?.progress ?? statusData.progress;
    const progress = typeof rawProgress === "number" ? rawProgress : Number.parseFloat(String(rawProgress));
    const videoUrl =
      statusData.data?.content?.video_url ||
      statusData.content?.video_url ||
      statusData.data?.video_url ||
      statusData.video_url;

    setRenderSections((prev) =>
      prev.map((item) =>
        item.id === sectionId
          ? {
              ...item,
              apiState: state,
              progress: Number.isFinite(progress) ? progress : item.progress,
              videoUrl: typeof videoUrl === "string" ? videoUrl : item.videoUrl,
              status: state === "succeeded" ? "done" : item.status,
              version: state === "succeeded" ? item.version + 1 : item.version,
            }
          : item,
      ),
    );
  }

  async function combineAndExport() {
    if (combining) return;
    setCombining(true);

    try {
      const ready = renderSections.filter((item) => item.status === "done" && item.videoUrl);
      if (ready.length === 0) {
        throw new Error("No completed sections");
      }

      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const { fetchFile, toBlobURL } = await import("@ffmpeg/util");
      const ffmpeg = new FFmpeg();
      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });

      let concatList = "";
      for (let i = 0; i < ready.length; i += 1) {
        const inputName = `input${i}.mp4`;
        const proxyUrl = `/api/video/proxy?url=${encodeURIComponent(ready[i].videoUrl!)}`;
        await ffmpeg.writeFile(inputName, await fetchFile(proxyUrl));
        concatList += `file '${inputName}'\n`;
      }

      await ffmpeg.writeFile("concat.txt", concatList);
      await ffmpeg.exec(["-f", "concat", "-safe", "0", "-i", "concat.txt", "-c", "copy", "output.mp4"]);
      const data = await ffmpeg.readFile("output.mp4");
      const blob = new Blob([toStrictArrayBuffer(data)], { type: "video/mp4" });
      const url = URL.createObjectURL(blob);
      if (exportUrl) URL.revokeObjectURL(exportUrl);
      setExportUrl(url);
      const safeName = (projectName || "DemoDance").trim().replace(/\s+/g, "_");
      setExportName(`${safeName}_final.mp4`);
    } catch (e) {
      console.error(e);
      alert(tr("Failed to combine videos.", "视频拼接失败。"));
    } finally {
      setCombining(false);
    }
  }

  return (
    <AppShell>
      <main className="h-full pt-2">
        <section className="dd-card w-full max-w-5xl mx-auto p-4 md:p-5">
          <header className="dd-card-subtle px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-6">
                <Link href="/onboarding" className="flex items-center gap-2.5 opacity-75">
                  <span className="h-8 w-8 rounded-full grid place-items-center text-xs border border-[rgba(165,186,255,0.35)] text-[var(--dd-text-secondary)]">1</span>
                  <span className="leading-tight">
                    <span className="block text-sm text-[var(--dd-text-secondary)]">Onboarding</span>
                    <span className="block text-xs text-[var(--dd-text-muted)]">入口</span>
                  </span>
                </Link>
                <span className="h-px w-14 bg-[linear-gradient(90deg,rgba(124,92,255,0.2),rgba(165,186,255,0.35))]" />
                <Link href="/workflow" className="flex items-center gap-2.5 opacity-75">
                  <span className="h-8 w-8 rounded-full grid place-items-center text-xs border border-[rgba(165,186,255,0.35)] text-[var(--dd-text-secondary)]">2</span>
                  <span className="leading-tight">
                    <span className="block text-sm text-[var(--dd-text-secondary)]">Script & Collaborate</span>
                    <span className="block text-xs text-[var(--dd-text-muted)]">脚本与协作</span>
                  </span>
                </Link>
                <span className="h-px w-14 bg-[linear-gradient(90deg,rgba(124,92,255,0.2),rgba(165,186,255,0.35))]" />
                <div className="flex items-center gap-2.5">
                  <span className="h-8 w-8 rounded-full grid place-items-center text-xs border border-[rgba(124,92,255,0.72)] bg-[linear-gradient(180deg,rgba(136,107,255,0.44),rgba(74,57,162,0.65))] text-white shadow-[0_0_16px_rgba(115,89,255,0.5)]">3</span>
                  <span className="leading-tight">
                    <span className="block text-sm text-white">Generate & Export</span>
                    <span className="block text-xs text-[var(--dd-text-muted)]">生成与导出</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => setLocale("en")} className={`dd-btn-secondary h-8 px-3 text-xs ${locale === "en" ? "dd-pill-active text-white" : ""}`}>EN</button>
                <button onClick={() => setLocale("zh")} className={`dd-btn-secondary h-8 px-3 text-xs ${locale === "zh" ? "dd-pill-active text-white" : ""}`}>中文</button>
              </div>
            </div>
          </header>

          <section className="mt-3 dd-card-subtle p-5">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h1 className="text-[32px] font-semibold tracking-tight">Generate & Export</h1>
                <p className="text-sm text-[var(--dd-text-secondary)] mt-1">Generate each section and combine into final MP4.</p>
                <p className="text-xs text-[var(--dd-text-muted)] mt-1">分段生成视频，可重试、预览，最终合并导出。</p>
              </div>
              <button
                onClick={startGenerateAll}
                className={`dd-btn-primary h-10 px-4 text-sm ${renderingAll ? "opacity-60 cursor-not-allowed" : ""}`}
                disabled={renderingAll}
              >
                {renderingAll ? "Generating..." : "Start Generate All"}
              </button>
            </div>

            <div className="grid gap-3">
              {renderSections.map((section, idx) => (
                <div key={section.id} className="dd-card-subtle p-4 flex items-center gap-3">
                  <div className="h-7 w-7 rounded-full grid place-items-center text-xs dd-pill-active">{idx + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{section.title}</div>
                    <div className="text-xs text-[var(--dd-text-muted)] mt-0.5 truncate">
                      {(section.summary || summarizeStep(section.id)).slice(0, 120) || "No summary yet"}
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-lg border border-[rgba(165,186,255,0.28)] text-[var(--dd-text-secondary)]">
                    {section.status === "generating"
                      ? `${section.apiState || "generating"}${typeof section.progress === "number" ? ` ${section.progress}%` : ""}`
                      : section.status}
                  </span>
                  <button className="dd-btn-secondary h-9 px-3 text-xs" onClick={() => generateSection(section.id)}>
                    {section.status === "done" ? "Regenerate" : "Generate"}
                  </button>
                  <button className="dd-btn-secondary h-9 px-3 text-xs" onClick={() => manualRefresh(section.id)}>
                    Refresh
                  </button>
                  {section.videoUrl && (
                    <>
                      <a href={section.videoUrl} target="_blank" rel="noreferrer" className="dd-btn-secondary h-9 px-3 text-xs inline-flex items-center">
                        Preview
                      </a>
                      <a
                        href={section.videoUrl}
                        download={`${(projectName || "DemoDance").trim().replace(/\s+/g, "_")}_${section.id}.mp4`}
                        className="dd-btn-secondary h-9 px-3 text-xs inline-flex items-center"
                      >
                        Download
                      </a>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-[rgba(165,186,255,0.12)] flex justify-end items-center gap-3">
              <button
                onClick={combineAndExport}
                className={`dd-btn-primary h-11 px-6 text-sm ${!allDone || combining ? "opacity-60 cursor-not-allowed" : ""}`}
                disabled={!allDone || combining}
              >
                {combining ? "Combining..." : "Combine & Export"}
              </button>
              {exportUrl && exportName && (
                <a href={exportUrl} download={exportName} className="dd-btn-secondary h-10 px-4 text-sm inline-flex items-center">
                  Download {exportName}
                </a>
              )}
            </div>
          </section>
        </section>
      </main>
    </AppShell>
  );
}
