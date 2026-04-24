# DemoDance UX 3-Page Modification Plan

Based on `s1.png`, `s2.png`, and `s3.png`.

This document is the implementation-level UX, visual style, and CSS plan for the three-page DemoDance experience. The goal is to make the current app feel like one polished dark productivity workspace instead of three separate screens.

## 1. Product Direction

Keep the product as a strict three-page flow:

1. `/onboarding` - collect raw hackathon submission and optional demo video.
2. `/workflow` - edit the six-part script with AI collaboration.
3. `/generate` - generate storyboards, generate video sections, and export.

The visual reference across all three screenshots is consistent:

- Dark app shell with persistent left navigation.
- Bilingual English/Chinese labels everywhere.
- Center content changes per page, but page chrome stays stable.
- Top three-step progress indicator is always visible.
- Right AI assistant panel is present on every page, with page-specific role.
- Purple/blue accent is used for active state, CTA, progress, and AI affordances.
- Cards use thin borders, soft shadows, restrained glow, and deep blue-black surfaces.

## 2. Screenshot Reading

## 2.1 `s1.png` - Onboarding

The first page is a guided input page. It should feel calm, clear, and low-friction.

Visible structure:

- Left sidebar:
  - DemoDance logo at top.
  - Collapse chevrons near the top right edge of the sidebar.
  - Home is active.
  - Menu items: Home, Projects, Templates, Brand Kit, Settings.
  - Team card at bottom with avatar, team name, member count, invite button.
- Top stepper:
  - Step 1 is active.
  - Step 1 circle is filled with purple gradient and glow.
  - Step 2 and Step 3 are inactive dark circles with light borders.
  - Step labels have English title and Chinese subtitle.
  - EN / 中文 segmented control sits at top right.
- Main card:
  - Large title `Onboarding`.
  - Chinese subtitle `素材输入`.
  - Short instructional copy.
  - Hackathon Submission textarea.
  - Optional raw demo video upload dropzone.
  - Language segmented control.
  - Full-width purple/blue CTA: `Let AI draft the script`.
  - Privacy notice card at bottom.
- Right panel:
  - Title `AI Guide`.
  - Time estimate pill `~2 min`.
  - Three guidance cards.
  - Bottom checklist card `Before you start`.

UX implication:

- Onboarding is not a landing page. It is the first usable tool screen.
- The AI guide should reduce uncertainty before the user submits.
- The page should not overload controls; it should focus on input, upload, language, and proceed.

## 2.2 `s2.png` - Script & Collaborate

The second page is the core editing workspace. It has the highest information density.

Visible structure:

- Left sidebar:
  - Same app shell as Page 1.
  - Includes Pro Plan card between nav and team card.
  - Home remains active in the screenshot, but implementation can map active state to current section if desired.
- Top stepper:
  - Step 2 is active.
  - Step 1 is inactive/completed in outline style.
  - Step 3 remains inactive.
- Main top tabs:
  - Six script steps displayed as horizontal tabs.
  - Step 3 `Product Intro` is active.
  - Active tab has purple-tinted background and purple bottom border.
  - Each tab uses number badge + English title + Chinese subtitle.
- Main work card:
  - Project name field with edit icon.
  - Completion bar at 42%.
  - Divider.
  - Section header with purple icon square.
  - Bilingual heading and description.
  - Product Name and Slogan inputs.
  - Logo preview card and Generate Logo button.
  - Script / Narration textarea.
  - Previous and Next buttons at bottom.
- Right panel:
  - Title `AI Copilot`.
  - Pin and refresh icons.
  - Context pill.
  - Chat bubbles with AI/user distinction.
  - Quick action chips.
  - Bottom input with send icon.

UX implication:

- This page should feel like a structured editor, not a chat app with form fields.
- The AI panel supports the selected section, but does not own the page.
- The active script step drives the form contents, AI context, quick actions, completion, and previous/next behavior.

## 2.3 `s3.png` - Generate & Export

The third page is a production dashboard for generating visual assets and videos.

Visible structure:

- Left sidebar:
  - Same app shell as Page 2.
  - Same Pro Plan and Team cards.
- Top stepper:
  - Step 3 active.
  - Step 1 and Step 2 inactive/completed.
- Main content:
  - Section A: `Storyboard Generation`.
  - Action row: Generate Storyboards, Regenerate, Preview All, Edit Prompt.
  - Five storyboard cards, each representing one chapter.
  - Cards include preview image grid, frame count, duration, and status.
  - Status examples: Done, Generating 65%, Waiting.
  - Section B: `Video Generation`.
  - Primary action: Generate Video from Storyboards.
  - Table with chapter, source storyboard, video generation, progress, estimated duration, actions.
  - Bottom stats: total duration, chapters completed, export readiness.
  - Large Combine & Export CTA.
- Right panel:
  - Title `AI Producer`.
  - Context pill for Generate & Export.
  - Chat bubbles about pacing and visual consistency.
  - Quick actions.
  - Input for storyboards, pacing, or export questions.

UX implication:

- Generate is status-heavy and should read like a pipeline.
- The user must always see what is done, what is running, what is waiting, and what can be acted on next.
- Export readiness should be visually prominent but unavailable until enough generation is complete.

## 3. Global App Shell

## 3.1 Page Frame

All pages use the same three-zone frame:

- Left sidebar: fixed width, full viewport height.
- Center app area: flexible, contains top stepper and page-specific content.
- Right assistant panel: fixed width, full content height.

