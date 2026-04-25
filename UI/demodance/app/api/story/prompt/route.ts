import { NextResponse } from "next/server";

import { jsonError, readJsonBody } from "@/lib/server/http";
import { composeStoryPrompt, loadStoryPromptParts } from "@/lib/server/story-prompts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const data = await readJsonBody(request);

  try {
    const parts = await loadStoryPromptParts();
    const prompt = composeStoryPrompt(parts, {
      includeTechnicalArchitecture: Boolean(data.includeTechnicalArchitecture),
      language: data.language === "zh" ? "zh" : "en",
      sectionId: typeof data.sectionId === "string" ? data.sectionId : undefined,
      sectionTitle: typeof data.sectionTitle === "string" ? data.sectionTitle : undefined,
      sectionSummary: typeof data.sectionSummary === "string" ? data.sectionSummary : undefined,
      user: typeof data.user === "string" ? data.user : "",
      problem: typeof data.problem === "string" ? data.problem : "",
      evidence: typeof data.evidence === "string" ? data.evidence : "",
      productName: typeof data.productName === "string" ? data.productName : "",
      slogan: typeof data.slogan === "string" ? data.slogan : "",
      features: Array.isArray(data.features)
        ? data.features.filter((v): v is string => typeof v === "string")
        : [],
      techStack: typeof data.techStack === "string" ? data.techStack : "",
      vision: typeof data.vision === "string" ? data.vision : "",
    });

    return NextResponse.json({
      prompt,
      parts: parts.map((part) => ({
        file: part.file,
        title: part.title,
      })),
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    return jsonError("Failed to compose story prompt", 500, details);
  }
}
