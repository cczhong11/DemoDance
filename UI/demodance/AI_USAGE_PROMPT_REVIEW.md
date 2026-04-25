# DemoDance AI 使用方法与 Prompt 评审

本文档整理当前项目中所有主要 AI 使用方式、对应 prompt、调用链，以及这些设计是否合理。结论先说：整体方向是合理的，架构上已经把“输入解析、脚本协作、分镜/旁白 prompt 合成、视频生成、视频理解、语音/字幕”拆开了；但目前存在几处会影响稳定性和生成质量的问题，尤其是 prompt 源重复、部分文案承诺与实际能力不一致、结构化输出约束不够强、以及视频生成 prompt 对“单个章节”和“整条视频”的边界不够清晰。

## 0. 实施状态

本轮已实现评审中的修改意见：

- 文本 LLM 已切到 OpenAI Chat Completions，默认 `gpt-5.4-mini`。
- `/api/text/chat` 已支持 `mode: "json"` 和 `mode: "chat"`，JSON 模式默认低 temperature，并使用 JSON response format。
- Onboarding 已接入 `/api/video/analyze`：上传原始 demo 视频后会尝试提取功能和片段，再参与 workflow 预填。
- “Web Evidence” 已收敛为 “Evidence Angle”，避免暗示已经联网检索真实证据。
- AI Suggest 已增加 step-specific 指导、语言要求、保留已有事实的规则。
- Logo prompt 已禁止文字/字母，要求居中、安全边距、透明或纯色背景、小尺寸可读。
- Story/Scene/Voice prompt composer 已支持 `language`、`sectionId`、`sectionTitle`、`sectionSummary`，生成视频时只针对当前章节。
- Scene prompt 已要求结构化 JSON，包含 `voiceover_hint` 和 `on_screen_text`。
- Voice prompt 已增加中文旁白字符/语速规则，并要求输出 `duration_sec`。
- BytePlus 视频任务已显式传 `ratio`、`resolution`、`duration`、`generate_audio`。
- 生成页已接入 TTS 和本地 SRT 生成，可基于脚本文本生成旁白音频和字幕文件。
- `prompt/*.md` 已归档到 `docs/prompts-archive/`，运行时唯一 prompt 来源为 TypeScript 常量；`next.config.ts` 也移除了 prompt 文件 tracing。
- 未使用的 prompt file 常量、Gemini 配置、BytePlus image 默认配置已清理。

## 1. AI 能力总览

| 能力 | 前端入口 | API 路由 | 上游服务/模型 | 当前用途 |
|---|---|---|---|---|
| 文本聊天/脚本补全 | `/onboarding`、`/workflow` | `POST /api/text/chat` | OpenAI，默认 `gpt-5.4-mini` | 解析提交文本、AI Suggest、AI Copilot 对话 |
| Logo 图片生成 | `/workflow` 产品步骤 | `POST /api/images/generations` | OpenAI，默认 `gpt-image-2` | 生成产品 Logo |
| Story Prompt 合成 | `/generate` | `POST /api/story/prompt` | 本地 prompt composer | 生成产品叙事结构 prompt |
| Scene Prompt 合成 | `/generate` | `POST /api/scene/prompt` | 本地 prompt composer | 生成分镜/场景 prompt |
| Voice Prompt 合成 | `/generate` | `POST /api/voice/prompt` | 本地 prompt composer | 生成旁白 prompt |
| 视频生成任务 | `/generate` | `POST /api/video/tasks` | BytePlus Ark，默认 `dreamina-seedance-2-0-260128` | 根据 story/scene/voice prompt 创建视频任务 |
| 视频任务查询 | `/generate` | `GET /api/video/tasks/:taskId` | BytePlus Ark | 查询视频生成状态和视频 URL |
| 视频理解 | API 测试页/分析接口 | `POST /api/video/understand` | BytePlus Ark，默认 `seed-2-0-lite-260228` | 用视频 URL 或 file_id 理解视频 |
| 视频分析聚合 | API | `POST /api/video/analyze` | BytePlus + FFmpeg fallback + 视觉模型 | 提取 1-3 个功能片段 |
| FFmpeg 抽帧理解 | API 测试页/分析 fallback | `POST /api/ffmpeg_understand` | IonRouter 视觉模型，默认 `Qwen3-VL-8B` | 抽帧后逐帧总结 |
| 语音合成 | `/generate`、API 测试页 | `POST /api/audio/speech` | IonRouter，默认 `orpheus-3b` | 文本转语音，用于生成页旁白 |
| 字幕生成/转写 | `/generate`、API 测试页 | 本地 SRT 生成、`POST /api/audio/srt` | 本地脚本估算、OpenAI `whisper-1` | 生成页基于脚本生成 SRT；上传音频可转写 SRT |