Recommended desktop grid:

```css
.app-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 304px minmax(720px, 1fr) 448px;
  background:
    radial-gradient(circle at 18% 0%, rgba(92, 72, 255, 0.12), transparent 28rem),
    linear-gradient(180deg, #07101d 0%, #050a13 100%);
  color: var(--text-primary);
}

.sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  border-right: 1px solid var(--border-subtle);
  background: rgba(5, 10, 19, 0.78);
  backdrop-filter: blur(18px);
}

.main-region {
  min-width: 0;
  padding: 22px 20px 22px 20px;
}

.assistant-region {
  min-width: 0;
  padding: 24px 22px 22px 0;
}
```

The screenshot width is `1672px`. The layout above maps closely to the references:

- Sidebar: approximately `280-304px`.
- Main area: approximately `920-1040px`.
- Assistant: approximately `380-430px`.
- Gutters: approximately `16-22px`.

## 3.2 Responsive Behavior

For widths below `1180px`:

- Collapse sidebar to icon-only width `84px`.
- Keep top stepper visible but shorten labels if needed.
- Assistant panel becomes a right drawer triggered by an AI button.
- Main content becomes one column.

For widths below `760px`:

- Use bottom navigation or top compact nav instead of full sidebar.
- Top stepper becomes horizontal scroll.
- Workflow six-step tabs become horizontal scroll.
- Assistant is a modal sheet.
- Form fields stack vertically.
- Large textareas and upload dropzones remain full width.

Recommended breakpoints:

```css
@media (max-width: 1180px) {
  .app-shell {
    grid-template-columns: 84px minmax(0, 1fr);
  }

  .assistant-region {
    display: none;
  }
}

@media (max-width: 760px) {
  .app-shell {
    display: block;
  }

  .sidebar {
    position: sticky;
    top: 0;
    z-index: 40;
    width: 100%;
    height: auto;
  }

  .main-region {
    padding: 14px;
  }
}
```

## 4. Design Tokens

Use one shared token set across all pages. Do not hard-code random colors in individual components.

## 4.1 Color Tokens

```css
:root {
  --bg-page: #050a13;
  --bg-shell: #070d18;
  --bg-panel: #0b1322;
  --bg-card: #101827;
  --bg-card-elevated: #141d2f;
  --bg-input: #0d1626;
  --bg-control: #111b2d;
  --bg-control-hover: #17223a;

  --text-primary: #f2f6ff;
  --text-secondary: #c6cede;
  --text-muted: #8e9ab3;
  --text-faint: #66728a;

  --brand-purple: #7b4dff;
  --brand-purple-2: #a13cff;
  --brand-blue: #3d7dff;
  --brand-cyan: #55c7ff;

  --accent-gradient: linear-gradient(135deg, #b638d5 0%, #7b4dff 44%, #325fd6 100%);
  --accent-gradient-bright: linear-gradient(135deg, #c13be2 0%, #8157ff 48%, #4169ef 100%);
  --active-surface: rgba(99, 82, 220, 0.28);
  --active-surface-strong: rgba(109, 83, 255, 0.38);

  --border-subtle: rgba(151, 169, 212, 0.14);
  --border-default: rgba(151, 169, 212, 0.22);
  --border-strong: rgba(164, 181, 229, 0.34);
  --border-active: rgba(129, 91, 255, 0.78);

  --success: #58c878;
  --warning: #f2b84b;
  --danger: #ff6b8a;
  --info: #4ea3ff;

  --shadow-card: 0 18px 44px rgba(0, 0, 0, 0.28);
  --shadow-control: 0 10px 24px rgba(7, 10, 22, 0.24);
  --glow-purple: 0 0 0 1px rgba(126, 85, 255, 0.42), 0 0 26px rgba(126, 85, 255, 0.34);
  --glow-blue: 0 0 22px rgba(61, 125, 255, 0.24);
}
```

## 4.2 Radius, Spacing, and Size Tokens

```css
:root {
  --radius-xs: 6px;
  --radius-sm: 8px;
  --radius-md: 10px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-2xl: 20px;
  --radius-pill: 999px;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;

  --control-h-sm: 36px;
  --control-h-md: 44px;
  --control-h-lg: 54px;
  --sidebar-w: 304px;
  --assistant-w: 448px;
}
```

Style note:

- The screenshots use modest radii, mostly `8-16px`.
- Avoid very round floating cards. Buttons and small badges can be pill-shaped.
- Cards should feel crisp and product-focused, not soft marketing panels.

## 4.3 Typography

Recommended fonts:

```css
body {
  font-family: Inter, "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  line-height: 1.45;
  letter-spacing: 0;
}
```

Scale:

- Page title: `36px / 44px`, weight `700`.
- Section title: `20px / 28px`, weight `650`.
- Card title: `16px / 24px`, weight `650`.
- Body: `14px / 21px`, weight `400`.
- Secondary body: `13px / 20px`, weight `400`.
- Captions and Chinese subtitles: `12px / 18px`, weight `400`.
- Button: `14px / 18px`, weight `650`.

Bilingual pattern:

```tsx
<span className="label-en">Onboarding</span>
<span className="label-zh">入门</span>
```

```css
.label-en {
  display: block;
  color: var(--text-primary);
  font-weight: 650;
}

.label-zh {
  display: block;
  margin-top: 2px;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 18px;
}
```

## 5. Shared Components

## 5.1 Left Sidebar

The sidebar is a permanent product identity anchor.

