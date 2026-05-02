"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { AppShell } from "../_components/app-shell";
import { AssistantPanel } from "../_components/assistant-panel";
import { LanguageToggle } from "../_components/language-toggle";
import { extractFeatureKeyframes } from "../_lib/video-keyframes";
import { TopStepper } from "../_components/top-stepper";
import { useLocale } from "../locale-provider";
import { useWorkflowStore } from "../_state/workflow-store";
import { analyzeDemoVideo, parseSubmission, wordCount } from "./_lib/onboarding-ai";

export default function OnboardingPage() {
  const router = useRouter();
  const { tr, locale, setLocale } = useLocale();
  const {
    submission,
    setSubmission,
    demoVideo,
    setDemoVideo,
    setActiveStepId,
    fillStepFields,
    setFeatureFrames,
    setChat,
  } = useWorkflowStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoVideoFile, setDemoVideoFile] = useState<File | null>(null);

  const currentWordCount = useMemo(() => wordCount(submission), [submission]);

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
      const [parsed, videoAnalysis] = await Promise.all([
        parseSubmission(input),
        demoVideoFile ? analyzeDemoVideo(demoVideoFile).catch(() => null) : Promise.resolve(null),
      ]);
      const extractedFrames =
        demoVideoFile && videoAnalysis
          ? await extractFeatureKeyframes(demoVideoFile, videoAnalysis.segments).catch(() => [])
          : [];
      const videoFeatures = videoAnalysis?.features ?? [];
      const evidenceNote = videoAnalysis
        ? tr(
            `Raw demo analysis detected ${videoFeatures.length || videoAnalysis.segments.length} usable product moment(s).`,
            `原始 demo 分析识别到 ${videoFeatures.length || videoAnalysis.segments.length} 个可用产品片段。`,
          )
        : "";

      fillStepFields("audience", { user: parsed.audienceUser, problem: parsed.audienceProblem });
      fillStepFields("importance", {
        evidence:
          evidenceNote ||
          parsed.importanceEvidence ||
          tr("Demand is rising and teams need clearer launch storytelling.", "需求在增长，团队需要更清晰的发布叙事。"),
      });
      fillStepFields("product", {
        name: parsed.productName || "DemoDance",
        slogan: parsed.productSlogan || tr("From raw demo to launch-ready.", "从原始 demo 到可发布成片。"),
      });
      fillStepFields("features", {
        feature1: videoFeatures[0] || parsed.feature1,
        feature2: videoFeatures[1] || parsed.feature2,
        feature3: videoFeatures[2] || parsed.feature3,
      });
      setFeatureFrames({
        feature1: extractedFrames[0],
        feature2: extractedFrames[1],
        feature3: extractedFrames[2],
      });
      fillStepFields("tech", { stack: parsed.techStack || "Next.js · OpenAI · FFmpeg" });
      fillStepFields("impact", {
        impact: parsed.impact || tr("Help builders launch with confidence.", "帮助开发者更自信地发布。"),
      });

      setActiveStepId("importance");
      setChat((prev) => [
        ...prev,
        {
          role: "ai",
          tag: tr("Submission Parsed", "已解析提交内容"),
          text: videoAnalysis
            ? tr(
                "I parsed the submission and analyzed the raw demo video, then prefilled the workflow.",
                "我已解析提交文本并分析原始 demo 视频，然后预填了工作流。",
              )
            : tr("I prefilled steps 2-6. Review and refine in workflow.", "我已预填第 2-6 步，你可以在工作台继续细化。"),
        },
      ]);

      router.push("/workflow");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      router.push("/workflow");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <main className="dd-page-grid">
        <section className="dd-center-pane">
          <header className="dd-main-header">
            <TopStepper activeStep={1} />
            <LanguageToggle />
          </header>

          <div className="p-5 md:p-6 overflow-y-auto h-[calc(100%-73px)]">
            <section className="dd-panel p-5 md:p-6">
              <h1 className="dd-section-title">Onboarding</h1>
              <p className="dd-label-zh mt-2">素材输入</p>
              <p className="mt-3 text-[19px] text-[var(--dd-text-secondary)] max-w-4xl">
                Paste your hackathon submission text and optionally upload your raw demo video. Our AI will understand
                your project and draft a compelling demo script for you.
              </p>

              <label className="block mt-6">
                <div className="flex items-center gap-4">
                  <span className="dd-label-en">Hackathon Submission</span>
                  <span className="dd-label-zh">提交文本</span>
                </div>
                <div className="relative mt-2">
                  <textarea
                    className="dd-textarea min-h-52 pr-24 pb-10 text-lg leading-7"
                    placeholder="Describe your project, the problem you solve, your solution, and the impact you aim to create."
                    value={submission}
                    onChange={(e) => setSubmission(e.target.value)}
                  />
                  <div className="absolute left-3 bottom-2 text-sm text-[var(--dd-text-muted)]">{currentWordCount}+ words</div>
                  <div className="absolute right-3 bottom-2 text-sm text-[var(--dd-text-muted)]">{submission.length} / 2000</div>
                </div>
              </label>

              <section className="mt-5">
                <div className="flex items-center gap-4">
                  <span className="dd-label-en">Original Demo Video (Optional)</span>
                  <span className="dd-label-zh">原始 demo 视频（可选）</span>
                </div>
                <label className="dd-upload-zone mt-2 cursor-pointer">
                  <div>
                    <div className="text-2xl text-[var(--dd-brand-purple)]">↑</div>
                    <div className="mt-2 text-lg">
                      {demoVideo
                        ? `${demoVideo.name} (${(demoVideo.size / 1024 / 1024).toFixed(1)} MB)`
                        : "Drag & drop your video here, or click to browse"}
                    </div>
                    <div className="text-sm mt-2 text-[var(--dd-text-muted)]">MP4 / MOV / WebM, up to 500MB</div>
                  </div>
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setDemoVideoFile(file);
                      setDemoVideo({ name: file.name, size: file.size, url: URL.createObjectURL(file) });
                    }}
                  />
                </label>
              </section>

              <section className="mt-5">
                <div className="dd-label-en">Language <span className="zh-only">/ 语言</span></div>
                <div className="mt-2 flex w-full p-1 rounded-[12px] border border-[var(--dd-border-default)] bg-[rgba(8,15,28,0.82)]">
                  <button
                    type="button"
                    className={`flex-1 h-12 rounded-[10px] text-lg font-semibold transition-all ${locale === "en" ? "bg-[rgba(19,31,50,0.82)] border border-[rgba(129,91,255,0.62)] text-white shadow-[0_0_14px_rgba(126,85,255,0.2)]" : "text-[var(--dd-text-muted)] border border-transparent hover:text-white"}`}
                    onClick={() => setLocale("en")}
                  >
                    EN
                  </button>
                  <button
                    type="button"
                    className={`flex-1 h-12 rounded-[10px] text-lg font-semibold transition-all ${locale === "zh" ? "bg-[rgba(19,31,50,0.82)] border border-[rgba(129,91,255,0.62)] text-white shadow-[0_0_14px_rgba(126,85,255,0.2)]" : "text-[var(--dd-text-muted)] border border-transparent hover:text-white"}`}
                    onClick={() => setLocale("zh")}
                  >
                    中文
                  </button>
                </div>
              </section>

              <button
                type="button"
                onClick={prefillAndContinue}
                disabled={loading}
                className={`dd-btn-primary mt-6 h-14 w-full text-[31px] ${loading ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <span className="text-[28px] mr-2">✨</span>
                {loading ? tr("Drafting...", "生成中...") : tr("Let AI draft the script", "让 AI 起草脚本")}
              </button>
              <p className="mt-3 text-center text-[17px] text-[var(--dd-text-muted)]">
                AI will analyze the text and video (if provided) to draft the next workflow.
              </p>

              <div className="dd-panel mt-5 p-4 flex items-start gap-4">
                <div className="w-12 h-12 rounded-full grid place-items-center bg-[rgba(126,85,255,0.15)] border border-[rgba(126,85,255,0.3)] shrink-0 mt-1">
                  <span className="text-2xl" aria-hidden="true">🛡️</span>
                </div>
                <div>
                  <div className="text-[18px] text-[var(--dd-text-secondary)]">
                    Your data is private and secure. We only use your text and video to generate your demo.
                  </div>
                  <div className="text-[16px] mt-1 text-[var(--dd-text-muted)] zh-only">您的数据安全私密，仅用于生成您的 demo。</div>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between">
                <Link href="/workflow" className="dd-btn-secondary h-10 px-5 text-sm">
                  Skip
                </Link>
                {error ? <div className="text-sm text-[var(--dd-danger)]">{error}</div> : null}
              </div>
            </section>
          </div>
        </section>

        <AssistantPanel
          title="AI Guide"
          subtitle="快速上手指南"
          rightSlot={<span className="dd-status-pill">~2 min</span>}
          body={
            <div className="space-y-3">
              <article className="dd-guide-card">
                <div className="text-[var(--dd-brand-purple)] text-xl">💡</div>
                <div>
                  <div className="dd-label-en">1. What makes a strong submission?</div>
                  <p className="mt-2 text-[17px] text-[var(--dd-text-secondary)]">
                    Clearly state the problem, your solution, what makes it unique, and the impact you expect.
                  </p>
                  <p className="mt-2 text-[15px] text-[var(--dd-text-muted)] zh-only">
                    清晰说明问题、你的解决方案、独特之处以及你期望带来的影响。
                  </p>
                </div>
              </article>

              <article className="dd-guide-card">
                <div className="text-[var(--dd-brand-purple)] text-xl">🎬</div>
                <div>
                  <div className="dd-label-en">2. What to include in your video?</div>
                  <p className="mt-2 text-[17px] text-[var(--dd-text-secondary)]">
                    A short raw demo walkthrough, key features, and real results if any.
                  </p>
                  <p className="mt-2 text-[15px] text-[var(--dd-text-muted)] zh-only">展示产品核心功能、关键流程和实际效果。</p>
                </div>
              </article>

              <article className="dd-guide-card">
                <div className="text-[var(--dd-brand-purple)] text-xl">🚀</div>
                <div>
                  <div className="dd-label-en">3. What happens next?</div>
                  <p className="mt-2 text-[17px] text-[var(--dd-text-secondary)]">
                    AI drafts your script, then you review and edit before generating your final demo.
                  </p>
                  <p className="mt-2 text-[15px] text-[var(--dd-text-muted)] zh-only">
                    AI 将先生成个性化脚本，你可以审阅、编辑，再生成最终演示。
                  </p>
                </div>
              </article>
            </div>
          }
          footer={
            <div className="dd-panel p-3">
              <div className="dd-label-en">Before you start</div>
              <ul className="mt-2 text-[15px] text-[var(--dd-text-secondary)] space-y-1">
                <li>✓ Submission text ready</li>
                <li>✓ Raw demo video (optional)</li>
                <li>✓ Language selected</li>
              </ul>
            </div>
          }
        />
      </main>
    </AppShell>
  );
}
