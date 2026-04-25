# Prompt Connect Logic

This document explains how prompt data flows through DemoDance from UI input to model-facing APIs and back into app state.

## 1. High-Level Flow

The core 3-page flow is:

1. `/onboarding`: user provides submission text and optional raw video.
2. `/workflow`: user edits per-step fields and collaborates with AI.
3. `/generate`: app builds per-section video prompts and starts render tasks.

The prompt pipeline is split by intent:

- Text understanding and rewriting: `/api/text/chat`
- Image generation (logo): `/api/images/generations`
- Video section generation: `/api/video/tasks` and `/api/video/tasks/[taskId]`
- Structured prompt composition utilities:
  - `/api/story/prompt`
  - `/api/scene/prompt`
  - `/api/voice/prompt`

## 2. Frontend Prompt Entry Points

## 2.1 Onboarding Prompt

File: `app/onboarding/page.tsx`

`prefillAndContinue()` builds a parser prompt from the submission text and sends:

- `POST /api/text/chat`
- body: `{ prompt }`

Expected model output: JSON object with keys:

- `audience_user`
- `audience_problem`
- `importance_evidence`
- `product_name`
- `product_slogan`
- `feature1`, `feature2`, `feature3`
- `tech_stack`
- `impact`

Response is parsed by `extractJsonObject()` and mapped into store fields via `fillStepFields(...)`.

## 2.2 Workflow AI Suggest Prompt

File: `app/workflow/page.tsx`

`runAiSuggest()` creates a step-scoped JSON prompt:

- Includes current locale, step title, dynamic field schema, current field values, and current step script.
- Sends `POST /api/text/chat` with `{ prompt }`.
- Expects strict JSON back, then updates:
  - step field values (`fillStepFields`)
  - step narration (`setStepScript`)

This is intentionally step-local: suggestions should only mutate the active step.

## 2.3 Workflow Copilot Chat Prompt

File: `app/workflow/page.tsx`

`sendMessage()` builds a conversational prompt with:

- active step context
- current field snapshot
- user message

Then calls `/api/text/chat` and appends assistant text into local chat history.

## 2.4 Workflow Logo Prompt

File: `app/workflow/page.tsx`

`generateLogo()` creates a style-constrained logo prompt from product name and slogan:

- `POST /api/images/generations`
- body includes `prompt`, `model: "gpt-image-2"`, size/quality/output format.

Returned image URL is optionally compressed client-side and persisted into `product.logo`.

## 2.5 Generate Page Video Prompt

File: `app/generate/page.tsx`

For each section:

1. `summarizeStep(stepId)` composes section-local text from current fields + step script.
2. `buildPromptContext()` gathers full workflow context from store:
   - target user/problem
   - evidence
   - product name/slogan
   - features list
   - tech stack
   - future vision
3. `buildTaskContent(sectionId)` calls prompt composer APIs in parallel:
   - `POST /api/story/prompt`
   - `POST /api/scene/prompt`
   - `POST /api/voice/prompt`
4. These API-returned prompts are assembled into `content[]` chunks and sent to:
   - `POST /api/video/tasks` with `{ content }`
5. `generateSection(sectionId)` polls `GET /api/video/tasks/[taskId]` until success/failure

On success, `videoUrl` and progress metadata are stored in `renderSections`.

## 3. Backend Prompt Routing

## 3.1 `/api/text/chat`

File: `app/api/text/chat/route.ts`

Behavior:

- Accepts either:
  - `messages` (array), or
  - `prompt` (string; wrapped into one user message)
- Forwards to OpenAI: `POST {OPENAI_BASE_URL}/chat/completions`
- Uses configured model from request or server defaults. The default text model is `OPENAI_TEXT_MODEL`, falling back to `gpt-5.4-mini`.

Empty-content handling:

1. First request executes with the requested model and token budget.
2. If assistant text is empty, route retries with:
   - one additional user instruction requesting final strict JSON output.

This improves robustness for structured prompt calls from onboarding/workflow.

## 3.2 `/api/images/generations`

File: `app/api/images/generations/route.ts`

Behavior:

- Validates `prompt`.
- Forwards image generation request with model and rendering options.
- Returns provider response payload back to client.

Used directly by workflow logo generation.

## 3.3 `/api/video/tasks` and `/api/video/tasks/[taskId]`

Files:

- `app/api/video/tasks/route.ts`
- `app/api/video/tasks/[taskId]/route.ts`

Behavior:

- Accepts either `content` or `prompt`.
- Current generate flow sends API-composed multi-part `content[]` directly.
- If only `prompt` is provided, route still wraps it as text content for task creation.
- Returns async task metadata.
- Task status endpoint provides state/progress/video URL data.

Generate page orchestrates task lifecycle and status sync.

## 3.4 Prompt Composer Endpoints

Files:

- `app/api/story/prompt/route.ts`
- `app/api/scene/prompt/route.ts`
- `app/api/voice/prompt/route.ts`
- `lib/server/story-prompts.ts`
- `lib/server/scene-prompts.ts`
- `lib/server/voice-prompts.ts`

Behavior:

- Uses TypeScript prompt constants as the runtime source of truth. Markdown prompt drafts are archived under `docs/prompts-archive/` and are not loaded at runtime.
- Composes deterministic long-form prompts by combining:
  - fixed rubric/format constraints
  - runtime inputs (section, title, product, script, language, etc.)
- Returns assembled prompt text for downstream generation steps.

These routes are the structured, reusable prompt layer for story/scene/voice pipelines.

## 4. Store-Level Prompt Data Plumbing

File: `app/_state/workflow-store.tsx`

The store acts as prompt context cache:

- `fieldValues`: step field data used to build prompts later.
- `stepScripts`: narration text used in AI suggest + video section prompts.
- `renderSections`: generation status and outputs per chapter/section.
- `chat`: assistant conversation state.

Persistence:

- Session-backed (`sessionStorage`) via `demodance.workflow.v2`.
- Prompt-relevant edits survive route switches and refreshes during the session.

## 5. Sequence Summary

```mermaid
flowchart LR
  A[Onboarding Submission] --> B[/api/text/chat]
  B --> C[Workflow Fields + Scripts]
  C --> D[Workflow AI Suggest /api/text/chat]
  C --> E[Logo Prompt /api/images/generations]
  C --> F[Generate compose story/scene/voice prompts per section]
  F --> G[/api/video/tasks]
  G --> H[/api/video/tasks/:taskId polling]
  H --> I[Section video URLs]
  I --> J[Combine & Export]
```

## 6. Guardrails and Failure Handling

- Text route rejects missing `prompt/messages` with `400`.
- Image route rejects missing prompt.
- Video tasks reject missing `prompt/content`.
- Workflow UI captures errors in `chatError` and emits fallback assistant messages.
- Generate UI falls back section status to `idle` with error detail on task failure.

## 7. Current Practical Rule

Prompt context should always be derived from store state at send-time (not stale snapshots), and model responses that affect structured fields should be parsed and schema-validated before mutating state.