Layout:

- Top logo row height: `72px`.
- Nav card starts around `88px` from top.
- Nav card padding: `12px`.
- Nav item height: `64px`.
- Icon area: `28px`.
- Text stack: English top, Chinese bottom.
- Bottom cards use same card style as page panels.

Visual style:

```css
.sidebar-logo {
  height: 72px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 26px;
}

.sidebar-logo-mark {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: var(--accent-gradient);
  box-shadow: var(--glow-purple);
}

.sidebar-card {
  margin: 14px 22px;
  padding: 12px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  background: rgba(16, 24, 39, 0.68);
  box-shadow: var(--shadow-control);
}

.nav-item {
  height: 64px;
  display: grid;
  grid-template-columns: 34px 1fr;
  align-items: center;
  gap: 12px;
  padding: 0 14px;
  border-radius: var(--radius-lg);
  color: var(--text-secondary);
}

.nav-item.active {
  color: var(--text-primary);
  background: linear-gradient(135deg, rgba(80, 104, 255, 0.38), rgba(116, 72, 255, 0.28));
}

.nav-item.active .nav-icon {
  color: #6f91ff;
}
```

Required nav entries:

- Home / 首页
- Projects / 项目管理
- Templates / 模板中心
- Brand Kit / 品牌中心
- Settings / 设置中心

Pro Plan card:

- Only shown on workflow and generate in the screenshots.
- Can be shown on all pages for consistency if vertical space allows.
- Crown icon in yellow.
- CTA uses the same purple gradient as primary buttons.

Team card:

- Avatar circle with `D`.
- Team name `Demo Team`.
- Chinese label `演示团队`.
- Member count.
- Invite Members button with user-plus icon.

## 5.2 Top Stepper

The top stepper should remain stable across all pages.

Behavior:

- Current route determines active step.
- Completed prior steps can use outline circles or check icons.
- Active step uses purple filled circle, glow, and active connector.
- Inactive future steps use dark surface and border.

Recommended structure:

```tsx
const topSteps = [
  { id: "onboarding", title: "Onboarding", zh: "入门", href: "/onboarding" },
  { id: "workflow", title: "Script & Collaborate", zh: "脚本与协作", href: "/workflow" },
  { id: "generate", title: "Generate & Export", zh: "生成与导出", href: "/generate" },
];
```

CSS:

```css
.top-stepper {
  height: 58px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
}

.top-step {
  display: grid;
  grid-template-columns: 44px max-content;
  align-items: center;
  gap: 10px;
  color: var(--text-secondary);
}

.top-step-index {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 1px solid var(--border-strong);
  background: #080f1c;
  color: var(--text-primary);
  font-weight: 650;
}

.top-step.active .top-step-index {
  border-color: rgba(125, 91, 255, 0.9);
  background: var(--accent-gradient-bright);
  box-shadow: var(--glow-purple);
}

.top-step-connector {
  width: 74px;
  height: 2px;
  background: rgba(151, 169, 212, 0.24);
}

.top-step-connector.active {
  background: linear-gradient(90deg, #7b4dff, #3d7dff);
}
```

## 5.3 Language Toggle

Used in the top-right corner on all pages and inside onboarding language selection.

```css
.segmented {
  display: inline-grid;
  grid-auto-flow: column;
  padding: 4px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  background: rgba(10, 17, 31, 0.86);
}

.segmented button {
  min-width: 58px;
  height: 36px;
  border: 0;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--text-muted);
  font-weight: 650;
}

.segmented button[data-active="true"] {
  background: var(--bg-control);
  color: var(--text-primary);
}
```

## 5.4 Assistant Panel

The assistant panel is page-specific in title and tone:

- Page 1: `AI Guide` / 快速上手指南
- Page 2: `AI Copilot` / 智能助手
- Page 3: `AI Producer` / AI 制作助手

Shared shell:

```css
.assistant-panel {
  height: calc(100vh - 46px);
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-xl);
  background: rgba(13, 21, 36, 0.92);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

.assistant-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 26px 22px 14px;
}

.assistant-body {
  flex: 1;
  overflow: auto;
  padding: 0 18px 18px;
}

.context-pill {
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 14px;
  border: 1px solid rgba(125, 91, 255, 0.45);
  border-radius: var(--radius-lg);
  background: rgba(76, 56, 180, 0.12);
  color: #b99cff;
}
```

Chat bubble styles:

```css
.message-row {
  display: flex;
  gap: 10px;
  margin-top: 14px;
}

.message-row.user {
  justify-content: flex-end;
}

.message-bubble {
  max-width: 78%;
  padding: 14px 16px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  background: var(--bg-card-elevated);
  color: var(--text-secondary);
}

.message-row.user .message-bubble {
  border-color: rgba(88, 118, 255, 0.52);
  background: rgba(55, 75, 154, 0.42);
}
```

Quick actions:

```css
.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 18px;
}

.quick-action {
  min-height: 44px;
  padding: 8px 12px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: rgba(12, 20, 35, 0.78);
  color: var(--text-secondary);
  text-align: left;
}

.quick-action:hover,
.quick-action[data-active="true"] {
  border-color: var(--border-active);
  color: #b99cff;
  background: rgba(76, 56, 180, 0.18);
}
```

Input:

