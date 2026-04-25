
type ScenePromptPart = {
  file: string;
  title: string;
  content: string;
};

type SceneInput = {
  language: "en" | "zh";
  sectionId?: string;
  sectionTitle?: string;
  sectionSummary?: string;
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

const SCENE_PROMPT_PARTS: ScenePromptPart[] = [
  {
    file: "scene_01_goal.md",
    title: "SCENE VIDEO Goal",
    content: `# SCENE VIDEO Goal
Ensure the video is realistic, structured, and demonstrates actual product usage.`
  },
  {
    file: "scene_02_structure.md",
    title: "SCENE VIDEO Structure",
    content: `# SCENE VIDEO Structure
Each scene must define:
- Scene ID
- User action
- UI state
- System response
- Visual instruction
- Duration (seconds)`
  },
  {
    file: "scene_03_feature_demo.md",
    title: "Core Benchmark A: Feature Demonstration (0-10)",
    content: `# Core Benchmark A: Feature Demonstration (0-10)

## A1 Feature Clarity (0-3)
- Include 3-5 features
- Each feature clearly states:
  - what it does
  - why it matters

## A2 Interaction Demonstration (0-3)
- Step-by-step flow
- Clear user -> system loop

## A3 Scenario Realism (0-2)
- Real user context
- Logical behavior

## A4 Coverage (0-2)
- No missing critical flow`
  },
  {
    file: "scene_04_prototype_fidelity.md",
    title: "Core Benchmark B: Prototype Fidelity (0-5)",
    content: `# Core Benchmark B: Prototype Fidelity (0-5)
Align scenes with provided product input:
- Product type
- Device frame (mobile / desktop)
- UI structure
- Interaction logic`
  },
  {
    file: "scene_05_visual_quality.md",
    title: "Core Benchmark C: Visual Quality (0-5)",
    content: `# Core Benchmark C: Visual Quality (0-5)
- No AI artifacts (hands, face, UI glitches)
- Consistent visual style
- Clean layout`
  },
  {
    file: "scene_06_multimodal.md",
    title: "Core Benchmark D: Multimodal Consistency (0-6)",
    content: `# Core Benchmark D: Multimodal Consistency (0-6)
- Voice <-> Visual: 0-2
- Voice <-> Text: 0-2
- Music <-> Product tone: 0-2`
  },
  {
    file: "scene_07_continuity.md",
    title: "Core Benchmark E: Scene Continuity (0-5)",
    content: `# Core Benchmark E: Scene Continuity (0-5)
- Smooth transitions
- No abrupt jumps
- Logical sequence`
  }
];

export async function loadScenePromptParts(): Promise<ScenePromptPart[]> {
  return SCENE_PROMPT_PARTS;
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
    "## Current Production Scope",
    input.sectionId
      ? `Generate scenes only for this section: ${input.sectionTitle || input.sectionId}. Do not cover the full product video.`
      : "Generate scenes for the full product video.",
    input.sectionSummary ? `Section summary: ${input.sectionSummary}` : "",
    `Output language: ${input.language === "zh" ? "Chinese" : "English"}`,
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
    input.sectionId ? "- Produce 1-3 scenes in chronological order for the current section only." : "- Produce 3-8 scenes in chronological order.",
    "- Return strict JSON with schema: {\"scenes\":[{\"id\":\"S1\",\"duration_sec\":5,\"user_action\":\"...\",\"ui_state\":\"...\",\"system_response\":\"...\",\"visual_instruction\":\"...\",\"voiceover_hint\":\"...\",\"on_screen_text\":\"...\"}]}",
    "- Ensure strong user->system interaction loops and realistic usage context.",
    "- Screen text must be readable and grounded in the product context. Do not invent random UI text.",
    "- Keep continuity smooth and align visuals with likely voice/text.",
  ].join("\n");
}
