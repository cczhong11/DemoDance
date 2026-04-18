"use client";

import { useMemo, useRef, useState, useEffect } from "react";

type StepId = "audience" | "importance" | "product" | "features" | "tech" | "impact";

type Field = {
  key: string;
  label: string;
  value: string;
  placeholder: string;
};

type Step = {
  id: StepId;
  index: number;
  title: string;
  subtitle: string;
  fields: Field[];
};

type ChatMsg = {
  role: "ai" | "user";
  text: string;
  tag?: string;
};

const INITIAL_STEPS: Step[] = [
  {
    id: "audience",
    index: 1,
    title: "目标用户 & 问题",
    subtitle: "说清楚 demo 是给谁看的、他们遇到什么问题",
    fields: [
      { key: "user", label: "Target User", value: "", placeholder: "例如：独立开发者、Hackathon 选手…" },
      { key: "problem", label: "Problem", value: "", placeholder: "他们遇到什么困难？" },
    ],
  },
  {
    id: "importance",
    index: 2,
    title: "问题的重要性（联网佐证）",
    subtitle: "AI 会抓取网络数据支撑这个 problem",
    fields: [
      { key: "evidence", label: "Web Evidence", value: "", placeholder: "点右侧 AI「去网上找证据」…" },
    ],
  },
  {
    id: "product",
    index: 3,
    title: "产品亮相",
    subtitle: "Logo、名字、Slogan —— 三件套",
    fields: [
      { key: "logo", label: "Logo", value: "", placeholder: "拖拽上传 / 让 AI 生成" },
      { key: "name", label: "Product Name", value: "", placeholder: "产品叫什么？" },
      { key: "slogan", label: "Slogan", value: "", placeholder: "一句话打动人" },
    ],
  },
  {
    id: "features",
    index: 4,
    title: "功能介绍",
    subtitle: "每条 feature 一小段话，视频会逐条带过",
    fields: [
      { key: "feature1", label: "Feature 1", value: "", placeholder: "最核心的那一个先说" },
      { key: "feature2", label: "Feature 2", value: "", placeholder: "次重要" },
      { key: "feature3", label: "Feature 3", value: "", placeholder: "可选" },
    ],
  },
  {
    id: "tech",
    index: 5,
    title: "技术说明",
    subtitle: "向技术观众展示你的 stack",
    fields: [
      { key: "stack", label: "Tech Stack", value: "", placeholder: "Next.js · AI SDK · Postgres…" },
    ],
  },
  {
    id: "impact",
    index: 6,
    title: "未来 Impact",
    subtitle: "这个产品会如何改变世界",
    fields: [
      { key: "impact", label: "Future Vision", value: "", placeholder: "一句话收尾，想象空间拉满" },
    ],
  },
];

const INITIAL_CHAT: ChatMsg[] = [
  {
    role: "ai",
    text: "嗨！我是 DemoDance ✨\n我会帮你把 demo 素材自动包装成一条 launch 视频。我们按左边 6 步来 —— 先说说你的 demo 是给谁看的？他们遇到了什么问题？",
  },
];

