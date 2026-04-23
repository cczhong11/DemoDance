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

## Current UX Overview (当前 UX 介绍)

DemoDance 当前体验是一个从 `raw demo` 到 `launch video` 的单页流程，默认分为两段：

1. Onboarding（素材输入）
   - 用户先贴入 Hackathon 提交文本（建议 20+ 字）并可选上传原始 demo 视频。
   - 支持中英文切换（EN / 中文），文案和字段占位符同步切换。
   - 点击 `Let AI draft the script` 后，系统会尝试用文本 + 视频分析结果自动预填后续步骤；如果分析失败，仍可手动继续。

2. Workflow（脚本与生成）
   - 左侧是 6 步脚本卡片：
     1) 目标用户与问题
     2) 问题重要性（联网证据）
     3) 产品亮相（Logo/Name/Slogan）
     4) 功能介绍
     5) 技术栈
     6) 未来影响
   - 每一步都可手动编辑，也可点击 `AI Suggest` 让模型定向补全。
   - 顶部有步骤完成度、前后步导航、项目名编辑；全部完成后可一键跳转到生成区。

3. 右侧 AI 协作栏
   - 常驻聊天侧栏会绑定“当前步骤”上下文，支持对话式改写。
   - 支持 `Enter` 发送、`Shift+Enter` 换行。
   - 在 Product 步骤可一键生成 Logo（写回对应字段）。

4. 视频生成与导出
   - 底部生成面板按 5 个章节分段出片（可单段生成/重生成/预览/下载）。
   - 每段显示状态（waiting / generating / done）、进度和时长目标。
   - 全部分段完成后可 `Combine & Export` 合成为最终 MP4 并下载。

5. 当前 UX 特点
   - 渐进式流程：先可用，再自动化增强（AI 失败时不阻塞主路径）。
   - 双语一致性：关键操作、字段、提示都支持中英切换。
   - 可控性：支持逐段重试、Prompt 预览/重置、片段预览，便于调参与回看。


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
    "model":"gpt-image-2",
    "size":"1024x1024",
    "quality":"medium",
    "output_format":"png"
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
  - OpenAI text-to-image via `POST /v1/images/generations`
  - default model: `gpt-image-2` (override with `model` or env `OPENAI_IMAGE_MODEL`)
  - required: `prompt`
  - optional: `size`, `quality`, `background`, `output_format`, `n`
  - backward-compatible input mapping:
    - `size: "1K"/"2K"/"4K"` + `aspect_ratio` will be mapped to OpenAI-compatible size
    - `image` input is ignored with warnings (no edit input on this endpoint)
  - env vars: `OPENAI_API_KEY`, optional `OPENAI_IMAGE_MODEL`
- `POST /api/ffmpeg_understand`:
  - Requires `ffmpeg` installed on server
  - Accepts JSON `video_url` or multipart `file`
  - Extracts frames at configured `fps` and batches to vision model
