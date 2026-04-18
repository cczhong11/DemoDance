"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { useLocale } from "./locale-provider";

type StepId = "audience" | "importance" | "product" | "features" | "tech" | "impact";

type FeatureSegment = {
  start: number;
  end: number;
  label: string;
  accent: string;
  emoji: string;
  caption: string;
};

type Field = {
  key: string;
  label: string;
  value: string;
  placeholder: string;
  segment?: FeatureSegment;
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

function getInitialSteps(locale: "en" | "zh"): Step[] {
  const isEn = locale === "en";
  return [
    {
      id: "audience",
      index: 1,
      title: isEn ? "Target User & Problem" : "目标用户 & 问题",
      subtitle: isEn ? "Clarify who this demo serves and what pain they have" : "说清楚 demo 是给谁看的、他们遇到什么问题",
      fields: [
        {
          key: "user",
          label: "Target User",
          value: "",
          placeholder: isEn ? "For example: indie devs, hackathon teams..." : "例如：独立开发者、Hackathon 选手…",
        },
        {
          key: "problem",
          label: "Problem",
          value: "",
          placeholder: isEn ? "What is their concrete pain?" : "他们遇到什么困难？",
        },
      ],
    },
    {
      id: "importance",
      index: 2,
      title: isEn ? "Problem Importance (Web Evidence)" : "问题的重要性（联网佐证）",
      subtitle: isEn ? "AI gathers online signals to validate the problem" : "AI 会抓取网络数据支撑这个 problem",
      fields: [
        {
          key: "evidence",
          label: "Web Evidence",
          value: "",
          placeholder: isEn ? "Ask AI on the right to search evidence..." : "点右侧 AI「去网上找证据」…",
        },
      ],
    },
    {
      id: "product",
      index: 3,
      title: isEn ? "Product Reveal" : "产品亮相",
      subtitle: isEn ? "Logo, name, and slogan — the launch trio" : "Logo、名字、Slogan —— 三件套",
      fields: [
        { key: "logo", label: "Logo", value: "", placeholder: isEn ? "Upload or ask AI to generate" : "拖拽上传 / 让 AI 生成" },
        { key: "name", label: "Product Name", value: "", placeholder: isEn ? "What's the product name?" : "产品叫什么？" },
        { key: "slogan", label: "Slogan", value: "", placeholder: isEn ? "One line that sticks" : "一句话打动人" },
      ],
    },
    {
      id: "features",
      index: 4,
      title: isEn ? "Features" : "功能介绍",
      subtitle: isEn ? "One short line per feature for the video sequence" : "每条 feature 一小段话，视频会逐条带过",
      fields: [
        { key: "feature1", label: "Feature 1", value: "", placeholder: isEn ? "Start with the strongest one" : "最核心的那一个先说" },
        { key: "feature2", label: "Feature 2", value: "", placeholder: isEn ? "Second most important" : "次重要" },
        { key: "feature3", label: "Feature 3", value: "", placeholder: isEn ? "Optional" : "可选" },
      ],
    },
    {
      id: "tech",
      index: 5,
      title: isEn ? "Tech Stack" : "技术说明",
      subtitle: isEn ? "Show the stack clearly for technical audience" : "向技术观众展示你的 stack",
      fields: [
        { key: "stack", label: "Tech Stack", value: "", placeholder: "Next.js · AI SDK · Postgres…" },
      ],
    },
    {
      id: "impact",
      index: 6,
      title: isEn ? "Future Impact" : "未来 Impact",
      subtitle: isEn ? "How this product can change the world" : "这个产品会如何改变世界",
      fields: [
        { key: "impact", label: "Future Vision", value: "", placeholder: isEn ? "Close with one memorable line" : "一句话收尾，想象空间拉满" },
      ],
    },
  ];
}

function getInitialChat(locale: "en" | "zh"): ChatMsg[] {
  if (locale === "en") {
    return [
      {
        role: "ai",
        text: "Hi! I'm DemoDance ✨\nI'll help turn your raw demo into a launch video. Let's start from step 1: who is this for, and what problem do they face?",
      },
    ];
  }

  return [
    {
      role: "ai",
      text: "嗨！我是 DemoDance ✨\n我会帮你把 demo 素材自动包装成一条 launch 视频。我们按左边 6 步来 —— 先说说你的 demo 是给谁看的？他们遇到了什么问题？",
    },
  ];
}

export default function Home() {
  const { locale, setLocale, tr } = useLocale();
  const [stage, setStage] = useState<"onboard" | "workflow">("onboard");
  const [submission, setSubmission] = useState("");
  const [demoVideo, setDemoVideo] = useState<{ name: string; size: number; url?: string } | null>(null);
  const [parsing, setParsing] = useState(false);
  const [previewSegment, setPreviewSegment] = useState<FeatureSegment | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  const [steps, setSteps] = useState<Step[]>(() => getInitialSteps("en"));
  const [activeStepId, setActiveStepId] = useState<StepId>("audience");
  const [chat, setChat] = useState<ChatMsg[]>(() => getInitialChat("en"));
  const [input, setInput] = useState("");
  const [projectName, setProjectName] = useState("MyHackathonDemo");
  const [generating, setGenerating] = useState<null | {
    stage: number;
    done: boolean;
  }>(null);
  const [storyPromptPreview, setStoryPromptPreview] = useState<string | null>(null);
  const [storyPromptSources, setStoryPromptSources] = useState<string[]>([]);
  const [loadingStoryPrompt, setLoadingStoryPrompt] = useState(false);
  const [storyPromptError, setStoryPromptError] = useState<string | null>(null);
  const [voicePromptPreview, setVoicePromptPreview] = useState<string | null>(null);
  const [voicePromptSources, setVoicePromptSources] = useState<string[]>([]);
  const [loadingVoicePrompt, setLoadingVoicePrompt] = useState(false);
  const [voicePromptError, setVoicePromptError] = useState<string | null>(null);
  const [scenePromptPreview, setScenePromptPreview] = useState<string | null>(null);
  const [scenePromptSources, setScenePromptSources] = useState<string[]>([]);
  const [loadingScenePrompt, setLoadingScenePrompt] = useState(false);
  const [scenePromptError, setScenePromptError] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const isEn = locale === "en";

  useEffect(() => {
    const templates = getInitialSteps(locale);
    setSteps((prev) =>
      prev.map((step) => {
        const templateStep = templates.find((s) => s.id === step.id);
        if (!templateStep) return step;
        return {
          ...step,
          title: templateStep.title,
          subtitle: templateStep.subtitle,
          fields: step.fields.map((field) => {
            const templateField = templateStep.fields.find((f) => f.key === field.key);
            if (!templateField) return field;
            return {
              ...field,
              label: templateField.label,
              placeholder: templateField.placeholder,
            };
          }),
        };
      }),
    );
  }, [locale]);

  async function handleStart() {
    setParsing(true);

    const defaultFeatures = [
      tr("Auto script generation for launch-style storytelling.", "自动生成 launch 风格脚本。"),
      tr("Web evidence retrieval to validate problem importance.", "联网抓证据支撑问题重要性。"),
      tr("One-click composition from demo assets to final video.", "从 demo 素材到成片的一键合成。"),
    ];

    const extractJsonObject = (raw: string): Record<string, unknown> | null => {
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
    };

    const asString = (value: unknown, fallback = ""): string =>
      typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;

    try {
      const fillPrompt = [
        isEn
          ? "Read the submission and fill workflow steps 2-6."
          : "读取提交材料，填写工作流第2到第6步。",
        isEn
          ? "Return strict JSON only, with no markdown."
          : "只返回严格 JSON，不要 markdown。",
        `Language: ${isEn ? "English" : "Chinese"}`,
        "",
        "JSON schema:",
        "{",
        '  "audience_user": "string",',
        '  "audience_problem": "string",',
        '  "importance_evidence": "string",',
        '  "product_name": "string",',
        '  "product_slogan": "string",',
        '  "features": ["string", "string", "string"],',
        '  "tech_stack": "string",',
        '  "impact": "string"',
        "}",
        "",
        "Rules:",
        "- evidence should include 2-3 concise bullet points.",
        "- features must be concrete and demo-friendly.",
        "- keep each field concise and editable.",
        "",
        "Submission:",
        submission,
      ].join("\n");

      const llmResp = await fetch("/api/text/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          temperature: 0.35,
          max_tokens: 700,
          messages: [{ role: "user", content: fillPrompt }],
        }),
      });

      const llmData = await llmResp.json();
      if (!llmResp.ok) {
        throw new Error(String(llmData?.error || "Failed to parse submission with LLM"));
      }

      const llmText =
        typeof llmData?.choices?.[0]?.message?.content === "string"
          ? llmData.choices[0].message.content
          : "";
      const parsed = extractJsonObject(llmText);

      const audienceUser = asString(parsed?.audience_user);
      const audienceProblem = asString(parsed?.audience_problem, submission.slice(0, 140));
      const importanceEvidence = asString(
        parsed?.importance_evidence,
        tr("• Demand signal from builders is strong\n• Launch visibility depends on clear storytelling", "• 创作者对这类工具有明显需求\n• launch 成效高度依赖叙事表达"),
      );
      const productName = asString(parsed?.product_name, "DemoDance");
      const productSlogan = asString(
        parsed?.product_slogan,
        tr("From raw demo to launch-ready in 60 seconds.", "把原始 demo 在 60 秒内变成可发布视频。"),
      );
      const rawFeatures = Array.isArray(parsed?.features)
        ? parsed.features.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
        : [];
      const features = [rawFeatures[0], rawFeatures[1], rawFeatures[2]].map(
        (v, i) => v?.trim() || defaultFeatures[i],
      );
      const techStack = asString(parsed?.tech_stack, "Next.js · AI SDK · Remotion · Postgres");
      const impact = asString(
        parsed?.impact,
        tr(
          "Help every builder launch with the polish of a larger team.",
          "让每个独立开发者都能像成熟团队一样体面地发布产品。",
        ),
      );

      const mockSegments: FeatureSegment[] = [
        {
          start: 2,
          end: 9,
          label: tr("Opening · Problem Setup", "开场 · 问题切入"),
          accent: "#0ea5e9",
          emoji: "🎬",
          caption: features[0],
        },
        {
          start: 12,
          end: 22,
          label: tr("Core Feature Demo", "核心功能演示"),
          accent: "#f97316",
          emoji: "✨",
          caption: features[1],
        },
        {
          start: 25,
          end: 34,
          label: tr("Final Output · Export", "成品展示 · 导出"),
          accent: "#8b5cf6",
          emoji: "🎞️",
          caption: features[2],
        },
      ];

      setSteps((prev) =>
        prev.map((s) => {
          if (s.id === "audience") {
            return {
              ...s,
              fields: s.fields.map((f) => {
                if (f.key === "user") return { ...f, value: audienceUser || f.value };
                if (f.key === "problem") return { ...f, value: audienceProblem };
                return f;
              }),
            };
          }
          if (s.id === "importance") {
            return {
              ...s,
              fields: s.fields.map((f) =>
                f.key === "evidence" ? { ...f, value: importanceEvidence } : f,
              ),
            };
          }
          if (s.id === "product") {
            return {
              ...s,
              fields: s.fields.map((f) => {
                if (f.key === "name") return { ...f, value: productName };
                if (f.key === "slogan") return { ...f, value: productSlogan };
                return f;
              }),
            };
          }
          if (s.id === "features") {
            return {
              ...s,
              fields: s.fields.map((f, i) => {
                if (f.key.startsWith("feature")) {
                  const seg = mockSegments[i];
                  return {
                    ...f,
                    value: features[i] || f.value,
                    segment: seg ?? f.segment,
                  };
                }
                return f;
              }),
            };
          }
          if (s.id === "tech") {
            return {
              ...s,
              fields: s.fields.map((f) => (f.key === "stack" ? { ...f, value: techStack } : f)),
            };
          }
          if (s.id === "impact") {
            return {
              ...s,
              fields: s.fields.map((f) => (f.key === "impact" ? { ...f, value: impact } : f)),
            };
          }
          return s;
        }),
      );

      setActiveStepId("importance");
      setStage("workflow");
      setChat((c) => [
        ...c,
        {
          role: "ai",
          tag: tr("Submission Parsed", "已读取提交材料"),
          text: demoVideo
            ? tr(
                `Read ${submission.length} chars, loaded "${demoVideo.name}", and used LLM to fill steps 2-6. Review Step 2 to Step 6 👀`,
                `读完你的提交材料（${submission.length} 字）并加载了「${demoVideo.name}」，已用 LLM 自动填完第2到第6步。先从 Step 2 开始检查 👀`,
              )
            : tr(
                `Read ${submission.length} chars and used LLM to fill steps 2-6. Review Step 2 to Step 6 👀`,
                `读完你的提交材料（${submission.length} 字），已用 LLM 自动填完第2到第6步。先从 Step 2 开始检查 👀`,
              ),
        },
      ]);
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      setChat((c) => [
        ...c,
        {
          role: "ai",
          tag: tr("Parse Failed", "解析失败"),
          text: tr(
            `I couldn't auto-fill with LLM (${details}). You can continue manually, or click AI Suggest per step.`,
            `LLM 自动填充失败（${details}）。你可以继续手动填写，或在每一步点击「AI 建议」。`,
          ),
        },
      ]);
      setStage("workflow");
    } finally {
      setParsing(false);
    }
  }

  function formatTime(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  useEffect(() => {
    if (!previewSegment) return;
    const v = previewVideoRef.current;
    if (!v) return;
    const onLoaded = () => {
      v.currentTime = previewSegment.start;
      v.play().catch(() => {});
    };
    const onTime = () => {
      if (v.currentTime >= previewSegment.end) {
        v.pause();
        v.currentTime = previewSegment.start;
      }
    };
    v.addEventListener("loadedmetadata", onLoaded);
    v.addEventListener("timeupdate", onTime);
    if (v.readyState >= 1) onLoaded();
    return () => {
      v.removeEventListener("loadedmetadata", onLoaded);
      v.removeEventListener("timeupdate", onTime);
    };
  }, [previewSegment]);

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

  async function sendMessage() {
    const text = input.trim();
    if (!text || chatLoading) return;
    setInput("");
    setChatError(null);

    const userMsg: ChatMsg = { role: "user", text };
    setChat((c) => [...c, userMsg]);

    const step = steps.find((s) => s.id === activeStepId);
    if (!step) return;

    const emptyField = step.fields.find((f) => !f.value.trim());
    if (emptyField) {
      // Preserve the existing fast-fill UX while generating real AI guidance.
      updateField(activeStepId, emptyField.key, text);
    }

    const baseContext = {
      includeTechnicalArchitecture: getFieldValue("tech", "stack").trim().length > 0,
      targetUser: getFieldValue("audience", "user"),
      user: getFieldValue("audience", "user"),
      problem: getFieldValue("audience", "problem"),
      evidence: getFieldValue("importance", "evidence"),
      productName: getFieldValue("product", "name"),
      slogan: getFieldValue("product", "slogan"),
      features: [
        getFieldValue("features", "feature1"),
        getFieldValue("features", "feature2"),
        getFieldValue("features", "feature3"),
      ],
      techStack: getFieldValue("tech", "stack"),
      vision: getFieldValue("impact", "impact"),
      deviceFrame: "desktop" as const,
    };

    const stepGuidance = (() => {
      switch (activeStepId) {
        case "audience":
          return tr(
            "Focus on target user clarity and one concrete problem statement.",
            "重点完善目标用户清晰度和一个具体问题陈述。",
          );
        case "importance":
          return tr("Focus on evidence quality and severity framing.", "重点完善证据质量与严重性表达。");
        case "product":
          return tr("Focus on product reveal clarity and differentiation.", "重点完善产品亮相清晰度与差异化。");
        case "features":
          return tr("Focus on action-system-value loops for each feature.", "重点完善每个 feature 的动作-系统-价值闭环。");
        case "tech":
          return tr("Focus on simple technical architecture and data flow.", "重点用易懂方式说明技术架构与数据流。");
        case "impact":
          return tr("Focus on concrete and aligned future impact.", "重点给出具体且一致的未来影响。");
      }
    })();

    setChatLoading(true);
    try {
      const [storyResp, voiceResp, sceneResp] = await Promise.all([
        fetch("/api/story/prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            includeTechnicalArchitecture: baseContext.includeTechnicalArchitecture,
            user: baseContext.user,
            problem: baseContext.problem,
            evidence: baseContext.evidence,
            productName: baseContext.productName,
            slogan: baseContext.slogan,
            features: baseContext.features,
            techStack: baseContext.techStack,
            vision: baseContext.vision,
          }),
        }),
        fetch("/api/voice/prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            includeTechnicalArchitecture: baseContext.includeTechnicalArchitecture,
            targetUser: baseContext.targetUser,
            problem: baseContext.problem,
            evidence: baseContext.evidence,
            productName: baseContext.productName,
            slogan: baseContext.slogan,
            features: baseContext.features,
            techStack: baseContext.techStack,
            vision: baseContext.vision,
          }),
        }),
        fetch("/api/scene/prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetUser: baseContext.targetUser,
            problem: baseContext.problem,
            evidence: baseContext.evidence,
            productName: baseContext.productName,
            slogan: baseContext.slogan,
            features: baseContext.features,
            techStack: baseContext.techStack,
            vision: baseContext.vision,
            deviceFrame: baseContext.deviceFrame,
          }),
        }),
      ]);

      const [storyData, voiceData, sceneData] = await Promise.all([
        storyResp.json(),
        voiceResp.json(),
        sceneResp.json(),
      ]);

      if (!storyResp.ok || !voiceResp.ok || !sceneResp.ok) {
        throw new Error(
          String(storyData?.error || voiceData?.error || sceneData?.error || "Failed to compose prompts"),
        );
      }

      const storyPrompt = typeof storyData.prompt === "string" ? storyData.prompt : "";
      const voicePrompt = typeof voiceData.prompt === "string" ? voiceData.prompt : "";
      const scenePrompt = typeof sceneData.prompt === "string" ? sceneData.prompt : "";

      const historyMessages = [...chat, userMsg].slice(-8).map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.text,
      }));

      const chatResp = await fetch("/api/text/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          temperature: 0.5,
          max_tokens: 420,
          messages: [
            {
              role: "system",
              content: [
                tr(
                  "You are DemoDance copilot. Help complete the current workflow step with concise, practical writing.",
                  "你是 DemoDance 协作助手，请用简洁实用的方式帮助完成当前工作流步骤。",
                ),
                tr(
                  "Give ready-to-paste text where possible. Ask at most one follow-up question.",
                  "尽量给可直接粘贴的文案。最多追问一个问题。",
                ),
                `Current step: ${step.title}`,
                `Current guidance: ${stepGuidance}`,
                `Current step fields: ${step.fields.map((f) => `${f.label}=${f.value || "(empty)"}`).join(" | ")}`,
                "",
                "[STORY PROMPT]",
                storyPrompt,
                "",
                "[VOICE PROMPT]",
                voicePrompt,
                "",
                "[SCENE PROMPT]",
                scenePrompt,
              ].join("\n"),
            },
            ...historyMessages,
            {
              role: "user",
              content: [
                `User message: ${text}`,
                "",
                "Current product context:",
                `- Target user: ${baseContext.targetUser || "(empty)"}`,
                `- Problem: ${baseContext.problem || "(empty)"}`,
                `- Evidence: ${baseContext.evidence || "(empty)"}`,
                `- Product name: ${baseContext.productName || "(empty)"}`,
                `- Slogan: ${baseContext.slogan || "(empty)"}`,
                `- Features: ${baseContext.features.filter(Boolean).join(" | ") || "(empty)"}`,
                `- Tech stack: ${baseContext.techStack || "(empty)"}`,
                `- Vision: ${baseContext.vision || "(empty)"}`,
              ].join("\n"),
            },
          ],
        }),
      });

      const chatData = await chatResp.json();
      if (!chatResp.ok) {
        throw new Error(String(chatData?.error || "Chat request failed"));
      }

      const aiText =
        (typeof chatData?.choices?.[0]?.message?.content === "string"
          ? chatData.choices[0].message.content
          : "") ||
        tr("Tell me what tone you want, and I can draft this step directly.", "告诉我你要的语气，我可以直接起草这一步。");

      setChat((c) => [
        ...c,
        {
          role: "ai",
          tag: `${tr("Prompt-Wired", "已接入 Prompt")} · ${step.title}`,
          text: aiText.trim(),
        },
      ]);

      if (emptyField) {
        const stillEmpty = step.fields.filter((f) => f.key !== emptyField.key).some((f) => !f.value.trim());
        if (!stillEmpty) {
          const nextStep = steps[step.index];
          if (nextStep) setTimeout(() => setActiveStepId(nextStep.id), 350);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setChatError(message);
      setChat((c) => [
        ...c,
        {
          role: "ai",
          tag: tr("Error", "出错了"),
          text: tr(
            "I couldn't reach the model just now. Send one more message and I'll continue.",
            "刚才模型请求失败了。你再发一次，我会继续处理。",
          ),
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  function aiSuggest(stepId: StepId) {
    setActiveStepId(stepId);
    const suggestions: Record<StepId, Record<string, string>> = {
      audience: {
        user: tr("Indie developers, hackathon participants, small product teams", "独立开发者、Hackathon 选手、小型产品团队"),
        problem: tr("Can build products but lack time/skills to produce professional launch videos", "能做出产品，但没时间/技能做出专业的 launch 视频"),
      },
      importance: {
        evidence: tr(
          "• ProductHunt: 72% of top launches include video on day one\n• X: posts with launch video get 3.8× more engagement\n• YC: investors often only watch the first 30 seconds",
          "• ProductHunt：72% 上榜产品在 launch 当天有视频\n• X：带视频的新品发帖平均多 3.8× engagement\n• YC：投资人平均只看 demo 视频前 30 秒",
        ),
      },
      product: {
        logo: tr("(AI generated logo candidates from your product name)", "（AI 已根据你的产品名生成候选 Logo）"),
        name: "DemoDance",
        slogan: "From raw demo to launch-ready in 60 seconds.",
      },
      features: {
        feature1: tr("Auto script generation: structured by launch-video template", "脚本自动生成：按经典 launch 视频模板分段撰写"),
        feature2: tr("Web evidence retrieval: validates your problem statement", "联网取证：自动抓网络数据支撑 problem statement"),
        feature3: tr("One-click asset composition: logo/name/demo capture to final video", "素材一键合成：Logo / 名字 / demo 录屏 → 成品视频"),
      },
      tech: {
        stack: "Next.js 16 · Vercel AI SDK · Remotion · FAL · Postgres",
      },
      impact: {
        impact: tr(
          "Help every builder launch with the polish of a large company.",
          "让每一个在车库里 ship 产品的人，都能像大厂一样体面地 launch。",
        ),
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
        tag: `${tr("AI Suggestion", "AI 建议")} · ${steps.find((s) => s.id === stepId)?.title}`,
        text: tr(
          "I filled this step based on a common launch template. Feel free to edit anything.",
          "我按常见模板帮你把这一步填了，可以直接编辑不满意的地方。",
        ),
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

  function getFieldValue(stepId: StepId, fieldKey: string): string {
    return steps.find((s) => s.id === stepId)?.fields.find((f) => f.key === fieldKey)?.value ?? "";
  }

  async function previewStoryPrompt() {
    setLoadingStoryPrompt(true);
    setStoryPromptError(null);

    try {
      const response = await fetch("/api/story/prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          includeTechnicalArchitecture: getFieldValue("tech", "stack").trim().length > 0,
          user: getFieldValue("audience", "user"),
          problem: getFieldValue("audience", "problem"),
          evidence: getFieldValue("importance", "evidence"),
          productName: getFieldValue("product", "name"),
          slogan: getFieldValue("product", "slogan"),
          features: [
            getFieldValue("features", "feature1"),
            getFieldValue("features", "feature2"),
            getFieldValue("features", "feature3"),
          ],
          techStack: getFieldValue("tech", "stack"),
          vision: getFieldValue("impact", "impact"),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? "Failed to build story prompt");
      }

      const prompt = typeof data.prompt === "string" ? data.prompt : "";
      const parts = Array.isArray(data.parts)
        ? (data.parts as Array<{ file?: unknown; title?: unknown }>)
            .map((part) =>
              typeof part.file === "string" && typeof part.title === "string"
                ? `${part.file} · ${part.title}`
                : null,
            )
            .filter((value): value is string => Boolean(value))
        : [];

      setStoryPromptPreview(prompt);
      setStoryPromptSources(parts);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStoryPromptError(message);
    } finally {
      setLoadingStoryPrompt(false);
    }
  }

  async function previewVoicePrompt() {
    setLoadingVoicePrompt(true);
    setVoicePromptError(null);

    try {
      const response = await fetch("/api/voice/prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          includeTechnicalArchitecture: getFieldValue("tech", "stack").trim().length > 0,
          targetUser: getFieldValue("audience", "user"),
          problem: getFieldValue("audience", "problem"),
          evidence: getFieldValue("importance", "evidence"),
          productName: getFieldValue("product", "name"),
          slogan: getFieldValue("product", "slogan"),
          features: [
            getFieldValue("features", "feature1"),
            getFieldValue("features", "feature2"),
            getFieldValue("features", "feature3"),
          ],
          techStack: getFieldValue("tech", "stack"),
          vision: getFieldValue("impact", "impact"),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? "Failed to build voice prompt");
      }

      const prompt = typeof data.prompt === "string" ? data.prompt : "";
      const parts = Array.isArray(data.parts)
        ? (data.parts as Array<{ file?: unknown; title?: unknown }>)
            .map((part) =>
              typeof part.file === "string" && typeof part.title === "string"
                ? `${part.file} · ${part.title}`
                : null,
            )
            .filter((value): value is string => Boolean(value))
        : [];

      setVoicePromptPreview(prompt);
      setVoicePromptSources(parts);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setVoicePromptError(message);
    } finally {
      setLoadingVoicePrompt(false);
    }
  }

  async function previewScenePrompt() {
    setLoadingScenePrompt(true);
    setScenePromptError(null);

    try {
      const response = await fetch("/api/scene/prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetUser: getFieldValue("audience", "user"),
          problem: getFieldValue("audience", "problem"),
          evidence: getFieldValue("importance", "evidence"),
          productName: getFieldValue("product", "name"),
          slogan: getFieldValue("product", "slogan"),
          features: [
            getFieldValue("features", "feature1"),
            getFieldValue("features", "feature2"),
            getFieldValue("features", "feature3"),
          ],
          techStack: getFieldValue("tech", "stack"),
          vision: getFieldValue("impact", "impact"),
          deviceFrame: "desktop",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? "Failed to build scene prompt");
      }

      const prompt = typeof data.prompt === "string" ? data.prompt : "";
      const parts = Array.isArray(data.parts)
        ? (data.parts as Array<{ file?: unknown; title?: unknown }>)
            .map((part) =>
              typeof part.file === "string" && typeof part.title === "string"
                ? `${part.file} · ${part.title}`
                : null,
            )
            .filter((value): value is string => Boolean(value))
        : [];

      setScenePromptPreview(prompt);
      setScenePromptSources(parts);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setScenePromptError(message);
    } finally {
      setLoadingScenePrompt(false);
    }
  }

  const allDone = progress.every((p) => p.status === "done");

  if (stage === "onboard") {
    const canStart = submission.trim().length >= 20 && !parsing;
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100 text-zinc-900">
        <header className="h-14 flex items-center px-6 border-b border-zinc-200 bg-white/60 backdrop-blur">
          <div className="text-[15px] font-semibold tracking-tight">
            🎬 <span className="ml-1">DemoDance</span>
          </div>
          <div className="ml-2 text-xs text-zinc-400">From raw demo to launch-ready</div>
          <div className="flex-1" />
          <div className="flex items-center gap-1">
            <button
              onClick={() => setLocale("en")}
              className={`text-xs px-2 py-1 rounded ${locale === "en" ? "bg-black text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}
            >
              EN
            </button>
            <button
              onClick={() => setLocale("zh")}
              className={`text-xs px-2 py-1 rounded ${locale === "zh" ? "bg-black text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}
            >
              中文
            </button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-2xl">
            <div className="text-center mb-8">
              <div className="inline-block text-[11px] uppercase tracking-widest text-zinc-500 bg-zinc-100 px-3 py-1 rounded-full mb-4">
                Hackathon Launch Video · AI Generated
              </div>
              <h1 className="text-3xl font-semibold tracking-tight mb-3">
                {tr("Turn your hackathon project into a launch video", "把你的 Hackathon 作品，变成一条 launch 视频")}
              </h1>
              <p className="text-sm text-zinc-600 max-w-lg mx-auto leading-relaxed">
                {tr(
                  "Paste your submission text and upload raw demo capture. AI handles script, storyboard, voiceover, and rendering.",
                  "贴上你的 Hackathon 提交文字 + 上传原始 demo 录屏，剩下的脚本、分镜、配音、合成 —— 都交给 AI。",
                )}
              </p>
            </div>

            <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-6 flex flex-col gap-5">
              {/* Submission text */}
              <div>
                <label className="flex items-center justify-between text-sm font-medium mb-2">
                  <span>
                    <span className="text-zinc-400 mr-2">1.</span>
                    {tr("Hackathon Submission", "Hackathon 提交说明")}
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    {isEn ? `${submission.length} chars · recommended 50+` : `${submission.length} 字 · 建议 50+ 字`}
                  </span>
                </label>
                <textarea
                  value={submission}
                  onChange={(e) => setSubmission(e.target.value)}
                  placeholder={tr(
                    "Paste what you wrote in your hackathon submission: what it does, what problem it solves, who it's for, and stack used. AI will turn it into script blocks.",
                    "贴上你在 Hackathon 提交页填的说明：产品做什么、解决什么问题、为谁做、用到什么技术… AI 会帮你拆成脚本。",
                  )}
                  rows={6}
                  className="w-full text-[13px] leading-relaxed border border-zinc-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-zinc-500 resize-none placeholder:text-zinc-400"
                />
              </div>

              {/* Demo video upload */}
              <div>
                <label className="flex items-center justify-between text-sm font-medium mb-2">
                  <span>
                    <span className="text-zinc-400 mr-2">2.</span>
                    {tr("Raw Demo Video", "原始 Demo 视频")}
                  </span>
                  <span className="text-[11px] text-zinc-400">{tr("Optional · mp4 / mov", "可选 · mp4 / mov")}</span>
                </label>
                <label
                  htmlFor="demo-video"
                  className={`block border-2 border-dashed rounded-lg px-4 py-6 text-center cursor-pointer transition ${
                    demoVideo
                      ? "border-zinc-900 bg-zinc-50"
                      : "border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50"
                  }`}
                >
                  {demoVideo ? (
                    <div className="text-sm">
                      <div className="font-medium text-zinc-900">🎞️ {demoVideo.name}</div>
                      <div className="text-xs text-zinc-500 mt-1">
                        {isEn
                          ? `${(demoVideo.size / (1024 * 1024)).toFixed(1)} MB · click to replace`
                          : `${(demoVideo.size / (1024 * 1024)).toFixed(1)} MB · 点击替换`}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-zinc-500">
                      <div className="text-2xl mb-2">📁</div>
                      {tr("Click or drag to upload demo capture", "点击或拖拽上传你的 demo 录屏")}
                      <div className="text-[11px] text-zinc-400 mt-1">
                        {tr("No video? Skip it — AI can generate placeholder storyboard from text.", "没有视频也可以跳过 —— AI 会基于文字生成占位分镜")}
                      </div>
                    </div>
                  )}
                  <input
                    id="demo-video"
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        if (demoVideo?.url) URL.revokeObjectURL(demoVideo.url);
                        setDemoVideo({ name: f.name, size: f.size, url: URL.createObjectURL(f) });
                      }
                    }}
                  />
                </label>
              </div>

              {/* Start button */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  disabled={!canStart}
                  onClick={handleStart}
                  className={`flex-1 h-11 rounded-lg text-sm font-medium transition ${
                    canStart
                      ? "bg-black text-white hover:bg-zinc-800"
                      : "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                  }`}
                >
                  {parsing
                    ? tr("AI is parsing your materials...", "AI 正在读取素材…")
                    : tr("✨ Let AI draft the script", "✨ 让 AI 帮我起草脚本")}
                </button>
                <button
                  onClick={() => setStage("workflow")}
                  className="h-11 px-4 rounded-lg text-sm text-zinc-500 hover:text-zinc-800"
                >
                  {tr("Skip, fill manually", "跳过，手动填")}
                </button>
              </div>
            </div>

            <div className="mt-5 text-center text-[11px] text-zinc-400">
              {tr(
                "Next you'll enter a 6-step workflow — each step can be completed by chatting with AI.",
                "接下来你会看到一个 6 步工作流 · 每一步都可以和 AI 聊着填",
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-50 text-zinc-900">
      {/* ===== Top bar ===== */}
      <header className="h-14 flex items-center gap-4 border-b border-zinc-200 bg-white px-5">
        <button
          onClick={() => setStage("onboard")}
          className="text-[15px] font-semibold tracking-tight hover:opacity-70"
          title={tr("Back to onboarding", "回到起点")}
        >
          🎬 <span className="ml-1">DemoDance</span>
        </button>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span>{tr("Project", "项目")}</span>
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="border border-dashed border-zinc-300 rounded px-2 py-0.5 text-zinc-700 focus:outline-none focus:border-zinc-500"
          />
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <button
            onClick={() => setLocale("en")}
            className={`text-xs px-2 py-1 rounded ${locale === "en" ? "bg-black text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}
          >
            EN
          </button>
          <button
            onClick={() => setLocale("zh")}
            className={`text-xs px-2 py-1 rounded ${locale === "zh" ? "bg-black text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}
          >
            中文
          </button>
        </div>
        <div className="text-xs text-zinc-500">
          {isEn ? `${overallFilled} / ${steps.length} steps complete` : `${overallFilled} / ${steps.length} 步完成`}
        </div>
        <button
          onClick={previewStoryPrompt}
          disabled={loadingStoryPrompt}
          className={`text-xs px-3 py-1.5 rounded border ${
            loadingStoryPrompt
              ? "border-zinc-200 text-zinc-400 cursor-not-allowed"
              : "border-zinc-300 hover:bg-zinc-100"
          }`}
        >
          {loadingStoryPrompt ? tr("Building...", "生成中…") : tr("Preview Script", "预览脚本")}
        </button>
        <button
          onClick={previewVoicePrompt}
          disabled={loadingVoicePrompt}
          className={`text-xs px-3 py-1.5 rounded border ${
            loadingVoicePrompt
              ? "border-zinc-200 text-zinc-400 cursor-not-allowed"
              : "border-zinc-300 hover:bg-zinc-100"
          }`}
        >
          {loadingVoicePrompt ? tr("Building...", "生成中…") : tr("Preview Voice", "预览配音")}
        </button>
        <button
          onClick={previewScenePrompt}
          disabled={loadingScenePrompt}
          className={`text-xs px-3 py-1.5 rounded border ${
            loadingScenePrompt
              ? "border-zinc-200 text-zinc-400 cursor-not-allowed"
              : "border-zinc-300 hover:bg-zinc-100"
          }`}
        >
          {loadingScenePrompt ? tr("Building...", "生成中…") : tr("Preview Scene", "预览分镜")}
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
          {tr("✨ Generate Video", "✨ 生成视频")}
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
              <span className="text-[11px] text-zinc-400">{tr("Click any step to activate", "点击任一步可激活")}</span>
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
                          ? tr("Done", "已完成")
                          : isActive
                            ? tr("Active", "进行中")
                            : `${prog.filled}/${prog.total}`}
                      </span>
                    </div>

                    <div className="flex flex-col gap-2 mt-3">
                      {s.fields.map((f) => (
                        <div
                          key={f.key}
                          className="bg-zinc-50 border border-dashed border-zinc-200 rounded-md px-3 py-2"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-[10px] uppercase tracking-wider text-zinc-400">
                              {f.label}
                            </div>
                            {f.segment && (
                              <div className="text-[10px] text-zinc-400 tabular-nums">
                                {formatTime(f.segment.start)} – {formatTime(f.segment.end)}
                              </div>
                            )}
                          </div>
                          {f.segment ? (
                            <div className="flex gap-3 items-stretch">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewSegment(f.segment!);
                                }}
                                className="relative shrink-0 w-28 h-16 rounded-md overflow-hidden group"
                                style={{
                                  background: `linear-gradient(135deg, ${f.segment.accent} 0%, rgba(0,0,0,0.85) 100%)`,
                                }}
                                title={tr("Play this segment", "播放该片段")}
                              >
                                <div className="absolute inset-0 flex items-center justify-center text-xl">
                                  {f.segment.emoji}
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition">
                                  <div className="w-7 h-7 rounded-full bg-white/90 text-black flex items-center justify-center text-xs">
                                    ▶
                                  </div>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 text-[9px] text-white/90 bg-black/40 px-1 py-0.5 text-left truncate">
                                  {f.segment.label}
                                </div>
                              </button>
                              <textarea
                                value={f.value}
                                onChange={(e) => updateField(s.id, f.key, e.target.value)}
                                placeholder={f.placeholder}
                                rows={2}
                                className="flex-1 bg-transparent text-[13px] text-zinc-800 resize-none focus:outline-none placeholder:text-zinc-300"
                              />
                            </div>
                          ) : (
                            <textarea
                              value={f.value}
                              onChange={(e) => updateField(s.id, f.key, e.target.value)}
                              placeholder={f.placeholder}
                              rows={f.value.length > 60 ? 3 : 1}
                              className="w-full bg-transparent text-[13px] text-zinc-800 resize-none focus:outline-none placeholder:text-zinc-300"
                            />
                          )}
                        </div>
                      ))}
                      {s.id === "features" && s.fields.some((f) => f.segment) && (
                        <div className="text-[10px] text-zinc-400 mt-1 flex items-center gap-1">
                          <span>🎞️</span>
                          <span>
                            {tr(
                              `AI auto-cut ${s.fields.filter((f) => f.segment).length} matched segments from demo video. Click thumbnails to preview.`,
                              `AI 已从 demo 视频自动切出 ${s.fields.filter((f) => f.segment).length} 段对应片段 · 点缩略图预览`,
                            )}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          aiSuggest(s.id);
                        }}
                        className="text-[11px] px-2.5 py-1 bg-white border border-zinc-200 rounded hover:bg-zinc-50"
                      >
                        {tr("✨ AI Suggest", "✨ 让 AI 建议")}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveStepId(s.id);
                        }}
                        className="text-[11px] px-2.5 py-1 bg-white border border-zinc-200 rounded hover:bg-zinc-50"
                      >
                        {tr("💬 Chat on right", "💬 在右侧聊")}
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
            <h3 className="text-sm font-semibold">{tr("💬 Write Script with AI", "💬 和 AI 一起写脚本")}</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              {tr("Current step:", "正在填：")}
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
            {chatLoading && (
              <div className="max-w-[88%] text-[12px] leading-relaxed rounded-xl px-3.5 py-2 bg-zinc-100 text-zinc-500 self-start rounded-bl-sm">
                {tr("Thinking with prompts...", "正在结合 prompts 思考中…")}
              </div>
            )}
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
                disabled={chatLoading}
                placeholder={tr(
                  "Chat with AI or type content directly (Enter to send · Shift+Enter newline)",
                  "和 AI 聊聊，或直接写内容（Enter 发送 · Shift+Enter 换行）",
                )}
                rows={2}
                className="w-full text-[13px] resize-none focus:outline-none placeholder:text-zinc-400"
              />
              {chatError && (
                <div className="mt-1 text-[11px] text-red-600">{chatError}</div>
              )}
              <div className="flex items-center gap-1.5 mt-1">
                <button className="text-[11px] px-2 py-0.5 bg-zinc-100 rounded text-zinc-600 hover:bg-zinc-200">
                  {tr("📎 Assets", "📎 素材")}
                </button>
                <button className="text-[11px] px-2 py-0.5 bg-zinc-100 rounded text-zinc-600 hover:bg-zinc-200">
                  🎨 Logo
                </button>
                <button className="text-[11px] px-2 py-0.5 bg-zinc-100 rounded text-zinc-600 hover:bg-zinc-200">
                  {tr("🔗 Links", "🔗 链接")}
                </button>
                <div className="flex-1" />
                <button
                  onClick={sendMessage}
                  disabled={chatLoading || !input.trim()}
                  className={`w-7 h-7 rounded-md text-white text-sm ${
                    chatLoading || !input.trim()
                      ? "bg-zinc-300 cursor-not-allowed"
                      : "bg-black hover:bg-zinc-700"
                  }`}
                >
                  ↑
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* ===== Segment preview modal ===== */}
      {previewSegment && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4"
          onClick={() => setPreviewSegment(null)}
        >
          <div
            className="bg-white rounded-2xl p-4 w-[560px] max-w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-semibold">{previewSegment.label}</div>
                <div className="text-[11px] text-zinc-500 tabular-nums">
                  {formatTime(previewSegment.start)} – {formatTime(previewSegment.end)} · {tr("from raw demo", "来自原始 demo")}
                </div>
              </div>
              <button
                onClick={() => setPreviewSegment(null)}
                className="text-zinc-400 hover:text-zinc-800 text-lg leading-none"
              >
                ×
              </button>
            </div>

            <div
              className="relative rounded-lg overflow-hidden aspect-video"
              style={{
                background: `linear-gradient(135deg, ${previewSegment.accent} 0%, #111 100%)`,
              }}
            >
              {demoVideo?.url ? (
                <video
                  ref={previewVideoRef}
                  src={demoVideo.url}
                  controls
                  className="absolute inset-0 w-full h-full object-contain bg-black"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  <div className="text-5xl mb-2">{previewSegment.emoji}</div>
                  <div className="text-xs opacity-80">{tr("No demo uploaded · showing placeholder storyboard", "没上传 demo 视频 · 显示占位分镜")}</div>
                  <div className="mt-3 text-[11px] bg-white/20 px-2 py-0.5 rounded-full tabular-nums">
                    ▶ {formatTime(previewSegment.start)} – {formatTime(previewSegment.end)}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-3 text-[13px] leading-relaxed text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-md px-3 py-2">
              {previewSegment.caption}
            </div>
          </div>
        </div>
      )}

      {/* ===== Story prompt preview modal ===== */}
      {storyPromptPreview && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4"
          onClick={() => setStoryPromptPreview(null)}
        >
          <div
            className="bg-white rounded-2xl p-4 w-[900px] max-w-full shadow-xl max-h-[86vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="text-sm font-semibold">Story Prompt Preview</div>
                <div className="text-[11px] text-zinc-500 mt-1">
                  Split sub-prompts used:
                  {storyPromptSources.length > 0 ? ` ${storyPromptSources.join(" | ")}` : " (none)"}
                </div>
              </div>
              <button
                onClick={() => setStoryPromptPreview(null)}
                className="text-zinc-400 hover:text-zinc-800 text-lg leading-none"
              >
                ×
              </button>
            </div>

            <pre className="flex-1 overflow-auto text-[12px] leading-relaxed bg-zinc-50 border border-zinc-200 rounded-md p-3 whitespace-pre-wrap">
              {storyPromptPreview}
            </pre>
          </div>
        </div>
      )}

      {storyPromptError && (
        <div className="fixed bottom-4 right-4 text-xs bg-red-50 text-red-700 border border-red-200 px-3 py-2 rounded-md shadow">
          Story prompt error: {storyPromptError}
        </div>
      )}

      {/* ===== Voice prompt preview modal ===== */}
      {voicePromptPreview && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4"
          onClick={() => setVoicePromptPreview(null)}
        >
          <div
            className="bg-white rounded-2xl p-4 w-[900px] max-w-full shadow-xl max-h-[86vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="text-sm font-semibold">Voice Prompt Preview</div>
                <div className="text-[11px] text-zinc-500 mt-1">
                  Split sub-prompts used:
                  {voicePromptSources.length > 0 ? ` ${voicePromptSources.join(" | ")}` : " (none)"}
                </div>
              </div>
              <button
                onClick={() => setVoicePromptPreview(null)}
                className="text-zinc-400 hover:text-zinc-800 text-lg leading-none"
              >
                ×
              </button>
            </div>

            <pre className="flex-1 overflow-auto text-[12px] leading-relaxed bg-zinc-50 border border-zinc-200 rounded-md p-3 whitespace-pre-wrap">
              {voicePromptPreview}
            </pre>
          </div>
        </div>
      )}

      {voicePromptError && (
        <div className="fixed bottom-4 left-4 text-xs bg-red-50 text-red-700 border border-red-200 px-3 py-2 rounded-md shadow">
          Voice prompt error: {voicePromptError}
        </div>
      )}

      {/* ===== Scene prompt preview modal ===== */}
      {scenePromptPreview && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4"
          onClick={() => setScenePromptPreview(null)}
        >
          <div
            className="bg-white rounded-2xl p-4 w-[900px] max-w-full shadow-xl max-h-[86vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="text-sm font-semibold">Scene Prompt Preview</div>
                <div className="text-[11px] text-zinc-500 mt-1">
                  Split sub-prompts used:
                  {scenePromptSources.length > 0 ? ` ${scenePromptSources.join(" | ")}` : " (none)"}
                </div>
              </div>
              <button
                onClick={() => setScenePromptPreview(null)}
                className="text-zinc-400 hover:text-zinc-800 text-lg leading-none"
              >
                ×
              </button>
            </div>

            <pre className="flex-1 overflow-auto text-[12px] leading-relaxed bg-zinc-50 border border-zinc-200 rounded-md p-3 whitespace-pre-wrap">
              {scenePromptPreview}
            </pre>
          </div>
        </div>
      )}

      {scenePromptError && (
        <div className="fixed bottom-20 left-4 text-xs bg-red-50 text-red-700 border border-red-200 px-3 py-2 rounded-md shadow">
          Scene prompt error: {scenePromptError}
        </div>
      )}

      {/* ===== Generating overlay ===== */}
      {generating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-[420px] shadow-xl">
            <div className="text-lg font-semibold mb-1">
              {generating.done ? tr("🎉 Video generation complete", "🎉 视频生成完成") : tr("✨ Generating your launch video...", "✨ 正在合成你的 launch 视频…")}
            </div>
            <div className="text-xs text-zinc-500 mb-5">
              {generating.done
                ? tr("You can download, share, or continue editing the script.", "可以下载、分享，或继续编辑脚本。")
                : tr("Please wait, around 1 minute.", "请稍等，大概 1 分钟。")}
            </div>
            <div className="flex flex-col gap-2 mb-5">
              {[
                tr("Draft script & storyboard", "撰写脚本分镜"),
                tr("Fetch web evidence", "联网抓取问题佐证"),
                tr("Synthesize voice & subtitles", "合成配音 & 字幕"),
                tr("Render final video", "渲染最终视频"),
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
                {generating.done ? tr("Close", "关闭") : tr("Run in background", "后台运行")}
              </button>
              {generating.done && (
                <button className="text-xs px-3 py-1.5 rounded bg-black text-white hover:bg-zinc-800">
                  {tr("⬇ Download Video", "⬇ 下载视频")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