```css
.assistant-input {
  display: grid;
  grid-template-columns: 1fr 42px;
  align-items: end;
  gap: 8px;
  margin-top: auto;
  padding: 12px 14px;
  border: 1px solid rgba(88, 118, 255, 0.52);
  border-radius: var(--radius-lg);
  background: rgba(9, 16, 30, 0.9);
}

.assistant-input textarea {
  min-height: 44px;
  max-height: 140px;
  resize: vertical;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text-primary);
}

.send-button {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: var(--radius-md);
  background: transparent;
  color: #8d6dff;
}
```

## 6. Page 1: Onboarding Specification

## 6.1 Layout

Main content uses a two-column content region inside the app shell:

- Center onboarding card: flexible width.
- Right guide panel: fixed assistant width.

The onboarding card should start below the stepper and have generous padding.

```css
.onboarding-card {
  margin-top: 2px;
  padding: 28px 38px 24px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-xl);
  background: rgba(13, 21, 36, 0.88);
  box-shadow: var(--shadow-card);
}

.page-title {
  margin: 0;
  font-size: 36px;
  line-height: 44px;
  font-weight: 750;
  letter-spacing: 0;
}

.page-subtitle-zh {
  margin-top: 2px;
  color: var(--text-primary);
  font-size: 17px;
  font-weight: 650;
}

.intro-copy {
  max-width: 760px;
  margin-top: 10px;
  color: var(--text-secondary);
  font-size: 16px;
  line-height: 24px;
}
```

## 6.2 Submission Textarea

Visual details:

- Label row has English and Chinese.
- Textarea height around `142px`.
- Placeholder uses muted text.
- Word requirement `20+ words` bottom left.
- Character count `0 / 2000` bottom right.
- Border brightens on focus.

```css
.field-label {
  display: flex;
  align-items: baseline;
  gap: 18px;
  margin: 22px 0 8px;
  color: var(--text-primary);
  font-weight: 650;
}

.field-label .zh {
  color: var(--text-muted);
  font-size: 13px;
}

.textarea-wrap {
  position: relative;
}

.submission-textarea {
  width: 100%;
  min-height: 142px;
  padding: 16px 18px 36px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  background: var(--bg-input);
  color: var(--text-primary);
  font-size: 16px;
  line-height: 24px;
  resize: vertical;
  outline: none;
}

.submission-textarea:focus {
  border-color: var(--border-active);
  box-shadow: 0 0 0 3px rgba(124, 77, 255, 0.16);
}

.textarea-meta {
  position: absolute;
  left: 18px;
  right: 18px;
  bottom: 12px;
  display: flex;
  justify-content: space-between;
  color: var(--text-muted);
  pointer-events: none;
}
```

## 6.3 Upload Dropzone

The upload control is a large dashed rectangle.

States:

- Default: dashed muted border.
- Hover: purple border and subtle purple surface.
- Drag active: purple border, glow, upload icon brighter.
- File selected: show file name, size, duration if available, and remove button.
- Error: red border and error message below.

```css
.upload-dropzone {
  height: 128px;
  display: grid;
  place-items: center;
  padding: 20px;
  border: 1px dashed rgba(164, 181, 229, 0.48);
  border-radius: var(--radius-lg);
  background: rgba(8, 15, 28, 0.66);
  color: var(--text-secondary);
  text-align: center;
}

.upload-dropzone:hover,
.upload-dropzone[data-dragging="true"] {
  border-color: rgba(155, 89, 255, 0.9);
  background: rgba(80, 56, 180, 0.1);
  box-shadow: inset 0 0 24px rgba(124, 77, 255, 0.08);
}

.upload-icon {
  color: #8b5cff;
  filter: drop-shadow(0 0 12px rgba(139, 92, 255, 0.36));
}
```

## 6.4 Primary CTA

The main button spans the form width and is visually important.

```css
.primary-cta {
  width: 100%;
  height: 54px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 22px;
  border: 0;
  border-radius: var(--radius-lg);
  background: var(--accent-gradient-bright);
  color: white;
  font-size: 18px;
  font-weight: 700;
  box-shadow: 0 12px 28px rgba(74, 70, 230, 0.28);
}

.primary-cta:hover {
  filter: brightness(1.06);
  box-shadow: 0 14px 32px rgba(74, 70, 230, 0.34);
}

.primary-cta:active {
  transform: scale(0.98);
}

.primary-cta:disabled {
  cursor: not-allowed;
  opacity: 0.5;
  filter: grayscale(0.3);
}
```

## 6.5 AI Guide Cards

Guide cards should be structured, not chat bubbles.

```css
.guide-card {
  display: grid;
  grid-template-columns: 34px 1fr;
  gap: 12px;
  padding: 18px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  background: var(--bg-card);
}

.guide-card + .guide-card {
  margin-top: 12px;
}

.guide-title {
  color: var(--text-primary);
  font-weight: 700;
}

.guide-body {
  margin-top: 10px;
  color: var(--text-secondary);
  line-height: 21px;
}

.guide-body-zh {
  margin-top: 8px;
  color: var(--text-muted);
  line-height: 20px;
}
```

## 7. Page 2: Workflow Specification

## 7.1 Layout

Workflow center area:

1. Top stepper.
2. Six-step tab strip.
3. Main editor card.

The tab strip and editor card align to the same width.

