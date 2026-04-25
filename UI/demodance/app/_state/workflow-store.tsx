"use client";

import { createContext, ReactNode, startTransition, useContext, useEffect, useMemo, useState } from "react";

import { useLocale } from "../locale-provider";
import type { ChatMsg, Step, StepId } from "../home/types";
import { getInitialChat, getInitialSteps } from "../home/types";

type DemoVideoMeta = {
  name: string;
  size: number;
  url?: string;
};

type SectionRender = {
  id: StepId;
  title: string;
  summary: string;
  status: "idle" | "generating" | "done";
  durationSec: number;
  version: number;
  storyboardFrames?: string[];
  storyboardPrompt?: string;
  taskId?: string;
  apiState?: string;
  progress?: number;
  videoUrl?: string;
  rawResponse?: unknown;
};

type StoreState = {
  projectName: string;
  submission: string;
  demoVideo: DemoVideoMeta | null;
  activeStepId: StepId;
  fieldValues: Record<string, string>;
  stepScripts: Record<StepId, string>;
  chat: ChatMsg[];
  renderSections: SectionRender[];
};

type WorkflowStoreValue = {
  projectName: string;
  setProjectName: (value: string) => void;
  submission: string;
  setSubmission: (value: string) => void;
  demoVideo: DemoVideoMeta | null;
  setDemoVideo: (value: DemoVideoMeta | null) => void;
  activeStepId: StepId;
  setActiveStepId: (value: StepId) => void;
  steps: Step[];
  overallFilled: number;
  allDone: boolean;
  updateField: (stepId: StepId, fieldKey: string, value: string) => void;
  fillStepFields: (stepId: StepId, values: Record<string, string>) => void;
  getStepScript: (stepId: StepId) => string;
  setStepScript: (stepId: StepId, script: string) => void;
  chat: ChatMsg[];
  setChat: (next: ChatMsg[] | ((prev: ChatMsg[]) => ChatMsg[])) => void;
  renderSections: SectionRender[];
  setRenderSections: (next: SectionRender[] | ((prev: SectionRender[]) => SectionRender[])) => void;
  resetAll: () => void;
};

const STORAGE_KEY = "demodance.workflow.v2";

const stepOrder: StepId[] = ["audience", "importance", "product", "features", "tech", "impact"];

const DEFAULT_FIELD_VALUES: Record<string, string> = {};

const DEFAULT_STEP_SCRIPTS: Record<StepId, string> = {
  audience: "",
  importance: "",
  product: "",
  features: "",
  tech: "",
  impact: "",
};

function getFieldStorageKey(stepId: string, fieldKey: string): string {
  return `${stepId}.${fieldKey}`;
}

function getDefaultRenderSections(): SectionRender[] {
  return [
    { id: "audience", title: "Target User & Problem", summary: "", status: "idle", durationSec: 15, version: 0 },
    { id: "importance", title: "Why It Matters", summary: "", status: "idle", durationSec: 15, version: 0 },
    { id: "product", title: "Product Intro", summary: "", status: "idle", durationSec: 20, version: 0 },
    { id: "features", title: "Features", summary: "", status: "idle", durationSec: 30, version: 0 },
    { id: "impact", title: "Future Impact", summary: "", status: "idle", durationSec: 20, version: 0 },
  ];
}

function buildDefaultState(locale: "en" | "zh" = "en"): StoreState {
  return {
    projectName: "",
    submission: "",
    demoVideo: null,
    activeStepId: "audience",
    fieldValues: DEFAULT_FIELD_VALUES,
    stepScripts: DEFAULT_STEP_SCRIPTS,
    chat: getInitialChat(locale),
    renderSections: getDefaultRenderSections(),
  };
}

function loadStoredState(): StoreState {
  if (typeof window === "undefined") {
    return buildDefaultState("en");
  }

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return buildDefaultState("en");
    }

    const parsed = JSON.parse(raw) as Partial<StoreState>;
    return {
      projectName: typeof parsed.projectName === "string" ? parsed.projectName : "",
      submission: typeof parsed.submission === "string" ? parsed.submission : "",
      demoVideo: parsed.demoVideo && typeof parsed.demoVideo === "object" ? (parsed.demoVideo as DemoVideoMeta) : null,
      activeStepId: stepOrder.includes(parsed.activeStepId as StepId) ? (parsed.activeStepId as StepId) : "audience",
      fieldValues:
        parsed.fieldValues && typeof parsed.fieldValues === "object"
          ? { ...DEFAULT_FIELD_VALUES, ...(parsed.fieldValues as Record<string, string>) }
          : DEFAULT_FIELD_VALUES,
      stepScripts:
        parsed.stepScripts && typeof parsed.stepScripts === "object"
          ? {
              audience:
                typeof (parsed.stepScripts as Record<string, unknown>).audience === "string"
                  ? ((parsed.stepScripts as Record<string, string>).audience ?? "")
                  : DEFAULT_STEP_SCRIPTS.audience,
              importance:
                typeof (parsed.stepScripts as Record<string, unknown>).importance === "string"
                  ? ((parsed.stepScripts as Record<string, string>).importance ?? "")
                  : DEFAULT_STEP_SCRIPTS.importance,
              product:
                typeof (parsed.stepScripts as Record<string, unknown>).product === "string"
                  ? ((parsed.stepScripts as Record<string, string>).product ?? "")
                  : DEFAULT_STEP_SCRIPTS.product,
              features:
                typeof (parsed.stepScripts as Record<string, unknown>).features === "string"
                  ? ((parsed.stepScripts as Record<string, string>).features ?? "")
                  : DEFAULT_STEP_SCRIPTS.features,
              tech:
                typeof (parsed.stepScripts as Record<string, unknown>).tech === "string"
                  ? ((parsed.stepScripts as Record<string, string>).tech ?? "")
                  : DEFAULT_STEP_SCRIPTS.tech,
              impact:
                typeof (parsed.stepScripts as Record<string, unknown>).impact === "string"
                  ? ((parsed.stepScripts as Record<string, string>).impact ?? "")
                  : DEFAULT_STEP_SCRIPTS.impact,
            }
          : DEFAULT_STEP_SCRIPTS,
      chat: Array.isArray(parsed.chat) && parsed.chat.length > 0 ? (parsed.chat as ChatMsg[]) : getInitialChat("en"),
      renderSections: Array.isArray(parsed.renderSections) && parsed.renderSections.length > 0
        ? (parsed.renderSections as SectionRender[])
        : getDefaultRenderSections(),
    };
  } catch {
    return buildDefaultState("en");
  }
}