## 2. 文本模型调用

### 2.1 通用文本 API

位置：`app/api/text/chat/route.ts`

方法：
- 读取 `OPENAI_API_KEY`。
- 默认模型来自 `OPENAI_TEXT_MODEL`，未设置时为 `gpt-5.4-mini`。
- 默认上游地址为 `https://api.openai.com/v1`，可用 `OPENAI_BASE_URL` 覆盖。
- 支持两种输入：`prompt` 或 `messages`。
- 支持两种模式：`mode: "chat"` 和 `mode: "json"`。
- 默认 `max_completion_tokens = 5000`，也兼容调用方传入旧字段 `max_tokens`。
- JSON 模式默认 `temperature = 0.2`，并传 `response_format: { type: "json_object" }`。
- 仅当调用方显式传入 `temperature` 或 `reasoning_effort` 时，才覆盖默认参数。
- 如果第一次返回空内容，会追加一次用户消息并重试；JSON 模式要求严格 JSON，chat 模式只要求返回最终答案。

评判：
- 作为统一代理层是合理的，前端不直接暴露 API key。
- `gpt-5.4-mini` 适合作为主流程默认模型，速度、成本和能力比较均衡。
- 对结构化 JSON 任务来说，当前 `mode: "json"` 已比原先稳定。
- chat 和 JSON 的重试指令已经分开，避免普通聊天被强制 JSON 化。

修改建议：
- 已完成：文本 API 已分成 `mode: "json"` 和 `mode: "chat"`。
- 已完成：JSON 模式默认低 temperature，并使用 OpenAI JSON response format。
- 后续可选：如果要进一步增强类型安全，可以把 JSON schema 下沉到具体调用方并做运行时校验。

## 3. Onboarding 提交文本解析

位置：`app/onboarding/_lib/onboarding-ai.ts`

当前 prompt 中文等价内容：

```text
你是 DemoDance 的解析器。
只返回 JSON 对象，字段包括：
audience_user, audience_problem, importance_evidence, product_name, product_slogan,
feature1, feature2, feature3, tech_stack, impact

提交内容：
{用户粘贴的 hackathon submission}
```

调用方式：
- 前端要求用户输入至少 20 个字符。
- 调 `/api/text/chat`，使用 `mode: "json"`。
- 如果用户上传了原始 demo 视频，同时调用 `/api/video/analyze` 提取功能片段。
- 从模型回复中提取 JSON。
- 合并文本解析结果和视频分析结果，填入 6 个 workflow 步骤。

评判：
- 这个方向合理，适合把杂乱提交文本拆成结构化字段。
- prompt 太短，字段语义不够明确，模型可能输出泛泛内容。
- `importance_evidence` 仍是内部 JSON 字段名，但 UI 已改为 “Evidence Angle”，避免误导用户以为已做联网检索。
- 前端现在会在有上传视频时调用视频分析流程；如果分析失败，会静默回退到文本解析结果。

修改建议：
- 已完成：解析 prompt 已要求 feature 包含用户动作、系统响应和价值。
- 已完成：上传视频时会调用 `/api/video/analyze`，并优先使用视频中识别出的 feature。
- 已完成：UI 字段已从 Web Evidence 收敛为 Evidence Angle。
- 后续可选：把内部字段 `importance_evidence` 也改名为 `importance_angle`，需要同步 store 和历史 session 数据。