```css
.workflow-layout {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 12px;
}

.workflow-tabs {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  background: rgba(13, 21, 36, 0.9);
  overflow: hidden;
}

.script-tab {
  min-height: 82px;
  display: grid;
  grid-template-columns: 34px 1fr;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-right: 1px solid var(--border-subtle);
  background: transparent;
  color: var(--text-secondary);
}

.script-tab:last-child {
  border-right: 0;
}

.script-tab[data-active="true"] {
  position: relative;
  background: linear-gradient(180deg, rgba(91, 79, 213, 0.42), rgba(91, 79, 213, 0.22));
  color: var(--text-primary);
}

.script-tab[data-active="true"]::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  background: linear-gradient(90deg, #7b4dff, #b63cff);
}

.script-tab-index {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border: 1px solid var(--border-strong);
  border-radius: 50%;
  color: var(--text-primary);
  font-weight: 700;
}

.script-tab[data-active="true"] .script-tab-index {
  border-color: transparent;
  background: var(--brand-purple);
  box-shadow: var(--glow-purple);
}
```

## 7.2 Six Script Steps

Use the exact step model below.

```ts
type ScriptStepId =
  | "target-user"
  | "why-it-matters"
  | "product-intro"
  | "features"
  | "tech-stack"
  | "future-impact";

const scriptSteps = [
  {
    id: "target-user",
    index: 1,
    title: "Target User & Problem",
    zh: "目标用户与问题",
    icon: "Users",
  },
  {
    id: "why-it-matters",
    index: 2,
    title: "Why It Matters",
    zh: "为什么重要",
    icon: "Target",
  },
  {
    id: "product-intro",
    index: 3,
    title: "Product Intro",
    zh: "产品介绍",
    subtitle: "Logo / 名称 / 标语",
    icon: "PenLine",
  },
  {
    id: "features",
    index: 4,
    title: "Features",
    zh: "核心功能",
    icon: "Sparkles",
  },
  {
    id: "tech-stack",
    index: 5,
    title: "Tech Stack",
    zh: "技术栈",
    icon: "Cpu",
  },
  {
    id: "future-impact",
    index: 6,
    title: "Future Impact",
    zh: "未来影响",
    icon: "Rocket",
  },
];
```

## 7.3 Editor Card

The editor card should use a clear hierarchy:

- Project row.
- Completion row.
- Divider.
- Active step header.
- Active step fields.
- Bottom navigation.

```css
.editor-card {
  padding: 22px 24px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  background: rgba(13, 21, 36, 0.9);
  box-shadow: var(--shadow-card);
}

.editor-top-row {
  display: grid;
  grid-template-columns: minmax(280px, 1fr) 352px;
  gap: 80px;
  align-items: end;
}

.project-name-control {
  height: 40px;
  display: grid;
  grid-template-columns: 1fr 32px;
  align-items: center;
  padding: 0 12px 0 14px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: var(--bg-input);
}

.completion-bar {
  display: grid;
  grid-template-columns: 1fr 42px;
  align-items: center;
  gap: 14px;
  margin-top: 12px;
}

.progress-track {
  height: 9px;
  overflow: hidden;
  border-radius: var(--radius-pill);
  background: rgba(96, 110, 145, 0.22);
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #704dff, #a13cff);
  box-shadow: 0 0 18px rgba(126, 85, 255, 0.38);
}

.editor-divider {
  height: 1px;
  margin: 18px 0;
  background: var(--border-subtle);
}
```

## 7.4 Product Intro Form

The active screenshot focuses on Step 3. Implement this first and use the same styling for other steps.

Fields:

- Product Name, max 60 chars.
- Slogan, max 80 chars.
- Logo preview/upload/generated output.
- Generate Logo action.
- Script / Narration, max 2000 chars.

Layout:

```css
.active-step-header {
  display: grid;
  grid-template-columns: 52px 1fr;
  gap: 16px;
  align-items: start;
  margin-bottom: 22px;
}

.active-step-icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, #3d62f2, #7c4dff);
  color: white;
  box-shadow: var(--glow-blue);
}

.field-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 22px 38px;
}

.field-control {
  width: 100%;
  height: 42px;
  padding: 0 14px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: var(--bg-input);
  color: var(--text-primary);
  outline: none;
}

.field-control:focus,
.script-textarea:focus {
  border-color: var(--border-active);
  box-shadow: 0 0 0 3px rgba(124, 77, 255, 0.14);
}

.char-count {
  margin-top: 8px;
  color: var(--text-muted);
  font-size: 13px;
}

.product-intro-grid {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 38px;
  margin-top: 24px;
}

.logo-preview {
  height: 154px;
  display: grid;
  place-items: center;
  border: 1px dashed rgba(164, 181, 229, 0.52);
  border-radius: var(--radius-md);
  background:
    radial-gradient(circle at 50% 50%, rgba(91, 79, 213, 0.12), transparent 70%),
    rgba(7, 13, 24, 0.72);
}

.secondary-gradient-button {
  width: 100%;
  height: 44px;
  margin-top: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid rgba(145, 95, 255, 0.74);
  border-radius: var(--radius-md);
  background: rgba(80, 56, 180, 0.12);
  color: #b071ff;
  font-weight: 700;
}

.script-textarea {
  width: 100%;
  min-height: 220px;
  padding: 16px 18px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: var(--bg-input);
  color: var(--text-primary);
  line-height: 24px;
  resize: vertical;
  outline: none;
}
```

## 7.5 Workflow Bottom Navigation

The screenshot uses a subdued previous button and a bright next button.

