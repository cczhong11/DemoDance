"use client";

import { useMemo, useState } from "react";

import { AppShell } from "../_components/app-shell";
import { AssistantPanel } from "../_components/assistant-panel";
import { LanguageToggle } from "../_components/language-toggle";
import { storeGeneratedImage } from "../_lib/generated-image-storage";
import { TopStepper } from "../_components/top-stepper";
import { useLocale } from "../locale-provider";
import { useWorkflowStore } from "../_state/workflow-store";
import type { StepId } from "../home/types";
import { buildSectionTaskContent, createVideoTask, generateStoryboardFrames, loadVideoTaskStatus, summarizeStep } from "./_lib/generate-ai";
import { buildExportFileName, combineVideoUrls } from "./_lib/video-export";

function statusClass(status: "idle" | "generating" | "done"): "waiting" | "generating" | "done" {
  if (status === "done") return "done";
  if (status === "generating") return "generating";
  return "waiting";
}

export default function GeneratePage() {
  const { tr, locale } = useLocale();
  const { projectName, steps, getStepScript, renderSections, setRenderSections } = useWorkflowStore();
  const [renderingAll, setRenderingAll] = useState(false);
  const [combining, setCombining] = useState(false);
  const [voiceoverGenerating, setVoiceoverGenerating] = useState(false);
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [exportName, setExportName] = useState<string | null>(null);
  const [voiceoverSrc, setVoiceoverSrc] = useState<string | null>(null);
  const [srtUrl, setSrtUrl] = useState<string | null>(null);
  const [assistantNotes, setAssistantNotes] = useState<string[]>([
    tr("Great job! You're now working with storyboard patches for each chapter.", "做得很好！你现在在为每个章节生成分镜批次。"),
    tr(
      "Let's keep pacing flowing naturally across all chapters and visual style consistent.",
      "让我们确保每个章节的节奏衔接自然，并保持整体视觉风格一致。",
    ),
  ]);

  const allDone = useMemo(() => renderSections.every((s) => s.videoUrl), [renderSections]);
  const readyCount = useMemo(() => renderSections.filter((s) => s.videoUrl).length, [renderSections]);
  const totalDuration = useMemo(() => renderSections.reduce((sum, section) => sum + section.durationSec, 0), [renderSections]);
  const readiness = useMemo(() => Math.round((readyCount / renderSections.length) * 100), [readyCount, renderSections.length]);
  const narrationText = useMemo(
    () =>
      renderSections
        .map((section) => {
          const script = getStepScript(section.id).trim();
          if (script) return script;
          const step = steps.find((item) => item.id === section.id);
          return step?.fields.map((field) => field.value).filter(Boolean).join(". ") ?? "";
        })
        .filter(Boolean)
        .join("\n\n"),
    [getStepScript, renderSections, steps],
  );

  function formatSrtTime(totalSeconds: number) {
    const safe = Math.max(0, totalSeconds);
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    const seconds = Math.floor(safe % 60);
    const millis = Math.round((safe - Math.floor(safe)) * 1000);
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")},${String(millis).padStart(3, "0")}`;
  }

  function buildSrtFromNarration() {
    let cursor = 0;
    const blocks = renderSections.flatMap((section, index) => {
      const text = getStepScript(section.id).trim();
      if (!text) {
        cursor += section.durationSec;
        return [];
      }
      const start = cursor;
      const end = cursor + section.durationSec;
      cursor = end;
      return [`${index + 1}\n${formatSrtTime(start)} --> ${formatSrtTime(end)}\n${text.replace(/\s+/g, " ").trim()}`];
    });
    return `${blocks.join("\n\n")}\n`;
  }

  function base64ToObjectUrl(base64: string, mimeType: string) {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return URL.createObjectURL(new Blob([bytes], { type: mimeType }));
  }

  async function copyPrompt(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setAssistantNotes((prev) => [...prev, locale === "zh" ? `• 已复制 ${label} prompt。` : `• Copied ${label} prompt.`]);
    } catch (error) {
      setAssistantNotes((prev) => [
        ...prev,
        `${locale === "zh" ? "• Prompt 复制失败：" : "• Prompt copy failed: "}${error instanceof Error ? error.message : String(error)}`,
      ]);
    }
  }

  async function copyVideoPrompt(sectionId: StepId) {
    const section = renderSections.find((item) => item.id === sectionId);
    if (!section) return;

    if (section.prompt) {
      await copyPrompt(section.prompt, section.title);
      return;
    }

    try {
      const storyboardFrames = section.storyboardFrames ?? [];
      const { prompt } = await buildSectionTaskContent(steps, getStepScript, projectName, sectionId, locale, storyboardFrames);
      setRenderSections((prev) => prev.map((item) => (item.id === sectionId ? { ...item, prompt } : item)));
      await copyPrompt(prompt, section.title);
    } catch (error) {
      setAssistantNotes((prev) => [
        ...prev,
        `${locale === "zh" ? "• 生成视频 prompt 失败：" : "• Failed to build video prompt: "}${error instanceof Error ? error.message : String(error)}`,
      ]);
    }
  }

  async function generateStoryboardSection(sectionId: StepId) {
    const sectionSummary = summarizeStep(steps, getStepScript, sectionId);
    setRenderSections((prev) =>
      prev.map((item) =>
        item.id === sectionId
          ? { ...item, status: "generating", summary: sectionSummary, apiState: "queued" }
          : item,
      ),
    );

    try {
      const { frames, prompt } = await generateStoryboardFrames(steps, getStepScript, projectName, sectionId, locale);
      const storedFrames = await Promise.all(
        frames.map((frame, index) =>
          storeGeneratedImage(
            frame,
            `${(projectName || "demodance").trim().replace(/[^a-zA-Z0-9_-]+/g, "-") || "demodance"}-${sectionId}-storyboard-${index + 1}.webp`,
          ),
        ),
      );
      setRenderSections((prev) =>
        prev.map((item) =>
          item.id === sectionId
            ? {
                ...item,
                status: "done",
                storyboardFrames: storedFrames.map((asset) => asset.url),
                storyboardAssets: storedFrames,
                storyboardPrompt: prompt,
                version: item.version + 1,
                apiState: "storyboard-ready",
                progress: 100,
              }
            : item,
        ),
      );
    } catch (e) {
      const details = e instanceof Error ? e.message : String(e);
      setRenderSections((prev) =>
        prev.map((item) =>
          item.id === sectionId
            ? { ...item, status: item.storyboardFrames?.length ? "done" : "idle", apiState: `error: ${details}` }
            : item,
        ),
      );
    }
  }

  function resetStoryboardSection(sectionId: StepId) {
    setRenderSections((prev) =>
      prev.map((item) =>
        item.id === sectionId
          ? {
              ...item,
              status: item.storyboardFrames?.length ? "done" : "idle",
              apiState: undefined,
              progress: undefined,
            }
          : item,
      ),
    );
  }

  async function generateVideoSection(sectionId: StepId) {
    const sectionSummary = summarizeStep(steps, getStepScript, sectionId);
    setRenderSections((prev) =>
      prev.map((item) =>
        item.id === sectionId
          ? { ...item, summary: sectionSummary, apiState: "video-queued", progress: 0 }
          : item,
      ),
    );

    try {
      const storyboardFrames = renderSections.find((item) => item.id === sectionId)?.storyboardFrames ?? [];
      const { content, prompt } = await buildSectionTaskContent(steps, getStepScript, projectName, sectionId, locale, storyboardFrames);
      const durationSec = renderSections.find((item) => item.id === sectionId)?.durationSec ?? 15;
      const taskId = await createVideoTask(content, durationSec);

      setRenderSections((prev) => prev.map((item) => (item.id === sectionId ? { ...item, taskId, prompt } : item)));

      while (true) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        const status = await loadVideoTaskStatus(taskId);

        setRenderSections((prev) =>
          prev.map((item) =>
            item.id === sectionId
              ? {
                  ...item,
                  apiState: status.state,
                  progress: status.progress ?? item.progress,
                  videoUrl: status.videoUrl ?? item.videoUrl,
                  rawResponse: status.raw,
                }
              : item,
          ),
        );

        if (status.state === "succeeded") {
          setRenderSections((prev) =>
            prev.map((item) =>
              item.id === sectionId
                ? { ...item, status: "done", version: item.version + 1, apiState: "succeeded", progress: 100 }
                : item,
            ),
          );
          break;
        }
        if (status.state === "failed" || status.state === "cancelled") throw new Error(`Task ${status.state}`);
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
      await generateStoryboardSection(section.id);
    }
    setRenderingAll(false);
  }

  async function regenerateAllStoryboards() {
    if (renderingAll) return;
    setRenderingAll(true);
    for (const section of renderSections) {
      setRenderSections((prev) =>
        prev.map((item) =>
          item.id === section.id
            ? { ...item, storyboardFrames: [], storyboardAssets: [], storyboardPrompt: undefined, progress: 0, status: "idle" }
            : item,
        ),
      );
      await generateStoryboardSection(section.id);
    }
    setRenderingAll(false);
  }

  async function startGenerateVideos() {
    if (renderingAll) return;
    setRenderingAll(true);
    for (const section of renderSections) {
      await generateVideoSection(section.id);
    }
    setRenderingAll(false);
  }

  async function manualRefresh(sectionId: string) {
    const section = renderSections.find((item) => item.id === sectionId);
    if (!section?.taskId) return;

    const status = await loadVideoTaskStatus(section.taskId);

    setRenderSections((prev) =>
      prev.map((item) =>
        item.id === sectionId
          ? {
              ...item,
              apiState: status.state,
              progress: status.progress ?? item.progress,
              videoUrl: status.videoUrl ?? item.videoUrl,
              status: status.state === "succeeded" ? "done" : item.status,
              version: status.state === "succeeded" ? item.version + 1 : item.version,
            }
          : item,
      ),
    );
  }

  async function combineAndExport() {
    if (combining) return;
    setCombining(true);

    try {
      const ready = renderSections.filter((item) => item.status === "done" && item.videoUrl).map((item) => item.videoUrl!);
      const url = await combineVideoUrls(ready);
      if (exportUrl) URL.revokeObjectURL(exportUrl);
      setExportUrl(url);
      setExportName(buildExportFileName(projectName));
    } catch {
      alert(tr("Failed to combine videos.", "视频拼接失败。"));
    } finally {
      setCombining(false);
    }
  }

  async function generateVoiceoverAssets() {
    if (voiceoverGenerating || !narrationText.trim()) return;
    setVoiceoverGenerating(true);

    try {
      const response = await fetch("/api/audio/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: narrationText,
          base64: true,
        }),
      });
      const data = (await response.json()) as { audio_base64?: string; mime_type?: string; error?: unknown };
      if (!response.ok || !data.audio_base64) {
        throw new Error(typeof data.error === "string" ? data.error : "Failed to generate voiceover");
      }

      if (voiceoverSrc) URL.revokeObjectURL(voiceoverSrc);
      const audioUrl = base64ToObjectUrl(data.audio_base64, data.mime_type ?? "audio/wav");
      setVoiceoverSrc(audioUrl);

      if (srtUrl) URL.revokeObjectURL(srtUrl);
      const nextSrtUrl = URL.createObjectURL(new Blob([buildSrtFromNarration()], { type: "text/plain;charset=utf-8" }));
      setSrtUrl(nextSrtUrl);
      setAssistantNotes((prev) => [
        ...prev,
        locale === "zh" ? "• 已生成旁白音频和本地 SRT 字幕。" : "• Voiceover audio and local SRT captions are ready.",
      ]);
    } catch (error) {
      setAssistantNotes((prev) => [
        ...prev,
        `${locale === "zh" ? "• 旁白生成失败：" : "• Voiceover failed: "}${error instanceof Error ? error.message : String(error)}`,
      ]);
    } finally {
      setVoiceoverGenerating(false);
    }
  }

  return (
    <AppShell>
      <main className="dd-page-grid">
        <section className="dd-center-pane">
          <header className="dd-main-header">
            <TopStepper activeStep={3} />
            <LanguageToggle />
          </header>

          <div className="p-4 md:p-5 overflow-y-auto h-[calc(100%-73px)] space-y-3">
            <section className="dd-panel p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="dd-tab-index">A</span>
                    <h2 className="text-[34px] font-semibold leading-tight">Storyboard Generation</h2>
                  </div>
                  <p className="dd-label-zh mt-1">分镜生成</p>
                  <p className="mt-2 text-[17px] text-[var(--dd-text-secondary)]">
                    Create a visual blueprint first. We generate storyboard frames for each chapter.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 justify-end">
                  <button type="button" className="dd-btn-primary h-11 px-5" onClick={startGenerateAll} disabled={renderingAll}>
                    {renderingAll ? "Generating..." : "Generate Storyboards"}
                  </button>
                  <button type="button" className="dd-btn-secondary h-11 px-4" onClick={regenerateAllStoryboards} disabled={renderingAll}>
                    Regenerate
                  </button>
                  <button type="button" className="dd-btn-secondary h-11 px-4">
                    Preview All
                  </button>
                  <button type="button" className="dd-btn-secondary h-11 px-4">
                    Edit Prompt
                  </button>
                </div>
              </div>

              <div className="dd-storyboard-grid mt-4">
                {renderSections.map((section, idx) => (
                  <article key={section.id} className="dd-storyboard-card">
                    <div className="flex items-center gap-2">
                      <span className="dd-tab-index">{idx + 1}</span>
                      <div className="min-w-0">
                        <div className="dd-label-en truncate">{section.title}</div>
                        <div className="dd-label-zh truncate">{steps.find((s) => s.id === section.id)?.title ?? ""}</div>
                      </div>
                    </div>
                    <div className="dd-storyboard-preview mt-2">
                      {section.storyboardFrames?.length === 1 ? (
                        <div className="dd-storyboard-preview-single">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={section.storyboardFrames[0]}
                            alt={`${section.title} storyboard board`}
                            className="dd-storyboard-preview-img"
                          />
                        </div>
                      ) : (
                        <div className="dd-storyboard-preview-grid">
                          {Array.from({ length: 4 }).map((_, frameIdx) => {
                            const frame = section.storyboardFrames?.[frameIdx];
                            return frame ? (
                              <div key={frame} className="dd-storyboard-preview-tile">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={frame}
                                  alt={`${section.title} storyboard frame ${frameIdx + 1}`}
                                  className="dd-storyboard-preview-img"
                                />
                              </div>
                            ) : (
                              <div key={frameIdx} className="dd-storyboard-preview-tile" />
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div className="mt-2 text-sm text-[var(--dd-text-secondary)]">
                      {section.storyboardFrames?.length === 1 ? "1 storyboard board " : "4 frames "}
                      <span className="zh-only">{section.storyboardFrames?.length === 1 ? "/ 1 张分镜板" : "/ 4 张分镜"}</span>
                    </div>
                    <div className="mt-1 text-sm text-[var(--dd-text-muted)]">0:{String(section.durationSec).padStart(2, "0")}</div>
                    <div className={`dd-status-pill ${statusClass(section.status)} mt-2`}>
                      {section.status === "done"
                        ? "Done"
                        : section.status === "generating"
                          ? `Generating... ${Math.round(section.progress ?? 0)}%`
                          : "Waiting"}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        className="dd-btn-secondary h-9 px-3 text-sm"
                        onClick={() => void generateStoryboardSection(section.id)}
                        disabled={section.status === "generating" || renderingAll}
                      >
                        {section.storyboardFrames?.length ? "Regenerate This Section" : "Generate This Section"}
                      </button>
                      {section.status === "generating" && (section.progress ?? 0) <= 0 ? (
                        <button
                          type="button"
                          className="dd-btn-secondary h-9 px-3 text-sm"
                          onClick={() => resetStoryboardSection(section.id)}
                          disabled={renderingAll}
                        >
                          Reset
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="dd-panel p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="dd-tab-index">B</span>
                    <h2 className="text-[34px] font-semibold leading-tight">Video Generation</h2>
                  </div>
                  <p className="dd-label-zh mt-1">视频生成</p>
                </div>
                <button type="button" className="dd-btn-primary h-11 px-6" onClick={startGenerateVideos} disabled={renderingAll}>
                  Generate Video from Storyboards
                </button>
              </div>

              <table className="dd-table mt-3">
                <thead>
                  <tr>
                    <th>Chapter <span className="zh-only">/ 章节</span></th>
                    <th>Source Storyboard <span className="zh-only">/ 分镜源</span></th>
                    <th>Video Generation <span className="zh-only">/ 视频生成</span></th>
                    <th>Progress <span className="zh-only">/ 进度</span></th>
                    <th>Est. Duration <span className="zh-only">/ 预计时长</span></th>
                    <th>Actions <span className="zh-only">/ 操作</span></th>
                  </tr>
                </thead>
                <tbody>
                  {renderSections.map((section, idx) => (
                    <tr key={section.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="dd-tab-index">{idx + 1}</span>
                          <div className="min-w-0">
                            <div className="dd-label-en truncate">{section.title}</div>
                            <div className="dd-label-zh truncate">{steps.find((s) => s.id === section.id)?.title ?? ""}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`dd-status-pill ${statusClass(section.status)}`}>
                          {section.status === "done" ? "Done" : section.status === "generating" ? "Generating..." : "Waiting"}
                        </span>
                      </td>
                      <td>
                        <span className={`dd-status-pill ${section.videoUrl ? "done" : (section.taskId || section.apiState === "video-queued") && !section.apiState?.startsWith("error") ? "generating" : "waiting"}`}>
                          {section.videoUrl ? "Done" : (section.taskId || section.apiState === "video-queued") && !section.apiState?.startsWith("error") ? "Generating..." : "Waiting"}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="dd-progress-track w-28">
                            <div className="dd-progress-fill" style={{ width: `${Math.round(section.progress ?? (section.videoUrl ? 100 : 0))}%` }} />
                          </div>
                          <span className="text-xs text-[var(--dd-text-muted)]">
                            {Math.round(section.progress ?? (section.videoUrl ? 100 : 0))}%
                          </span>
                        </div>
                      </td>
                      <td>0:{String(section.durationSec).padStart(2, "0")}</td>
                      <td>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button type="button" className="dd-icon-btn" onClick={() => void generateVideoSection(section.id)} aria-label="Generate">
                            <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
                          </button>
                          <button type="button" className="dd-icon-btn" onClick={() => void manualRefresh(section.id)} aria-label="Refresh">
                            <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]"><path fill="currentColor" d="M17.65 6.35A7.95 7.95 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4z"/></svg>
                          </button>
                          <button
                            type="button"
                            className="dd-icon-btn"
                            onClick={() => void copyVideoPrompt(section.id)}
                            aria-label="Copy prompt"
                            title="Copy prompt"
                          >
                            <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]"><path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v12h2V3h12zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2m0 16H8V7h11z"/></svg>
                          </button>
                          {section.videoUrl ? (
                            <a href={section.videoUrl} target="_blank" rel="noreferrer" className="dd-icon-btn" aria-label="Preview">
                              <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]"><path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5M12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5m0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3"/></svg>
                            </a>
                          ) : null}
                          {section.videoUrl ? (
                            <a
                              href={section.videoUrl}
                              download={`${(projectName || "DemoDance").trim().replace(/\s+/g, "_")}_${section.id}.mp4`}
                              className="dd-icon-btn"
                              aria-label="Download"
                            >
                              <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]"><path fill="currentColor" d="M19 9h-4V3H9v6H5l7 7zM5 18v2h14v-2z"/></svg>
                            </a>
                          ) : null}
                          {section.videoUrl ? (
                            <a
                              href={section.videoUrl}
                              download={`${(projectName || "DemoDance").trim().replace(/\s+/g, "_")}_${section.id}.mp4`}
                              className="dd-btn-secondary h-9 px-3 text-sm"
                            >
                              Download Clip
                            </a>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="dd-export-grid mt-4">
                <div className="dd-export-stats">
                  <div className="dd-export-stat">
                    <div className="text-sm text-[var(--dd-text-muted)]">Total Duration <span className="zh-only">/ 总时长</span></div>
                    <div className="text-[32px] font-semibold mt-2">
                      {Math.floor(totalDuration / 60)
                        .toString()
                        .padStart(2, "0")}
                      :{String(totalDuration % 60).padStart(2, "0")}
                    </div>
                  </div>
                  <div className="dd-export-stat">
                    <div className="text-sm text-[var(--dd-text-muted)]">Chapters Completed <span className="zh-only">/ 已完成章节</span></div>
                    <div className="text-[32px] font-semibold mt-2">
                      {readyCount} / {renderSections.length}
                    </div>
                  </div>
                  <div className="dd-export-stat">
                    <div className="text-sm text-[var(--dd-text-muted)]">Export Readiness <span className="zh-only">/ 导出就绪度</span></div>
                    <div className="text-[32px] font-semibold mt-2">{readiness}%</div>
                  </div>
                </div>

                <button
                  type="button"
                  className={`dd-export-cta ${!allDone || combining ? "opacity-60 cursor-not-allowed" : ""}`}
                  onClick={combineAndExport}
                  disabled={!allDone || combining}
                >
                  <span className="text-4xl">🎬</span>
                  <span>
                    <span className="block text-[28px] font-semibold leading-tight">Combine & Export</span>
                    <span className="block text-[17px] mt-1 opacity-90">Export final MP4 <span className="zh-only">/ 导出最终 MP4</span></span>
                  </span>
                  <span className="text-4xl">→</span>
                </button>
              </div>
              {exportUrl && exportName ? (
                <a href={exportUrl} download={exportName} className="dd-btn-secondary h-10 px-4 mt-3 inline-flex">
                  Download {exportName}
                </a>
              ) : null}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={`dd-btn-secondary h-10 px-4 ${voiceoverGenerating || !narrationText.trim() ? "opacity-60 cursor-not-allowed" : ""}`}
                  onClick={generateVoiceoverAssets}
                  disabled={voiceoverGenerating || !narrationText.trim()}
                >
                  {voiceoverGenerating ? "Generating Voiceover..." : "Generate Voiceover + SRT"}
                </button>
                {voiceoverSrc ? <audio controls src={voiceoverSrc} className="h-10" /> : null}
                {voiceoverSrc ? (
                  <a
                    href={voiceoverSrc}
                    download={`${(projectName || "DemoDance").trim().replace(/\s+/g, "_") || "DemoDance"}.wav`}
                    className="dd-btn-secondary h-10 px-4"
                  >
                    Download WAV
                  </a>
                ) : null}
                {srtUrl ? (
                  <a href={srtUrl} download={`${(projectName || "DemoDance").trim().replace(/\s+/g, "_")}.srt`} className="dd-btn-secondary h-10 px-4">
                    Download SRT
                  </a>
                ) : null}
              </div>
            </section>
          </div>
        </section>

        <AssistantPanel
          title="AI Producer"
          subtitle="AI 制作助手"
          rightSlot={
            <>
              <button type="button" className="dd-icon-btn" aria-label="Pin panel">
                ↗
              </button>
              <button type="button" className="dd-icon-btn" aria-label="Refresh panel">
                ↺
              </button>
            </>
          }
          contextSlot={
            <div className="dd-context-pill">
              <div className="text-[16px]">Context: Generate & Export</div>
              <div className="text-sm mt-1 zh-only">当前阶段：生成与导出</div>
            </div>
          }
          body={
            <div className="space-y-3">
              {assistantNotes.map((note, index) => (
                <div key={`${note}-${index}`} className={index % 2 === 0 ? "dd-chat-ai" : "dd-chat-user"}>
                  <div className="text-[17px] leading-7">{note}</div>
                </div>
              ))}
              <div className="dd-chat-ai">
                <div className="text-[17px] leading-7">
                  {tr(
                    "Use a consistent color palette, lighting, and camera language. I can also adjust pacing if needed.",
                    "建议保持统一的色彩、光线和镜头语言。如需我也可以帮你调整节奏。",
                  )}
                </div>
              </div>
            </div>
          }
          footer={
            <>
              <div className="dd-chip-row mb-3">
                {["More cinematic", "Keep visual consistency", "Add captions", "Shorter"].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    className="dd-chip"
                    onClick={() =>
                      setAssistantNotes((prev) => [...prev, `• ${chip} requested`])
                    }
                  >
                    {chip}
                  </button>
                ))}
              </div>
              <textarea className="dd-textarea min-h-24" placeholder="Ask anything about storyboards, pacing, or export..." />
              <div className="mt-2 text-sm text-[var(--dd-text-muted)]">Enter to send · Shift+Enter for new line</div>
            </>
          }
        />
      </main>
    </AppShell>
  );
}
