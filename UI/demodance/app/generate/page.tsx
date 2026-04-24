"use client";

import { useMemo, useState } from "react";

import { AppShell } from "../_components/app-shell";
import { AssistantPanel } from "../_components/assistant-panel";
import { LanguageToggle } from "../_components/language-toggle";
import { TopStepper } from "../_components/top-stepper";
import { useLocale } from "../locale-provider";
import { useWorkflowStore } from "../_state/workflow-store";
import type { StepId } from "../home/types";
import { buildSectionTaskContent, createVideoTask, loadVideoTaskStatus, summarizeStep } from "./_lib/generate-ai";
import { buildExportFileName, combineVideoUrls } from "./_lib/video-export";

function statusClass(status: "idle" | "generating" | "done"): "waiting" | "generating" | "done" {
  if (status === "done") return "done";
  if (status === "generating") return "generating";
  return "waiting";
}

export default function GeneratePage() {
  const { tr } = useLocale();
  const { projectName, steps, getStepScript, renderSections, setRenderSections } = useWorkflowStore();
  const [renderingAll, setRenderingAll] = useState(false);
  const [combining, setCombining] = useState(false);
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [exportName, setExportName] = useState<string | null>(null);
  const [assistantNotes, setAssistantNotes] = useState<string[]>([
    tr("Great job! You're now working with storyboard patches for each chapter.", "做得很好！你现在在为每个章节生成分镜批次。"),
    tr(
      "Let's keep pacing flowing naturally across all chapters and visual style consistent.",
      "让我们确保每个章节的节奏衔接自然，并保持整体视觉风格一致。",
    ),
  ]);

  const allDone = useMemo(() => renderSections.every((s) => s.status === "done"), [renderSections]);
  const readyCount = useMemo(() => renderSections.filter((s) => s.status === "done").length, [renderSections]);
  const totalDuration = useMemo(() => renderSections.reduce((sum, section) => sum + section.durationSec, 0), [renderSections]);
  const readiness = useMemo(() => Math.round((readyCount / renderSections.length) * 100), [readyCount, renderSections.length]);

  async function generateSection(sectionId: StepId) {
    const sectionSummary = summarizeStep(steps, getStepScript, sectionId);
    setRenderSections((prev) =>
      prev.map((item) =>
        item.id === sectionId
          ? { ...item, status: "generating", summary: sectionSummary, apiState: "queued" }
          : item,
      ),
    );

    try {
      const { content } = await buildSectionTaskContent(steps, getStepScript, projectName, sectionId);
      const taskId = await createVideoTask(content);

      setRenderSections((prev) => prev.map((item) => (item.id === sectionId ? { ...item, taskId } : item)));

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
      await generateSection(section.id);
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
                  <button type="button" className="dd-btn-secondary h-11 px-4" onClick={startGenerateAll} disabled={renderingAll}>
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
                    <div className="dd-storyboard-preview mt-2" />
                    <div className="mt-2 text-sm text-[var(--dd-text-secondary)]">4 frames / 4 张分镜</div>
                    <div className="mt-1 text-sm text-[var(--dd-text-muted)]">0:{String(section.durationSec).padStart(2, "0")}</div>
                    <div className={`dd-status-pill ${statusClass(section.status)} mt-2`}>
                      {section.status === "done"
                        ? "Done"
                        : section.status === "generating"
                          ? `Generating... ${Math.round(section.progress ?? 0)}%`
                          : "Waiting"}
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
                <button type="button" className="dd-btn-primary h-11 px-6" onClick={startGenerateAll} disabled={renderingAll}>
                  Generate Video from Storyboards
                </button>
              </div>

              <table className="dd-table mt-3">
                <thead>
                  <tr>
                    <th>Chapter / 章节</th>
                    <th>Source Storyboard / 分镜源</th>
                    <th>Video Generation / 视频生成</th>
                    <th>Progress / 进度</th>
                    <th>Est. Duration / 预计时长</th>
                    <th>Actions / 操作</th>
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
                        <span className={`dd-status-pill ${statusClass(section.status)}`}>
                          {section.status === "done" ? "Done" : section.status === "generating" ? "Generating..." : "Waiting"}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="dd-progress-track w-28">
                            <div className="dd-progress-fill" style={{ width: `${Math.round(section.progress ?? (section.status === "done" ? 100 : 0))}%` }} />
                          </div>
                          <span className="text-xs text-[var(--dd-text-muted)]">
                            {Math.round(section.progress ?? (section.status === "done" ? 100 : 0))}%
                          </span>
                        </div>
                      </td>
                      <td>0:{String(section.durationSec).padStart(2, "0")}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button type="button" className="dd-icon-btn" onClick={() => void generateSection(section.id)} aria-label="Generate">
                            ▶
                          </button>
                          <button type="button" className="dd-icon-btn" onClick={() => void manualRefresh(section.id)} aria-label="Refresh">
                            ↺
                          </button>
                          {section.videoUrl ? (
                            <a href={section.videoUrl} target="_blank" rel="noreferrer" className="dd-icon-btn" aria-label="Preview">
                              ◉
                            </a>
                          ) : null}
                          {section.videoUrl ? (
                            <a
                              href={section.videoUrl}
                              download={`${(projectName || "DemoDance").trim().replace(/\s+/g, "_")}_${section.id}.mp4`}
                              className="dd-icon-btn"
                              aria-label="Download"
                            >
                              ↓
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
                    <div className="text-sm text-[var(--dd-text-muted)]">Total Duration / 总时长</div>
                    <div className="text-[32px] font-semibold mt-2">
                      {Math.floor(totalDuration / 60)
                        .toString()
                        .padStart(2, "0")}
                      :{String(totalDuration % 60).padStart(2, "0")}
                    </div>
                  </div>
                  <div className="dd-export-stat">
                    <div className="text-sm text-[var(--dd-text-muted)]">Chapters Completed / 已完成章节</div>
                    <div className="text-[32px] font-semibold mt-2">
                      {readyCount} / {renderSections.length}
                    </div>
                  </div>
                  <div className="dd-export-stat">
                    <div className="text-sm text-[var(--dd-text-muted)]">Export Readiness / 导出就绪度</div>
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
                    <span className="block text-[17px] mt-1 opacity-90">Export final MP4 / 导出最终 MP4</span>
                  </span>
                  <span className="text-4xl">→</span>
                </button>
              </div>
              {exportUrl && exportName ? (
                <a href={exportUrl} download={exportName} className="dd-btn-secondary h-10 px-4 mt-3 inline-flex">
                  Download {exportName}
                </a>
              ) : null}
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
              <div className="text-sm mt-1">当前阶段：生成与导出</div>
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
