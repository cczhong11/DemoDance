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

## Notes

- Set Butterbase API config in `.env.local`:
  - `BUTTERBASE_API_BASE_URL` (for example `https://api.butterbase.ai/v1/app_bm27uoe0fdff`) OR `BUTTERBASE_APP_ID`
  - `BUTTERBASE_API_TOKEN` (or alias `BUTTERBASE_API_KEY`) for private apps
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
