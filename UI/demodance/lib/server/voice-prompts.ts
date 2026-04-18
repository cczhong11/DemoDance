import { promises as fs } from "fs";
import path from "path";

type VoicePromptPart = {
  file: string;
  title: string;
  content: string;
};

type VoiceInput = {
  includeTechnicalArchitecture: boolean;
  targetUser: string;
  problem: string;
  evidence: string;
  productName: string;
  slogan: string;
  features: string[];
  techStack: string;
  vision: string;
};

const VOICE_PROMPT_FILES = [
  "voice_01_goal.md",
  "voice_02_section_structure.md",
  "voice_03_benchmark.md",
  "voice_04_global_constraints.md",
  "voice_05_problem_motivation.md",
  "voice_06_solution_intro.md",
  "voice_07_features_prototype.md",
  "voice_08_technical_architecture.md",
  "voice_09_vision.md",
  "voice_10_wrap_up.md",
  "voice_11_total_scoring.md",
] as const;

async function readVoicePromptPart(file: string): Promise<VoicePromptPart> {
  const promptDir = path.resolve(process.cwd(), "./prompt");
  const fullPath = path.join(promptDir, file);
  const content = await fs.readFile(fullPath, "utf8");
  const firstLine = content.split("\n")[0]?.trim().replace(/^#\s*/, "") || file;
  return {
    file,
    title: firstLine,
    content: content.trim(),
  };
}

export async function loadVoicePromptParts(): Promise<VoicePromptPart[]> {
  return Promise.all(VOICE_PROMPT_FILES.map((file) => readVoicePromptPart(file)));
}

export function composeVoicePrompt(parts: VoicePromptPart[], input: VoiceInput): string {
  const selectedSections = input.includeTechnicalArchitecture
    ? "Problem & Motivation, Solution Introduction, Features + Prototype, Technical Architecture, Vision, Wrap-up"
    : "Problem & Motivation, Solution Introduction, Features + Prototype, Vision, Wrap-up";

  const featureLines = input.features
    .filter((value) => value.trim().length > 0)
    .map((value, index) => `${index + 1}. ${value.trim()}`)
    .join("\n");

  return [
    "You are generating VOICEOVER SCRIPT output.",
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
    `Target user: ${input.targetUser || "(not provided)"}`,
    `Problem: ${input.problem || "(not provided)"}`,
    `Web evidence: ${input.evidence || "(not provided)"}`,
    `Product name: ${input.productName || "(not provided)"}`,
    `Slogan: ${input.slogan || "(not provided)"}`,
    `Features:\n${featureLines || "(not provided)"}`,
    `Tech stack: ${input.techStack || "(not provided)"}`,
    `Vision: ${input.vision || "(not provided)"}`,
    "",
    "Output requirements:",
    "- Keep each section aligned to the provided duration and word-count targets.",
    "- Respect sentence constraints and style constraints globally.",
    "- Provide section headers and keep smooth transitions between sections.",
    "- Match narration to likely visuals and on-screen text.",
  ].join("\n");
}