## 4. Workflow AI Suggest

位置：`app/workflow/_lib/workflow-ai.ts`

当前 prompt 中文等价内容：

```text
你是 DemoDance 协作助手。
只返回 JSON 对象，不要 markdown。
语言：{en 或 zh}
当前步骤：{步骤标题}

为当前步骤字段填写简洁、实用、适合 launch video 的文案。

JSON schema:
{
  "{当前步骤字段 key}": "string",
  "script": "string"
}

当前字段值：
{字段 label: 当前值}

当前脚本：
{当前 script 或 empty}
```

评判：
- 合理，AI Suggest 的输出直接对应当前步骤字段和 script。
- 只给了字段 key，没有给字段目标、长度、语气、好坏样例。
- `Locale` 只是 `en/zh`，但步骤标题和字段 label 可能仍是英文，中文模式下模型未必稳定输出中文。
- 没有限制是否保留已有内容，可能会覆盖用户已经写好的好内容。

修改建议：
- 已完成：每个 step 已增加单独字段说明。
- 已完成：已有内容不为空时，要求保留事实并增强，不做无关替换。
- 已完成：中文模式下明确所有字段和 script 必须输出中文。
- 后续可选：返回结构可继续扩展 `confidence`、`assumptions` 或 `missing_info`，便于 UI 提醒用户。

## 5. Workflow AI Copilot Chat

位置：`app/workflow/_lib/workflow-ai.ts`

当前 prompt 中文等价内容：

```text
你是 DemoDance 协作助手。
当前步骤：{步骤标题}

当前字段值：
{字段 label: 当前值}

用户请求：
{用户输入}

请回复简洁、可执行。
```

评判：
- 对右侧聊天助手来说足够轻量。
- 但它无法直接更新字段，只能回复文本；这和用户期待“帮我改这里”可能不完全一致。
- 缺少整条视频上下文，例如产品名、其他步骤、目标时长。

修改建议：
- 已完成：普通聊天不再走 JSON 模式，空回复重试也不会强制 JSON。
- 后续可选：支持工具式返回 `reply` + `suggested_updates`，让 Copilot 可直接写回字段。
- 后续可选：把 project name、当前总进度、相邻步骤摘要加入上下文。

## 6. Logo 图片生成

位置：`app/workflow/_lib/workflow-ai.ts`、`app/api/images/generations/route.ts`

当前 prompt 中文等价内容：

```text
为名为“{产品名}”的产品创建一个干净、现代的 app logo。
如果有 slogan，则加入语境：{slogan}。
风格：极简、醒目、高对比，以图标标志为主。
不要复杂文字块。避免照片写实风格。
```

调用参数：
- `model: gpt-image-2`
- `size: 1024x1024`
- `quality: low`
- `output_format: webp`

评判：
- 用文本到图像生成 Logo 是合理的，参数也适合快速 demo。
- prompt 说“不要复杂文字块”，但没有明确“不要生成文字”，Logo 模型仍可能生成乱码文字。
- 没有要求透明背景、居中、安全边距、单图标可缩放。
- API route 接受 `image` 字段但实际会忽略，因为走的是 OpenAI text-to-image endpoint，这一点已经有 warning，但 UI 可能误以为支持编辑。

修改建议：
- 已完成：Prompt 已禁止可读文字、字母和复杂文本块，并要求居中、安全边距、小尺寸可读、透明或纯色背景。
- 后续可选：如果需要基于已有 Logo 修改，应另接 image edit API，而不是忽略 image input。
- 后续可选：给 Logo 生成增加 2-4 个候选，而不是只生成 1 张。

## 7. Story Prompt 合成

位置：`lib/server/story-prompts.ts`、`app/api/story/prompt/route.ts`

当前 Story prompt 中文等价内容：