export default function Home() {
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS);
  const [activeStepId, setActiveStepId] = useState<StepId>("audience");
  const [chat, setChat] = useState<ChatMsg[]>(INITIAL_CHAT);
  const [input, setInput] = useState("");
  const [projectName, setProjectName] = useState("MyHackathonDemo");
  const [generating, setGenerating] = useState<null | {
    stage: number;
    done: boolean;
  }>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const progress = useMemo(() => {
    return steps.map((s) => {
      const total = s.fields.length;
      const filled = s.fields.filter((f) => f.value.trim().length > 0).length;
      let status: "done" | "active" | "pending" = "pending";
      if (filled === total && total > 0) status = "done";
      else if (s.id === activeStepId) status = "active";
      return { id: s.id, status, filled, total };
    });
  }, [steps, activeStepId]);

  const overallFilled = progress.filter((p) => p.status === "done").length;

  function updateField(stepId: StepId, key: string, value: string) {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === stepId
          ? { ...s, fields: s.fields.map((f) => (f.key === key ? { ...f, value } : f)) }
          : s,
      ),
    );
  }

  function sendMessage() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    const userMsg: ChatMsg = { role: "user", text };
    setChat((c) => [...c, userMsg]);

    // fake AI routing — inspect active step and "fill" one field
    setTimeout(() => {
      const step = steps.find((s) => s.id === activeStepId);
      if (!step) return;
      const emptyField = step.fields.find((f) => !f.value.trim());
      if (emptyField) {
        updateField(activeStepId, emptyField.key, text);
        setChat((c) => [
          ...c,
          {
            role: "ai",
            tag: `已写入 · ${step.title} · ${emptyField.label}`,
            text: buildAiReply(step.id, emptyField.key),
          },
        ]);
        // auto-advance when this step is complete after update
        const stillEmpty =
          step.fields.filter((f) => f.key !== emptyField.key).some((f) => !f.value.trim());
        if (!stillEmpty) {
          const nextStep = steps[step.index]; // index is 1-based, array pos = index
          if (nextStep) {
            setTimeout(() => setActiveStepId(nextStep.id), 400);
          }
        }
      } else {
        setChat((c) => [
          ...c,
          {
            role: "ai",
            text: "这一步已经填完了，我们跳到下一步吧 →",
          },
        ]);
      }
    }, 450);
  }

  function buildAiReply(stepId: StepId, fieldKey: string): string {
    switch (stepId) {
      case "audience":
        return fieldKey === "user"
          ? "👍 用户画像记下了。那他们具体遇到什么 pain point？"
          : "问题清楚了。接下来我去联网找几条数据支撑这个 problem，稍等…";
      case "importance":
        return "已经抓了 3 条网络数据：ProductHunt · X · HackerNews。要不要看原文？";
      case "product":
        if (fieldKey === "name") return "名字不错！Slogan 方向偏「工具感」还是「情绪感」？";
        if (fieldKey === "slogan") return "Slogan 收到。下一步聊 feature ✨";
        return "Logo 已接收。";
      case "features":
        return "Feature 记好了。再来一个？视频里最多带 3 个最突出。";
      case "tech":
        return "Tech stack ✓。最后一步：聊聊 impact。";
      case "impact":
        return "收尾漂亮！👉 右上角点「生成视频」就可以渲染了。";
    }
  }

  function aiSuggest(stepId: StepId) {
    setActiveStepId(stepId);
    const suggestions: Record<StepId, Record<string, string>> = {
      audience: {
        user: "独立开发者、Hackathon 选手、小型产品团队",
        problem: "能做出产品，但没时间/技能做出专业的 launch 视频",
      },
      importance: {
        evidence:
          "• ProductHunt：72% 上榜产品在 launch 当天有视频\n• X：带视频的新品发帖平均多 3.8× engagement\n• YC：投资人平均只看 demo 视频前 30 秒",
      },
      product: {
        logo: "（AI 已根据你的产品名生成候选 Logo）",
        name: "DemoDance",
        slogan: "From raw demo to launch-ready in 60 seconds.",
      },
      features: {
        feature1: "脚本自动生成：按经典 launch 视频模板分段撰写",
        feature2: "联网取证：自动抓网络数据支撑 problem statement",
        feature3: "素材一键合成：Logo / 名字 / demo 录屏 → 成品视频",
      },
      tech: {
        stack: "Next.js 16 · Vercel AI SDK · Remotion · FAL · Postgres",
      },
      impact: {
        impact: "让每一个在车库里 ship 产品的人，都能像大厂一样体面地 launch。",
      },
    };
    const patch = suggestions[stepId];
    setSteps((prev) =>
      prev.map((s) =>
        s.id === stepId
          ? {
              ...s,
              fields: s.fields.map((f) => (patch[f.key] ? { ...f, value: patch[f.key] } : f)),
            }
          : s,
      ),
    );
    setChat((c) => [
      ...c,
      {
        role: "ai",
        tag: `AI 建议 · ${INITIAL_STEPS.find((s) => s.id === stepId)?.title}`,
        text: "我按常见模板帮你把这一步填了，可以直接编辑不满意的地方。",
      },
    ]);
  }

  function startGenerate() {
    setGenerating({ stage: 0, done: false });
    const stages = 4;
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      if (i >= stages) {
        setGenerating({ stage: stages, done: true });
        clearInterval(t);
      } else {
        setGenerating({ stage: i, done: false });
      }
    }, 800);
  }

  const allDone = progress.every((p) => p.status === "done");

  return (
    <div className="flex flex-col h-screen bg-zinc-50 text-zinc-900">
      {/* ===== Top bar ===== */}
      <header className="h-14 flex items-center gap-4 border-b border-zinc-200 bg-white px-5">
        <div className="text-[15px] font-semibold tracking-tight">
          🎬 <span className="ml-1">DemoDance</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span>项目</span>
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="border border-dashed border-zinc-300 rounded px-2 py-0.5 text-zinc-700 focus:outline-none focus:border-zinc-500"
          />
        </div>
        <div className="flex-1" />
        <div className="text-xs text-zinc-500">
          {overallFilled} / {steps.length} 步完成
        </div>
        <button className="text-xs px-3 py-1.5 rounded border border-zinc-300 hover:bg-zinc-100">
          预览脚本
        </button>
        <button
          disabled={!allDone}
          onClick={startGenerate}
          className={`text-xs px-4 py-1.5 rounded font-medium ${
            allDone
              ? "bg-black text-white hover:bg-zinc-800"
              : "bg-zinc-200 text-zinc-400 cursor-not-allowed"
          }`}
        >
          ✨ 生成视频
        </button>
      </header>

      {/* ===== Body ===== */}
      <div className="flex-1 grid grid-cols-[1fr_420px] overflow-hidden">
        {/* LEFT */}
        <main className="overflow-y-auto px-8 py-6">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[11px] uppercase tracking-widest text-zinc-500">
                Video Script Workflow · 6 Steps
              </h2>
              <span className="text-[11px] text-zinc-400">点击任一步可激活</span>
            </div>

            <div className="flex gap-1 mb-6">
              {progress.map((p) => (
                <div
                  key={p.id}
                  className={`flex-1 h-1 rounded-full transition-colors ${
                    p.status === "done"
                      ? "bg-black"
                      : p.status === "active"
                        ? "bg-zinc-500"
                        : "bg-zinc-200"
                  }`}
                />
              ))}
            </div>

            <div className="flex flex-col gap-3">
              {steps.map((s) => {
                const prog = progress.find((p) => p.id === s.id)!;
                const isActive = activeStepId === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => setActiveStepId(s.id)}
                    className={`bg-white border rounded-xl p-5 cursor-pointer transition ${
                      isActive
                        ? "border-zinc-900 shadow-sm"
                        : prog.status === "done"
                          ? "border-zinc-200 bg-zinc-50/60"
                          : "border-zinc-200 hover:border-zinc-400"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-1">
                      <div
                        className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-semibold ${
                          prog.status === "done" || isActive
                            ? "bg-black text-white"
                            : "bg-zinc-200 text-zinc-500"
                        }`}
                      >
                        {prog.status === "done" ? "✓" : s.index}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold">{s.title}</div>
                        <div className="text-xs text-zinc-500">{s.subtitle}</div>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full ${
                          prog.status === "done"
                            ? "bg-green-100 text-green-700"
                            : isActive
                              ? "bg-zinc-900 text-white"
                              : "bg-zinc-100 text-zinc-500"
                        }`}
                      >
                        {prog.status === "done"
                          ? "已完成"
                          : isActive
                            ? "进行中"
                            : `${prog.filled}/${prog.total}`}
                      </span>
                    </div>

                    <div className="flex flex-col gap-2 mt-3">
                      {s.fields.map((f) => (
                        <div
                          key={f.key}
                          className="bg-zinc-50 border border-dashed border-zinc-200 rounded-md px-3 py-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-1">
                            {f.label}
                          </div>
                          <textarea
                            value={f.value}
                            onChange={(e) => updateField(s.id, f.key, e.target.value)}
                            placeholder={f.placeholder}
                            rows={f.value.length > 60 ? 3 : 1}
                            className="w-full bg-transparent text-[13px] text-zinc-800 resize-none focus:outline-none placeholder:text-zinc-300"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          aiSuggest(s.id);
                        }}
                        className="text-[11px] px-2.5 py-1 bg-white border border-zinc-200 rounded hover:bg-zinc-50"
                      >
                        ✨ 让 AI 建议
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveStepId(s.id);
                        }}
                        className="text-[11px] px-2.5 py-1 bg-white border border-zinc-200 rounded hover:bg-zinc-50"
                      >
                        💬 在右侧聊
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="h-12" />
          </div>
        </main>

        {/* RIGHT: chat */}
        <aside className="bg-white border-l border-zinc-200 flex flex-col">
          <div className="px-5 py-3 border-b border-zinc-200">
            <h3 className="text-sm font-semibold">💬 和 AI 一起写脚本</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              正在填：
              <span className="text-zinc-800 font-medium">
                {steps.find((s) => s.id === activeStepId)?.title}
              </span>
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
            {chat.map((m, i) => (
              <div
                key={i}
                className={`max-w-[88%] text-[13px] leading-relaxed rounded-xl px-3.5 py-2.5 whitespace-pre-wrap ${
                  m.role === "ai"
                    ? "bg-zinc-100 text-zinc-800 self-start rounded-bl-sm"
                    : "bg-black text-white self-end rounded-br-sm"
                }`}
              >
                {m.tag && (
                  <div className="text-[10px] uppercase tracking-wider opacity-60 mb-1">
                    {m.tag}
                  </div>
                )}
                {m.text}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="p-3 border-t border-zinc-200 bg-zinc-50">
            <div className="bg-white border border-zinc-300 rounded-xl p-2.5 focus-within:border-zinc-500">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="和 AI 聊聊，或直接写内容（Enter 发送 · Shift+Enter 换行）"
                rows={2}
                className="w-full text-[13px] resize-none focus:outline-none placeholder:text-zinc-400"
              />
              <div className="flex items-center gap-1.5 mt-1">
                <button className="text-[11px] px-2 py-0.5 bg-zinc-100 rounded text-zinc-600 hover:bg-zinc-200">
                  📎 素材
                </button>
                <button className="text-[11px] px-2 py-0.5 bg-zinc-100 rounded text-zinc-600 hover:bg-zinc-200">
                  🎨 Logo
                </button>
                <button className="text-[11px] px-2 py-0.5 bg-zinc-100 rounded text-zinc-600 hover:bg-zinc-200">
                  🔗 链接
                </button>
                <div className="flex-1" />
                <button
                  onClick={sendMessage}
                  className="w-7 h-7 rounded-md bg-black text-white text-sm hover:bg-zinc-700"
                >
                  ↑
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* ===== Generating overlay ===== */}
      {generating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-[420px] shadow-xl">
            <div className="text-lg font-semibold mb-1">
              {generating.done ? "🎉 视频生成完成" : "✨ 正在合成你的 launch 视频…"}
            </div>
            <div className="text-xs text-zinc-500 mb-5">
              {generating.done ? "可以下载、分享，或继续编辑脚本。" : "请稍等，大概 1 分钟。"}
            </div>
            <div className="flex flex-col gap-2 mb-5">
              {[
                "撰写脚本分镜",
                "联网抓取问题佐证",
                "合成配音 & 字幕",
                "渲染最终视频",
              ].map((label, i) => {
                const stageDone = generating.done || i < generating.stage;
                const stageActive = !generating.done && i === generating.stage;
                return (
                  <div key={label} className="flex items-center gap-3 text-sm">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                        stageDone
                          ? "bg-black text-white"
                          : stageActive
                            ? "bg-zinc-300 text-zinc-700 animate-pulse"
                            : "bg-zinc-100 text-zinc-400"
                      }`}
                    >
                      {stageDone ? "✓" : i + 1}
                    </div>
                    <div className={stageDone ? "text-zinc-800" : "text-zinc-500"}>{label}</div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setGenerating(null)}
                className="text-xs px-3 py-1.5 rounded border border-zinc-300 hover:bg-zinc-100"
              >
                {generating.done ? "关闭" : "后台运行"}
              </button>
              {generating.done && (
                <button className="text-xs px-3 py-1.5 rounded bg-black text-white hover:bg-zinc-800">
                  ⬇ 下载视频
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
