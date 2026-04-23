"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AppShell } from "../_components/app-shell";
import { useLocale } from "../locale-provider";
import { useWorkflowStore } from "../_state/workflow-store";

function extractJsonObject(raw: string): Record<string, unknown> | null {
  const fenced = raw.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? raw;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function readAssistantText(data: unknown): string {
  const body = data as { choices?: Array<{ message?: { content?: unknown } }> };
  const content = body.choices?.[0]?.message?.content;
  return typeof content === "string" ? content : "";
}

export default function OnboardingPage() {
  const router = useRouter();
  const { tr, locale, setLocale } = useLocale();
  const { submission, setSubmission, demoVideo, setDemoVideo, projectName, setProjectName, setActiveStepId, fillStepFields, setChat } = useWorkflowStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function prefillAndContinue() {
    if (loading) return;
    const input = submission.trim();
    if (input.length < 20) {
      setError(tr("Please provide at least 20 characters.", "请至少输入 20 个字符。"));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const prompt = [
        "You are DemoDance parser.",
        "Return only JSON object with fields:",
        "audience_user, audience_problem, importance_evidence, product_name, product_slogan, feature1, feature2, feature3, tech_stack, impact",
        "Submission:",
        input,
      ].join("\n\n");

      const response = await fetch("/api/text/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(String((data as { error?: unknown }).error ?? "parse failed"));
      }

      const text = readAssistantText(data);
      const parsed = extractJsonObject(text) ?? {};

      const asString = (value: unknown, fallback = "") =>
        typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;

      fillStepFields("audience", { user: asString(parsed.audience_user), problem: asString(parsed.audience_problem) });
      fillStepFields("importance", {
        evidence: asString(
          parsed.importance_evidence,
          tr("Demand is rising and teams need clearer launch storytelling.", "需求在增长，团队需要更清晰的发布叙事。"),
        ),
      });
      fillStepFields("product", {
        name: asString(parsed.product_name, projectName || "DemoDance"),
        slogan: asString(parsed.product_slogan, tr("From raw demo to launch-ready.", "从原始 demo 到可发布成片。")),
      });
      fillStepFields("features", {
        feature1: asString(parsed.feature1),
        feature2: asString(parsed.feature2),
        feature3: asString(parsed.feature3),
      });
      fillStepFields("tech", { stack: asString(parsed.tech_stack, "Next.js · OpenAI · FFmpeg") });
      fillStepFields("impact", {
        impact: asString(parsed.impact, tr("Help builders launch with confidence.", "帮助开发者更自信地发布。")),
      });

      setActiveStepId("importance");
      setChat((prev) => [
        ...prev,
        {
          role: "ai",
          tag: tr("Submission Parsed", "已解析提交内容"),
          text: tr("I prefilled steps 2-6. Review and refine in workflow.", "我已预填第 2-6 步，你可以在工作台继续细化。"),
        },
      ]);

      router.push("/workflow");
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      router.push("/workflow");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <main className="h-full flex items-start justify-center pt-2">
        <section className="dd-card w-full max-w-5xl p-4 md:p-5">
          <header className="dd-card-subtle px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2.5">
                  <span className="h-8 w-8 rounded-full grid place-items-center text-xs border border-[rgba(124,92,255,0.72)] bg-[linear-gradient(180deg,rgba(136,107,255,0.44),rgba(74,57,162,0.65))] text-white shadow-[0_0_16px_rgba(115,89,255,0.5)]">1</span>
                  <span className="leading-tight">
                    <span className="block text-sm text-white">Onboarding</span>
                    <span className="block text-xs text-[var(--dd-text-muted)]">入口</span>
                  </span>
                </div>
                <span className="h-px w-14 bg-[linear-gradient(90deg,rgba(124,92,255,0.2),rgba(165,186,255,0.35))]" />
                <span className="flex items-center gap-2.5 opacity-75">
                  <span className="h-8 w-8 rounded-full grid place-items-center text-xs border border-[rgba(165,186,255,0.35)] text-[var(--dd-text-secondary)]">2</span>
                  <span className="leading-tight">
                    <span className="block text-sm text-[var(--dd-text-secondary)]">Script & Collaborate</span>
                    <span className="block text-xs text-[var(--dd-text-muted)]">脚本与协作</span>
                  </span>
                </span>
                <span className="h-px w-14 bg-[linear-gradient(90deg,rgba(124,92,255,0.2),rgba(165,186,255,0.35))]" />
                <span className="flex items-center gap-2.5 opacity-75">
                  <span className="h-8 w-8 rounded-full grid place-items-center text-xs border border-[rgba(165,186,255,0.35)] text-[var(--dd-text-secondary)]">3</span>
                  <span className="leading-tight">
                    <span className="block text-sm text-[var(--dd-text-secondary)]">Generate & Export</span>
                    <span className="block text-xs text-[var(--dd-text-muted)]">生成与导出</span>
                  </span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => setLocale("en")} className={`dd-btn-secondary h-8 px-3 text-xs ${locale === "en" ? "dd-pill-active text-white" : ""}`}>EN</button>
                <button onClick={() => setLocale("zh")} className={`dd-btn-secondary h-8 px-3 text-xs ${locale === "zh" ? "dd-pill-active text-white" : ""}`}>中文</button>
              </div>
            </div>
          </header>

          <div className="mt-3 dd-card-subtle p-5">
            <div className="mb-5">
              <h1 className="text-[32px] font-semibold tracking-tight">Onboarding</h1>
              <p className="text-sm text-[var(--dd-text-secondary)] mt-1">Provide your Hackathon submission and optional demo video.</p>
              <p className="text-xs text-[var(--dd-text-muted)] mt-1">填写你的 Hackathon 提交内容（建议 20+ 字），并可选上传 demo 视频。</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="dd-card-subtle p-4">
                <div className="text-sm font-medium">Hackathon Submission</div>
                <div className="text-xs text-[var(--dd-text-muted)] mt-1">20+ words</div>
                <textarea
                  className="dd-textarea mt-3 w-full min-h-44 px-3 py-2"
                  placeholder="Describe your project, problem, and impact..."
                  value={submission}
                  onChange={(e) => setSubmission(e.target.value)}
                />
                <div className="text-xs text-[var(--dd-text-muted)] mt-2">{submission.length} / 2000</div>
              </div>

              <div className="dd-card-subtle p-4">
                <div className="text-sm font-medium">Original Demo Video (Optional)</div>
                <div className="text-xs text-[var(--dd-text-muted)] mt-1">MP4 / MOV / WEBM</div>
                <label className="mt-3 h-44 border border-dashed rounded-xl border-[rgba(165,186,255,0.22)] bg-[rgba(12,18,31,0.65)] grid place-items-center text-sm text-[var(--dd-text-muted)] cursor-pointer">
                  {demoVideo ? `${demoVideo.name} (${(demoVideo.size / 1024 / 1024).toFixed(1)} MB)` : "Drag & drop or click to upload"}
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setDemoVideo({ name: file.name, size: file.size, url: URL.createObjectURL(file) });
                    }}
                  />
                </label>

                <div className="mt-3">
                  <div className="text-xs text-[var(--dd-text-secondary)]">Project Name</div>
                  <input className="dd-input mt-1 w-full px-3" value={projectName} onChange={(e) => setProjectName(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <p className="text-xs text-[var(--dd-text-muted)]">AI will analyze your text and prefill script draft.</p>
              <div className="flex items-center gap-2">
                <Link href="/workflow" className="dd-btn-secondary h-10 px-4 text-sm inline-flex items-center">Skip</Link>
                <button onClick={prefillAndContinue} disabled={loading} className={`dd-btn-primary h-10 px-5 text-sm ${loading ? "opacity-60 cursor-not-allowed" : ""}`}>
                  {loading ? tr("Drafting...", "生成中...") : tr("Let AI draft", "让 AI 起草")}
                </button>
              </div>
            </div>
            {error && <div className="text-xs text-[var(--dd-danger)] mt-3">{error}</div>}
          </div>
        </section>
      </main>
    </AppShell>
  );
}
