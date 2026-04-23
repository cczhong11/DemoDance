# DemoDance UX 改造计划（3-Page Experience v2）

## 1. 目标

保持“三页流程”不变，但把第二步（Script & Collaborate）升级为核心工作台。

三页结构：

1. Onboarding（入口）
2. Script & Collaborate（脚本协作）
3. Generate & Export（生成导出）

设计原则：

- 清晰分层：全局导航、步骤导航、当前步骤编辑、AI 协作分开。
- 低门槛高控制：先可填写，再 AI 强化，不强制黑盒。
- 双语对齐：EN/中文文案一致、状态一致。
- 导航一致性：左侧全局导航在三页保持常驻，降低页面切换认知成本。

## 2. 新版信息架构（整体）

## Page 1: `/onboarding`

目标：快速进入可编辑状态。

- 左侧全局导航（与其他页面一致）
- 输入 Hackathon submission（必填）
- 上传 demo 视频（可选）
- 点击 `Let AI draft` 预填 Step 2-6
- 成功或失败都可进入 `/workflow`

完成条件：

- submission 达最小字数，或用户主动跳过 AI 预填。

## Page 2: `/workflow`（重点）

目标：逐步完善脚本，和 AI 持续协作。

- 左侧全局导航（Home / Projects / Templates / Brand Kit / Settings）
- 顶部 3-step 进度条（当前高亮 Step 2）
- Step 子导航（1-6 六个脚本步骤）
- 中央编辑区（当前步骤字段）
- 右侧 AI Copilot（上下文感知聊天）

完成条件：

- 六个脚本步骤达到“可生成”门槛后允许进入 `/generate`。

## Page 3: `/generate`

目标：分段生成、可控重试、最终导出。

- 左侧全局导航（与其他页面一致）
- 展示 section 列表及状态
- 单段 `Generate / Retry / Cancel / Preview / Download`
- 全局 `Combine & Export`

完成条件：

- 至少一次成功生成并导出 MP4。

## 3. 第二步（Script & Collaborate）详细设计

## 3.1 页面布局（Desktop）

采用 `app shell + content columns`：

1. 左栏（侧导航）
- 产品标识 DemoDance
- 全局菜单：Home / Projects / Templates / Brand Kit / Settings
- 计划卡（Pro Plan）
- 团队卡（成员、邀请入口）

2. 主区（中间）
- 顶部：3-step 进度条（Onboarding → Script & Collaborate → Generate & Export）
- 次级导航：6-step pills（Target User, Why It Matters, Product Intro, Features, Tech Stack, Future Impact）
- 表单工作区：Project Name + Completion + 当前步骤卡片
- 底部：`Previous` / `Next`

3. 右栏（AI Copilot）
- 标题区：AI Copilot
- Context 标签：当前步骤（如 Product Intro）
- 聊天历史
- 快捷操作 Chips（Rewrite / Shorter / More punchy / More professional）
- 输入框（Enter 发送，Shift+Enter 换行）

说明：

- 左侧导航是三页共享的 App Shell，不仅在 `/workflow`，也出现在 `/onboarding` 与 `/generate`。
- `/workflow` 在 App Shell 基础上采用中区编辑 + 右栏 Copilot 的双内容列。

## 3.2 第二步默认聚焦：Step 3 Product Intro

字段结构：

- Product Name（字符计数）
- Slogan（字符计数）
- Logo（预览 + Generate Logo 按钮）
- Script / Narration（多行文本，字符计数）

交互规则：

- Step pill 点击切换当前步骤，右侧 Copilot context 同步。
- `AI Suggest` 只影响当前步骤字段。
- `Generate Logo` 调用 `/api/images/generations`，回填 logo 字段。
- Logo 生成后在前端压缩为小图数据 URL（当前实现已完成）。

## 3.3 状态与可用性规则

完成度计算：

- 每个 step 有 `required fields`。
- 完成度 = 已填必填字段 / 必填字段总数。
- 顶部 Completion 与 Step 进度条实时联动。

按钮状态：

