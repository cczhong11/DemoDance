# DemoDance (Next.js + API Routes)

Frontend and backend are both in Next.js. API routes run on the Node.js runtime in this app.

## Setup

```bash
cd UI/demodance
cp .env.local.example .env.local
npm install
npm run dev
```

App runs at `http://localhost:3000`.

## Database (Butterbase)

DemoDance uses Butterbase as the project data store.

### Env config

Set these in `.env.local`:

- `BUTTERBASE_API_BASE_URL` (example: `https://api.butterbase.ai/v1/app_bm27uoe0fdff`) or `BUTTERBASE_APP_ID`
- `BUTTERBASE_API_TOKEN` (or compatibility alias `BUTTERBASE_API_KEY`)

### Health check

```bash
curl -X GET http://localhost:3000/api/db/health
```

### Schema files

- Source design: `db/schema.sql`
- Notes and mapping: `db/schema-notes.md`
- Applied Butterbase-compatible schema: `db/butterbase-schema.applied.json`
- Push helper: `db/push-butterbase-schema.sh`

### Push schema to Butterbase

From `UI/demodance`:

```bash
chmod +x db/push-butterbase-schema.sh
./db/push-butterbase-schema.sh
```

The script runs:

1. Dry run schema apply
2. Real schema apply
3. Final `/schema` fetch and table list check

### Current live tables

Current pushed schema includes:

- `projects`
- `project_steps`
- `project_step_fields`
- `project_step_documents`
- `project_step_document_messages`
- `project_assets`
- `generation_jobs`
- `external_video_tasks`
- `audio_transcriptions`

### Data model summary

- Project-first design (`projects`) for one hackathon pitch lifecycle.
- Per-step structured fields (`project_step_fields`) for UI cards.
- Multiple markdown docs per step (`project_step_documents`) plus user/ai edit chat (`project_step_document_messages`).
- Generation tracking (`generation_jobs`, `external_video_tasks`) for BytePlus async jobs.
- Media and subtitle artifacts (`project_assets`, `audio_transcriptions`).

### Current DB API surface

- Implemented: `GET /api/db/health`
- Planned next: project/document CRUD routes on top of Butterbase Data API

## API Endpoints

- `GET /api/health`
- `GET /api/db/health`
- `POST /api/text/chat`
- `POST /api/audio/speech`
- `POST /api/audio/srt`
- `POST /api/video/tasks`
- `GET /api/video/tasks/:taskId`
- `GET /api/video/tasks`
- `POST /api/video/files`
- `POST /api/video/understand`
- `POST /api/images/generations`
- `POST /api/ffmpeg_understand`

## Examples

### Text chat

```bash
curl -X POST http://localhost:3000/api/text/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Reply with exactly: pong"}'
```

### Database health (Butterbase)

```bash
curl -X GET http://localhost:3000/api/db/health
```

### Audio speech (base64)

```bash
curl -X POST http://localhost:3000/api/audio/speech \
  -H "Content-Type: application/json" \
  -d '{"input":"Welcome to DemoDance","base64":true}'
```

### Audio to SRT subtitles

```bash
curl -X POST http://localhost:3000/api/audio/srt \
  -F "file=@/absolute/path/to/audio.wav" \
  -F "model=whisper-1"
```

This endpoint uses OpenAI `v1/audio/transcriptions` and requires `OPENAI_API_KEY`.

### Create video task

```bash
curl -X POST http://localhost:3000/api/video/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "prompt":"meta engineer write code",
    "resolution":"720p",
    "ratio":"16:9",
    "duration":5,
    "generate_audio":true
  }'
```

### Get video task status

```bash
curl -X GET http://localhost:3000/api/video/tasks/cgt-2026xxxx
```

### List video tasks

```bash
curl -X GET "http://localhost:3000/api/video/tasks?page_num=1&page_size=3&filter.status=succeeded&filter.task_ids=id1&filter.task_ids=id2"
```

### Upload local video file (for understanding)

```bash
curl -X POST http://localhost:3000/api/video/files \
  -F "file=@/absolute/path/to/video.mp4" \
  -F "purpose=user_data" \
  -F "preprocess_fps=0.3"
```

### Video understanding with uploaded `file_id`

```bash
curl -X POST http://localhost:3000/api/video/understand \
  -H "Content-Type: application/json" \
  -d '{
    "file_id":"file-2026xxxx",
    "prompt":"Please describe movement sequence and output JSON with start_time, end_time, event, danger."
  }'
```

### Video understanding with public URL or Base64 data URL

```bash
curl -X POST http://localhost:3000/api/video/understand \
  -H "Content-Type: application/json" \
  -d '{
    "video_url":"https://ark-doc.tos-ap-southeast-1.bytepluses.com/video_understanding.mp4",
    "fps":1,
    "prompt":"What is in the video?"
  }'
```

### Text-to-image

```bash
curl -X POST http://localhost:3000/api/images/generations \
  -H "Content-Type: application/json" \
  -d '{
    "prompt":"Vibrant close-up editorial portrait, dramatic studio lighting.",
    "size":"2K",
    "output_format":"png",
    "response_format":"url",
    "watermark":false
  }'
```

### Image-to-image

```bash
curl -X POST http://localhost:3000/api/images/generations \
  -H "Content-Type: application/json" \
  -d '{
    "prompt":"Keep pose unchanged and transform clothing into clear water.",
    "image":"https://ark-doc.tos-ap-southeast-1.bytepluses.com/doc_image/seedream4_5_imageToimage.png",
    "size":"2K",
    "output_format":"png",
    "response_format":"url",
    "watermark":false
  }'
```

### FFmpeg video understand (frame-by-frame + Qwen3-VL-8B)

This API extracts frames every second using `ffmpeg`, then sends frame batches to a vision model.

JSON (public video URL):

```bash
curl -X POST http://localhost:3000/api/ffmpeg_understand \
  -H "Content-Type: application/json" \
  -d '{
    "video_url":"https://ark-doc.tos-ap-southeast-1.bytepluses.com/video_understanding.mp4",
    "prompt":"Describe key actions and risks per second",
    "fps":1,
    "batch_size":8,
    "model":"Qwen3-VL-8B"
  }'
```

Multipart (local upload):

```bash
curl -X POST http://localhost:3000/api/ffmpeg_understand \
  -F "file=@/absolute/path/to/video.mp4" \
  -F "prompt=Describe key actions and risks per second" \
  -F "fps=1" \
  -F "batch_size=8" \
  -F "model=Qwen3-VL-8B"
```

## Notes

- Butterbase config and schema workflow are documented in the `Database (Butterbase)` section above.
- BytePlus list filters supported: `page_num`, `page_size`, `status`/`filter.status`, `model`/`filter.model`, `service_tier`/`filter.service_tier`, `task_ids`/`filter.task_ids`.
- `task_ids` supports repeated query params and comma-separated input.
- `POST /api/video/understand` calls BytePlus `Responses API` and supports:
  - `file_id` (recommended)
  - `video_url` (public URL)
  - `video_url` as Base64 data URL
- `POST /api/images/generations` supports:
  - text-to-image (`prompt` only)
  - image-to-image (`prompt` + `image`)
  - multi-image blend (`prompt` + `image: []`)
- `POST /api/ffmpeg_understand`:
  - Requires `ffmpeg` installed on server
  - Accepts JSON `video_url` or multipart `file`
  - Extracts frames at configured `fps` and batches to vision model
