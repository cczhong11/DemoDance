"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { AppShell } from "../_components/app-shell";
import { useLocale } from "../locale-provider";
import { useWorkflowStore } from "../_state/workflow-store";
import type { StepId } from "../home/types";

const stepOrder: StepId[] = ["audience", "importance", "product", "features", "tech", "impact"];

const stepUiMap: Record<StepId, { en: string; zh: string }> = {
  audience: { en: "Target User & Problem", zh: "目标用户与问题" },
  importance: { en: "Why It Matters", zh: "为什么重要" },
  product: { en: "Product Intro", zh: "产品介绍" },
  features: { en: "Features", zh: "核心功能" },
  tech: { en: "Tech Stack", zh: "技术栈" },
  impact: { en: "Future Impact", zh: "未来影响" },
};

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
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((chunk) => {
        if (typeof chunk === "string") return chunk;
        if (chunk && typeof chunk === "object" && "text" in chunk && typeof (chunk as { text?: unknown }).text === "string") {
          return (chunk as { text: string }).text;
        }
        return "";
      })
      .filter(Boolean)
      .join("\n")
      .trim();
  }
  return "";
}

function fieldCounter(fieldKey: string): number {
  if (fieldKey === "name") return 60;
  if (fieldKey === "slogan") return 80;
  if (fieldKey === "logo") return 800;
  if (fieldKey === "stack") return 320;
  return 2000;
}

