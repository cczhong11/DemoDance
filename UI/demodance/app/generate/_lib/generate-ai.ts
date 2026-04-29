import { getJson, postJson } from "@/app/_lib/client-api";
import type { LocaleCode, Step, StepId } from "@/app/home/types";

type PromptComposeBody = {
  includeTechnicalArchitecture: boolean;
  language: LocaleCode;
  sectionId?: StepId;
  sectionTitle?: string;
  sectionSummary?: string;
  user: string;
  targetUser: string;
  problem: string;
  evidence: string;
  productName: string;
  slogan: string;
  features: string[];
  techStack: string;
  vision: string;
  deviceFrame: "desktop" | "mobile";
};

type PromptComposeResponse = {
  prompt?: unknown;
  error?: unknown;
};

type VideoTaskCreateResponse = {
  data?: {
    task_id?: unknown;
    id?: unknown;
  };
  task_id?: unknown;
  id?: unknown;
  error?: unknown;
};

type VideoTaskStatusResponse = {
  data?: {
    status?: unknown;
    state?: unknown;
    progress?: unknown;
    video_url?: unknown;
    content?: {
      video_url?: unknown;
    };
  };
  status?: unknown;
  state?: unknown;
  progress?: unknown;
  video_url?: unknown;
  content?: {
    video_url?: unknown;
  };
  error?: unknown;
};

type ImageGenerationResponse = {
  data?: Array<{
    url?: unknown;
    b64_json?: unknown;
    mime_type?: unknown;
  }>;
  error?: unknown;
};

export type VideoTaskContent =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "image_url";
      image_url: {
        url: string;
      };
      role: "reference_image";
    };

export type VideoTaskStatus = {
  state: string;
  progress?: number;
  videoUrl?: string;
  raw: unknown;
};

const sectionOrder: StepId[] = ["audience", "importance", "product", "features", "tech", "impact"];

const relevantSectionMap: Record<StepId, StepId[]> = {
  audience: ["audience"],
  importance: ["audience", "importance"],
  product: ["audience", "importance", "product"],
  features: ["product", "features"],
  tech: ["product", "features", "tech"],
  impact: ["product", "features", "impact"],
};

export function summarizeStep(steps: Step[], getStepScript: (stepId: StepId) => string, stepId: StepId): string {
  const step = steps.find((item) => item.id === stepId);
  if (!step) return "";
  const fieldsSummary = step.fields
    .map((field) => {
      const rawValue = typeof field.value === "string" ? field.value.trim() : "";
      if (!rawValue) return `${field.label}: `;
      if (field.key === "logo") {
        return `${field.label}: ${rawValue.startsWith("data:image/") ? "[generated logo image attached separately]" : rawValue}`;
      }
      return `${field.label}: ${rawValue}`;
    })
    .filter((line) => !line.endsWith(": "))
    .join("\n");
  const script = getStepScript(step.id).trim();
  return script ? `${fieldsSummary}\nScript: ${script}` : fieldsSummary;
}

function getStepField(steps: Step[], stepId: StepId, fieldKey: string): string {
  const step = steps.find((item) => item.id === stepId);
  const field = step?.fields.find((item) => item.key === fieldKey);
  return typeof field?.value === "string" ? field.value.trim() : "";
}

function buildAllSectionsContext(
  steps: Step[],
  getStepScript: (stepId: StepId) => string,
  currentSectionId: StepId,
): string[] {
  const relevantSections = new Set(relevantSectionMap[currentSectionId] ?? [currentSectionId]);

  return sectionOrder
    .filter((stepId) => relevantSections.has(stepId))
    .map((stepId) => {
      const step = steps.find((item) => item.id === stepId);
      const summary = summarizeStep(steps, getStepScript, stepId).trim();
      if (!step || !summary) return "";
      const prefix = stepId === currentSectionId ? "[Current Chapter]" : "[Supporting Context]";
      return `${prefix} ${step.title}: ${summary.replace(/\n+/g, " | ")}`;
    })
    .filter(Boolean);
}

function buildStoryboardProductImageGuidance(steps: Step[], sectionId: StepId): string[] {
  const productName = getStepField(steps, "product", "name") || "the product";
  const slogan = getStepField(steps, "product", "slogan");
  const productLabel = slogan ? `${productName} (${slogan})` : productName;

  if (sectionId === "features") {
    return [
      `Branded product-image rule: this is Stage 4, the only storyboard allowed to visibly depict ${productLabel} as a branded product.`,
      "In this stage, it is okay to show the product hero screen, branded device/app surfaces, or a recognizable product visual if helpful to explain the features.",
    ];
  }

  return [
    "Branded product-image rule: do not show the product image in this storyboard.",
    `This is not Stage 4, so avoid hero shots of ${productLabel}, avoid splash screens, avoid prominent branded UI/product shots, and avoid any logo-centric composition.`,
    "Keep the visuals focused on the user problem, stakes, workflow context, or future outcome instead of the branded product reveal.",
  ];
}

