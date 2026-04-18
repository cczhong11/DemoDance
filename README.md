# DemoDance API

Flask API (managed with `uv`) for IonRouter text and text-to-audio endpoints.

## Setup

```bash
uv sync
cp .env.example .env
# add your real IONROUTER_API_KEY in .env
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
