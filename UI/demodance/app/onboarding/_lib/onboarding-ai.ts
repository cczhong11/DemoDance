import { extractJsonObject, readAssistantText } from "@/app/_lib/assistant-response";
import { postJson } from "@/app/_lib/client-api";

type TextChatResponse = {
  choices?: Array<{ message?: { content?: unknown } }>;
  error?: unknown;
};

export type ParsedOnboardingSubmission = {
  audienceUser: string;
  audienceProblem: string;
  importanceEvidence: string;
  productName: string;
  productSlogan: string;
  feature1: string;
  feature2: string;
  feature3: string;
  techStack: string;
  impact: string;
};

export type VideoAnalysis = {
  features: string[];
  segments: Array<{
    start: number;
    end: number;
    label: string;
    caption: string;
    confidence: number;
  }>;
  sourceEngine: string;
  fallbackUsed: boolean;
};

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

export function wordCount(value: string): number {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function buildSubmissionParsePrompt(submission: string): string {
  return [
    "You are DemoDance parser.",
    "Return only JSON object with fields:",
    "audience_user, audience_problem, importance_evidence, product_name, product_slogan, feature1, feature2, feature3, tech_stack, impact",
    "Rules:",
    "- Each feature must be one concise sentence with user action, system response, and value.",
    "- importance_evidence should explain why the project matters in the broader real world: social value, practical significance, urgency, or meaningful impact.",
    "- importance_evidence should come mainly from the submission context, not from the uploaded demo itself.",
    "- Keep every field practical for a 60-90 second launch video.",
    "Submission:",
    submission,
  ].join("\n\n");
}

export async function parseSubmission(submission: string): Promise<ParsedOnboardingSubmission> {
  const data = await postJson<TextChatResponse>(
    "/api/text/chat",
    { prompt: buildSubmissionParsePrompt(submission), mode: "json", max_completion_tokens: 2000 },
    "Failed to parse submission",
  );
  const text = readAssistantText(data);
  const parsed = extractJsonObject(text) ?? {};
  return {
    audienceUser: asString(parsed.audience_user),
    audienceProblem: asString(parsed.audience_problem),
    importanceEvidence: asString(parsed.importance_evidence),
    productName: asString(parsed.product_name),
    productSlogan: asString(parsed.product_slogan),
    feature1: asString(parsed.feature1),
    feature2: asString(parsed.feature2),
    feature3: asString(parsed.feature3),
    techStack: asString(parsed.tech_stack),
    impact: asString(parsed.impact),
  };
}

export async function analyzeDemoVideo(file: File): Promise<VideoAnalysis | null> {
  const form = new FormData();
  form.append("file", file, file.name || "demo-video.mp4");
  form.append("prompt", "Extract product features, UI flow, and the user value shown in this raw demo video.");

  const response = await fetch("/api/video/analyze", {
    method: "POST",
    body: form,
  });
  if (!response.ok) return null;

  const data = (await response.json()) as {
    features?: unknown;
    segments?: unknown;
    source_engine?: unknown;
    fallback_used?: unknown;
  };

  const features = Array.isArray(data.features)
    ? data.features.map((feature) => String(feature).trim()).filter(Boolean).slice(0, 3)
    : [];
  const segments = Array.isArray(data.segments)
    ? data.segments.flatMap((segment) => {
        if (!segment || typeof segment !== "object") return [];
        const row = segment as Record<string, unknown>;
        const start = Number(row.start);
        const end = Number(row.end);
        const caption = typeof row.caption === "string" ? row.caption.trim() : "";
        if (!Number.isFinite(start) || !Number.isFinite(end) || !caption) return [];
        return [{
          start,
          end,
          label: typeof row.label === "string" ? row.label : "Feature Segment",
          caption,
          confidence: Number.isFinite(Number(row.confidence)) ? Number(row.confidence) : 0.5,
        }];
      })
    : [];

  if (features.length === 0 && segments.length === 0) return null;

  return {
    features,
    segments,
    sourceEngine: typeof data.source_engine === "string" ? data.source_engine : "unknown",
    fallbackUsed: Boolean(data.fallback_used),
  };
}
