# DemoDance DB Schema Notes

This schema is **project-based** and maps directly to the current UI workflow.

## Mapping from UI to DB

- Top project name + active step + progress:
  - `projects`
  - `project_steps`
- Step field contents (user/problem/evidence/logo/name/slogan/features/stack/impact):
  - `project_step_fields`
- Step markdown docs (multiple markdown files per step):
  - `project_step_documents`
  - `project_step_document_messages`
- Right-side chat history:
  - `project_chat_messages`
- "Importance" web evidence links:
  - `project_evidence_sources`
- Uploaded/generated materials (logo/audio/video/srt):
  - `project_assets`
- Full render pipeline runs + stage events:
  - `generation_jobs`
  - `generation_job_events`
- BytePlus task lifecycle storage:
  - `external_video_tasks`
- OpenAI SRT transcription records:
  - `audio_transcriptions`

## Why this shape

- Keeps core business object as **project**.
- Supports multiple markdown artifacts per step, not just one text field.
- Lets user + AI chat directly against each markdown file.
- Allows repeated generation attempts without overwriting previous runs.
- Preserves reproducibility by saving `script_snapshot` at generation start.
- Separates external provider task IDs from internal job IDs.
- Works with current UI and future auth/multi-user extension.

## Suggested next implementation step

Add server actions/API routes for:
1. `POST /api/projects` create project with default 6 rows in `project_steps`.
2. `PATCH /api/projects/:id/fields` upsert into `project_step_fields`.
3. `POST /api/projects/:id/steps/:step/documents` create markdown file for a step.
4. `POST /api/documents/:id/messages` append user/ai chat for that markdown file.
5. `PATCH /api/documents/:id` update current markdown content directly.
6. `POST /api/projects/:id/generate` create `generation_jobs` + provider task.
7. `GET /api/projects/:id` hydrate project + fields + documents + latest generation state.
