export type LocaleCode = "en" | "zh";

export type StepId = "audience" | "importance" | "product" | "features" | "tech" | "impact";

export type FeatureSegment = {
  start: number;
  end: number;
  label: string;
  accent: string;
  emoji: string;
  caption: string;
  clipUrl?: string;
};

export type Field = {
  key: string;
  label: string;
  value: string;
  placeholder: string;
  segment?: FeatureSegment;
};

export type Step = {
  id: StepId;
  index: number;
  title: string;
  subtitle: string;
  fields: Field[];
};

export type ChatMsg = {
  role: "ai" | "user";
  text: string;
  tag?: string;
};

export type RenderStatus = "idle" | "generating" | "done";

export type RenderSection = {
  id: StepId;
  title: string;
  status: RenderStatus;
  durationSec: number;
  summary: string;
  prompt: string;
  version: number;
  progress?: number;
  apiState?: string;
  taskId?: string;
  videoUrl?: string;
  rawResponse?: unknown;
};

export type DemoVideoMeta = {
  name: string;
  size: number;
  url?: string;
};

export function getInitialSteps(locale: LocaleCode): Step[] {
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
      title: isEn ? "Problem Importance" : "问题的重要性",
      subtitle: isEn ? "Summarize why this problem matters using the submission and demo context" : "结合提交文本和 demo 语境说明这个问题为什么重要",
      fields: [
        {
          key: "evidence",
          label: "Evidence Angle",
          value: "",
          placeholder: isEn ? "Summarize the signal, urgency, or demo proof..." : "总结需求信号、紧迫性或 demo 证明…",
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

export function getInitialChat(locale: LocaleCode): ChatMsg[] {
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
