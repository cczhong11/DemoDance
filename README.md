# DemoDance API

Flask API (managed with `uv`) for:
- IonRouter text endpoint
- BytePlus ModelArk video generation tasks (text-to-video and multimodal via `content[]`)

## Setup

```bash
uv sync
cp .env.example .env
# add your real API keys in .env
```

## Run

```bash
uv run python main.py
```

Server starts at `http://127.0.0.1:5000`.

## Endpoints

- `GET /health`
- `POST /api/text/chat`
- `POST /api/audio/speech`
- `POST /api/video/tasks`
- `GET /api/video/tasks/<task_id>`
- `GET /api/video/tasks`

### Text API example

```bash
curl -X POST http://127.0.0.1:5000/api/text/chat \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write a short greeting"
  }'
```

### Text-to-audio API example (binary audio response)

```bash
curl -X POST http://127.0.0.1:5000/api/audio/speech \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Welcome to DemoDance"
  }' \
  --output speech.wav
```

### Text-to-audio API example (base64 JSON response)

```bash
curl -X POST http://127.0.0.1:5000/api/audio/speech \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Welcome to DemoDance",
    "base64": true
  }'
```

### Create video task (text-to-video)

```bash
curl -X POST http://127.0.0.1:5000/api/video/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "model": "dreamina-seedance-2-0-260128",
    "prompt": "A cinematic drone shot over coastal cliffs at golden hour",
    "resolution": "720p",
    "ratio": "16:9",
    "duration": 5,
    "watermark": true
  }'
```

### Query video task status

```bash
curl -X GET http://127.0.0.1:5000/api/video/tasks/cgt-2025**** \
  -H "Content-Type: application/json"
```

### Query video task list

```bash
curl -X GET "http://127.0.0.1:5000/api/video/tasks?page_num=1&page_size=10&status=running" \
  -H "Content-Type: application/json"
```

### Query video task list with multiple task IDs

```bash
curl -X GET "http://127.0.0.1:5000/api/video/tasks?page_size=3&filter.status=succeeded&filter.task_ids=id1&filter.task_ids=id2" \
  -H "Content-Type: application/json"
```

### Direct BytePlus API equivalent (from docs)

```bash
curl -X GET https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks/cgt-2025**** \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ARK_API_KEY"
```
