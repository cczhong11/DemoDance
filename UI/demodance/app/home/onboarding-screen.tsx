import type { DemoVideoMeta, LocaleCode } from "./types";

type OnboardingScreenProps = {
  locale: LocaleCode;
  isEn: boolean;
  submission: string;
  demoVideo: DemoVideoMeta | null;
  parsing: boolean;
  canStart: boolean;
  tr: (en: string, zh: string) => string;
  onLocaleChange: (next: LocaleCode) => void;
  onSubmissionChange: (value: string) => void;
  onDemoVideoSelect: (file: File) => void;
  onStart: () => void;
  onSkip: () => void;
};

export function OnboardingScreen(props: OnboardingScreenProps) {
  const {
    locale,
    isEn,
    submission,
    demoVideo,
    parsing,
    canStart,
    tr,
    onLocaleChange,
    onSubmissionChange,
    onDemoVideoSelect,
    onStart,
    onSkip,
  } = props;

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100 text-zinc-900">
      <header className="h-14 flex items-center px-6 border-b border-zinc-200 bg-white/60 backdrop-blur">
        <div className="text-[15px] font-semibold tracking-tight">
          🎬 <span className="ml-1">DemoDance</span>
        </div>
        <div className="ml-2 text-xs text-zinc-400">From raw demo to launch-ready</div>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <button
            onClick={() => onLocaleChange("en")}
            className={`text-xs px-2 py-1 rounded ${locale === "en" ? "bg-black text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}
          >
            EN
          </button>
          <button
            onClick={() => onLocaleChange("zh")}
            className={`text-xs px-2 py-1 rounded ${locale === "zh" ? "bg-black text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}
          >
            中文
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <div className="inline-block text-[11px] uppercase tracking-widest text-zinc-500 bg-zinc-100 px-3 py-1 rounded-full mb-4">
              Hackathon Launch Video · AI Generated
            </div>
            <h1 className="text-3xl font-semibold tracking-tight mb-3">
              {tr("Turn your hackathon project into a launch video", "把你的 Hackathon 作品，变成一条 launch 视频")}
            </h1>
            <p className="text-sm text-zinc-600 max-w-lg mx-auto leading-relaxed">
              {tr(
                "Paste your submission text and upload raw demo capture. AI handles script, storyboard, voiceover, and rendering.",
                "贴上你的 Hackathon 提交文字 + 上传原始 demo 录屏，剩下的脚本、分镜、配音、合成 —— 都交给 AI。",
              )}
            </p>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-6 flex flex-col gap-5">
            <div>
              <label className="flex items-center justify-between text-sm font-medium mb-2">
                <span>
                  <span className="text-zinc-400 mr-2">1.</span>
                  {tr("Hackathon Submission", "Hackathon 提交说明")}
                </span>
                <span className="text-[11px] text-zinc-400">
                  {isEn ? `${submission.length} chars · recommended 50+` : `${submission.length} 字 · 建议 50+ 字`}
                </span>
              </label>
              <textarea
                value={submission}
                onChange={(e) => onSubmissionChange(e.target.value)}
                placeholder={tr(
                  "Paste what you wrote in your hackathon submission: what it does, what problem it solves, who it's for, and stack used. AI will turn it into script blocks.",
                  "贴上你在 Hackathon 提交页填的说明：产品做什么、解决什么问题、为谁做、用到什么技术… AI 会帮你拆成脚本。",
                )}
                rows={6}
                className="w-full text-[13px] leading-relaxed border border-zinc-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-zinc-500 resize-none placeholder:text-zinc-400"
              />
            </div>

            <div>
              <label className="flex items-center justify-between text-sm font-medium mb-2">
                <span>
                  <span className="text-zinc-400 mr-2">2.</span>
                  {tr("Raw Demo Video", "原始 Demo 视频")}
                </span>
                <span className="text-[11px] text-zinc-400">{tr("Optional · mp4 / mov", "可选 · mp4 / mov")}</span>
              </label>
              <label
                htmlFor="demo-video"
                className={`block border-2 border-dashed rounded-lg px-4 py-6 text-center cursor-pointer transition ${
                  demoVideo ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50"
                }`}
              >
                {demoVideo ? (
                  <div className="text-sm">
                    <div className="font-medium text-zinc-900">🎞️ {demoVideo.name}</div>
                    <div className="text-xs text-zinc-500 mt-1">
                      {isEn
                        ? `${(demoVideo.size / (1024 * 1024)).toFixed(1)} MB · click to replace`
                        : `${(demoVideo.size / (1024 * 1024)).toFixed(1)} MB · 点击替换`}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-zinc-500">
                    <div className="text-2xl mb-2">📁</div>
                    {tr("Click or drag to upload demo capture", "点击或拖拽上传你的 demo 录屏")}
                    <div className="text-[11px] text-zinc-400 mt-1">
                      {tr("No video? Skip it — AI can generate placeholder storyboard from text.", "没有视频也可以跳过 —— AI 会基于文字生成占位分镜")}
                    </div>
                  </div>
                )}
                <input
                  id="demo-video"
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onDemoVideoSelect(f);
                  }}
                />
              </label>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                disabled={!canStart}
                onClick={onStart}
                className={`flex-1 h-11 rounded-lg text-sm font-medium transition ${
                  canStart ? "bg-black text-white hover:bg-zinc-800" : "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                }`}
              >
                {parsing
                  ? tr("AI is parsing your materials...", "AI 正在读取素材…")
                  : tr("✨ Let AI draft the script", "✨ 让 AI 帮我起草脚本")}
              </button>
              <button onClick={onSkip} className="h-11 px-4 rounded-lg text-sm text-zinc-500 hover:text-zinc-800">
                {tr("Next", "下一步")}
              </button>
            </div>
          </div>

          <div className="mt-5 text-center text-[11px] text-zinc-400">
            {tr(
              "Next you'll enter a 6-step workflow — each step can be completed by chatting with AI.",
              "接下来你会看到一个 6 步工作流 · 每一步都可以和 AI 聊着填",
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
