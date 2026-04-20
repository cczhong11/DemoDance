"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { OnboardingScreen } from "./home/onboarding-screen";
import { PromptErrorToast, PromptPreviewModal, SectionPromptModal, SegmentPreviewModal } from "./home/modals";
import { WorkflowChatSidebar } from "./home/workflow-chat-sidebar";
import { WorkflowHeader } from "./home/workflow-header";
import {
  type ChatMsg,
  type DemoVideoMeta,
  type FeatureSegment,
  type RenderSection,
  type Step,
  type StepId,
  getInitialChat,
  getInitialSteps,
} from "./home/types";
import { useLocale } from "./locale-provider";

type AnalyzeApiSegment = {
  start?: unknown;
  end?: unknown;
  label?: unknown;
  caption?: unknown;
  confidence?: unknown;
};

type AnalyzeApiResponse = {
  ok?: unknown;
  source_engine?: unknown;
  features?: unknown;
  segments?: unknown;
};

type WorkflowDraft = {
  steps: Step[];
  activeStepId: StepId;
  chat: ChatMsg[];
  projectName: string;
  submission: string;
};

const WORKFLOW_DRAFT_KEY = "demodance.workflow.draft.v1";

export default function Home() {
  const router = useRouter();
  const pathname = usePathname();
  const { locale, setLocale, tr } = useLocale();
  const [stage, setStage] = useState<"onboard" | "workflow">(pathname === "/workflow" ? "workflow" : "onboard");
  const [submission, setSubmission] = useState("");
  const [demoVideo, setDemoVideo] = useState<DemoVideoMeta | null>(null);
  const [demoVideoFile, setDemoVideoFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [previewSegment, setPreviewSegment] = useState<FeatureSegment | null>(null);

  const [steps, setSteps] = useState<Step[]>(() => getInitialSteps("en"));
  const [activeStepId, setActiveStepId] = useState<StepId>("audience");
  const [chat, setChat] = useState<ChatMsg[]>(() => getInitialChat("en"));
  const [input, setInput] = useState("");
  const [projectName, setProjectName] = useState("MyHackathonDemo");
  const [sectionRenders, setSectionRenders] = useState<RenderSection[]>([]);
  const [renderingAll, setRenderingAll] = useState(false);
  const [combining, setCombining] = useState(false);
  const [exportReady, setExportReady] = useState(false);
  const [exportFileName, setExportFileName] = useState<string | null>(null);
  const [exportFileUrl, setExportFileUrl] = useState<string | null>(null);
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
  const [activeSectionPromptId, setActiveSectionPromptId] = useState<StepId | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [logoGenerating, setLogoGenerating] = useState(false);
  const [lastLogoPrompt, setLastLogoPrompt] = useState<string | null>(null);
  const isEn = locale === "en";
  const renderPanelRef = useRef<HTMLDivElement>(null);
  const workflowHydratedRef = useRef(false);
  const stopGenerationRef = useRef(false);

  function saveWorkflowDraft(draft: WorkflowDraft) {
    try {
      window.sessionStorage.setItem(WORKFLOW_DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // ignore storage errors
    }
  }

  useEffect(() => {
    if (pathname !== "/workflow" || workflowHydratedRef.current) return;
    workflowHydratedRef.current = true;

    try {
      const raw = window.sessionStorage.getItem(WORKFLOW_DRAFT_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as Partial<WorkflowDraft>;
      if (Array.isArray(parsed.steps) && parsed.steps.length > 0) {
        setSteps(parsed.steps as Step[]);
      }
      if (typeof parsed.activeStepId === "string") {
        setActiveStepId(parsed.activeStepId as StepId);
      }
      if (Array.isArray(parsed.chat) && parsed.chat.length > 0) {
        setChat(parsed.chat as ChatMsg[]);
      }
      if (typeof parsed.projectName === "string" && parsed.projectName.trim()) {
        setProjectName(parsed.projectName);
      }
      if (typeof parsed.submission === "string") {
        setSubmission(parsed.submission);
      }
    } catch {
      // ignore malformed storage payload
    }
  }, [pathname]);

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

  async function buildFeatureSegmentClips(file: File, segments: FeatureSegment[]): Promise<FeatureSegment[]> {
    if (segments.length === 0) return segments;

    const { FFmpeg } = await import("@ffmpeg/ffmpeg");
    const { fetchFile, toBlobURL } = await import("@ffmpeg/util");

    const ffmpeg = new FFmpeg();
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });

    await ffmpeg.writeFile("feature_source.mp4", await fetchFile(file));

    const clipped: FeatureSegment[] = [];
    for (let i = 0; i < segments.length; i += 1) {
      const seg = segments[i];
      const outputName = `feature_clip_${i}.mp4`;
      const start = String(Math.max(0, seg.start));
      const duration = String(Math.max(0.5, seg.end - seg.start));

      try {
        await ffmpeg.exec([
          "-ss",
          start,
          "-t",
          duration,
          "-i",
          "feature_source.mp4",
          "-c:v",
          "libx264",
          "-c:a",
          "aac",
          "-movflags",
          "+faststart",
          outputName,
        ]);

        const data = await ffmpeg.readFile(outputName);
        const bytes =
          data instanceof Uint8Array ? Uint8Array.from(data) : new TextEncoder().encode(String(data));
        const clipUrl = URL.createObjectURL(new Blob([bytes.buffer], { type: "video/mp4" }));
        clipped.push({ ...seg, clipUrl });
      } catch {
        clipped.push(seg);
      }
    }

    return clipped;
  }

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

    const normalizeAnalyzeSegments = (data: AnalyzeApiResponse, features: string[]): FeatureSegment[] => {
      const palette = [
        { accent: "#0ea5e9", emoji: "🎬" },
        { accent: "#f97316", emoji: "✨" },
        { accent: "#8b5cf6", emoji: "🎞️" },
      ];

      const raw = Array.isArray(data.segments) ? (data.segments as AnalyzeApiSegment[]) : [];
      return raw
        .map((seg, idx) => {
          const start = Number.parseFloat(String(seg.start ?? ""));
          const end = Number.parseFloat(String(seg.end ?? ""));
          if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
          const theme = palette[idx % palette.length];
          return {
            start: Math.max(0, Math.round(start)),
            end: Math.max(0, Math.round(end)),
            label: asString(seg.label, tr(`Feature Segment ${idx + 1}`, `功能片段 ${idx + 1}`)),
            accent: theme.accent,
            emoji: theme.emoji,
            caption: asString(seg.caption, features[idx] || ""),
          } as FeatureSegment;
        })
        .filter((v): v is FeatureSegment => Boolean(v))
        .slice(0, 3);
    };

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
      let analyzedSource = "";
      let analyzedFeatures: string[] = [];
      let analyzedSegments: FeatureSegment[] = [];

      if (demoVideoFile) {
        const analyzeForm = new FormData();
        analyzeForm.append("file", demoVideoFile, demoVideoFile.name || "demo.mp4");
        analyzeForm.append(
          "prompt",
          tr(
            "Extract up to 3 key feature demonstrations from this product demo with accurate time ranges.",
            "从这个产品演示里提取最多 3 个关键功能演示，并给出准确时间范围。",
          ),
        );

        try {
          const analyzeResp = await fetch("/api/video/analyze", {
            method: "POST",
            body: analyzeForm,
          });
          const analyzeData = (await analyzeResp.json()) as AnalyzeApiResponse;

          if (analyzeResp.ok) {
            analyzedSource = asString(analyzeData.source_engine);
            analyzedFeatures = Array.isArray(analyzeData.features)
              ? analyzeData.features
                  .map((v) => asString(v))
                  .filter(Boolean)
                  .slice(0, 3)
              : [];
            analyzedSegments = normalizeAnalyzeSegments(analyzeData, analyzedFeatures);
          }
        } catch {
          // Fall back to LLM-only defaults when video analyze fails.
        }
      }

      const features = [analyzedFeatures[0], analyzedFeatures[1], analyzedFeatures[2]].map(
        (v, i) => v?.trim() || rawFeatures[i]?.trim() || defaultFeatures[i],
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
      const featureSegments = analyzedSegments.length > 0 ? analyzedSegments : mockSegments;
      const clippedFeatureSegments =
        demoVideoFile && featureSegments.length > 0
          ? await buildFeatureSegmentClips(demoVideoFile, featureSegments)
          : featureSegments;

      const nextSteps = steps.map((s) => {
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
                  const seg = clippedFeatureSegments[i];
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
        });

      const nextActiveStepId: StepId = "importance";
      const aiMessage: ChatMsg = {
        role: "ai",
        tag: tr("Submission Parsed", "已读取提交材料"),
        text: demoVideo
          ? tr(
              analyzedSource
                ? `Read ${submission.length} chars, loaded "${demoVideo.name}", and used ${analyzedSource} video analyze + LLM to fill steps 2-6. Review Step 2 to Step 6 👀`
                : `Read ${submission.length} chars, loaded "${demoVideo.name}", and used LLM to fill steps 2-6. Review Step 2 to Step 6 👀`,
              analyzedSource
                ? `读完你的提交材料（${submission.length} 字）并加载了「${demoVideo.name}」，已用 ${analyzedSource} 视频分析 + LLM 自动填完第2到第6步。先从 Step 2 开始检查 👀`
                : `读完你的提交材料（${submission.length} 字）并加载了「${demoVideo.name}」，已用 LLM 自动填完第2到第6步。先从 Step 2 开始检查 👀`,
            )
          : tr(
              `Read ${submission.length} chars and used LLM to fill steps 2-6. Review Step 2 to Step 6 👀`,
              `读完你的提交材料（${submission.length} 字），已用 LLM 自动填完第2到第6步。先从 Step 2 开始检查 👀`,
            ),
      };
      const nextChat = [...chat, aiMessage];

      setSteps(nextSteps);
      setChat(nextChat);
      setActiveStepId(nextActiveStepId);
      saveWorkflowDraft({
        steps: nextSteps,
        activeStepId: nextActiveStepId,
        chat: nextChat,
        projectName,
        submission,
      });

      setStage("workflow");
      if (pathname !== "/workflow") {
        router.push("/workflow");
      }
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
      if (pathname !== "/workflow") {
        router.push("/workflow");
      }
    } finally {
      setParsing(false);
    }
  }

  function formatTime(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

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

  async function aiSuggest(stepId: StepId) {
    setActiveStepId(stepId);
    setChatError(null);

    const step = steps.find((s) => s.id === stepId);
    if (!step) return;

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

    const escapeRegExp = (value: string): string =>
      value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const cleanupValue = (value: string): string =>
      value
        .replace(/^[-*•\s]+/, "")
        .replace(/\*\*/g, "")
        .replace(/^["'`]|["'`,]$/g, "")
        .trim();

    const extractLooseFieldValues = (raw: string): Record<string, string> => {
      const out: Record<string, string> = {};
      const lines = raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      for (const field of step.fields) {
        const keyPattern = new RegExp(
          `^["'\`]?${escapeRegExp(field.key)}["'\`]?\\s*[:：]\\s*(.+)$`,
          "i",
        );
        const labelPattern = new RegExp(
          `^["'\`]?${escapeRegExp(field.label)}["'\`]?\\s*[:：]\\s*(.+)$`,
          "i",
        );

        let hit = "";
        for (const line of lines) {
          const km = line.match(keyPattern);
          if (km?.[1]) {
            hit = cleanupValue(km[1]);
            break;
          }
          const lm = line.match(labelPattern);
          if (lm?.[1]) {
            hit = cleanupValue(lm[1]);
            break;
          }
        }

        if (!hit) {
          const inlineJsonLike = raw.match(
            new RegExp(`"${escapeRegExp(field.key)}"\\s*:\\s*"([^"]+)"`, "i"),
          );
          if (inlineJsonLike?.[1]) {
            hit = cleanupValue(inlineJsonLike[1]);
          }
        }

        if (hit) out[field.key] = hit;
      }

      return out;
    };

    const pickChatContentText = (payload: unknown): string => {
      const root = payload as {
        choices?: Array<{
          message?: {
            content?: unknown;
          };
        }>;
      };
      const content = root?.choices?.[0]?.message?.content;
      if (typeof content === "string") return content;
      if (Array.isArray(content)) {
        const joined = content
          .map((part) => {
            if (typeof part === "string") return part;
            if (part && typeof part === "object" && "text" in part) {
              const text = (part as { text?: unknown }).text;
              return typeof text === "string" ? text : "";
            }
            return "";
          })
          .filter(Boolean)
          .join("\n");
        return joined;
      }
      return "";
    };

    const baseContext = {
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
      impact: getFieldValue("impact", "impact"),
    };

    setChatLoading(true);
    try {
      const schemaLines = step.fields.map((f) => `  "${f.key}": "string"`).join(",\n");
      const stepFieldLines = step.fields
        .map((f) => `${f.key} | ${f.label} | current="${f.value || "(empty)"}" | placeholder="${f.placeholder}"`)
        .join("\n");

      const buildMessages = (forceJson = false) => [
        {
          role: "system",
          content: [
            tr(
              "You are DemoDance copilot. Fill the requested step with practical, concrete launch-video copy.",
              "你是 DemoDance 助手。请为指定步骤生成实用、具体的 launch 视频文案。",
            ),
            tr(
              "Return strict JSON only, no markdown, no explanation.",
              "只返回严格 JSON，不要 markdown，不要解释。",
            ),
            forceJson
              ? tr(
                  "IMPORTANT: Output must be a valid JSON object. Do not return empty output.",
                  "重要：输出必须是合法 JSON 对象，禁止空输出。",
                )
              : "",
          ]
            .filter(Boolean)
            .join("\n"),
        },
        {
          role: "user",
          content: [
            `Language: ${isEn ? "English" : "Chinese"}`,
            `Step: ${step.title}`,
            "",
            "JSON schema:",
            "{",
            schemaLines,
            "}",
            "",
            "Step fields:",
            stepFieldLines,
            "",
            "Project context:",
            `targetUser=${baseContext.targetUser || "(empty)"}`,
            `problem=${baseContext.problem || "(empty)"}`,
            `evidence=${baseContext.evidence || "(empty)"}`,
            `productName=${baseContext.productName || "(empty)"}`,
            `slogan=${baseContext.slogan || "(empty)"}`,
            `features=${baseContext.features.filter(Boolean).join(" | ") || "(empty)"}`,
            `techStack=${baseContext.techStack || "(empty)"}`,
            `impact=${baseContext.impact || "(empty)"}`,
          ].join("\n"),
        },
      ];

      let rawText = "";
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const resp = await fetch("/api/text/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            temperature: 0.4,
            max_tokens: 420,
            messages: buildMessages(attempt > 0),
          }),
        });

        const data = await resp.json();
        if (!resp.ok) {
          throw new Error(String((data as { error?: unknown })?.error || "AI suggest request failed"));
        }

        rawText = pickChatContentText(data).trim();
        if (rawText) break;
        console.log("[aiSuggest] empty raw output, retry attempt:", attempt + 1);
      }

      console.log("[aiSuggest] step:", stepId, step.title);
      console.log("[aiSuggest] raw output preview:", rawText.slice(0, 800));

      const strictParsed = extractJsonObject(rawText);
      const looseParsed = strictParsed ? null : extractLooseFieldValues(rawText);
      const parsed = strictParsed ?? looseParsed ?? {};

      console.log("[aiSuggest] parse mode:", strictParsed ? "json" : "loose");
      console.log("[aiSuggest] parsed keys:", Object.keys(parsed));

      const patch: Record<string, string> = {};
      for (const f of step.fields) {
        const next = parsed[f.key];
        const nextValue =
          typeof next === "string"
            ? next.trim()
            : Array.isArray(next)
              ? next.map((v) => String(v).trim()).filter(Boolean).join(" · ")
              : "";
        if (nextValue.length > 0) {
          patch[f.key] = nextValue;
        }
      }
      const appliedCount = Object.keys(patch).length;

      setSteps((prev) =>
        prev.map((s) =>
          s.id === stepId
            ? {
                ...s,
                fields: s.fields.map((f) =>
                  patch[f.key] ? { ...f, value: patch[f.key] } : f,
                ),
              }
            : s,
        ),
      );

      console.log("[aiSuggest] applied field count:", appliedCount);
      console.log("[aiSuggest] expected field keys:", step.fields.map((f) => f.key));

      if (appliedCount === 0) {
        throw new Error("AI suggest returned unparseable output");
      }

      setChat((c) => [
        ...c,
        {
          role: "ai",
          tag: `${tr("AI Suggestion", "AI 建议")} · ${step.title}`,
          text: tr(
            "Generated this step with LLM based on your current project context. Review and edit as needed.",
            "已基于你当前项目上下文用 LLM 生成这一步内容。你可以继续微调。",
          ),
        },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setChatError(message);
      setChat((c) => [
        ...c,
        {
          role: "ai",
          tag: tr("AI Suggest Failed", "AI 建议失败"),
          text: tr(
            `I couldn't generate this step just now (${message}). Please try again.`,
            `这一步刚才生成失败（${message}），请重试。`,
          ),
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  function summarizeStep(stepId: StepId): string {
    const step = steps.find((s) => s.id === stepId);
    if (!step) return tr("No content yet", "暂无内容");
    const text = step.fields
      .map((f) => f.value.trim())
      .filter((v) => v.length > 0)
      .join(" · ");
    if (!text) return tr("No content yet", "暂无内容");
    return text;
  }

  function getRenderTitle(stepId: StepId): string {
    return steps.find((s) => s.id === stepId)?.title ?? stepId;
  }

  function getRenderDuration(stepId: StepId): number {
    switch (stepId) {
      case "importance":
        return 14;
      case "product":
        return 10;
      case "features":
        return 28;
      case "tech":
        return 16;
      case "impact":
        return 8;
      default:
        return 10;
    }
  }

  function buildSectionPrompt(sectionId: StepId, title: string, summary: string): string {
    const cleanSummary = summary.trim().length > 0 ? summary : tr("No content yet", "暂无内容");
    return [
      `Section ID: ${sectionId}`,
      `Section Title: ${title}`,
      `Duration Target: ${getRenderDuration(sectionId)}s`,
      "Instruction: Generate a concise launch-video section aligned with this context.",
      `Content Summary: ${cleanSummary}`,
    ].join("\n");
  }

  function getDefaultRenderSections(): RenderSection[] {
    const ids: StepId[] = ["importance", "product", "features", "tech", "impact"];
    return ids.map((id) => {
      const title = getRenderTitle(id);
      const summary = summarizeStep(id);
      return {
        id,
        title,
        status: "idle",
        durationSec: getRenderDuration(id),
        summary,
        prompt: buildSectionPrompt(id, title, summary),
        version: 0,
      };
    });
  }

  function updateSectionPrompt(sectionId: StepId, prompt: string) {
    setSectionRenders((prev) => {
      const current = prev.length ? prev : getDefaultRenderSections();
      return current.map((item) => (item.id === sectionId ? { ...item, prompt } : item));
    });
  }

  function resetSectionPrompt(sectionId: StepId) {
    setSectionRenders((prev) => {
      const current = prev.length ? prev : getDefaultRenderSections();
      return current.map((item) => {
        if (item.id !== sectionId) return item;
        const title = getRenderTitle(sectionId);
        const summary = summarizeStep(sectionId);
        return {
          ...item,
          title,
          summary,
          prompt: buildSectionPrompt(sectionId, title, summary),
        };
      });
    });
  }

  async function cancelVideoTask(taskId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/video/tasks/${taskId}`, {
        method: "DELETE",
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async function stopSectionGeneration(sectionId: StepId) {
    const section = sectionRenders.find((s) => s.id === sectionId);
    if (!section?.taskId || section.status !== "generating") return;

    const cancelled = await cancelVideoTask(section.taskId);
    setSectionRenders((prev) =>
      prev.map((item) =>
        item.id === sectionId
          ? {
              ...item,
              status: "idle",
              apiState: cancelled ? "cancelled" : "cancel_failed",
            }
          : item,
      ),
    );
  }

  async function stopAllGeneration() {
    stopGenerationRef.current = true;
    const runningTasks = sectionRenders
      .filter((s) => s.status === "generating" && s.taskId)
      .map((s) => ({ id: s.id, taskId: s.taskId as string }));

    await Promise.all(
      runningTasks.map(async ({ taskId }) => {
        await cancelVideoTask(taskId);
      }),
    );

    setSectionRenders((prev) =>
      prev.map((item) =>
        item.status === "generating"
          ? {
              ...item,
              status: "idle",
              apiState: "cancelled",
            }
          : item,
      ),
    );
    setRenderingAll(false);
  }

  async function generateOneSection(sectionId: StepId, apiPromptContext?: string) {
    if (stopGenerationRef.current) return false;
    setSectionRenders((prev) => {
      const current = prev.length ? prev : getDefaultRenderSections();
      return current.map((item) =>
        item.id === sectionId
          ? {
              ...item,
              status: "generating",
              summary: summarizeStep(sectionId),
              prompt:
                item.prompt?.trim().length > 0
                  ? item.prompt
                  : buildSectionPrompt(sectionId, getRenderTitle(sectionId), summarizeStep(sectionId)),
            }
          : item,
      );
    });

    let succeeded = false;
    let finalState = "idle";

    try {
      const summary = summarizeStep(sectionId);
      const currentSections = sectionRenders.length ? sectionRenders : getDefaultRenderSections();
      const currentSection = currentSections.find((s) => s.id === sectionId);
      const title = currentSection?.title ?? getRenderTitle(sectionId);
      const prompt =
        currentSection?.prompt?.trim() && currentSection.prompt.trim().length > 0
          ? currentSection.prompt
          : buildSectionPrompt(sectionId, title, summary);
      const finalPrompt = apiPromptContext?.trim()
        ? `${prompt}\n\nAdditional Prompt Context (from prompt APIs):\n${apiPromptContext}`
        : prompt;

      const targetDuration = currentSection?.durationSec ?? getRenderDuration(sectionId);

      let res = await fetch("/api/video/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: finalPrompt, duration: targetDuration }),
      });

      if (!res.ok) {
        console.warn("[video] create task with duration failed, retrying without duration", {
          sectionId,
          targetDuration,
          status: res.status,
        });
        res = await fetch("/api/video/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: finalPrompt }),
        });
      }

      if (!res.ok) throw new Error("Failed to start video task");

      const data = await res.json();
      const taskId = data.data?.task_id || data.task_id || data.data?.id || data.id;

      if (taskId) {
        setSectionRenders((prev) =>
          prev.map((item) => (item.id === sectionId ? { ...item, taskId } : item))
        );
        while (true) {
          if (stopGenerationRef.current) {
            await cancelVideoTask(taskId);
            finalState = "cancelled";
            throw new Error("Video task cancelled by user");
          }
          await new Promise((r) => setTimeout(r, 3000));
          const statusRes = await fetch(`/api/video/tasks/${taskId}`);
          const statusData = await statusRes.json();
          
          const state =
            statusData.data?.status || statusData.data?.state || statusData.status || statusData.state;

          let nextProgress: number | undefined = undefined;
          const rawProgress = statusData.data?.progress ?? statusData.progress;
          if (typeof rawProgress === "number") {
            nextProgress = rawProgress;
          } else if (typeof rawProgress === "string") {
            const p = parseFloat(rawProgress);
            if (!isNaN(p)) nextProgress = p;
          }

          setSectionRenders((prev) =>
            prev.map((item) => {
              if (item.id === sectionId) {
                const videoUrl = statusData.data?.content?.video_url || statusData.content?.video_url || statusData.data?.video_url || statusData.video_url;
                return { ...item, progress: nextProgress ?? item.progress, apiState: state, videoUrl: videoUrl || item.videoUrl, rawResponse: statusData };
              }
              return item;
            })
          );
          if (state === "succeeded") {
            succeeded = true;
            finalState = "succeeded";
            break;
          }
          if (state === "failed" || state === "cancelled") {
            finalState = state;
            throw new Error(`Video task ${state}`);
          }
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 700));
        succeeded = true;
        finalState = "succeeded";
      }
    } catch (error) {
      console.error("Video generation error:", error);
      await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 700));
    }

    setSectionRenders((prev) => {
      const current = prev.length ? prev : getDefaultRenderSections();
      return current.map((item) =>
        item.id === sectionId
          ? {
              ...item,
              status: succeeded ? "done" : "idle",
              durationSec: getRenderDuration(sectionId),
              summary: summarizeStep(sectionId),
              prompt:
                item.prompt?.trim().length > 0
                  ? item.prompt
                  : buildSectionPrompt(sectionId, getRenderTitle(sectionId), summarizeStep(sectionId)),
              version: succeeded ? item.version + 1 : item.version,
              apiState: succeeded ? "succeeded" : finalState,
            }
          : item,
      );
    });
    return succeeded;
  }

  async function startSectionGeneration() {
    stopGenerationRef.current = false;
    setExportReady(false);
    setExportFileName(null);
    setCombining(false);
    setRenderingAll(true);
    setSectionRenders((prev) => {
      if (!prev.length) return getDefaultRenderSections();
      return prev.map((item) => {
        const title = getRenderTitle(item.id);
        const summary = summarizeStep(item.id);
        return {
          ...item,
          title,
          summary,
          durationSec: getRenderDuration(item.id),
          status: "idle",
          prompt:
            item.prompt?.trim().length > 0
              ? item.prompt
              : buildSectionPrompt(item.id, title, summary),
        };
      });
    });

    const apiPromptContext = await buildRenderApiPromptContext();

    const ids: StepId[] = ["importance", "product", "features", "tech", "impact"];
    for (const id of ids) {
      if (stopGenerationRef.current) break;
      // eslint-disable-next-line no-await-in-loop
      await generateOneSection(id, apiPromptContext);
    }

    setRenderingAll(false);
  }

  async function regenerateSection(sectionId: StepId) {
    if (renderingAll || combining) return;
    setExportReady(false);
    setExportFileName(null);
    const apiPromptContext = await buildRenderApiPromptContext();
    await generateOneSection(sectionId, apiPromptContext);
  }

  async function manualFetchStatus(sectionId: StepId) {
    const section = sectionRenders.find((s) => s.id === sectionId);
    if (!section || !section.taskId || section.status !== "generating") return;

    try {
      const statusRes = await fetch(`/api/video/tasks/${section.taskId}`);
      const statusData = await statusRes.json();
      
      const state =
        statusData.data?.status || statusData.data?.state || statusData.status || statusData.state;

      let nextProgress: number | undefined = undefined;
      const rawProgress = statusData.data?.progress ?? statusData.progress;
      if (typeof rawProgress === "number") {
        nextProgress = rawProgress;
      } else if (typeof rawProgress === "string") {
        const p = parseFloat(rawProgress);
        if (!isNaN(p)) nextProgress = p;
      }

      setSectionRenders((prev) =>
        prev.map((item) => {
          if (item.id === sectionId) {
            const videoUrl = statusData.data?.content?.video_url || statusData.content?.video_url || statusData.data?.video_url || statusData.video_url;
            const isDone = state === "succeeded";
            return {
              ...item,
              progress: nextProgress ?? item.progress,
              apiState: state,
              videoUrl: videoUrl || item.videoUrl,
              rawResponse: statusData,
              status: isDone ? "done" : item.status,
              version: isDone ? item.version + 1 : item.version,
            };
          }
          return item;
        })
      );
    } catch (error) {
      console.error("Manual fetch failed", error);
    }
  }

  async function combineAndExport() {
    if (combining) return;
    setCombining(true);
    setExportReady(false);
    setExportFileName(null);
    if (exportFileUrl) URL.revokeObjectURL(exportFileUrl);
    setExportFileUrl(null);

    try {
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const { fetchFile, toBlobURL } = await import("@ffmpeg/util");

      const ffmpeg = new FFmpeg();
      
      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });

      const validSections = sectionRenders.filter(s => s.status === "done" && s.videoUrl);
      
      if (validSections.length === 0) {
        throw new Error("No completed video sections found to combine.");
      }
      
      let concatList = "";
      
      for (let i = 0; i < validSections.length; i++) {
        const s = validSections[i];
        const proxyUrl = `/api/video/proxy?url=${encodeURIComponent(s.videoUrl!)}`;
        const inputName = `input${i}.mp4`;
        await ffmpeg.writeFile(inputName, await fetchFile(proxyUrl));
        concatList += `file '${inputName}'\n`;
      }
      
      await ffmpeg.writeFile("concat.txt", concatList);
      
      await ffmpeg.exec(["-f", "concat", "-safe", "0", "-i", "concat.txt", "-c", "copy", "output.mp4"]);
      
      const data = await ffmpeg.readFile("output.mp4");
      const bytes =
        data instanceof Uint8Array ? Uint8Array.from(data) : new TextEncoder().encode(String(data));
      const blob = new Blob([bytes.buffer], { type: "video/mp4" });
      const url = URL.createObjectURL(blob);
      
      const name = (projectName || "DemoDance").trim().replace(/\s+/g, "_");
      setExportFileName(`${name}_final.mp4`);
      setExportFileUrl(url);
      setExportReady(true);
    } catch (e) {
      console.error("FFmpeg combine failed", e);
      alert(locale === "en" ? "Failed to combine videos." : "视频拼接失败。");
    } finally {
      setCombining(false);
    }
  }

  function scrollToRenderPanel() {
    renderPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function getFieldValue(stepId: StepId, fieldKey: string): string {
    return steps.find((s) => s.id === stepId)?.fields.find((f) => f.key === fieldKey)?.value ?? "";
  }

  function takePromptSnippet(raw: string, maxLen = 800): string {
    const text = raw.trim();
    if (!text) return "";
    return text.length > maxLen ? text.slice(0, maxLen) : text;
  }

  async function buildRenderApiPromptContext(): Promise<string> {
    const storyBody = {
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
    };
    const sceneBody = {
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
    };
    const voiceBody = {
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
    };

    try {
      const [storyResp, sceneResp, voiceResp] = await Promise.all([
        fetch("/api/story/prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(storyBody),
        }),
        fetch("/api/scene/prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sceneBody),
        }),
        fetch("/api/voice/prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(voiceBody),
        }),
      ]);

      const parts: string[] = [];
      if (storyResp.ok) {
        const storyData = await storyResp.json();
        const storyPrompt =
          typeof storyData?.prompt === "string" ? takePromptSnippet(storyData.prompt, 900) : "";
        if (storyPrompt) parts.push(`Story Prompt Snippet:\n${storyPrompt}`);
      }
      if (sceneResp.ok) {
        const sceneData = await sceneResp.json();
        const scenePrompt =
          typeof sceneData?.prompt === "string" ? takePromptSnippet(sceneData.prompt, 700) : "";
        if (scenePrompt) parts.push(`Scene Prompt Snippet:\n${scenePrompt}`);
      }
      if (voiceResp.ok) {
        const voiceData = await voiceResp.json();
        const voicePrompt =
          typeof voiceData?.prompt === "string" ? takePromptSnippet(voiceData.prompt, 700) : "";
        if (voicePrompt) parts.push(`Voice Prompt Snippet:\n${voicePrompt}`);
      }
      return parts.join("\n\n");
    } catch (error) {
      console.warn("[render] prompt API context unavailable:", error);
      return "";
    }
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

  async function generateLogo() {
    if (logoGenerating) return;
    setLogoGenerating(true);
    setChatError(null);

    const productName = getFieldValue("product", "name").trim() || projectName.trim() || "DemoDance";
    const slogan = getFieldValue("product", "slogan").trim();
    const user = getFieldValue("audience", "user").trim();

    const prompt = [
      `Create a clean, modern app logo for a product named "${productName}".`,
      slogan ? `Tagline/context: ${slogan}.` : "",
      user ? `Target users: ${user}.` : "",
      "Style: minimal, bold, high contrast, icon-first mark with transparent-like simple background.",
      "No complex text blocks. Avoid photorealism.",
      "Square composition, suitable for product launch page.",
    ]
      .filter(Boolean)
      .join(" ");
    setLastLogoPrompt(prompt);

    try {
      const response = await fetch("/api/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          aspect_ratio: "1:1",
          size: "1K",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? "Failed to generate logo");
      }

      const logoUrl = typeof data?.data?.[0]?.url === "string" ? data.data[0].url : "";
      if (!logoUrl) {
        throw new Error("No logo image returned");
      }

      updateField("product", "logo", logoUrl);
      setActiveStepId("product");
      setChat((c) => [
        ...c,
        {
          role: "ai",
          tag: tr("Logo Generated", "Logo 已生成"),
          text: tr(
            "Generated a new logo with Google GenAI and filled Product → Logo.",
            "已用 Google GenAI 生成新 Logo，并写入 Product → Logo。",
          ),
        },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setChatError(message);
      setChat((c) => [
        ...c,
        {
          role: "ai",
          tag: tr("Logo Failed", "Logo 生成失败"),
          text: tr(
            `Logo generation failed: ${message}`,
            `Logo 生成失败：${message}`,
          ),
        },
      ]);
    } finally {
      setLogoGenerating(false);
    }
  }

  const allDone = progress.every((p) => p.status === "done");
  const allSectionsDone =
    sectionRenders.length === 5 && sectionRenders.every((section) => section.status === "done");
  const displaySections = sectionRenders.length > 0 ? sectionRenders : getDefaultRenderSections();
  const activeSectionPrompt = activeSectionPromptId
    ? displaySections.find((section) => section.id === activeSectionPromptId) ?? null
    : null;
  const stepOrder: StepId[] = ["audience", "importance", "product", "features", "tech", "impact"];
  const activeStepIndex = stepOrder.indexOf(activeStepId);
  const prevStepId = activeStepIndex > 0 ? stepOrder[activeStepIndex - 1] : null;
  const nextStepId = activeStepIndex >= 0 && activeStepIndex < stepOrder.length - 1 ? stepOrder[activeStepIndex + 1] : null;

  if (stage === "onboard") {
    const canStart = submission.trim().length >= 20 && !parsing;
    return (
      <OnboardingScreen
        locale={locale}
        isEn={isEn}
        submission={submission}
        demoVideo={demoVideo}
        parsing={parsing}
        canStart={canStart}
        tr={tr}
        onLocaleChange={setLocale}
        onSubmissionChange={setSubmission}
        onDemoVideoSelect={(file) => {
          if (demoVideo?.url) URL.revokeObjectURL(demoVideo.url);
          setDemoVideoFile(file);
          setDemoVideo({ name: file.name, size: file.size, url: URL.createObjectURL(file) });
        }}
        onStart={handleStart}
        onSkip={() => {
          saveWorkflowDraft({
            steps,
            activeStepId,
            chat,
            projectName,
            submission,
          });
          setStage("workflow");
          if (pathname !== "/workflow") {
            router.push("/workflow");
          }
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-50 text-zinc-900">
      <WorkflowHeader
        locale={locale}
        isEn={isEn}
        overallFilled={overallFilled}
        totalSteps={steps.length}
        projectName={projectName}
        prevStepId={prevStepId}
        nextStepId={nextStepId}
        allDone={allDone}
        tr={tr}
        onBackHome={() => {
          setStage("onboard");
          if (pathname === "/workflow") {
            router.push("/");
          }
        }}
        onLocaleChange={setLocale}
        onProjectNameChange={setProjectName}
        onPrevStep={() => {
          if (prevStepId) setActiveStepId(prevStepId);
        }}
        onNextStep={() => {
          if (nextStepId) setActiveStepId(nextStepId);
        }}
        onGoToGenerate={scrollToRenderPanel}
      />

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
                                className="relative shrink-0 w-28 h-16 rounded-md overflow-hidden group bg-black"
                                title={tr("Play this segment", "播放该片段")}
                              >
                                {f.segment.clipUrl ? (
                                  <video
                                    src={f.segment.clipUrl}
                                    muted
                                    playsInline
                                    className="absolute inset-0 w-full h-full object-cover"
                                  />
                                ) : (
                                  <div
                                    className="absolute inset-0"
                                    style={{
                                      background: `linear-gradient(135deg, ${f.segment.accent} 0%, rgba(0,0,0,0.85) 100%)`,
                                    }}
                                  >
                                    <div className="absolute inset-0 flex items-center justify-center text-xl">
                                      {f.segment.emoji}
                                    </div>
                                  </div>
                                )}
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
                            <div>
                              <textarea
                                value={f.value}
                                onChange={(e) => updateField(s.id, f.key, e.target.value)}
                                placeholder={f.placeholder}
                                rows={f.value.length > 60 ? 3 : 1}
                                className="w-full bg-transparent text-[13px] text-zinc-800 resize-none focus:outline-none placeholder:text-zinc-300"
                              />
                              {s.id === "product" && f.key === "logo" && lastLogoPrompt && (
                                <details className="mt-2 rounded border border-zinc-200 bg-white p-2">
                                  <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-zinc-500">
                                    {tr("Logo Prompt", "Logo Prompt")}
                                  </summary>
                                  <pre className="mt-2 whitespace-pre-wrap text-[11px] leading-relaxed text-zinc-700">
                                    {lastLogoPrompt}
                                  </pre>
                                </details>
                              )}
                            </div>
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

            <section ref={renderPanelRef} className="mt-8 bg-white border border-zinc-200 rounded-xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">
                    {tr("Section Video Generation", "分段视频生成")}
                  </h3>
                  <p className="text-[12px] text-zinc-500 mt-1">
                    {tr(
                      "Generate section clips in this page, regenerate any section, then combine and export.",
                      "在本页分段生成视频，可单段重新生成，最后组合导出。",
                    )}
                  </p>
                </div>
                <button
                  onClick={startSectionGeneration}
                  disabled={!allDone || renderingAll || combining}
                  className={`text-xs px-3 py-1.5 rounded font-medium ${
                    !allDone || renderingAll || combining
                      ? "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                      : "bg-black text-white hover:bg-zinc-800"
                  }`}
                >
                  {renderingAll
                    ? tr("Generating...", "生成中...")
                    : tr("Start Generate Video", "开始生成视频")}
                </button>
                <button
                  onClick={stopAllGeneration}
                  disabled={!renderingAll}
                  className={`text-xs px-3 py-1.5 rounded font-medium ${
                    renderingAll
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                  }`}
                >
                  {tr("Stop", "停止")}
                </button>
              </div>

              <div className="mt-4 grid gap-3">
                {displaySections.map((section) => (
                    <div
                      key={section.id}
                      className="border border-zinc-200 rounded-lg p-3 bg-zinc-50/70"
                    >
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium flex-1">{section.title}</div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1.5 ${
                            section.status === "done"
                              ? "bg-emerald-100 text-emerald-700"
                              : section.status === "generating"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-zinc-100 text-zinc-500"
                          }`}
                        >
                          {section.status === "generating" && (
                            <svg className="animate-spin h-2.5 w-2.5 text-amber-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          )}
                          {section.status === "done"
                            ? tr(`Done · v${section.version}`, `已完成 · v${section.version}`)
                            : section.status === "generating"
                              ? (typeof section.progress === "number" && section.progress > 0 
                                  ? tr(`Generating ${section.progress}%`, `生成中 ${section.progress}%`) 
                                  : section.apiState === "queued" ? tr("Queued...", "排队中...") : tr("Generating...", "生成中..."))
                              : tr("Waiting", "待生成")}
                        </span>
                      </div>
                      <div className="text-[12px] text-zinc-500 mt-1">
                        {tr(`Duration: ${section.durationSec}s`, `时长：${section.durationSec}秒`)}
                      </div>
                      <div className="text-[12px] text-zinc-700 mt-2">{section.summary}</div>
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          onClick={() => setActiveSectionPromptId(section.id)}
                          className="text-xs px-2.5 py-1 rounded border border-zinc-300 hover:bg-zinc-100"
                        >
                          {tr("Preview Prompt", "预览 Prompt")}
                        </button>
                        <button
                          onClick={() => resetSectionPrompt(section.id)}
                          className="text-xs px-2.5 py-1 rounded border border-zinc-300 hover:bg-zinc-100"
                        >
                          {tr("Reset Prompt", "重置 Prompt")}
                        </button>
                        <button
                          onClick={() => regenerateSection(section.id)}
                          disabled={renderingAll || combining || section.status === "generating"}
                          className={`text-xs px-2.5 py-1 rounded border ${
                            renderingAll || combining || section.status === "generating"
                              ? "border-zinc-200 text-zinc-400 cursor-not-allowed"
                              : "border-zinc-300 hover:bg-zinc-100"
                          }`}
                        >
                          {section.status === "done"
                            ? tr("Regenerate", "重新生成")
                            : tr("Generate", "生成")}
                        </button>
                        {section.status === "generating" && (
                          <>
                            <button
                              onClick={() => manualFetchStatus(section.id)}
                              className="text-xs px-2.5 py-1 rounded border border-zinc-300 hover:bg-zinc-100"
                            >
                              {tr("Manual Fetch", "手动刷新进度")}
                            </button>
                            <button
                              onClick={() => stopSectionGeneration(section.id)}
                              className="text-xs px-2.5 py-1 rounded border border-red-300 text-red-700 hover:bg-red-50"
                            >
                              {tr("Stop", "停止")}
                            </button>
                          </>
                        )}
                        {section.status === "done" && (
                          <>
                            <span className="text-[11px] text-zinc-500">
                              {tr("Clip ready", "片段已就绪")}
                              <span className="text-zinc-400 ml-1">({section.apiState || "no-api-state"})</span>
                            </span>
                            {section.videoUrl ? (
                              <a
                                href={section.videoUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs px-2.5 py-1 rounded border border-emerald-300 text-emerald-700 hover:bg-emerald-50 ml-1"
                              >
                                {tr("Preview", "预览")}
                              </a>
                            ) : (
                              <div className="flex flex-col gap-1 w-full mt-2 border-t border-zinc-200 pt-2">
                                <span className="text-xs text-red-500 border border-red-200 rounded px-1 w-fit">
                                  No URL Extracted
                                </span>
                                {!!section.rawResponse && (
                                  <details className="text-[10px] text-zinc-500 overflow-hidden bg-zinc-100 rounded p-1">
                                    <summary className="cursor-pointer font-medium text-zinc-600">Raw API Response</summary>
                                    <pre className="max-h-32 overflow-y-auto mt-1 p-1 bg-zinc-200 rounded">{JSON.stringify(section.rawResponse, null, 2)}</pre>
                                  </details>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-zinc-200 flex items-center gap-2">
                <button
                  onClick={combineAndExport}
                  disabled={!allSectionsDone || combining}
                  className={`text-xs px-3 py-1.5 rounded font-medium ${
                    !allSectionsDone || combining
                      ? "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                      : "bg-emerald-600 text-white hover:bg-emerald-700"
                  }`}
                >
                  {combining ? tr("Combining...", "组合中...") : tr("Combine & Export", "组合并导出")}
                </button>
                {exportReady && exportFileName && exportFileUrl && (
                  <a 
                    href={exportFileUrl}
                    download={exportFileName}
                    className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-3 py-1.5 hover:bg-emerald-100 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    {tr("Download:", "下载：")} {exportFileName}
                  </a>
                )}
              </div>
            </section>

            <div className="h-12" />
          </div>
        </main>

        <WorkflowChatSidebar
          activeStepTitle={steps.find((s) => s.id === activeStepId)?.title ?? ""}
          chat={chat}
          input={input}
          chatLoading={chatLoading}
          chatError={chatError}
          logoGenerating={logoGenerating}
          tr={tr}
          chatEndRef={chatEndRef}
          onInputChange={setInput}
          onSendMessage={sendMessage}
          onGenerateLogo={generateLogo}
        />
      </div>

      <SegmentPreviewModal
        segment={previewSegment}
        demoVideo={demoVideo}
        formatTime={formatTime}
        tr={tr}
        onClose={() => setPreviewSegment(null)}
      />

      <PromptPreviewModal
        title="Story Prompt Preview"
        content={storyPromptPreview}
        sources={storyPromptSources}
        onClose={() => setStoryPromptPreview(null)}
      />
      <PromptPreviewModal
        title="Voice Prompt Preview"
        content={voicePromptPreview}
        sources={voicePromptSources}
        onClose={() => setVoicePromptPreview(null)}
      />
      <PromptPreviewModal
        title="Scene Prompt Preview"
        content={scenePromptPreview}
        sources={scenePromptSources}
        onClose={() => setScenePromptPreview(null)}
      />
      <SectionPromptModal
        open={Boolean(activeSectionPrompt)}
        title={
          activeSectionPrompt
            ? tr(`${activeSectionPrompt.title} · Prompt`, `${activeSectionPrompt.title} · Prompt`)
            : ""
        }
        value={activeSectionPrompt?.prompt ?? ""}
        resetLabel={tr("Reset Prompt", "重置 Prompt")}
        closeLabel={tr("Done", "完成")}
        onChange={(next) => {
          if (!activeSectionPrompt) return;
          updateSectionPrompt(activeSectionPrompt.id, next);
        }}
        onReset={() => {
          if (!activeSectionPrompt) return;
          resetSectionPrompt(activeSectionPrompt.id);
        }}
        onClose={() => setActiveSectionPromptId(null)}
      />

      <PromptErrorToast
        message={storyPromptError}
        label="Story prompt error"
        className="fixed bottom-4 right-4 text-xs bg-red-50 text-red-700 border border-red-200 px-3 py-2 rounded-md shadow"
      />
      <PromptErrorToast
        message={voicePromptError}
        label="Voice prompt error"
        className="fixed bottom-4 left-4 text-xs bg-red-50 text-red-700 border border-red-200 px-3 py-2 rounded-md shadow"
      />
      <PromptErrorToast
        message={scenePromptError}
        label="Scene prompt error"
        className="fixed bottom-20 left-4 text-xs bg-red-50 text-red-700 border border-red-200 px-3 py-2 rounded-md shadow"
      />

    </div>
  );
}