```css
.workflow-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid var(--border-subtle);
}

.ghost-nav-button,
.next-nav-button {
  min-width: 136px;
  height: 50px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border-radius: var(--radius-md);
  font-weight: 700;
}

.ghost-nav-button {
  border: 1px solid var(--border-default);
  background: rgba(11, 18, 32, 0.72);
  color: var(--text-secondary);
}

.next-nav-button {
  border: 0;
  background: var(--accent-gradient-bright);
  color: white;
  box-shadow: 0 12px 24px rgba(74, 70, 230, 0.3);
}
```

## 7.6 Workflow Interaction Rules

Step tab:

- Clicking a tab changes `activeStepId`.
- Main form swaps to that step's fields.
- Assistant context pill updates immediately.
- Quick actions update to step-relevant actions.
- Completion bar recalculates.

Next:

- If current step passes minimum requirements, move to next step.
- If current step is invalid, focus first invalid field and show inline validation.
- On Step 6, `Next` becomes `Go to Generate`.

Previous:

- Moves to previous script step.
- On Step 1, can return to `/onboarding`.

AI Suggest:

- Only modifies the active step.
- Must show loading state on relevant button or field.
- Should offer diff/preview if replacing substantial text.

Generate Logo:

- Calls image generation endpoint.
- Shows loading state inside logo preview.
- On success, stores image as a compressed data URL or stable uploaded asset URL.
- On failure, keeps previous logo and shows retry affordance.

Validation:

- Product Name required.
- Slogan recommended but can be generated.
- Script / Narration required before generate.
- Each step should expose `requiredFields` and `completionWeight`.

## 8. Page 3: Generate & Export Specification

## 8.1 Generate Page Layout

The generate page is a pipeline dashboard. The content should prioritize status visibility.

```css
.generate-dashboard {
  display: grid;
  gap: 12px;
}

.pipeline-section {
  padding: 18px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  background: rgba(9, 20, 34, 0.9);
  box-shadow: var(--shadow-card);
}

.pipeline-header {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 18px;
  align-items: start;
}

.section-label-circle {
  width: 28px;
  height: 28px;
  display: inline-grid;
  place-items: center;
  margin-right: 12px;
  border: 1px solid rgba(126, 85, 255, 0.68);
  border-radius: 50%;
  color: #a88cff;
  font-weight: 700;
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
```

## 8.2 Storyboard Cards

Storyboard cards in `s3.png` use five equal columns.

```css
.storyboard-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.storyboard-card {
  min-width: 0;
  padding: 10px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: rgba(7, 18, 31, 0.8);
}

.storyboard-card[data-active="true"] {
  border-color: rgba(126, 85, 255, 0.62);
  box-shadow: inset 0 0 0 1px rgba(126, 85, 255, 0.16);
}

.storyboard-title {
  display: grid;
  grid-template-columns: 30px 1fr;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.storyboard-preview {
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: var(--radius-xs);
  background: #263347;
}

.storyboard-preview-grid {
  height: 100%;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 2px;
  opacity: 0.82;
  filter: saturate(0.72);
}

.storyboard-meta {
  margin-top: 8px;
  color: var(--text-secondary);
  font-size: 13px;
}

.status-box {
  min-height: 40px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 8px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: rgba(5, 18, 31, 0.68);
}
```

Status variants:

```css
.status-dot {
  width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  border-radius: 50%;
}

.status-dot.done {
  background: var(--success);
  color: white;
}

.status-dot.generating {
  border: 2px solid rgba(126, 85, 255, 0.3);
  border-top-color: var(--brand-purple);
  animation: spin 900ms linear infinite;
}

.status-dot.waiting {
  border: 2px dotted rgba(164, 181, 229, 0.58);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
```

## 8.3 Video Generation Table

The table should feel compact and operational.

```css
.generation-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 14px;
  overflow: hidden;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
}

.generation-table th {
  padding: 10px 14px;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 650;
  text-align: left;
  background: rgba(8, 18, 31, 0.72);
}

.generation-table td {
  padding: 10px 14px;
  border-top: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  vertical-align: middle;
}

.chapter-cell {
  display: grid;
  grid-template-columns: 28px 1fr;
  gap: 10px;
  align-items: center;
}

.mini-progress {
  display: grid;
  grid-template-columns: 1fr 44px;
  gap: 10px;
  align-items: center;
}

.row-actions {
  display: flex;
  gap: 8px;
}

.icon-button {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  background: rgba(11, 18, 32, 0.72);
  color: var(--text-secondary);
}

.icon-button:disabled {
  opacity: 0.4;
}
```

## 8.4 Export Summary and CTA

The bottom area has summary metrics on the left and a large export CTA on the right.

```css
.export-bottom {
  display: grid;
  grid-template-columns: minmax(360px, 0.9fr) minmax(360px, 1fr);
  gap: 16px;
  margin-top: 14px;
}

.export-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  background: rgba(7, 18, 31, 0.72);
}

.export-stat {
  padding: 20px;
  border-right: 1px solid var(--border-subtle);
}

.export-stat:last-child {
  border-right: 0;
}

.stat-value {
  margin-top: 8px;
  color: var(--text-primary);
  font-size: 26px;
  line-height: 32px;
  font-weight: 750;
}

.combine-export {
  min-height: 114px;
  display: grid;
  grid-template-columns: 88px 1fr 68px;
  align-items: center;
  gap: 18px;
  padding: 22px 28px;
  border: 0;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, #7b27d8 0%, #5837de 45%, #3158c9 100%);
  color: white;
  text-align: left;
  box-shadow: 0 16px 34px rgba(51, 70, 210, 0.3);
}

.combine-export:disabled {
  opacity: 0.48;
  cursor: not-allowed;
}
```

