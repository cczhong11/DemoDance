# TODO

## Done
- Migrated backend to Next.js API routes.
- Added API test page at `/api-test`.
- Added OpenAI audio-to-SRT endpoint: `POST /api/audio/srt`.
- Added BytePlus video understanding APIs:
  - `POST /api/video/files` (upload local video, get `file_id`)
  - `POST /api/video/understand` (Responses API, supports `file_id` / URL / Base64 data URL)
- Added video understanding test section to `/api-test`.
- Added BytePlus image generation API:
  - `POST /api/images/generations` (text-to-image / image-to-image / multi-image)
- Added image generation test section to `/api-test`.
- Connected Butterbase app: `app_bm27uoe0fdff`.
- Pushed schema to Butterbase with 9 tables:
  - projects
  - project_steps
  - project_step_fields
  - project_step_documents
  - project_step_document_messages
  - project_assets
  - generation_jobs
  - external_video_tasks
  - audio_transcriptions
- Saved deployable schema file: `UI/demodance/db/butterbase-schema.applied.json`.
- Added schema push script: `UI/demodance/db/push-butterbase-schema.sh`.

## Next
- Implement `/api/projects` CRUD via Butterbase Data API.
- Implement document APIs:
  - `POST /api/projects/:id/steps/:step/documents`
  - `PATCH /api/documents/:id`
  - `POST /api/documents/:id/messages`
- Connect `app/page.tsx` state to DB (load/save project, fields, docs, chat).
- Add generation job persistence and task polling views.
- Add FK/constraint pass in Butterbase once compatibility path is confirmed.

## Next: Video Upload -> Analyze -> Feature Split

### Phase 1. Upload then analyze (real pipeline)
- Keep original `File` object in frontend state (not only preview URL metadata).
- In onboarding `Start` flow:
  - Upload file to `POST /api/video/files` and get `file_id`.
  - Call `POST /api/video/understand` with `file_id`.
- Enforce structured output contract from understanding call:
  - Must contain time segments + feature/event descriptions.
- Acceptance:
  - After upload, UI receives structured analysis JSON (not free-form text).

### Phase 2. Dual-engine strategy (BytePlus + ffmpeg fallback)
- Add orchestrator endpoint (suggestion: `POST /api/video/analyze`).
- Engine policy:
  - Primary: BytePlus understand (`/api/video/understand`).
  - Fallback: ffmpeg understand (`/api/ffmpeg_understand`) when primary fails or output quality invalid.
- Normalize both into one schema:
  - `features[]`, `segments[]`, `confidence`, `source_engine`.
- Acceptance:
  - Frontend consumes one stable response schema regardless of engine used.

### Phase 3. Fill Features step from analysis (replace mockSegments)
- Remove hardcoded `mockSegments` path in `app/page.tsx`.
- Map analyzed `features` + `segments` to:
  - `steps.features.fields[i].value`
  - `steps.features.fields[i].segment`
- Graceful degradation:
  - If only 1-2 features recognized, keep remaining fields editable and empty/default.
- Acceptance:
  - Feature thumbnails/time ranges come from uploaded video analysis, and preview seeks to real segment.

### Phase 4. Persistence + replay
- Persist uploaded demo asset and analyze output to DB:
  - Reuse `project_assets` with `metadata`, or add dedicated segment table.
- On page reload, hydrate feature text + segment metadata without re-analyzing.
- Acceptance:
  - Re-entering same project restores analyzed features/segments directly.

### Implementation order (fastest path)
1. Implement `/api/video/analyze` orchestrator + unified schema.
2. Wire `handleStart()` to upload + analyze.
3. Replace `mockSegments` with real parsed segments from analyze response.
4. Add DB persistence/hydration.