```text
你正在为 hackathon 产品叙事生成 STORY 输出。

目标：
把最少的用户输入转化为结构化、逻辑完整的产品叙事。

必须按以下顺序：
1. 问题与动机
2. 解决方案介绍
3. 功能 + 原型（核心）
4. 技术架构（可选）
5. 愿景
6. 收尾

评分重点：
- 每个必选 section 都要出现。
- 如果未选择技术架构，则从预期 section 中排除。
- 顺序必须是：问题 -> 解决方案 -> 功能 -> 技术 -> 愿景 -> 收尾。

质量检查：
- 问题要一句话讲清楚，至少包含 2 个具体痛点和严重程度。
- 解决方案要一句话讲清楚，差异点明确。
- 功能和原型是叙事深度的核心。
- 技术架构需要组件、数据流、模型/API 使用。
- 愿景需要清晰未来方向和扩展性。
- 收尾要短、有记忆点、强化核心价值。

产品上下文：
目标用户、问题、证据、产品名、slogan、features、tech stack、vision。

现在按要求输出 STORY section，并使用清晰 section 标题。
```

评判：
- 叙事结构合理，适合 hackathon demo 视频。
- 但 “STORY output” 和后续 “Section production brief” 同时进入视频生成模型，模型可能不知道是要生成文案、分镜，还是直接生成视频。
- `Web evidence` 并不一定是真实联网证据。
- 代码里的 prompt parts 是硬编码数组，`prompt/story_*.md` 文件并没有被真正读取。对 Vercel 部署来说，运行时使用 TypeScript 常量反而更稳，但需要明确它是唯一来源，否则后续容易不同步。

修改建议：
- 已完成：保持 TypeScript 常量作为运行时唯一来源，不在 Vercel runtime 用 `fs` 动态读取 markdown prompt。
- 已完成：`prompt/*.md` 已归档到 `docs/prompts-archive/` 并标注为历史设计参考。
- 已完成：Story prompt 已支持当前章节 scope，只生成当前章节相关 story guidance。
- 已完成：“证据”在 UI 上已改为 Evidence Angle，避免伪装成真实联网证据。
- 后续可选：Story 输出可进一步改为严格 JSON，方便后续自动剪辑。

## 8. Scene Prompt 合成

位置：`lib/server/scene-prompts.ts`、`app/api/scene/prompt/route.ts`

当前 Scene prompt 中文等价内容：

```text
你正在为产品 demo 视频生成 SCENE VIDEO 输出。

目标：
视频应真实、有结构，并展示真实产品使用。

每个场景必须定义：
- Scene ID
- 用户动作
- UI 状态
- 系统响应
- 视觉指令
- 时长（秒）

功能展示评分：
- 包含 3-5 个功能。
- 每个功能说明它做什么、为什么重要。
- 展示 step-by-step 的用户 -> 系统循环。
- 场景要真实，行为逻辑合理，不遗漏关键流程。

原型保真：
- 匹配产品类型、设备框、UI 结构、交互逻辑。

视觉质量：
- 避免 AI 痕迹，例如手、人脸、UI 错乱。
- 视觉风格一致，布局干净。

多模态一致：
- 旁白、画面、屏幕文字、音乐气质一致。

连续性：
- 转场平滑，不突兀，顺序合理。

输出要求：
- 生成 3-8 个按时间顺序排列的场景。
- 每个场景包含 Scene ID、用户动作、UI 状态、系统响应、视觉指令、时长。
- 强化用户 -> 系统交互闭环。
```

评判：
- 对“产品演示视频”的 Scene 规划是合理的。
- 但当前 `/generate` 是按 section 生成，每个 section 都拿到“生成 3-8 个场景”的全局要求，可能导致每个 section 都尝试覆盖完整产品。
- “No AI artifacts hands, face” 对纯 UI 产品演示有点泛，应该更具体地约束“不要虚构 UI、不要错字、不要不可点击控件漂移”。
- 没有要求输出严格结构，后续如果要自动转成镜头列表会难解析。

修改建议：
- 已完成：Scene prompt 已支持 `sectionId`，单章只生成 1-3 个场景。
- 已完成：Scene prompt 已要求严格 JSON，包含 `voiceover_hint` 和 `on_screen_text`。
- 已完成：已增加 UI 保真规则，要求屏幕文字可读并来自产品上下文。
- 后续可选：允许传入真实截图/录屏分析结果，提高保真。