function loadInitialState(): StoreState {
  if (typeof window === "undefined") {
    return buildDefaultState("en");
  }

  return buildDefaultState("en");
}

function persistState(next: StoreState) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore quota/storage errors
  }
}

const WorkflowStoreContext = createContext<WorkflowStoreValue | null>(null);

export function WorkflowStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>(() => loadInitialState());
  const { locale } = useLocale();

  useEffect(() => {
    startTransition(() => {
      setState(loadStoredState());
    });
  }, []);

  const steps = useMemo(() => {
    const templates = getInitialSteps(locale);
    return templates.map((step) => ({
      ...step,
      fields: step.fields.map((field) => ({
        ...field,
        value: state.fieldValues[getFieldStorageKey(step.id, field.key)] ?? "",
      })),
    }));
  }, [locale, state.fieldValues]);

  const progress = useMemo(
    () =>
      steps.map((step) => {
        const filled = step.fields.filter((field) => field.value.trim().length > 0).length;
        const scriptFilled = (state.stepScripts[step.id] ?? "").trim().length > 0 ? 1 : 0;
        const total = step.fields.length + 1;
        return {
          id: step.id,
          filled: filled + scriptFilled,
          total,
          done: filled + scriptFilled === total,
        };
      }),
    [steps, state.stepScripts],
  );

  const overallFilled = useMemo(() => progress.filter((p) => p.done).length, [progress]);
  const allDone = overallFilled === steps.length;

  function setStateAndPersist(updater: (prev: StoreState) => StoreState) {
    setState((prev) => {
      const next = updater(prev);
      persistState(next);
      return next;
    });
  }

  const value = useMemo<WorkflowStoreValue>(
    () => ({
      projectName: state.projectName,
      setProjectName: (projectName) => setStateAndPersist((prev) => ({ ...prev, projectName })),
      submission: state.submission,
      setSubmission: (submission) => setStateAndPersist((prev) => ({ ...prev, submission })),
      demoVideo: state.demoVideo,
      setDemoVideo: (demoVideo) => setStateAndPersist((prev) => ({ ...prev, demoVideo })),
      activeStepId: state.activeStepId,
      setActiveStepId: (activeStepId) => setStateAndPersist((prev) => ({ ...prev, activeStepId })),
      steps,
      overallFilled,
      allDone,
      updateField: (stepId, fieldKey, valueText) =>
        setStateAndPersist((prev) => ({
          ...prev,
          fieldValues: {
            ...prev.fieldValues,
            [getFieldStorageKey(stepId, fieldKey)]: valueText,
          },
        })),
      fillStepFields: (stepId, values) =>
        setStateAndPersist((prev) => {
          const updates: Record<string, string> = { ...prev.fieldValues };
          for (const [key, val] of Object.entries(values)) {
            updates[getFieldStorageKey(stepId, key)] = val;
          }
          return {
            ...prev,
            fieldValues: updates,
          };
        }),
      getStepScript: (stepId) => state.stepScripts[stepId] ?? "",
      setStepScript: (stepId, script) =>
        setStateAndPersist((prev) => ({
          ...prev,
          stepScripts: {
            ...prev.stepScripts,
            [stepId]: script,
          },
        })),
      chat: state.chat,
      setChat: (next) =>
        setStateAndPersist((prev) => ({
          ...prev,
          chat: typeof next === "function" ? next(prev.chat) : next,
        })),
      renderSections: state.renderSections,
      setRenderSections: (next) =>
        setStateAndPersist((prev) => ({
          ...prev,
          renderSections: typeof next === "function" ? next(prev.renderSections) : next,
        })),
      resetAll: () =>
        setStateAndPersist(() => ({
          projectName: "",
          submission: "",
          demoVideo: null,
          activeStepId: "audience",
          fieldValues: DEFAULT_FIELD_VALUES,
          stepScripts: DEFAULT_STEP_SCRIPTS,
          chat: getInitialChat(locale),
          renderSections: getDefaultRenderSections(),
        })),
    }),
    [state, steps, overallFilled, allDone, locale],
  );

  return <WorkflowStoreContext.Provider value={value}>{children}</WorkflowStoreContext.Provider>;
}

export function useWorkflowStore() {
  const ctx = useContext(WorkflowStoreContext);
  if (!ctx) {
    throw new Error("useWorkflowStore must be used within WorkflowStoreProvider");
  }
  return ctx;
}
