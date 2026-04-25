
type StoryPromptPart = {
  file: string;
  title: string;
  content: string;
};

type StoryInput = {
  includeTechnicalArchitecture: boolean;
  language: "en" | "zh";
  sectionId?: string;
  sectionTitle?: string;
  sectionSummary?: string;
  user: string;
  problem: string;
  evidence: string;
  productName: string;
  slogan: string;
  features: string[];
  techStack: string;
  vision: string;
};

const STORY_PROMPT_PARTS: StoryPromptPart[] = [
  {
    file: "story_01_goal.md",
    title: "STORY Goal",
    content: `# STORY Goal
Transform minimal user input into a structured, logical, and complete product narrative.`
  },
  {
    file: "story_02_structure.md",
    title: "STORY Required Structure",
    content: `# STORY Required Structure
Use this exact section order:
1. Problem & Motivation
2. Solution Introduction
3. Features + Prototype (Core)
4. Technical Architecture (Optional)
5. Vision
6. Wrap-up`
  },
  {
    file: "story_03_scoring.md",
    title: "STORY Benchmark",
    content: `# STORY Benchmark

## 0.1 Structure Coverage (0-6)
- Each required section present: +1
- If Technical Architecture is not selected, exclude it from expected sections
- Coverage Score = Covered Sections / Expected Sections

## 0.2 Structure Integrity (0-5)
Expected sequence:
Problem -> Solution -> Features -> (Tech) -> Vision -> Wrap-up

Scoring:
- 5: Fully coherent, smooth transitions
- 3-4: Minor jumps, mostly logical
- 0-2: Broken flow or illogical transitions`
  },
  {
    file: "story_04_checklist.md",
    title: "STORY Section Checklist",
    content: `# STORY Section Checklist

## 1) Problem & Motivation
- States a clear problem in 1 sentence
- Includes at least 2 concrete pain points
- Includes severity (frequency and/or impact)
- Uses a realistic user scenario

## 2) Solution Introduction
- One-line solution statement is clear
- Differentiator is explicit
- Transitions naturally from the problem

## 3) Features + Prototype (Core)
- Core section for narrative depth
- Detailed scoring handled in Scene rubric

## 4) Technical Architecture (Optional)
- Identifies system components
- Describes data flow
- Mentions model/API usage where relevant

## 5) Vision
- Defines a clear future direction
- Shows scalability/extensibility
- Aligns with product direction

## 6) Wrap-up
- Ends with a memorable closing
- Reinforces core value proposition
- Keeps conclusion concise`
  },
  {
    file: "story_05_output.md",
    title: "STORY Output Requirements",
    content: `# STORY Output Requirements
- Follow the required section order exactly
- Cover all selected sections explicitly
- Keep transitions natural and easy to follow
- Ensure each section satisfies its checklist`
  }
];

export async function loadStoryPromptParts(): Promise<StoryPromptPart[]> {
  return STORY_PROMPT_PARTS;
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
    "## Current Production Scope",
    input.sectionId
      ? `Generate story guidance only for this section: ${input.sectionTitle || input.sectionId}. Do not write the full video.`
      : "Generate story guidance for the full video.",
    input.sectionSummary ? `Section summary: ${input.sectionSummary}` : "",
    `Output language: ${input.language === "zh" ? "Chinese" : "English"}`,
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
    "Now write the STORY output with clear section headers in the required order.",
  ].join("\n");
}