export default function WorkflowPage() {
  const { tr, locale, setLocale } = useLocale();
  const {
    projectName,
    setProjectName,
    activeStepId,
    setActiveStepId,
    steps,
    overallFilled,
    allDone,
    updateField,
    fillStepFields,
    chat,
    setChat,
  } = useWorkflowStore();

  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [aiSuggestLoading, setAiSuggestLoading] = useState(false);
  const [logoGenerating, setLogoGenerating] = useState(false);

  const activeStep = steps.find((step) => step.id === activeStepId) ?? steps[0];
  const activeIndex = stepOrder.indexOf(activeStep.id);
  const prevStepId = activeIndex > 0 ? stepOrder[activeIndex - 1] : null;
  const nextStepId = activeIndex < stepOrder.length - 1 ? stepOrder[activeIndex + 1] : null;

  const completion = useMemo(() => Math.round((overallFilled / steps.length) * 100), [overallFilled, steps.length]);

  async function callTextChat(prompt: string): Promise<string> {
    const response = await fetch("/api/text/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(String((data as { error?: unknown }).error ?? "Text API failed"));
    }

    const text = readAssistantText(data);
    if (!text.trim()) {
      throw new Error("Empty response from text model");
    }
    return text;
  }

  async function runAiSuggest() {
    if (aiSuggestLoading) return;
    setAiSuggestLoading(true);
    setChatError(null);

    try {
      const schema = activeStep.fields.map((field) => `  \"${field.key}\": \"string\"`).join(",\n");
      const current = activeStep.fields.map((field) => `${field.label}: ${field.value || "(empty)"}`).join("\n");

      const prompt = [
        "You are DemoDance copilot.",
        "Return only JSON object, no markdown.",
        `Locale: ${locale}`,
        `Current Step: ${activeStep.title}`,
        "Fill concise, practical launch-video copy for current step fields.",
        "JSON schema:",
        `{\n${schema}\n}`,
        "Current values:",
        current,
      ].join("\n\n");

      const text = await callTextChat(prompt);
      const parsed = extractJsonObject(text);
      if (!parsed) {
        throw new Error("Model did not return valid JSON object");
      }

      const updates: Record<string, string> = {};
      for (const field of activeStep.fields) {
        const value = parsed[field.key];
        if (typeof value === "string" && value.trim()) {
          updates[field.key] = value.trim();
        }
      }
      fillStepFields(activeStep.id, updates);

      setChat((prev) => [
        ...prev,
        {
          role: "ai",
          tag: tr("AI Suggestion", "AI 建议"),
          text: tr("Updated this section with a stronger draft. Review and tweak if needed.", "我已为这一节提供更强草稿，请你按需微调。"),
        },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setChatError(message);
      setChat((prev) => [
        ...prev,
        {
          role: "ai",
          tag: tr("AI Suggest Failed", "AI 建议失败"),
          text: tr(`I couldn't fill this step (${message}).`, `这一步自动填写失败（${message}）。`),
        },
      ]);
    } finally {
      setAiSuggestLoading(false);
    }
  }

  async function sendMessage(customMessage?: string) {
    if (chatLoading) return;
    const content = (customMessage ?? chatInput).trim();
    if (!content) return;

    setChatError(null);
    setChatLoading(true);
    setChatInput("");

    setChat((prev) => [...prev, { role: "user", text: content }]);

    try {
      const context = activeStep.fields.map((field) => `${field.label}: ${field.value || "(empty)"}`).join("\n");
      const prompt = [
        "You are DemoDance copilot.",
        `Current step: ${activeStep.title}`,
        "Current field values:",
        context,
        "User request:",
        content,
        "Reply concise and actionable.",
      ].join("\n\n");

      const reply = await callTextChat(prompt);
      setChat((prev) => [...prev, { role: "ai", text: reply }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setChatError(message);
      setChat((prev) => [
        ...prev,
        {
          role: "ai",
          tag: tr("AI Error", "AI 错误"),
          text: tr(`I hit an error (${message}). Please retry.`, `请求失败（${message}），请重试。`),
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  async function generateLogo() {
    if (logoGenerating) return;

    async function shrinkLogoImage(inputUrl: string, maxSize = 256): Promise<string> {
      try {
        const response = await fetch(inputUrl);
        if (!response.ok) return inputUrl;
        const blob = await response.blob();
        const bitmap = await createImageBitmap(blob);

        const longestEdge = Math.max(bitmap.width, bitmap.height);
        if (!Number.isFinite(longestEdge) || longestEdge <= maxSize) {
          return inputUrl;
        }

        const scale = maxSize / longestEdge;
        const width = Math.max(1, Math.round(bitmap.width * scale));
        const height = Math.max(1, Math.round(bitmap.height * scale));

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return inputUrl;

        ctx.drawImage(bitmap, 0, 0, width, height);
        const compressed = canvas.toDataURL("image/webp", 0.88);
        return compressed || inputUrl;
      } catch {
        return inputUrl;
      }
    }

    setLogoGenerating(true);
    setChatError(null);

    try {
      const nameField = activeStep.fields.find((f) => f.key === "name")?.value ?? projectName;
      const sloganField = activeStep.fields.find((f) => f.key === "slogan")?.value ?? "";
      const prompt = [
        `Create a clean, modern app logo for a product named \"${nameField || "DemoDance"}\".`,
        sloganField ? `Tagline/context: ${sloganField}.` : "",
        "Style: minimal, bold, high contrast, icon-first mark.",
        "No complex text blocks. Avoid photorealism.",
      ]
        .filter(Boolean)
        .join(" ");

      const response = await fetch("/api/images/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          model: "gpt-image-2",
          size: "1024x1024",
          quality: "low",
          output_format: "webp",
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(String((data as { error?: unknown }).error ?? "Failed to generate logo"));
      }

      const logoUrl =
        typeof (data as { data?: Array<{ url?: unknown }> }).data?.[0]?.url === "string"
          ? (data as { data: Array<{ url: string }> }).data[0].url
          : "";
      if (!logoUrl) {
        throw new Error("No logo image returned");
      }

      const compactLogoUrl = await shrinkLogoImage(logoUrl, 256);
      fillStepFields("product", { logo: compactLogoUrl });
      setActiveStepId("product");
      setChat((prev) => [
        ...prev,
        {
          role: "ai",
          tag: tr("Logo Generated", "Logo 已生成"),
          text: tr("Generated and compressed logo, then filled Product > Logo.", "已生成并压缩 Logo，已回填到 Product > Logo。"),
        },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setChatError(message);
    } finally {
      setLogoGenerating(false);
    }
  }

  function quickAction(action: string) {
    sendMessage(`${action} this section in a concise way.`);
  }

  const topSteps = [
    { id: 1, en: "Onboarding", zh: "入口", href: "/onboarding", active: false },
    { id: 2, en: "Script & Collaborate", zh: "脚本与协作", href: "/workflow", active: true },
    { id: 3, en: "Generate & Export", zh: "生成与导出", href: "/generate", active: false },
  ];

  const activeStepUi = stepUiMap[activeStep.id];

  return (
    <AppShell>
      <main className="h-full grid grid-cols-[minmax(780px,1fr)_390px] gap-4">
        <section className="dd-card p-4 md:p-5 overflow-hidden">
          <header className="dd-card-subtle px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-6">
                {topSteps.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-6">
                    <Link href={item.href} className="flex items-center gap-2.5">
                      <span
                        className={`h-8 w-8 rounded-full grid place-items-center text-xs border ${
                          item.active
                            ? "border-[rgba(124,92,255,0.72)] bg-[linear-gradient(180deg,rgba(136,107,255,0.44),rgba(74,57,162,0.65))] text-white shadow-[0_0_16px_rgba(115,89,255,0.5)]"
                            : "border-[rgba(165,186,255,0.35)] text-[var(--dd-text-secondary)]"
                        }`}
                      >
                        {item.id}
                      </span>
                      <span className="leading-tight">
                        <span className={`block text-sm ${item.active ? "text-white" : "text-[var(--dd-text-secondary)]"}`}>{item.en}</span>
                        <span className="block text-xs text-[var(--dd-text-muted)]">{item.zh}</span>
                      </span>
                    </Link>
                    {idx < topSteps.length - 1 && <span className="h-px w-14 bg-[linear-gradient(90deg,rgba(124,92,255,0.2),rgba(165,186,255,0.35))]" />}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLocale("en")}
                  className={`dd-btn-secondary h-8 px-3 text-xs ${locale === "en" ? "dd-pill-active text-white" : ""}`}
                >
                  EN
                </button>
                <button
                  onClick={() => setLocale("zh")}
                  className={`dd-btn-secondary h-8 px-3 text-xs ${locale === "zh" ? "dd-pill-active text-white" : ""}`}
                >
                  中文
                </button>
              </div>
            </div>
          </header>

          <div className="mt-3 grid grid-cols-6 gap-2">
            {steps.map((step) => {
              const filled = step.fields.filter((field) => field.value.trim()).length;
              const done = filled === step.fields.length;
              const active = step.id === activeStep.id;
              const ui = stepUiMap[step.id];
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveStepId(step.id)}
                  className={`dd-transition rounded-xl border px-3 py-2.5 text-left ${
                    active
                      ? "dd-pill-active"
                      : "border-[rgba(165,186,255,0.16)] bg-[rgba(18,27,45,0.52)] hover:border-[rgba(124,92,255,0.44)]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-5 w-5 rounded-full text-[11px] grid place-items-center border ${active ? "border-[rgba(150,125,255,0.8)]" : "border-[rgba(165,186,255,0.35)]"}`}>
                      {step.index}
                    </span>
                    <span className="text-[13px] font-medium leading-none truncate">{ui.en}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-[var(--dd-text-muted)] truncate">{ui.zh}</div>
                  <div className="mt-1 text-[10px] text-[var(--dd-text-secondary)]">{done ? tr("Done", "已完成") : `${filled}/${step.fields.length}`}</div>
                </button>
              );
            })}
          </div>

          <section className="mt-3 dd-card-subtle p-4 md:p-5">
            <div className="grid grid-cols-[1fr_300px] gap-4 pb-4 border-b border-[rgba(165,186,255,0.12)]">
              <label className="block">
                <div className="text-xs text-[var(--dd-text-secondary)]">Project Name / 项目名称</div>
                <input className="dd-input mt-1 w-full px-3" value={projectName} onChange={(e) => setProjectName(e.target.value)} />
              </label>

              <div>
                <div className="flex items-center justify-between text-xs text-[var(--dd-text-secondary)]">
                  <span>Completion / 完成进度</span>
                  <span>{completion}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-[rgba(165,186,255,0.12)] overflow-hidden">
                  <div className="h-full" style={{ width: `${completion}%`, background: "var(--dd-accent-gradient)" }} />
                </div>
              </div>
            </div>

            <div className="pt-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-[linear-gradient(180deg,rgba(124,92,255,0.66),rgba(86,66,197,0.42))] border border-[rgba(147,123,255,0.65)] grid place-items-center shadow-[0_0_16px_rgba(114,89,255,0.45)]">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <path d="M6 16.8 17.8 5l1.3 1.3L7.3 18.1H6z" fill="currentColor" />
                      <path d="m15.5 3.7 1.2-1.2a2 2 0 0 1 2.8 2.8l-1.2 1.2z" fill="currentColor" opacity=".7" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-[29px] leading-tight font-semibold">{activeStepUi.en}</h2>
                    <p className="text-sm text-[var(--dd-text-muted)]">{activeStepUi.zh}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={runAiSuggest}
                  disabled={aiSuggestLoading}
                  className={`dd-btn-secondary h-10 px-4 text-sm ${aiSuggestLoading ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  {aiSuggestLoading ? tr("AI Suggesting...", "AI 建议中...") : tr("AI Suggest", "AI 建议")}
                </button>
              </div>

              <p className="text-sm text-[var(--dd-text-secondary)] mt-2">{activeStep.subtitle}</p>

              {activeStep.id === "product" ? (
                <div className="mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    {activeStep.fields
                      .filter((f) => f.key === "name" || f.key === "slogan")
                      .map((field) => (
                        <label key={field.key} className="block">
                          <div className="text-xs text-[var(--dd-text-secondary)]">{field.label}</div>
                          <input
                            className="dd-input mt-1 w-full px-3"
                            value={field.value}
                            onChange={(e) => updateField(activeStep.id, field.key, e.target.value)}
                            placeholder={field.placeholder}
                          />
                          <div className="text-xs text-[var(--dd-text-muted)] mt-1">{field.value.length} / {fieldCounter(field.key)}</div>
                        </label>
                      ))}
                  </div>

                  <div className="mt-3 grid grid-cols-[250px_1fr] gap-3">
                    {activeStep.fields
                      .filter((f) => f.key === "logo")
                      .map((field) => (
                        <div key={field.key} className="dd-card-subtle p-3">
                          <div className="text-xs text-[var(--dd-text-secondary)] mb-2">Logo / 标志</div>
                          <div className="rounded-xl border border-dashed border-[rgba(165,186,255,0.22)] bg-[rgba(7,13,24,0.85)] h-36 flex items-center justify-center overflow-hidden">
                            {field.value ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={field.value} alt="logo" className="max-h-full max-w-full object-contain" />
                            ) : (
                              <span className="text-[var(--dd-text-muted)] text-sm">DemoDance</span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={generateLogo}
                            disabled={logoGenerating}
                            className={`dd-btn-secondary mt-3 h-10 w-full text-sm ${logoGenerating ? "opacity-60 cursor-not-allowed" : ""}`}
                          >
                            {logoGenerating ? tr("Generating...", "生成中...") : tr("Generate Logo", "生成 Logo")}
                          </button>
                          <div className="text-xs text-[var(--dd-text-muted)] mt-2">AI will generate logo options for you / AI 将为你生成多个 Logo 选项</div>
                        </div>
                      ))}

                    {activeStep.fields
                      .filter((f) => f.key !== "name" && f.key !== "slogan" && f.key !== "logo")
                      .map((field) => (
                        <label key={field.key} className="block">
                          <div className="text-xs text-[var(--dd-text-secondary)]">{field.label}</div>
                          <textarea
                            className="dd-textarea mt-1 w-full min-h-56 px-3 py-2"
                            value={field.value}
                            onChange={(e) => updateField(activeStep.id, field.key, e.target.value)}
                            placeholder={field.placeholder}
                          />
                          <div className="text-xs text-[var(--dd-text-muted)] mt-1">{field.value.length} / {fieldCounter(field.key)}</div>
                        </label>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {activeStep.fields.map((field) => {
                    const longText = field.key === "impact" || field.key === "stack" || field.value.length > 120;
                    return (
                      <label key={field.key} className={`block ${longText ? "col-span-2" : ""}`}>
                        <div className="text-xs text-[var(--dd-text-secondary)]">{field.label}</div>
                        {longText ? (
                          <textarea
                            className="dd-textarea mt-1 w-full min-h-44 px-3 py-2"
                            value={field.value}
                            onChange={(e) => updateField(activeStep.id, field.key, e.target.value)}
                            placeholder={field.placeholder}
                          />
                        ) : (
                          <input
                            className="dd-input mt-1 w-full px-3"
                            value={field.value}
                            onChange={(e) => updateField(activeStep.id, field.key, e.target.value)}
                            placeholder={field.placeholder}
                          />
                        )}
                        <div className="text-xs text-[var(--dd-text-muted)] mt-1">{field.value.length} / {fieldCounter(field.key)}</div>
                      </label>
                    );
                  })}
                </div>
              )}

              <div className="mt-5 pt-4 border-t border-[rgba(165,186,255,0.12)] flex items-center justify-between">
                {prevStepId ? (
                  <button className="dd-btn-secondary h-10 px-4 text-sm" onClick={() => setActiveStepId(prevStepId)}>
                    Previous / 上一步
                  </button>
                ) : (
                  <Link href="/onboarding" className="dd-btn-secondary h-10 px-4 text-sm inline-flex items-center">
                    Previous / 上一步
                  </Link>
                )}

                {nextStepId ? (
                  <button className="dd-btn-primary h-10 px-5 text-sm" onClick={() => setActiveStepId(nextStepId)}>
                    Next / 下一步
                  </button>
                ) : (
                  <Link
                    href="/generate"
                    className={`dd-btn-primary h-10 px-5 text-sm inline-flex items-center ${allDone ? "" : "opacity-60 pointer-events-none"}`}
                  >
                    {tr("Go to Generate", "去生成页")}
                  </Link>
                )}
              </div>
            </div>
          </section>
        </section>

        <aside className="dd-card p-4 flex flex-col min-h-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-semibold leading-none">AI Copilot</h3>
              <div className="text-xs text-[var(--dd-text-muted)] mt-1">智能助手</div>
            </div>
            <div className="text-[var(--dd-text-muted)] flex items-center gap-2">
              <button className="h-8 w-8 rounded-lg border border-[rgba(165,186,255,0.18)] hover:border-[rgba(124,92,255,0.52)]">↗</button>
              <button className="h-8 w-8 rounded-lg border border-[rgba(165,186,255,0.18)] hover:border-[rgba(124,92,255,0.52)]">↺</button>
            </div>
          </div>

          <div className="mt-3 dd-card-subtle p-3 text-sm text-[var(--dd-text-secondary)]">
            <div className="font-medium">Context: {activeStepUi.en}</div>
            <div className="text-xs text-[var(--dd-text-muted)] mt-1">上下文：{activeStepUi.zh}</div>
          </div>

          <div className="mt-3 flex-1 overflow-y-auto space-y-3 pr-1">
            {chat.map((msg, idx) => (
              <div
                key={`${idx}-${msg.role}`}
                className={
                  msg.role === "ai"
                    ? "dd-card-subtle p-3 text-sm text-[var(--dd-text-secondary)]"
                    : "ml-10 rounded-xl border border-[rgba(138,118,255,0.68)] bg-[linear-gradient(180deg,rgba(120,94,255,0.44),rgba(66,54,141,0.5))] p-3 text-sm text-white"
                }
              >
                {msg.tag && <div className="text-[10px] uppercase tracking-wide opacity-70 mb-1">{msg.tag}</div>}
                {msg.text}
              </div>
            ))}
            {chatLoading && <div className="dd-card-subtle p-3 text-sm text-[var(--dd-text-secondary)]">Thinking...</div>}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {["Rewrite", "Shorter", "More punchy", "More professional"].map((chip) => (
              <button key={chip} className="dd-btn-secondary h-8 px-3 text-xs" onClick={() => quickAction(chip)}>
                {chip}
              </button>
            ))}
          </div>

          <div className="mt-3">
            <textarea
              className="dd-textarea w-full min-h-24 px-3 py-2"
              placeholder="Ask anything about this section..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <div className="mt-1 flex items-center justify-between">
              <div className="text-xs text-[var(--dd-text-muted)]">Enter to send · Shift+Enter for new line</div>
              <button
                type="button"
                className={`dd-btn-primary h-8 px-3 text-xs ${chatLoading || !chatInput.trim() ? "opacity-60 cursor-not-allowed" : ""}`}
                onClick={() => sendMessage()}
                disabled={chatLoading || !chatInput.trim()}
              >
                Send
              </button>
            </div>
            {chatError && <div className="text-xs text-[var(--dd-danger)] mt-2">{chatError}</div>}
          </div>
        </aside>
      </main>
    </AppShell>
  );
}