## 9. Voice Prompt 合成

位置：`lib/server/voice-prompts.ts`、`app/api/voice/prompt/route.ts`

当前 Voice prompt 中文等价内容：

```text
你正在生成 VOICEOVER SCRIPT 输出。

目标：
生成清晰、结构化、和 story/visual 同步的旁白。

每个 section 包含：
- 开场句
- 支撑解释
- 到下一 section 的过渡

全局限制：
- 语速假设 150-160 词/分钟，约 2.5 词/秒。
- 每句不超过 15 词，理想 8-12 词。
- 每个 section 使用 2-5 句。
- 语气自然对话，避免术语堆叠，一句一个意思。

各 section 目标：
- 问题与动机：15-20 秒，40-50 词，包含用户语境、问题、痛点、严重性。
- 解决方案：10 秒，20-25 词，包含产品名、做什么、差异点。
- 功能 + 原型：每个功能 10-15 秒，25-40 词，包含用户动作、系统响应、价值。
- 技术架构：可选，30 秒，70-80 词，包含系统概览、关键组件、数据/模型流。
- 愿景：20 秒，45-55 词，包含扩展方向、新用例、影响。
- 收尾：5 秒，10-15 词，包含产品名、核心价值。

输出要求：
- 对齐时长和词数。
- 遵守句长和风格限制。
- 保留 section 标题。
- 和可能的画面、屏幕文字匹配。
```

评判：
- 旁白规范很完整，特别是时长和词数约束，对视频生成很有帮助。
- 但所有字数约束都是英文词数，对中文不适用。
- 当前 composer 没有语言参数，中文 UI 状态下生成页仍可能产出英文旁白 prompt。
- Voice prompt 和真实 TTS `/api/audio/speech` 目前没有形成完整链路，只是视频生成任务的一部分。

修改建议：
- 已完成：Voice prompt 已支持 `language` 参数。
- 已完成：中文旁白已加入每秒 4-5 个汉字的估算规则。
- 已完成：输出要求已加入 `duration_sec`。
- 已完成：生成页已接入 TTS 和本地 SRT 生成。

## 10. 视频生成任务

位置：`app/generate/_lib/generate-ai.ts`、`app/api/video/tasks/route.ts`

当前流程：
1. 从 workflow store 收集产品上下文。
2. 并行调用 story/scene/voice 三个 prompt composer。
3. 构造 BytePlus `content`：
   - 第一段：当前 section 的 production brief。
   - 第二段：完整 Story Prompt。
   - 第三段：完整 Scene Prompt。
   - 第四段：完整 Voice Prompt。
4. 调 `POST /api/video/tasks` 创建任务。
5. 轮询 `GET /api/video/tasks/:taskId`。

评判：
- 把 story、scene、voice 合并给视频模型，方向上 make sense。
- 最大问题是“当前 section 摘要”和“三套完整全局 prompt”之间优先级可能冲突。虽然 brief 写了 highest-priority context，但后面的大 prompt 更长，模型可能被全局任务带偏。
- `POST /api/video/tasks` 当前没有传 `resolution`、`ratio`、`duration`、`generate_audio` 等参数，最终效果依赖上游默认值。
- 每一章都会重新传完整全局 prompt，成本和不确定性较高。

修改建议：
- 已完成：每个 section 会把 `sectionId`、`sectionTitle`、`sectionSummary` 传给 prompt composer。
- 已完成：BytePlus payload 已显式传 `ratio: "16:9"`、`resolution: "720p"`、`duration`、`generate_audio`。
- 已完成：最终 content 已加入“只生成本章，不要生成完整视频”的指令。
- 后续可选：将 story、scene、voice 先由文本模型生成结构化中间产物，再把精简后的最终视频 prompt 给视频模型。

## 11. 视频理解与视频分析

### 11.1 BytePlus 视频理解

位置：`app/api/video/understand/route.ts`

当前默认 prompt 中文等价内容：

```text
请描述这个视频中发生了什么。
```