function buildPromptContext(
  steps: Step[],
  getStepScript: (stepId: StepId) => string,
  projectName: string,
  language: LocaleCode,
  sectionId?: StepId,
  sectionTitle?: string,
  sectionSummary?: string,
): PromptComposeBody {
  const features = ["feature1", "feature2", "feature3"]
    .map((key) => getStepField(steps, "features", key))
    .filter(Boolean);

  return {
    includeTechnicalArchitecture: getStepScript("tech").trim().length > 0 || getStepField(steps, "tech", "stack").length > 0,
    language,
    sectionId,
    sectionTitle,
    sectionSummary,
    user: getStepField(steps, "audience", "user"),
    targetUser: getStepField(steps, "audience", "user"),
    problem: getStepField(steps, "audience", "problem"),
    evidence: getStepField(steps, "importance", "evidence"),
    productName: getStepField(steps, "product", "name") || projectName.trim(),
    slogan: getStepField(steps, "product", "slogan"),
    features,
    techStack: getStepField(steps, "tech", "stack"),
    vision: getStepField(steps, "impact", "impact"),
    deviceFrame: "desktop",
  };
}

async function callPromptComposer(
  endpoint: "/api/story/prompt" | "/api/scene/prompt" | "/api/voice/prompt",
  body: PromptComposeBody,
): Promise<string> {
  const data = await postJson<PromptComposeResponse>(endpoint, body, `${endpoint} failed`);
  if (typeof data.prompt !== "string" || !data.prompt.trim()) {
    throw new Error(`${endpoint} returned empty prompt`);
  }
  return data.prompt;
}

export async function buildSectionTaskContent(
  steps: Step[],
  getStepScript: (stepId: StepId) => string,
  projectName: string,
  sectionId: StepId,
  language: LocaleCode,
  storyboardFrames: string[] = [],
): Promise<{ prompt: string; summary: string; content: VideoTaskContent[] }> {
  const summary = summarizeStep(steps, getStepScript, sectionId);
  const sectionTitle = steps.find((item) => item.id === sectionId)?.title ?? sectionId;

  const referenceImages: VideoTaskContent[] = storyboardFrames
    .filter((frame) => typeof frame === "string" && frame.trim())
    .map((frame) => ({
      type: "image_url",
      image_url: { url: frame },
      role: "reference_image",
    }));

  const logoUrl = sectionId === "product" ? getStepField(steps, "product", "logo") : "";
  if (logoUrl) {
    referenceImages.push({
      type: "image_url",
      image_url: { url: logoUrl },
      role: "reference_image",
    });
  }

  const referenceNotes: string[] = [];
  if (referenceImages.length > 0) {
    const storyboardCount = storyboardFrames.filter(Boolean).length;
    if (storyboardCount > 0) {
      referenceNotes.push(
        `Use [Image 1]${storyboardCount > 1 ? ` through [Image ${storyboardCount}]` : ""} as storyboard reference images for shot composition, pacing, and visual continuity.`,
      );
    }
    if (logoUrl) {
      referenceNotes.push(
        `Use [Image ${referenceImages.length}] as the brand logo reference. In this Product Intro chapter, keep the logo shape, color, and brand feel recognizable when it appears in UI, packaging, splash screen, or title-card moments.`,
      );
    }
  }

  const textBlocks = [
    [
      "Section production brief:",
      `Section ID: ${sectionId}`,
      `Section Title: ${sectionTitle}`,
      "Use this section summary as the highest-priority context:",
      summary || "(empty)",
      "",
      ...referenceNotes,
      ...(referenceNotes.length > 0 ? [""] : []),
      "Final instruction: generate only this section/chapter, not the full product video.",
    ].join("\n"),
  ];

  return {
    prompt: textBlocks.join("\n\n"),
    summary,
    content: [
      ...textBlocks.map((text) => ({
        type: "text" as const,
        text,
      })),
      ...referenceImages,
    ],
  };
}

