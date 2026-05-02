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
  if (fieldKey === "evidence") return 600;
  if (fieldKey === "stack") return 320;
  return 2000;
}

export async function callTextChat(prompt: string): Promise<string> {
  const data = await postJson<TextChatResponse>("/api/text/chat", { prompt }, "Text API failed");
  const text = readAssistantText(data);
  if (!text.trim()) throw new Error("Empty response from text model");
  return text;
}

export async function callJsonTextChat(prompt: string): Promise<string> {
  const data = await postJson<TextChatResponse>(
    "/api/text/chat",
    { prompt, mode: "json", max_completion_tokens: 2500 },
    "Text API failed",
  );
  const text = readAssistantText(data);
  if (!text.trim()) throw new Error("Empty response from text model");
  return text;
}

function stepGuidance(stepId: StepId): string {
  const guidance: Record<StepId, string> = {
    audience: "Fields must identify a specific target user and one concrete problem they feel often.",
    importance:
      "Field must explain why this project matters in the real world. Write 2 to 4 full sentences about the broader social value, practical importance, urgency, or meaningful impact of solving this problem. Use the submission as the main source of truth. The uploaded demo can support context, but do not rely on demo proof as the core argument. Do not invent citations, numbers, URLs, or external research.",
    product: "Fields must make the product easy to remember: short name, sticky slogan, and logo prompt/context if needed.",
    features: "Each feature must be one sentence with user action, system response, and user value.",
    tech: "Explain stack and model/API flow in a way a technical judge can understand quickly.",
    impact: "Describe a specific future direction and practical impact. Avoid generic world-changing claims.",
  };
  return guidance[stepId];
}

export function buildSuggestPrompt(locale: "en" | "zh", activeStep: Step, currentScript: string): string {
  const schema = activeStep.fields.map((field) => `  "${field.key}": "string"`).join(",\n");
  const current = activeStep.fields.map((field) => `${field.label}: ${field.value || "(empty)"}`).join("\n");
  return [
    "You are DemoDance copilot.",
    "Return only JSON object, no markdown.",
    `Locale: ${locale}`,
    locale === "zh" ? "All field values and script must be written in Chinese." : "All field values and script must be written in English.",
    `Current Step: ${activeStep.title}`,
    "Fill concise, practical launch-video copy for current step fields.",
    stepGuidance(activeStep.id),
    activeStep.id === "importance"
      ? "For Evidence Angle specifically, avoid one-liners. Expand it into a compact but convincing paragraph focused on why the project matters to people, society, or the market."
      : "",
    "If a current value is not empty, improve it while preserving its facts instead of replacing it with unrelated claims.",
    "JSON schema:",
    `{\n${schema}${schema ? ",\n" : ""}  "script": "string"\n}`,
    "Current values:",
    current,
    "Current script:",
    currentScript || "(empty)",
  ].join("\n\n");
}

export function buildScriptPrompt(locale: "en" | "zh", activeStep: Step, currentScript: string): string {
  const context = activeStep.fields.map((field) => `${field.label}: ${field.value || "(empty)"}`).join("\n");
  return [
    "You are DemoDance copilot.",
    "Return only JSON object, no markdown.",
    `Locale: ${locale}`,
    locale === "zh" ? "Write the script in Chinese." : "Write the script in English.",
    `Current Step: ${activeStep.title}`,
    "Task: write a concise spoken narration for this single video chapter.",
    "Requirements:",
    "- Keep it natural for voiceover, not slide text.",
    "- Mention only facts supported by current field values.",
    "- Make it sound polished and launch-ready.",
    "- Target length: 2 to 4 spoken sentences.",
    "- Do not write the full video script, only this step.",
    "JSON schema:",
    '{\n  "script": "string"\n}',
    "Current values:",
    context,
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
    "Style: minimal, bold, high contrast, icon-first mark, centered with generous safe margin.",
    "No readable text, no letters, no words, no complex text blocks.",
    "Use a transparent or simple solid background. Must remain legible at 64px.",
    "Avoid photorealism.",
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