支持：
- `file_id`
- `video_url`
- 完整 `input` 数组
- `fps` 限制在 0.2 到 5

评判：
- API 封装合理。
- 默认 prompt 太泛，只适合测试，不适合产品功能提取。

修改建议：
- 按用途提供 prompt 模板：功能提取、UI 流程、风险检测、剪辑点推荐。

### 11.2 产品 demo 分析聚合

位置：`app/api/video/analyze/route.ts`

当前 BytePlus 分析 prompt 中文等价内容：

```text
分析这个产品 demo 视频，用于提取功能。
只返回严格 JSON，schema：
{
  "features": ["..."],
  "segments": [
    {
      "start": 0,
      "end": 5,
      "label": "...",
      "caption": "...",
      "confidence": 0.8
    }
  ]
}

规则：
- 返回 1 到 3 个功能。
- 片段时间单位是秒。
- caption 要描述演示的产品行为和用户价值。
- 如果用户提供任务重点，则加入 Task focus。
```

评判：
- 这个 prompt 很实用，结构化程度也比其他 prompt 更好。
- 有 BytePlus 失败后 FFmpeg fallback，工程上比较稳。
- 但 confidence 是模型自报或 fallback 估算，不应该当作真实置信度。

修改建议：
- 在返回结果里区分 `model_confidence` 和 `pipeline_confidence`。
- 增加 `evidence_frames` 或截图索引，方便用户核对。
- 把这个分析结果真正接入 onboarding，目前 UI 文案已暗示会分析视频，但主流程还没用上。

### 11.3 FFmpeg 抽帧理解

位置：`app/api/ffmpeg_understand/route.ts`

当前 prompt 中文等价内容：

```text
你是视频理解助手。
你会收到从视频中抽取的一组带时间戳的帧。
请独立总结每一帧。
只返回严格 JSON，schema：
{
  "frames": [
    {
      "second": 0,
      "summary": "...",
      "tags": ["..."],
      "danger": "low|medium|high"
    }
  ]
}
不要包含 markdown。

任务重点：{用户 prompt}
```

评判：
- 作为 fallback 很合理，尤其适合视频理解 API 不可用时。
- “danger” 字段对产品 demo 不一定必要，像是从安全/风险场景复用来的。
- 独立总结每帧会丢失跨帧动作，难以判断完整交互。

修改建议：
- 如果目标是产品 demo，应把 `danger` 改成 `interaction_type`、`ui_element`、`user_intent`。
- 增加第二阶段聚合：把逐帧总结再汇总成连续片段。
- 对帧数多的视频，需要控制抽帧数量，避免成本过高。

## 12. 语音合成与字幕

### 12.1 TTS

位置：`app/api/audio/speech/route.ts`

方法：
- 输入 `input` 文本。
- 默认模型 `orpheus-3b`。
- 默认声音 `tara`。
- 可选 `ref_audio`、`ref_text`。
- 可返回音频二进制或 base64。

评判：
- API 封装清晰。
- 目前它更像测试能力，没有和 voice prompt、视频导出工作流串起来。

修改建议：
- 在生成页增加“生成旁白音频”和“生成 SRT”步骤。
- 保存 voiceover 音频 URL，并让最终导出使用它。

### 12.2 STT/SRT

位置：`app/api/audio/srt/route.ts`

方法：
- 上传音频文件。
- 调 OpenAI audio transcription。
- 默认模型 `whisper-1`。
- `response_format = srt`。
- 可传 `language`、`prompt`、`temperature`。

评判：
- 用于字幕生成合理。
- 如果已经有旁白文本，没必要再 STT；可以直接从脚本文本生成 SRT，更省钱更准。

修改建议：
- 已完成：生成页会基于脚本文本和章节时长生成本地 SRT。
- 保留：用户上传原始音频时，继续使用 STT 生成 SRT。

## 13. Prompt 来源与 Vercel 部署

当前存在两套来源：
- `docs/prompts-archive/*.md` 历史设计参考。
- `lib/server/story-prompts.ts`、`scene-prompts.ts`、`voice-prompts.ts` 中的 TypeScript prompt parts。

