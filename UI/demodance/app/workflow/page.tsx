"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { AppShell } from "../_components/app-shell";
import { AssistantPanel } from "../_components/assistant-panel";
import { LanguageToggle } from "../_components/language-toggle";
import { TopStepper } from "../_components/top-stepper";
import { shrinkImageFromUrl } from "../_lib/image-utils";
import { useLocale } from "../locale-provider";
import { useWorkflowStore } from "../_state/workflow-store";
import {
  buildChatPrompt,
  buildLogoPrompt,
  buildScriptPrompt,
  buildSuggestPrompt,
  callJsonTextChat,
  callTextChat,
  fieldCounter,
  readSuggestUpdates,
  requestLogoUrl,
  workflowStepOrder,
  workflowStepUiMap,
} from "./_lib/workflow-ai";

export default function WorkflowPage() {
  const { tr, locale } = useLocale();
  const {
    projectName,
    setProjectName,
    activeStepId,
    setActiveStepId,
    steps,
    allDone,
    updateField,
    fillStepFields,
    getStepScript,
    setStepScript,
    chat,
    setChat,
  } = useWorkflowStore();

  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [aiSuggestLoading, setAiSuggestLoading] = useState(false);
  const [scriptGenerating, setScriptGenerating] = useState(false);
  const [logoGenerating, setLogoGenerating] = useState(false);

  const activeStep = steps.find((step) => step.id === activeStepId) ?? steps[0];
  const activeIndex = workflowStepOrder.indexOf(activeStep.id);
  const prevStepId = activeIndex > 0 ? workflowStepOrder[activeIndex - 1] : null;
  const nextStepId = activeIndex < workflowStepOrder.length - 1 ? workflowStepOrder[activeIndex + 1] : null;
  const completion = useMemo(() => {
    let filled = 0;
    let total = 0;
    for (const step of steps) {
      for (const field of step.fields) {
        total += 1;
        if (field.value.trim().length > 0) filled += 1;
      }
      total += 1;
      if (getStepScript(step.id).trim().length > 0) filled += 1;
    }
    if (total === 0) return 0;
    return Math.round((filled / total) * 100);
  }, [steps, getStepScript]);
  const activeStepUi = workflowStepUiMap[activeStep.id];
  const activeStepScript = getStepScript(activeStep.id);

  async function runAiSuggest() {
    if (aiSuggestLoading) return;
    setAiSuggestLoading(true);
    setChatError(null);

    try {
      const prompt = buildSuggestPrompt(locale, activeStep, getStepScript(activeStep.id));
      const text = await callJsonTextChat(prompt);
      const { fields, script } = readSuggestUpdates(activeStep, text);
      fillStepFields(activeStep.id, fields);
      if (script) setStepScript(activeStep.id, script);

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
      const reply = await callTextChat(buildChatPrompt(activeStep, content));
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

    setLogoGenerating(true);
    setChatError(null);

    try {
      const nameField = activeStep.fields.find((f) => f.key === "name")?.value ?? projectName;
      const sloganField = activeStep.fields.find((f) => f.key === "slogan")?.value ?? "";
      const logoUrl = await requestLogoUrl(buildLogoPrompt(nameField, sloganField));
      const compactLogoUrl = await shrinkImageFromUrl(logoUrl, 256);
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
      setChatError(error instanceof Error ? error.message : String(error));
    } finally {
      setLogoGenerating(false);
    }
  }

  async function generateStepScript() {
    if (scriptGenerating) return;

    setScriptGenerating(true);
    setChatError(null);

    try {
      const prompt = buildScriptPrompt(locale, activeStep, getStepScript(activeStep.id));
      const text = await callJsonTextChat(prompt);
      const { script } = readSuggestUpdates(activeStep, text);
      if (!script) {
        throw new Error(tr("AI returned an empty script.", "AI 返回了空脚本。"));
      }
      setStepScript(activeStep.id, script);
      setChat((prev) => [
        ...prev,
        {
          role: "ai",
          tag: tr("Script Generated", "脚本已生成"),
          text: tr("I drafted the narration for this step. Give it a quick polish if you want a different tone.", "我已经为这一节起草了旁白脚本，你可以再微调语气。"),
        },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setChatError(message);
      setChat((prev) => [
        ...prev,
        {
          role: "ai",
          tag: tr("Script Failed", "脚本生成失败"),
          text: tr(`I couldn't generate the script for this step (${message}).`, `这一节脚本生成失败（${message}）。`),
        },
      ]);
    } finally {
      setScriptGenerating(false);
    }
  }

  function quickAction(action: string) {
    void sendMessage(`${action} this section in a concise way.`);
  }

  return (
    <AppShell>
      <main className="dd-page-grid">
        <section className="dd-center-pane">
          <header className="dd-main-header">
            <TopStepper activeStep={2} />
            <LanguageToggle />
          </header>

          <div className="dd-workflow-tabs">
            {steps.map((step) => {
              const ui = workflowStepUiMap[step.id];
              const active = step.id === activeStep.id;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveStepId(step.id)}
                  className={`dd-workflow-tab ${active ? "active" : ""}`}
                >
                  <span className="dd-tab-index">{step.index}</span>
                  <span className="min-w-0 text-left">
                    <span className="dd-label-en">{ui.en}</span>
                    <span className="dd-label-zh">{ui.zh}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <section className="p-4 md:p-5 overflow-y-auto h-[calc(100%-148px)]">
            <div className="dd-panel p-4 md:p-5">
              <div className="grid grid-cols-[minmax(0,1fr)_320px] gap-8">
                <label className="block">
                  <div className="text-[17px] text-[var(--dd-text-secondary)]">Project Name <span className="zh-only">/ 项目名称</span></div>
                  <input className="dd-input mt-2 text-lg" value={projectName} onChange={(e) => setProjectName(e.target.value)} />
                </label>
                <div>
                  <div className="flex items-center justify-between text-[17px] text-[var(--dd-text-secondary)]">
                    <span>Completion <span className="zh-only">/ 完成进度</span></span>
                    <span>{completion}%</span>
                  </div>
                  <div className="dd-progress-track mt-3">
                    <div className="dd-progress-fill" style={{ width: `${completion}%` }} />
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-5 border-t border-[var(--dd-border-subtle)]">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-xl grid place-items-center bg-[linear-gradient(135deg,#3d62f2,#7c4dff)] text-white">
                      ✎
                    </div>
                    <div>
                      <h2 className="text-[36px] font-semibold leading-tight">{activeStepUi.en}</h2>
                      <p className="dd-label-zh">{activeStepUi.zh}</p>
                      <p className="mt-2 text-[18px] text-[var(--dd-text-secondary)]">{activeStep.subtitle}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={runAiSuggest}
                    disabled={aiSuggestLoading}
                    className={`dd-btn-secondary h-10 px-4 ${aiSuggestLoading ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    {aiSuggestLoading ? tr("AI Suggesting...", "AI 建议中...") : tr("AI Suggest", "AI 建议")}
                  </button>
                </div>

                {activeStep.id === "product" ? (
                  <div className="mt-5">
                    <div className="grid grid-cols-2 gap-4">
                      {activeStep.fields
                        .filter((f) => f.key === "name" || f.key === "slogan")
                        .map((field) => (
                          <label key={field.key} className="block">
                            <div className="text-[17px] text-[var(--dd-text-secondary)]">{field.label}</div>
                            <input
                              className="dd-input mt-2 text-lg"
                              value={field.value}
                              onChange={(e) => updateField(activeStep.id, field.key, e.target.value)}
                              placeholder={field.placeholder}
                            />
                            <div className="mt-2 text-sm text-[var(--dd-text-muted)]">
                              {field.value.length} / {fieldCounter(field.key)}
                            </div>
                          </label>
                        ))}
                    </div>

                    <div className="grid grid-cols-[250px_1fr] gap-5 mt-4">
                      {activeStep.fields
                        .filter((f) => f.key === "logo")
                        .map((field) => (
                          <section key={field.key}>
                            <div className="text-[17px] text-[var(--dd-text-secondary)]">Logo <span className="zh-only">/ 标志</span></div>
                            <div className="mt-2 rounded-xl border border-dashed border-[var(--dd-border-default)] bg-[rgba(7,13,24,0.85)] h-40 flex items-center justify-center overflow-hidden">
                              {field.value ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={field.value} alt="logo" className="max-h-full max-w-full object-contain" />
                              ) : (
                                <span className="text-[var(--dd-text-muted)] text-lg">DemoDance</span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={generateLogo}
                              disabled={logoGenerating}
                              className={`dd-btn-outline-purple mt-3 h-11 w-full ${logoGenerating ? "opacity-60 cursor-not-allowed" : ""}`}
                            >
                              {logoGenerating ? tr("Generating...", "生成中...") : tr("Generate Logo", "生成 Logo")}
                            </button>
                            <div className="mt-2 text-sm text-[var(--dd-text-muted)]">
                              AI will generate logo options for you <span className="zh-only">/ AI 将为你生成多个 Logo 选项</span>
                            </div>
                          </section>
                        ))}

                      <div className="flex flex-col">
                        <label className="block h-full flex flex-col">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-[17px] text-[var(--dd-text-secondary)]">Script / Narration <span className="text-[14px] ml-1 text-[var(--dd-text-muted)] zh-only">开场脚本 / 旁白</span></div>
                            <button
                              type="button"
                              onClick={generateStepScript}
                              disabled={scriptGenerating}
                              className={`dd-btn-secondary h-9 px-3 text-sm ${scriptGenerating ? "opacity-60 cursor-not-allowed" : ""}`}
                            >
                              {scriptGenerating ? tr("Generating...", "生成中...") : tr("Generate Script", "生成脚本")}
                            </button>
                          </div>
                          <textarea
                            className="dd-textarea flex-1 mt-2 text-lg leading-7"
                            value={activeStepScript}
                            onChange={(e) => setStepScript(activeStep.id, e.target.value)}
                            placeholder={tr("Write the spoken script for this step...", "填写这一段的视频旁白脚本...")}
                          />
                          <div className="mt-2 text-sm text-[var(--dd-text-muted)]">{activeStepScript.length} / 2000</div>
                        </label>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 grid grid-cols-2 gap-4">
                    {activeStep.fields.map((field) => {
                      const longText = field.key === "impact" || field.key === "stack" || field.key === "evidence" || field.value.length > 120;
                      return (
                        <label key={field.key} className={`block ${longText ? "col-span-2" : ""}`}>
                          <div className="text-[17px] text-[var(--dd-text-secondary)]">{field.label}</div>
                          {longText ? (
                            <textarea
                              className="dd-textarea min-h-44 mt-2 text-lg leading-7"
                              value={field.value}
                              onChange={(e) => updateField(activeStep.id, field.key, e.target.value)}
                              placeholder={field.placeholder}
                            />
                          ) : (
                            <input
                              className="dd-input mt-2 text-lg"
                              value={field.value}
                              onChange={(e) => updateField(activeStep.id, field.key, e.target.value)}
                              placeholder={field.placeholder}
                            />
                          )}
                          <div className="mt-2 text-sm text-[var(--dd-text-muted)]">
                            {field.value.length} / {fieldCounter(field.key)}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}

                {activeStep.id !== "product" ? (
                  <label className="block mt-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[17px] text-[var(--dd-text-secondary)]">Script / Narration</div>
                      <button
                        type="button"
                        onClick={generateStepScript}
                        disabled={scriptGenerating}
                        className={`dd-btn-secondary h-9 px-3 text-sm ${scriptGenerating ? "opacity-60 cursor-not-allowed" : ""}`}
                      >
                        {scriptGenerating ? tr("Generating...", "生成中...") : tr("Generate Script", "生成脚本")}
                      </button>
                    </div>
                    <textarea
                      className="dd-textarea min-h-56 mt-2 text-lg leading-7"
                      value={activeStepScript}
                      onChange={(e) => setStepScript(activeStep.id, e.target.value)}
                      placeholder={tr("Write the spoken script for this step...", "填写这一段的视频旁白脚本...")}
                    />
                    <div className="mt-2 text-sm text-[var(--dd-text-muted)]">{activeStepScript.length} / 2000</div>
                  </label>
                ) : null}

                <div className="mt-6 pt-4 border-t border-[var(--dd-border-subtle)] flex items-center justify-between">
                  {prevStepId ? (
                    <button type="button" className="dd-btn-secondary h-11 px-6" onClick={() => setActiveStepId(prevStepId)}>
                      Previous <span className="zh-only">/ 上一步</span>
                    </button>
                  ) : (
                    <Link href="/onboarding" className="dd-btn-secondary h-11 px-6">
                      Previous <span className="zh-only">/ 上一步</span>
                    </Link>
                  )}

                  {nextStepId ? (
                    <button type="button" className="dd-btn-primary h-11 px-7" onClick={() => setActiveStepId(nextStepId)}>
                      Next <span className="zh-only">/ 下一步</span>
                    </button>
                  ) : (
                    <Link
                      href="/generate"
                      className={`dd-btn-primary h-11 px-7 ${allDone ? "" : "opacity-60 pointer-events-none"}`}
                    >
                      {tr("Go to Generate", "去生成页")}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </section>
        </section>

        <AssistantPanel
          title="AI Copilot"
          subtitle="智能助手"
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
              <div className="text-[16px]">Context: {activeStepUi.en}</div>
              <div className="text-sm mt-1 zh-only">上下文：{activeStepUi.zh}</div>
            </div>
          }
          body={
            <div className="space-y-3">
              {chat.map((msg, idx) => (
                <div key={`${idx}-${msg.role}`} className={msg.role === "ai" ? "pr-5" : "pl-8"}>
                  <div className={msg.role === "ai" ? "dd-chat-ai" : "dd-chat-user"}>
                    {msg.tag ? <div className="text-xs opacity-70 mb-1">{msg.tag}</div> : null}
                    <div className="text-[17px] leading-7">{msg.text}</div>
                    <div className="mt-2 text-xs text-[var(--dd-text-muted)]">{idx < 2 ? "10:24 AM" : "10:25 AM"}</div>
                  </div>
                  {msg.role === "user" ? (
                    <div className="flex justify-end -mt-8 pr-1">
                      <span className="dd-team-avatar text-xs h-9 w-9">D</span>
                    </div>
                  ) : null}
                </div>
              ))}
              {chatLoading ? <div className="dd-chat-ai">Thinking...</div> : null}
            </div>
          }
          footer={
            <>
              <div className="dd-chip-row mb-3">
                {["Rewrite", "Shorter", "More punchy", "More professional"].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    className={`dd-chip ${chip === "More punchy" ? "active" : ""}`}
                    onClick={() => quickAction(chip)}
                  >
                    <span className="block text-[15px]">{chip}</span>
                  </button>
                ))}
              </div>

              <textarea
                className="dd-textarea min-h-24"
                placeholder="Ask anything about this section..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage();
                  }
                }}
              />
              <div className="mt-2 flex items-center justify-between">
                <div className="text-sm text-[var(--dd-text-muted)]">Enter to send · Shift+Enter for new line</div>
                <button
                  type="button"
                  className={`dd-btn-primary h-10 px-4 ${chatLoading || !chatInput.trim() ? "opacity-60 cursor-not-allowed" : ""}`}
                  onClick={() => void sendMessage()}
                  disabled={chatLoading || !chatInput.trim()}
                >
                  Send
                </button>
              </div>
              {chatError ? <div className="mt-2 text-sm text-[var(--dd-danger)]">{chatError}</div> : null}
            </>
          }
        />
      </main>
    </AppShell>
  );
}
