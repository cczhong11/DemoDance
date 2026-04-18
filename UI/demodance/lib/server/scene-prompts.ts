import { promises as fs } from "fs";
import path from "path";

type ScenePromptPart = {
  file: string;
  title: string;
  content: string;
};

type SceneInput = {
  targetUser: string;
  problem: string;
  evidence: string;
  productName: string;
  slogan: string;
  features: string[];
  techStack: string;
  vision: string;
  deviceFrame: "mobile" | "desktop";
};

const SCENE_PROMPT_FILES = [
  "scene_01_goal.md",
  "scene_02_structure.md",
  "scene_03_feature_demo.md",
  "scene_04_prototype_fidelity.md",
  "scene_05_visual_quality.md",
  "scene_06_multimodal.md",
  "scene_07_continuity.md",
] as const;

async function readScenePromptPart(file: string): Promise<ScenePromptPart> {
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

export async function loadScenePromptParts(): Promise<ScenePromptPart[]> {
  return Promise.all(SCENE_PROMPT_FILES.map((file) => readScenePromptPart(file)));
}

export function composeScenePrompt(parts: ScenePromptPart[], input: SceneInput): string {
  const featureLines = input.features
    .filter((value) => value.trim().length > 0)
    .map((value, index) => `${index + 1}. ${value.trim()}`)
    .join("\n");

  return [
    "You are generating SCENE VIDEO output for a product demo video.",
    "",
    "Apply the following prompt parts exactly:",
    ...parts.map((part, index) => `${index + 1}. [${part.file}] ${part.title}`),
    "",
    ...parts.map((part) => part.content),
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
    `Device frame: ${input.deviceFrame}`,
    "",
    "Output requirements:",
    "- Produce 3-8 scenes in chronological order.",
    "- For each scene include: Scene ID, User action, UI state, System response, Visual instruction, Duration(sec).",
    "- Ensure strong user->system interaction loops and realistic usage context.",
    "- Keep continuity smooth and align visuals with likely voice/text.",
  ].join("\n");
}
