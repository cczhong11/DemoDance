# DemoDance

Backend is now migrated to the Next.js app API routes in:

- `/Users/tczhong/Documents/code/hackathon/DemoDance/UI/demodance`

Use this as the primary runtime (frontend + backend).

## Run

```bash
cd UI/demodance
cp .env.local.example .env.local
npm install
npm run dev
```

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

API route docs are in:

- `/Users/tczhong/Documents/code/hackathon/DemoDance/UI/demodance/README.md`

DB schema docs are in:

- `/Users/tczhong/Documents/code/hackathon/DemoDance/UI/demodance/README.md` (Database section)
- `/Users/tczhong/Documents/code/hackathon/DemoDance/UI/demodance/db/schema-notes.md`
- `/Users/tczhong/Documents/code/hackathon/DemoDance/UI/demodance/db/butterbase-schema.applied.json`
