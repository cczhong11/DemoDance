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