## 8.5 Generate Interaction Rules

Storyboard generation:

- `Generate Storyboards` starts all missing storyboards.
- `Regenerate` asks for confirmation if completed assets would be replaced.
- Individual storyboard card can be previewed.
- Running cards show spinner and percentage.
- Waiting cards remain disabled for preview/download.

Video generation:

- `Generate Video from Storyboards` is enabled when at least one storyboard is done.
- Each chapter row can preview, download, retry, or open more actions.
- Progress bars update independently.
- Video generation should not block assistant chat.

Export:

- `Combine & Export` is enabled when required chapters are done.
- Export readiness percent should be derived from completed video sections.
- Final export button shows loading state and then download/preview state.

## 9. Button System

Primary gradient:

```css
.btn-primary {
  border: 0;
  background: var(--accent-gradient-bright);
  color: white;
  box-shadow: 0 12px 24px rgba(74, 70, 230, 0.28);
}
```

Secondary outline:

```css
.btn-secondary {
  border: 1px solid var(--border-default);
  background: rgba(11, 18, 32, 0.72);
  color: var(--text-secondary);
}
```

Purple outline:

```css
.btn-purple-outline {
  border: 1px solid rgba(145, 95, 255, 0.74);
  background: rgba(80, 56, 180, 0.12);
  color: #b071ff;
}
```

Base:

```css
.button {
  min-height: var(--control-h-md);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 16px;
  border-radius: var(--radius-md);
  font-weight: 700;
  transition:
    transform 90ms ease,
    border-color 140ms ease,
    background-color 140ms ease,
    box-shadow 140ms ease,
    filter 140ms ease;
}

.button:hover {
  filter: brightness(1.05);
}

.button:active {
  transform: scale(0.98);
}

.button:focus-visible {
  outline: 2px solid rgba(139, 92, 255, 0.78);
  outline-offset: 2px;
}
```

Use icons from `lucide-react`:

- Sparkles: AI actions.
- UploadCloud: video upload.
- Send: chat send.
- PenLine: edit/product intro.
- ArrowLeft / ArrowRight: previous/next.
- Play: preview.
- Download: download.
- MoreHorizontal: more actions.
- RefreshCw: regenerate.
- Eye: preview all.
- Crown: pro plan.
- Users / UserPlus: team.
- Home / Folder / FileStack / Palette / Settings: navigation.

## 10. State and Data Model

## 10.1 Route State

```ts
type AppRoute = "/onboarding" | "/workflow" | "/generate";

type Locale = "en" | "zh";

type ProjectState = {
  id: string;
  projectName: string;
  locale: Locale;
  createdAt: string;
  updatedAt: string;
};
```

## 10.2 Onboarding State

```ts
type OnboardingState = {
  submission: string;
  wordCount: number;
  demoVideo?: {
    name: string;
    size: number;
    type: string;
    duration?: number;
    objectUrl?: string;
  };
  analysisStatus: "idle" | "analyzing" | "success" | "error";
  error?: string;
};
```

## 10.3 Workflow State

```ts
type WorkflowState = {
  activeStepId: ScriptStepId;
  steps: Record<ScriptStepId, ScriptStepState>;
  completionPercent: number;
  chat: AssistantMessage[];
};

type ScriptStepState = {
  id: ScriptStepId;
  title: string;
  zh: string;
  fields: Record<string, string>;
  requiredFields: string[];
  completionPercent: number;
  aiStatus: "idle" | "generating" | "error";
};

type ProductIntroFields = {
  productName: string;
  slogan: string;
  logoUrl?: string;
  scriptNarration: string;
};
```

## 10.4 Generate State

```ts
type GenerateState = {
  storyboards: Record<string, StoryboardSection>;
  videos: Record<string, VideoSection>;
  exportStatus: "idle" | "ready" | "exporting" | "done" | "error";
  exportUrl?: string;
};

type SectionStatus = "waiting" | "generating" | "done" | "error";

type StoryboardSection = {
  id: string;
  title: string;
  zh: string;
  frames: string[];
  durationSec: number;
  status: SectionStatus;
  progress: number;
};

type VideoSection = {
  id: string;
  storyboardStatus: SectionStatus;
  videoStatus: SectionStatus;
  progress: number;
  durationSec: number;
  videoUrl?: string;
};
```

## 10.5 Persistence

Use `sessionStorage` for hackathon demo speed:

- `demodance.project.v3`
- `demodance.onboarding.v3`
- `demodance.workflow.v3`
- `demodance.generate.v3`

Persist on:

- Text field blur.
- Step tab switch.
- Route change.
- Successful AI generation.
- Storyboard/video status update.

## 11. Component Architecture

Recommended files:

- `UI/demodance/app/_components/AppShell.tsx`
- `UI/demodance/app/_components/LeftSidebar.tsx`
- `UI/demodance/app/_components/TopStepper.tsx`
- `UI/demodance/app/_components/LanguageToggle.tsx`
- `UI/demodance/app/_components/AssistantPanel.tsx`
- `UI/demodance/app/_components/ProgressBar.tsx`
- `UI/demodance/app/_components/BilingualLabel.tsx`
- `UI/demodance/app/onboarding/page.tsx`
- `UI/demodance/app/onboarding/_components/SubmissionForm.tsx`
- `UI/demodance/app/onboarding/_components/VideoDropzone.tsx`
- `UI/demodance/app/workflow/page.tsx`
- `UI/demodance/app/workflow/_components/ScriptStepTabs.tsx`
- `UI/demodance/app/workflow/_components/WorkflowEditorCard.tsx`
- `UI/demodance/app/workflow/_components/ProductIntroForm.tsx`
- `UI/demodance/app/generate/page.tsx`
- `UI/demodance/app/generate/_components/StoryboardPipeline.tsx`
- `UI/demodance/app/generate/_components/VideoGenerationTable.tsx`
- `UI/demodance/app/generate/_components/ExportSummary.tsx`
- `UI/demodance/app/home/types.ts` or `UI/demodance/app/types.ts`
- `UI/demodance/app/globals.css`