- `Next`：当前 step 至少达到最小可提交条件。
- `Go to Generate`：六步达到“可生成”门槛。
- `AI Suggest`：请求中时禁用，失败显示错误 toast + 可重试。

## 3.4 视觉样式建议（与图对齐）

- 深色背景：`zinc-950` 主背景，卡片 `zinc-900/800`。
- 强调色：紫蓝渐变（用于 active step、CTA、focus）。
- 圆角体系：卡片与输入统一 `rounded-xl`，按钮 `rounded-md/lg`。
- 信息密度：主区优先可读，右栏聊天固定宽度，避免挤压输入。

## 3.5 详细风格规范（按设计图）

整体风格关键词：

- `Dark Productive Workspace`（深色高效工作台）
- `Neon Purple Accent`（霓虹紫强调）
- `Soft Glass + Border`（轻玻璃感 + 细边框）
- `Bilingual Professional`（双语专业化）

色彩系统（建议 token）：

- 背景层级：
  - `bg/base`: `#060B14`
  - `bg/surface-1`: `#0B1220`
  - `bg/surface-2`: `#0F1728`
  - `bg/surface-3`: `#131D31`
- 文字层级：
  - `text/primary`: `#EAF0FF`
  - `text/secondary`: `#A9B4CC`
  - `text/muted`: `#7C88A6`
- 品牌强调：
  - `accent/primary`: `#7C5CFF`
  - `accent/secondary`: `#4BA3FF`
  - `accent/gradient`: `linear-gradient(135deg, #6D4DFF 0%, #6F7BFF 45%, #3F9CFF 100%)`
- 功能色：
  - `success`: `#35D07F`
  - `warning`: `#FFB347`
  - `danger`: `#FF6C8B`

边框与阴影：

- 默认边框：`1px solid rgba(165, 186, 255, 0.16)`
- 强调边框（active 卡/step）：`1px solid rgba(124, 92, 255, 0.75)`
- 卡片阴影：`0 12px 28px rgba(2, 7, 18, 0.45)`
- 发光效果（CTA/active）：`0 0 0 1px rgba(124, 92, 255, 0.45), 0 0 24px rgba(124, 92, 255, 0.25)`

圆角与间距：

- 页面外层：24px 间距
- 主要卡片圆角：16px
- 次级卡片圆角：12px
- 小标签/小按钮圆角：10px
- 输入控件高度：40px（多行输入最小 120px）

排版与文案密度：

- 字体建议：`Inter + Noto Sans SC`（中英文统一风格）
- 标题：
  - H1：32/40，600
  - H2：24/32，600
  - Card Title：18/26，600
- 正文：
  - 主正文：14/22，400
  - 辅助说明：12/18，400
- 双语规则：
  - 英文主行在上，中文副行在下
  - 中文字号比英文小 1 级，颜色更 muted

组件风格对齐（第二步）：

- 左侧导航：
  - active 菜单项使用深紫渐变底 + 左侧高亮条
  - icon 与文本纵向中心对齐，二级中文说明用 `text/muted`
- 顶部 3-step：
  - 当前步骤圆点使用紫色实心 + 外发光
  - 已完成步骤为浅蓝勾选/实心，未完成为描边
  - 步骤连线用渐变细线
- 6-step tabs：
  - active tab 背景比其他 tab 明亮一层，边框偏紫
  - tab 内“数字圆点 + 英文标题 + 中文副标题”保持固定结构
- 主编辑卡：
  - 标题行含 icon（紫色底图标）
  - 字段区域分组清晰，输入框背景比卡片深半级
  - 字符计数放字段底部右侧，使用 `text/muted`
- AI Copilot：
  - AI 气泡与用户气泡对比明显（AI 偏深灰蓝，用户偏紫蓝）
  - 快捷 Chips 作为次级动作，hover 时边框高亮
  - 输入框固定在底部，带发送图标按钮

交互动效：

- 页面切换：200ms 淡入 + 轻微上移（8px）
- 卡片 hover：120ms，边框提亮 + 阴影增强
- 按钮按下：90ms，scale `0.98`
- Step 切换：内容区使用 180ms 交叉淡入

