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
    "Submission:",
    submission,
  ].join("\n\n");
}

export async function parseSubmission(submission: string): Promise<ParsedOnboardingSubmission> {
  const data = await postJson<TextChatResponse>(
    "/api/text/chat",
    { prompt: buildSubmissionParsePrompt(submission) },
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