## 12. Implementation Phases

## Phase A - Shared Shell and Tokens

Scope:

- Add shared CSS tokens.
- Build `AppShell`.
- Build `LeftSidebar`.
- Build `TopStepper`.
- Build `LanguageToggle`.
- Ensure `/onboarding`, `/workflow`, and `/generate` use the same shell.

Acceptance:

- All three pages have the same sidebar, top stepper, and language toggle.
- Background, border, card, text, and button colors come from tokens.
- Desktop layout matches screenshot proportions.

## Phase B - Onboarding Page

Scope:

- Build submission textarea with word/char count.
- Build upload dropzone states.
- Build language selector.
- Build primary CTA.
- Build AI Guide cards and checklist.

Acceptance:

- Looks close to `s1.png`.
- User can enter text, attach video, select language, and continue.
- CTA loading/error/success states are present.
- On success, workflow state is initialized.

## Phase C - Workflow Page

Scope:

- Build six-step tabs.
- Build project name + completion.
- Build Product Intro form.
- Build previous/next navigation.
- Build AI Copilot chat panel.
- Wire active step to assistant context.

Acceptance:

- Looks close to `s2.png`.
- Product Name, Slogan, Logo, and Script fields are editable.
- Character counts update.
- Completion updates.
- Step switching works.
- Previous/Next state rules work.

## Phase D - AI and Logo

Scope:

- Add AI suggest per active step.
- Add Generate Logo.
- Add loading, error, retry, and success states.
- Persist generated content.

Acceptance:

- AI suggestions do not overwrite unrelated steps.
- Logo appears in preview.
- Failed logo generation preserves previous data.
- Chat messages include bilingual context where appropriate.

## Phase E - Generate Page

Scope:

- Build Storyboard Generation section.
- Build storyboard cards with status states.
- Build Video Generation table.
- Build export stats.
- Build Combine & Export CTA.
- Build AI Producer panel.

Acceptance:

- Looks close to `s3.png`.
- Storyboard statuses can be done/generating/waiting.
- Video rows have independent progress.
- Export readiness reflects generated sections.
- Combine & Export has disabled/loading/success states.

## Phase F - Responsive and Polish

Scope:

- Add tablet and mobile behavior.
- Verify text wrapping.
- Verify bilingual labels.
- Add focus-visible states.
- Add reduced-motion support.
- Browser-check desktop and mobile screenshots.

Acceptance:

- No text overlaps.
- Main controls are at least `40px` clickable.
- Assistant panel does not squeeze forms on narrow desktop.
- All critical text meets WCAG AA contrast.

## 13. Motion and Interaction Polish

Use subtle motion only.

```css
.fade-slide-in {
  animation: fadeSlideIn 180ms ease both;
}

@keyframes fadeSlideIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 1ms !important;
  }
}
```

Recommended timings:

- Page content fade: `180-220ms`.
- Card hover: `120-160ms`.
- Button press: `90ms`.
- Step content switch: `160-180ms`.
- Spinner: `900ms linear`.

## 14. Accessibility Requirements

- Every icon-only button needs `aria-label`.
- Use real buttons for clickable tabs and actions.
- `ScriptStepTabs` should use `role="tablist"`, `role="tab"`, and `aria-selected`.
- Chat messages should not steal focus when new messages arrive.
- Loading buttons should expose `aria-busy`.
- Error text should be tied to fields with `aria-describedby`.
- Do not rely on purple alone for status; pair color with icon/text.
- Keep minimum hit area at `40px x 40px`.
- Ensure all text has visible focus and enough contrast.

## 15. Do Not Do

- Do not create a marketing landing page.
- Do not remove the three-page structure.
- Do not make each page use a different sidebar or background.
- Do not use large decorative gradient blobs or random visual ornaments.
- Do not use oversized rounded cards nested inside other cards.
- Do not put long explanations in the UI about how the app works.
- Do not let the AI panel dominate the workflow editor.
- Do not make the generate page look like a simple form; it is a pipeline dashboard.

## 16. Final Definition of Done

- `/onboarding`, `/workflow`, and `/generate` exist as real routes.
- The three pages share `AppShell`, `LeftSidebar`, `TopStepper`, `LanguageToggle`, and design tokens.
- Page 1 matches `s1.png` structure and style.
- Page 2 matches `s2.png` structure and style, with Product Intro as the default active step.
- Page 3 matches `s3.png` structure and style, with storyboard/video/export pipeline states.
- Bilingual English/Chinese labels are present for visible labels and assistant context.
- Purple/blue accents are reserved for active state, AI, progress, and primary actions.
- Forms, tabs, chat, generation statuses, and export readiness are interactive.
- No layout overlap on desktop, tablet, or mobile.
- Browser verification confirms the pages render nonblank and visually align with the screenshots.
