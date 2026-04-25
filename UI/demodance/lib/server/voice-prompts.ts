
type VoicePromptPart = {
  file: string;
  title: string;
  content: string;
};

type VoiceInput = {
  includeTechnicalArchitecture: boolean;
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
};

const VOICE_PROMPT_PARTS: VoicePromptPart[] = [
  {
    file: "voice_01_goal.md",
    title: "VOICE Goal",
    content: `# VOICE Goal
Generate clear, structured, and synchronized narration aligned with story and visuals.`
  },
  {
    file: "voice_02_section_structure.md",
    title: "VOICE Section Structure",
    content: `# VOICE Section Structure
For each section, include:
- Opening line
- Supporting explanation
- Transition to next section

Template pattern:
- Hook / user context
- Problem statement
- Pain points
- Severity
- Transition

Solution intro pattern:
- Product name
- What it does
- Differentiator

Feature pattern:
- User action
- System response
- Value

Technical pattern (optional):
- Behind the scenes
- What it uses
- Why this is reliable`
  },
  {
    file: "voice_03_benchmark.md",
    title: "VOICE Benchmark",
    content: `# VOICE Benchmark

## 0.1 Clarity (0-5)
- Sentences concise
- No ambiguity
- Easy to understand

## 0.2 Structure Alignment (0-5)
- Matches story sections
- Proper transitions

## 0.3 Persuasiveness (0-5)
- Problem compelling
- Value clear
- Emotional and/or logical appeal

## 0.4 Redundancy Control (0-5)
- No repetition
- No filler language

## 0.5 Multimodal Sync (0-5)
- Matches visuals
- Matches on-screen text`
  },
  {
    file: "voice_04_global_constraints.md",
    title: "VOICE Global Constraints",
    content: `# VOICE Global Constraints

## Speaking speed assumption (must be consistent)
- 150-160 words per minute
- About 2.5 words per second

## Sentence constraints
- Each sentence <= 15 words (ideal 8-12)
- Each section uses 2-5 sentences
- Avoid long sentences (>18 words)

## Style constraints
- Conversational tone
- Avoid jargon stacking
- One idea per sentence`
  },
  {
    file: "voice_05_problem_motivation.md",
    title: "VOICE Section Rubric: Problem & Motivation",
    content: `# VOICE Section Rubric: Problem & Motivation
Target duration and words:
- 15-20 seconds
- 40-50 words

Must include:
1. User context
2. Problem
3. Pain point
4. Severity

Rubric (0-5):
- Word Count: 40-50 (deviation >10 penalized)
- Sentence Length: each sentence <=15 words
- Clarity: problem explained in one sentence
- Pain Specificity: at least 2 concrete pain points
- Emotional Resonance: feels real and relatable

Penalties:
- <30 or >60 words: -2
- Missing user context: -1
- Missing severity: -1`
  },
  {
    file: "voice_06_solution_intro.md",
    title: "VOICE Section Rubric: Solution Introduction",
    content: `# VOICE Section Rubric: Solution Introduction
Target duration and words:
- 10 seconds
- 20-25 words

Must include:
1. Product name
2. What it does
3. Differentiator

Rubric (0-5):
- Word Count: 20-25
- Clarity: one sentence makes the solution clear
- Differentiation: explicit contrast vs alternatives

Penalties:
- 30 words: -1
- Missing differentiator: -1`
  },
  {
    file: "voice_07_features_prototype.md",
    title: "VOICE Section Rubric: Features + Prototype",
    content: `# VOICE Section Rubric: Features + Prototype
Per-feature duration and words:
- 10-15 seconds per feature
- 25-40 words per feature
- Up to 5 features

Per-feature structure:
1. Action (what user does)
2. System (what system does)
3. Value (why it matters)

Per-feature rubric (0-5):
- Word Count: 25-40
- Flow Clarity: user -> system
- Value Clarity: explicit why
- Brevity: no fluff

Penalties:
- Missing interaction: -2
- Describes action only without value: -1
- 45 words: -1`
  },
  {
    file: "voice_08_technical_architecture.md",
    title: "VOICE Section Rubric: Technical Architecture (Optional)",
    content: `# VOICE Section Rubric: Technical Architecture (Optional)
Target duration and words:
- 30 seconds
- 70-80 words

Must include:
1. System overview
2. Key components
3. Data/model flow

Rubric (0-5):
- Word Count: 70-80
- Clarity: understandable by non-technical listeners
- Structure: layered and logical

Penalties:
- Too abstract: -2
- Overloaded with jargon: -1`
  },
  {
    file: "voice_09_vision.md",
    title: "VOICE Section Rubric: Vision",
    content: `# VOICE Section Rubric: Vision
Target duration and words:
- 20 seconds
- 45-55 words

Must include:
1. Future expansion
2. New use cases
3. Impact

Rubric (0-5):
- Word Count: 45-55
- Clarity: specific future direction
- Alignment: consistent with product direction

Penalties:
- Generic future claims: -2`
  },
  {
    file: "voice_10_wrap_up.md",
    title: "VOICE Section Rubric: Wrap-up",
    content: `# VOICE Section Rubric: Wrap-up
Target duration and words:
- 5 seconds
- 10-15 words

Must include:
1. Product name
2. Core value

Rubric (0-5):
- Word Count: 10-15
- Memorability: includes a strong punchline

Penalties:
- Too long: -1
- Not memorable: -2`
  },
  {
    file: "voice_11_total_scoring.md",
    title: "VOICE Total Scoring",
    content: `# VOICE Total Scoring
Voice Score =
- Problem (5)
- Solution (5)
- Features (5 x N)
- Technical (5, optional)
- Vision (5)
- Wrap-up (5)

Normalize final total to 25.`
  }
];

export async function loadVoicePromptParts(): Promise<VoicePromptPart[]> {
  return VOICE_PROMPT_PARTS;
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
    "## Current Production Scope",
    input.sectionId
      ? `Generate voiceover only for this section: ${input.sectionTitle || input.sectionId}. Do not write the full video.`
      : "Generate voiceover for the full video.",
    input.sectionSummary ? `Section summary: ${input.sectionSummary}` : "",
    `Output language: ${input.language === "zh" ? "Chinese" : "English"}`,
    input.language === "zh"
      ? "For Chinese narration, use roughly 4-5 Chinese characters per second, short spoken clauses, and avoid English word-count rules."
      : "For English narration, follow the word-count rules above.",
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
    "- Include duration_sec for each section or line group.",
    "- Respect sentence constraints and style constraints globally.",
    "- Provide section headers and keep smooth transitions between sections.",
    "- Match narration to likely visuals and on-screen text.",
  ].join("\n");
}
