import { promises as fs } from "fs";
import path from "path";

type StoryPromptPart = {
  file: string;
  title: string;
  content: string;
};

type StoryInput = {
  includeTechnicalArchitecture: boolean;
  user: string;
  problem: string;
  evidence: string;
  productName: string;
  slogan: string;
  features: string[];
  techStack: string;
  vision: string;
};

const STORY_PROMPT_FILES = [
  "story_01_goal.md",
  "story_02_structure.md",
  "story_03_scoring.md",
  "story_04_checklist.md",
  "story_05_output.md",
] as const;

async function readStoryPromptPart(file: string): Promise<StoryPromptPart> {
  const promptDir = path.resolve(process.cwd(), "../../prompt");
  const fullPath = path.join(promptDir, file);
  const content = await fs.readFile(fullPath, "utf8");
  const firstLine = content.split("\n")[0]?.trim().replace(/^#\s*/, "") || file;
  return {
    file,
    title: firstLine,
    content: content.trim(),
  };
}

export async function loadStoryPromptParts(): Promise<StoryPromptPart[]> {
  return Promise.all(STORY_PROMPT_FILES.map((file) => readStoryPromptPart(file)));
}

export function composeStoryPrompt(parts: StoryPromptPart[], input: StoryInput): string {
  const selectedSections = input.includeTechnicalArchitecture
    ? "Problem & Motivation, Solution Introduction, Features + Prototype, Technical Architecture, Vision, Wrap-up"
    : "Problem & Motivation, Solution Introduction, Features + Prototype, Vision, Wrap-up";

  const featureLines = input.features
    .filter((value) => value.trim().length > 0)
    .map((value, index) => `${index + 1}. ${value.trim()}`)
    .join("\n");

  return [
    "You are generating SECTION 1 STORY output for a hackathon product narrative.",
    "",
    "Apply the following prompt parts exactly:",
    ...parts.map((part, index) => `${index + 1}. [${part.file}] ${part.title}`),
    "",
    ...parts.map((part) => part.content),
    "",
    "## Selected Sections",
    selectedSections,
    "",
    "## Product Context",
    `Target user: ${input.user || "(not provided)"}`,
    `Problem: ${input.problem || "(not provided)"}`,
    `Web evidence: ${input.evidence || "(not provided)"}`,
    `Product name: ${input.productName || "(not provided)"}`,
    `Slogan: ${input.slogan || "(not provided)"}`,
    `Features:\n${featureLines || "(not provided)"}`,
    `Tech stack: ${input.techStack || "(not provided)"}`,
    `Vision: ${input.vision || "(not provided)"}`,
    "",
    "Now write the STORY section output with clear section headers in the required order.",
  ].join("\n");
}

