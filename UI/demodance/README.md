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
- `POST /api/text/chat`
- `POST /api/audio/speech`
- `POST /api/video/tasks`
- `GET /api/video/tasks/:taskId`
- `GET /api/video/tasks`

## Examples

### Text chat

```bash
curl -X POST http://localhost:3000/api/text/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Reply with exactly: pong"}'
```

### Audio speech (base64)

```bash
curl -X POST http://localhost:3000/api/audio/speech \
  -H "Content-Type: application/json" \
  -d '{"input":"Welcome to DemoDance","base64":true}'
```

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

## Notes

- BytePlus list filters supported: `page_num`, `page_size`, `status`/`filter.status`, `model`/`filter.model`, `service_tier`/`filter.service_tier`, `task_ids`/`filter.task_ids`.
- `task_ids` supports repeated query params and comma-separated input.
