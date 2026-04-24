import { getJson, postJson } from "@/app/_lib/client-api";
import type { Step, StepId } from "@/app/home/types";

type PromptComposeBody = {
  includeTechnicalArchitecture: boolean;
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

export type VideoTaskContent = {
  type: "text";
  text: string;
};

export type VideoTaskStatus = {
  state: string;
  progress?: number;
  videoUrl?: string;
  raw: unknown;
};

export function summarizeStep(steps: Step[], getStepScript: (stepId: StepId) => string, stepId: StepId): string {
  const step = steps.find((item) => item.id === stepId);
  if (!step) return "";
  const fieldsSummary = step.fields
    .map((field) => `${field.label}: ${field.value}`)
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

function buildPromptContext(
  steps: Step[],
  getStepScript: (stepId: StepId) => string,
  projectName: string,
): PromptComposeBody {
  const features = ["feature1", "feature2", "feature3"]
    .map((key) => getStepField(steps, "features", key))
    .filter(Boolean);

  return {
    includeTechnicalArchitecture: getStepScript("tech").trim().length > 0 || getStepField(steps, "tech", "stack").length > 0,
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
): Promise<{ summary: string; content: VideoTaskContent[] }> {
  const summary = summarizeStep(steps, getStepScript, sectionId);
  const sectionTitle = steps.find((item) => item.id === sectionId)?.title ?? sectionId;
  const payload = buildPromptContext(steps, getStepScript, projectName);
  const [storyPrompt, scenePrompt, voicePrompt] = await Promise.all([
    callPromptComposer("/api/story/prompt", payload),
    callPromptComposer("/api/scene/prompt", payload),
    callPromptComposer("/api/voice/prompt", payload),
  ]);

  return {
    summary,
    content: [
      {
        type: "text",
        text: [
          "Section production brief:",
          `Section ID: ${sectionId}`,
          `Section Title: ${sectionTitle}`,
          "Use this section summary as the highest-priority context:",
          summary || "(empty)",
        ].join("\n"),
      },
      { type: "text", text: `Story Prompt\n${storyPrompt}` },
      { type: "text", text: `Scene Prompt\n${scenePrompt}` },
      { type: "text", text: `Voice Prompt\n${voicePrompt}` },
    ],
  };
}

export async function createVideoTask(content: VideoTaskContent[]): Promise<string> {
  const created = await postJson<VideoTaskCreateResponse>("/api/video/tasks", { content }, "Failed to create video task");
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