评判：
- 已修正：markdown prompt 已归档到 `docs/prompts-archive/`，并有 README 标注“不参与运行时”。
- 修改归档 markdown 不会影响线上实际 prompt；运行时唯一来源是 TypeScript prompt 常量。
- 对 Vercel 来说，不建议为了“看起来更像内容文件”而在 runtime 用 `fs` 读取 markdown。Node.js runtime 理论上可以读取部署包里的只读文件，但 Edge runtime 不支持 `fs`，serverless 打包路径也更容易出本地/线上不一致的问题。
- 当前把 prompt 作为 TypeScript 常量打进 bundle，更适合 Vercel，部署稳定性更好。
- `section1_story_prompt.md` 已作为历史文档归档。

修改建议：
- 已完成：`lib/server/story-prompts.ts`、`scene-prompts.ts`、`voice-prompts.ts` 是运行时唯一 prompt 来源。
- 已完成：`prompt/*.md` 已移动到 `docs/prompts-archive/`。
- 已完成：`section1_story_prompt.md` 已标注为历史归档。
- 已完成：`STORY_PROMPT_FILES`、`SCENE_PROMPT_FILES`、`VOICE_PROMPT_FILES` 已删除，lint warning 已消除。

## 14. 总体判断：是否 make sense

整体 make sense：
- AI 使用链路符合产品目标：先理解输入，再组织故事，再生成分镜/旁白，最后生成视频。
- Prompt 方向也正确：Story 管叙事，Scene 管画面，Voice 管旁白，这个拆分清晰。
- 视频理解 fallback 设计比较务实，能提升 demo 素材解析的稳定性。

已收敛的问题：
- UI 文案说会分析视频，现在主流程已在上传视频时调用 `/api/video/analyze`。
- “联网证据”已改为 Evidence Angle，不再暗示真实联网检索。
- `prompt/*.md` 已归档，运行时唯一来源是 TypeScript prompt 常量。
- 视频生成已传入章节 scope，并明确“只生成当前章节”。
- 中文模式已贯穿 prompt composer，旁白长度规则也增加中文字符/语速要求。
- JSON 任务已使用 `mode: "json"`、低温和 JSON response format。

仍可继续增强的地方：
- Story/Scene/Voice 可以进一步拆成“文本模型先生成结构化中间产物，再喂给视频模型”的两段式流水线。
- AI Copilot 可以支持工具式写回字段。
- Logo 可以支持多候选和 image edit。

## 15. 优先修改清单

### P0：先修一致性

1. 已完成：TypeScript prompt 常量是唯一运行时来源，不在 Vercel runtime 用 `fs` 动态读取 markdown prompt。
2. 已完成：onboarding 已接入 `/api/video/analyze`。
3. 已完成：UI 字段已从 Web Evidence 改为 Evidence Angle。

### P1：提升生成稳定性

1. 已完成：JSON 输出任务使用 `mode: "json"`，默认低 temperature，并使用 JSON response format。
2. 已完成：AI Suggest 增加 step-specific 字段说明和语言要求。
3. 已完成：视频生成改为 section-specific prompt，明确“只生成当前章节”。
4. 已完成：BytePlus 视频任务显式传 ratio、resolution、duration、generate_audio。

### P2：提升最终视频质量

1. 已完成：Scene prompt 输出结构化 JSON，包含 `voiceover_hint` 和 `on_screen_text`。
2. 已完成：Voice prompt 支持中文字符数/语速规则。
3. 已完成：Logo prompt 禁止文字，要求透明/纯色背景和小尺寸可读。
4. 已完成：TTS 和本地 SRT 已接入生成页。

### P3：清理和维护

1. 已完成：`section1_story_prompt.md` 已归档到 `docs/prompts-archive/`。
2. 已完成：未使用的 Gemini 配置、BytePlus image 默认配置、prompt file 常量已清理。
3. 已完成基础验证：`npm run lint` 和 `npm run build` 通过。后续可补自动化 route 测试。
