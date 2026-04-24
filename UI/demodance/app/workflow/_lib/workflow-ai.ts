import { extractJsonObject, readAssistantText } from "@/app/_lib/assistant-response";
import { postJson } from "@/app/_lib/client-api";
import type { Step, StepId } from "@/app/home/types";

type TextChatResponse = {
  choices?: Array<{ message?: { content?: unknown } }>;
  error?: unknown;
};

type ImageGenerationResponse = {
  data?: Array<{ url?: unknown }>;
  error?: unknown;
};

export const workflowStepOrder: StepId[] = ["audience", "importance", "product", "features", "tech", "impact"];

export const workflowStepUiMap: Record<StepId, { en: string; zh: string }> = {
  audience: { en: "Target User & Problem", zh: "目标用户与问题" },
  importance: { en: "Why It Matters", zh: "为什么重要" },
  product: { en: "Product Intro", zh: "产品介绍" },
  features: { en: "Features", zh: "核心功能" },
  tech: { en: "Tech Stack", zh: "技术栈" },
  impact: { en: "Future Impact", zh: "未来影响" },
};

export function fieldCounter(fieldKey: string): number {
  if (fieldKey === "name") return 60;
  if (fieldKey === "slogan") return 80;
  if (fieldKey === "logo") return 800;
  if (fieldKey === "stack") return 320;
  return 2000;
}

export async function callTextChat(prompt: string): Promise<string> {
  const data = await postJson<TextChatResponse>("/api/text/chat", { prompt }, "Text API failed");
  const text = readAssistantText(data);
  if (!text.trim()) throw new Error("Empty response from text model");
  return text;
}

export function buildSuggestPrompt(locale: "en" | "zh", activeStep: Step, currentScript: string): string {
  const schema = activeStep.fields.map((field) => `  "${field.key}": "string"`).join(",\n");
  const current = activeStep.fields.map((field) => `${field.label}: ${field.value || "(empty)"}`).join("\n");
  return [
    "You are DemoDance copilot.",
    "Return only JSON object, no markdown.",
    `Locale: ${locale}`,
    `Current Step: ${activeStep.title}`,
    "Fill concise, practical launch-video copy for current step fields.",
    "JSON schema:",
    `{\n${schema}${schema ? ",\n" : ""}  "script": "string"\n}`,
    "Current values:",
    current,
    "Current script:",
    currentScript || "(empty)",
  ].join("\n\n");
}

export function readSuggestUpdates(activeStep: Step, rawText: string): { fields: Record<string, string>; script: string } {
  const parsed = extractJsonObject(rawText);
  if (!parsed) throw new Error("Model did not return valid JSON object");

  const updates: Record<string, string> = {};
  for (const field of activeStep.fields) {
    const value = parsed[field.key];
    if (typeof value === "string" && value.trim()) updates[field.key] = value.trim();
  }

  return {
    fields: updates,
    script: typeof parsed.script === "string" ? parsed.script.trim() : "",
  };
}

export function buildChatPrompt(activeStep: Step, content: string): string {
  const context = activeStep.fields.map((field) => `${field.label}: ${field.value || "(empty)"}`).join("\n");
  return [
    "You are DemoDance copilot.",
    `Current step: ${activeStep.title}`,
    "Current field values:",
    context,
    "User request:",
    content,
    "Reply concise and actionable.",
  ].join("\n\n");
}

export function buildLogoPrompt(name: string, slogan: string): string {
  return [
    `Create a clean, modern app logo for a product named "${name || "DemoDance"}".`,
    slogan ? `Tagline/context: ${slogan}.` : "",
    "Style: minimal, bold, high contrast, icon-first mark.",
    "No complex text blocks. Avoid photorealism.",
  ]
    .filter(Boolean)
    .join(" ");
}

export async function requestLogoUrl(prompt: string): Promise<string> {
  const data = await postJson<ImageGenerationResponse>(
    "/api/images/generations",
    {
      prompt,
      model: "gpt-image-2",
      size: "1024x1024",
      quality: "low",
      output_format: "webp",
    },
    "Failed to generate logo",
  );
  const url = data.data?.[0]?.url;
  if (typeof url !== "string" || !url) throw new Error("No logo image returned");
  return url;
}