export async function generateStoryboardFrames(
  steps: Step[],
  getStepScript: (stepId: StepId) => string,
  projectName: string,
  sectionId: StepId,
  language: LocaleCode,
): Promise<{ prompt: string; frames: string[] }> {
  const summary = summarizeStep(steps, getStepScript, sectionId);
  const sectionTitle = steps.find((item) => item.id === sectionId)?.title ?? sectionId;
  const payload = buildPromptContext(steps, getStepScript, projectName, language, sectionId, sectionTitle, summary);
  const scenePrompt = await callPromptComposer("/api/scene/prompt", payload);
  const allSectionsContext = buildAllSectionsContext(steps, getStepScript, sectionId);
  const productImageGuidance = buildStoryboardProductImageGuidance(steps, sectionId);
  const prompt = [
    "Create one single 2x2 storyboard board for exactly one chapter of a hackathon product demo video.",
    `Project: ${(projectName || "DemoDance").trim()}`,
    `Chapter: ${sectionTitle}`,
    `Only depict this chapter: ${sectionTitle}. Do not include scenes, claims, or transitions from other chapters.`,
    allSectionsContext.length > 0
      ? "Use only the relevant section context below from the workflow step as narrative grounding. The current chapter is the only one you should directly depict; the other sections are supporting context for continuity and positioning."
      : "",
    ...(allSectionsContext.length > 0 ? allSectionsContext : []),
    ...(allSectionsContext.length > 0 ? [""] : []),
    "Visual format: 16:9 cinematic storyboard frame, clean product-demo composition, readable UI surfaces, consistent lighting, polished but not poster-like.",
    "Output exactly one image containing a clean 2x2 storyboard layout.",
    "The four panels inside that single image should stay within this single chapter and show: chapter opening, primary action, supporting proof/detail, chapter close.",
    "Keep the panel spacing and composition clear so it reads as one storyboard board.",
    ...productImageGuidance,
    "Text inside the storyboard image should be as minimal as possible.",
    "Prefer zero text in the image. If text is absolutely necessary, use only very short labels of 1 to 3 words.",
    "Do not include paragraphs, captions, subtitles, dialog bubbles, dense UI copy, bullet lists, or explanatory annotations in the storyboard image.",
    "Keep UI screens visually simple and largely text-free so the storyboard can be turned into video more easily.",
    "Avoid text-heavy layouts, logos, watermarks, subtitles, and UI text that would be unreadable at small size.",
    "",
    "Chapter summary:",
    summary || "(empty)",
    "",
    "Scene guidance:",
    scenePrompt,
  ].join("\n");
  const result = await postJson<ImageGenerationResponse>(
    "/api/images/generations",
    {
      model: "gpt-image-2",
      prompt,
      n: 1,
      aspect_ratio: "16:9",
      size: "1536x1024",
      quality: "low",
      output_format: "webp",
      response_format: "url",
    },
    "Failed to generate storyboard images",
  );

  const frames = (Array.isArray(result.data) ? result.data : [])
    .map((item) => {
      if (typeof item.url === "string" && item.url) return item.url;
      if (typeof item.b64_json === "string" && item.b64_json) {
        const mimeType = typeof item.mime_type === "string" && item.mime_type ? item.mime_type : "image/webp";
        return `data:${mimeType};base64,${item.b64_json}`;
      }
      return "";
    })
    .filter(Boolean);

  if (frames.length === 0) {
    throw new Error("No storyboard images returned");
  }

  return { prompt, frames };
}

export async function createVideoTask(content: VideoTaskContent[], durationSec: number): Promise<string> {
  const created = await postJson<VideoTaskCreateResponse>(
    "/api/video/tasks",
    {
      content,
      ratio: "16:9",
      resolution: "720p",
      duration: Math.min(Math.max(durationSec, 5), 30),
      generate_audio: true,
    },
    "Failed to create video task",
  );
  const taskId = created.data?.task_id || created.task_id || created.data?.id || created.id;
  if (typeof taskId !== "string" || !taskId) {
    throw new Error("No task_id returned");
  }
  return taskId;
}

export async function loadVideoTaskStatus(taskId: string): Promise<VideoTaskStatus> {
  const statusData = await getJson<VideoTaskStatusResponse>(`/api/video/tasks/${taskId}`, "Failed to load video task status");
  const stateLike = statusData.data?.status || statusData.data?.state || statusData.status || statusData.state;
  const state = typeof stateLike === "string" ? stateLike : "";
  const rawProgress = statusData.data?.progress ?? statusData.progress;
  const progress = typeof rawProgress === "number" ? rawProgress : Number.parseFloat(String(rawProgress));
  const videoUrlLike =
    statusData.data?.content?.video_url ||
    statusData.content?.video_url ||
    statusData.data?.video_url ||
    statusData.video_url;
  return {
    state,
    progress: Number.isFinite(progress) ? progress : undefined,
    videoUrl: typeof videoUrlLike === "string" ? videoUrlLike : undefined,
    raw: statusData,
  };
}