可访问性与可读性：

- 所有关键文字对比度不低于 WCAG AA
- 紫色强调文本不直接用于大段正文，仅用于状态/按钮
- 交互控件最小点击区：40x40

## 3.6 三页风格一致性约束

- 三页必须共享同一套 Design Token（颜色、圆角、阴影、字体）。
- 左侧导航在三页视觉完全一致，避免“像不同产品”。
- 第二页最复杂，但第一页和第三页必须继承同样的深色基调和品牌强调色。
- 任何新增组件先套 token，再做页面个性化，不允许写死随机颜色。

## 4. 技术落地方案（保持三页）

## 4.1 路由

- `/onboarding`
- `/workflow`
- `/generate`
- `/` 重定向到 `/onboarding`

导航一致性：

- 三页统一挂载 `LeftSidebar`（共享组件），仅主内容区根据页面切换。

## 4.2 状态分层

- `projectState`: projectName, locale
- `onboardingState`: submission, demoVideoMeta
- `workflowState`: steps, activeStepId, fields, chat
- `generateState`: sectionRenders, exportFile

持久化：

- `sessionStorage`：页面草稿与跨页恢复
- key 建议：
  - `demodance.onboarding.v2`
  - `demodance.workflow.v2`
  - `demodance.generate.v2`

## 4.3 组件拆分

建议目录：

- `UI/demodance/app/_components/AppShell.tsx`
- `UI/demodance/app/_components/LeftSidebar.tsx`
- `UI/demodance/app/workflow/_components/TopStepper.tsx`
- `UI/demodance/app/workflow/_components/StepTabs.tsx`
- `UI/demodance/app/workflow/_components/WorkflowFormPanel.tsx`
- `UI/demodance/app/workflow/_components/AICopilotPanel.tsx`

## 5. 分阶段计划（更新）

## Phase A（1 天）骨架

- 建立三页真实路由
- 三页全部接入统一左侧导航 App Shell（占位数据）
- `/workflow` 接入新版中区+右栏骨架（占位数据）
- 顶部 Stepper + Step Tabs 打通

验收：

- 三页可互跳
- 三页左侧导航结构与样式一致
- 第二步页面结构与设计图一致度 > 80%

## Phase B（1.5 天）第二步核心交互

- Product Intro 字段编辑 + 计数
- Completion 计算
- AI Copilot context 联动
- `Previous/Next` 行为与禁用逻辑

验收：

- Step 切换、字段编辑、进度联动可用
- 右侧聊天能感知当前步骤

## Phase C（1 天）AI 与 Logo

- 接入 `AI Suggest`
- 接入 `Generate Logo`（OpenAI gpt-image-2）
- 小图压缩与回填

验收：

- Logo 可生成、显示、回填
- 失败有反馈，重试可恢复

## Phase D（1.5 天）与 Generate 串联

- 达标后允许跳转 `/generate`
- 传递六步内容到生成页
- 统一错误与加载态

验收：

- 从 Step 2 到 Step 3 主路径可跑通

## 6. 验收清单（DoD）

- 仍是三页流程：Onboarding / Workflow / Generate
- 左侧全局导航在三页常驻且一致
- 第二步页面完成三栏化并可用
- 六步脚本编辑、AI 协作、进度同步正常
- Logo 生成链路可用（含小图压缩）
- 双语切换无关键文案缺失
- 现有生成页能力未回归

## 7. 关键改动文件（建议）

- `UI/demodance/app/onboarding/page.tsx`
- `UI/demodance/app/workflow/page.tsx`
- `UI/demodance/app/generate/page.tsx`
- `UI/demodance/app/_components/AppShell.tsx`（新增）
- `UI/demodance/app/_components/LeftSidebar.tsx`（新增）
- `UI/demodance/app/workflow/_components/*`（新增）
- `UI/demodance/app/home/types.ts`（补状态类型）
- `UI/demodance/README.md`（更新 UX 描述）

---

结论：总体保持三页不变，优先把第二步做成稳定、清晰、可协作的“主工作台”，再把第三步生成链路无缝接上。
