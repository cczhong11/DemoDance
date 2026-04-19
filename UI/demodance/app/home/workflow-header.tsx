import type { LocaleCode, StepId } from "./types";

type WorkflowHeaderProps = {
  locale: LocaleCode;
  isEn: boolean;
  overallFilled: number;
  totalSteps: number;
  projectName: string;
  prevStepId: StepId | null;
  nextStepId: StepId | null;
  allDone: boolean;
  tr: (en: string, zh: string) => string;
  onBackHome: () => void;
  onLocaleChange: (next: LocaleCode) => void;
  onProjectNameChange: (value: string) => void;
  onPrevStep: () => void;
  onNextStep: () => void;
  onGoToGenerate: () => void;
};

export function WorkflowHeader(props: WorkflowHeaderProps) {
  const {
    locale,
    isEn,
    overallFilled,
    totalSteps,
    projectName,
    prevStepId,
    nextStepId,
    allDone,
    tr,
    onBackHome,
    onLocaleChange,
    onProjectNameChange,
    onPrevStep,
    onNextStep,
    onGoToGenerate,
  } = props;

  return (
    <header className="h-14 flex items-center gap-4 border-b border-zinc-200 bg-white px-5">
      <button onClick={onBackHome} className="text-[15px] font-semibold tracking-tight hover:opacity-70" title={tr("Back to onboarding", "回到起点")}>
        🎬 <span className="ml-1">DemoDance</span>
      </button>
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <span>{tr("Project", "项目")}</span>
        <input
          value={projectName}
          onChange={(e) => onProjectNameChange(e.target.value)}
          className="border border-dashed border-zinc-300 rounded px-2 py-0.5 text-zinc-700 focus:outline-none focus:border-zinc-500"
        />
      </div>
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
      <div className="text-xs text-zinc-500">{isEn ? `${overallFilled} / ${totalSteps} steps complete` : `${overallFilled} / ${totalSteps} 步完成`}</div>
      <div className="flex items-center gap-1">
        <button
          onClick={onPrevStep}
          disabled={!prevStepId}
          className={`text-xs px-2.5 py-1 rounded ${prevStepId ? "bg-zinc-100 text-zinc-700 hover:bg-zinc-200" : "bg-zinc-100 text-zinc-400 cursor-not-allowed"}`}
        >
          {tr("Prev", "上一步")}
        </button>
        <button
          onClick={onNextStep}
          disabled={!nextStepId}
          className={`text-xs px-2.5 py-1 rounded ${nextStepId ? "bg-zinc-100 text-zinc-700 hover:bg-zinc-200" : "bg-zinc-100 text-zinc-400 cursor-not-allowed"}`}
        >
          {tr("Next", "下一步")}
        </button>
      </div>

      <button
        disabled={!allDone}
        onClick={onGoToGenerate}
        className={`text-xs px-4 py-1.5 rounded font-medium ${allDone ? "bg-black text-white hover:bg-zinc-800" : "bg-zinc-200 text-zinc-400 cursor-not-allowed"}`}
      >
        {tr("Go to Generate", "去底部生成")}
      </button>
    </header>
  );
}
