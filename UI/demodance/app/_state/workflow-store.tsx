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
  prompt?: string;
  storyboardFrames?: string[];
  storyboardPrompt?: string;
  taskId?: string;
  apiState?: string;
  progress?: number;
  videoUrl?: string;
  rawResponse?: unknown;
};

type SyncPayload = {
  projectId: string | null;
  projectName: string;
  submission: string;
  demoVideo: {
    name: string;
    size: number;
  } | null;
  activeStepId: StepId;
  fieldValues: Record<string, string>;
  stepScripts: Record<StepId, string>;
  chat: ChatMsg[];
  renderSections: Array<{
    id: StepId;
    title: string;
    summary: string;
    status: "idle" | "generating" | "done";
    durationSec: number;
    version: number;
    storyboardFrames?: string[];
    taskId?: string;
    apiState?: string;
    progress?: number;
    videoUrl?: string;
  }>;
};

type StoreState = {
  projectId: string | null;
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
  projectId: string | null;
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
  saveProject: () => Promise<boolean>;
  saveState: "idle" | "saving" | "saved" | "error";
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

function normalizeDurationSec(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(Math.max(Math.round(parsed), 4), 15);
}

function getDefaultRenderSections(): SectionRender[] {
  return [
    { id: "audience", title: "Target User & Problem", summary: "", status: "idle", durationSec: 12, version: 0 },
    { id: "importance", title: "Why It Matters", summary: "", status: "idle", durationSec: 12, version: 0 },
    { id: "product", title: "Product Intro", summary: "", status: "idle", durationSec: 15, version: 0 },
    { id: "features", title: "Features", summary: "", status: "idle", durationSec: 15, version: 0 },
    { id: "impact", title: "Future Impact", summary: "", status: "idle", durationSec: 12, version: 0 },
  ];
}

function normalizeRenderSections(sections: SectionRender[]): SectionRender[] {
  const defaults = getDefaultRenderSections();
  const defaultMap = new Map(defaults.map((section) => [section.id, section]));

  return sections.map((section) => {
    const fallback = defaultMap.get(section.id)?.durationSec ?? 12;
    return {
      ...section,
      durationSec: normalizeDurationSec(section.durationSec, fallback),
    };
  });
}

function buildDefaultState(locale: "en" | "zh" = "en"): StoreState {
  return {
    projectId: null,
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
      projectId: typeof parsed.projectId === "string" && parsed.projectId.trim().length > 0 ? parsed.projectId : null,
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
      renderSections:
        Array.isArray(parsed.renderSections) && parsed.renderSections.length > 0
          ? normalizeRenderSections(parsed.renderSections as SectionRender[])
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

function trimText(value: string, limit: number) {
  const normalized = value.trim();
  return normalized.length > limit ? normalized.slice(0, limit) : normalized;
}

function sanitizeFieldValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("data:")) {
    return "[inline asset omitted from autosave]";
  }
  return trimmed.length > 4000 ? trimmed.slice(0, 4000) : trimmed;
}

function buildSyncPayload(snapshot: StoreState): SyncPayload {
  const fieldValues = Object.fromEntries(
    Object.entries(snapshot.fieldValues).map(([key, value]) => [key, sanitizeFieldValue(value)]),
  );

  const stepScripts = {
    audience: trimText(snapshot.stepScripts.audience ?? "", 4000),
    importance: trimText(snapshot.stepScripts.importance ?? "", 4000),
    product: trimText(snapshot.stepScripts.product ?? "", 4000),
    features: trimText(snapshot.stepScripts.features ?? "", 4000),
    tech: trimText(snapshot.stepScripts.tech ?? "", 4000),
    impact: trimText(snapshot.stepScripts.impact ?? "", 4000),
  } satisfies Record<StepId, string>;

  const chat = snapshot.chat.slice(-12).map((message) => ({
    ...message,
    text: typeof message.text === "string" ? trimText(message.text, 1500) : "",
    tag: typeof message.tag === "string" ? trimText(message.tag, 120) : undefined,
  }));

  const renderSections = snapshot.renderSections.map((section) => ({
    id: section.id,
    title: trimText(section.title, 120),
    summary: trimText(section.summary, 2000),
    status: section.status,
    durationSec: section.durationSec,
    version: section.version,
    storyboardFrames: Array.isArray(section.storyboardFrames)
      ? section.storyboardFrames
          .filter((frame): frame is string => typeof frame === "string" && frame.length > 0 && !frame.startsWith("data:"))
          .slice(0, 4)
          .map((frame) => trimText(frame, 2000))
      : undefined,
    taskId: typeof section.taskId === "string" ? trimText(section.taskId, 200) : undefined,
    apiState: typeof section.apiState === "string" ? trimText(section.apiState, 120) : undefined,
    progress: typeof section.progress === "number" ? section.progress : undefined,
    videoUrl:
      typeof section.videoUrl === "string" && !section.videoUrl.startsWith("data:")
        ? trimText(section.videoUrl, 2000)
        : undefined,
  }));

  return {
    projectId: snapshot.projectId,
    projectName: trimText(snapshot.projectName, 200),
    submission: trimText(snapshot.submission, 8000),
    demoVideo: snapshot.demoVideo
      ? {
          name: trimText(snapshot.demoVideo.name, 300),
          size: snapshot.demoVideo.size,
        }
      : null,
    activeStepId: snapshot.activeStepId,
    fieldValues,
    stepScripts,
    chat,
    renderSections,
  };
}

function hasSavableProgress(state: StoreState) {
  if (state.projectName.trim().length > 0) return true;
  if (state.submission.trim().length > 0) return true;
  if (state.demoVideo) return true;
  if (Object.values(state.fieldValues).some((value) => value.trim().length > 0)) return true;
  if (Object.values(state.stepScripts).some((value) => value.trim().length > 0)) return true;
  if (state.chat.length > 1) return true;
  if (state.renderSections.some((section) => section.summary.trim().length > 0 || (section.prompt ?? "").trim().length > 0 || section.taskId || section.videoUrl)) {
    return true;
  }
  return false;
}

const WorkflowStoreContext = createContext<WorkflowStoreValue | null>(null);

export function WorkflowStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>(() => loadInitialState());
  const [hasHydrated, setHasHydrated] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const { locale } = useLocale();

  useEffect(() => {
    startTransition(() => {
      setState(loadStoredState());
    });
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!hasSavableProgress(state)) return;

    const timeoutId = window.setTimeout(async () => {
      try {
        await saveProjectState(state, false);
      } catch {
        // keep local editing uninterrupted if autosave fails
      }
    }, 1200);

    return () => window.clearTimeout(timeoutId);
  }, [hasHydrated, state]);

  async function saveProjectState(snapshot: StoreState, showStatus = true): Promise<boolean> {
    if (!hasSavableProgress(snapshot)) {
      return false;
    }

    if (showStatus) {
      setSaveState("saving");
    }

    try {
      const payload = buildSyncPayload(snapshot);
      const response = await fetch("/api/projects/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        if (showStatus) {
          setSaveState("error");
        }
        return false;
      }

      const result = (await response.json()) as { projectId?: string };
      const syncedProjectId = typeof result.projectId === "string" && result.projectId ? result.projectId : null;
      if (syncedProjectId && syncedProjectId !== snapshot.projectId) {
        setState((prev) => {
          if (prev.projectId === syncedProjectId) {
            return prev;
          }
          const next = { ...prev, projectId: syncedProjectId };
          persistState(next);
          return next;
        });
      }

      if (showStatus) {
        setSaveState("saved");
      }
      return true;
    } catch {
      if (showStatus) {
        setSaveState("error");
      }
      return false;
    }
  }

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
      projectId: state.projectId,
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
      saveProject: () => saveProjectState(state, true),
      saveState,
      resetAll: () =>
        setStateAndPersist(() => ({
          projectId: null,
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
    [state, steps, overallFilled, allDone, locale, saveState],
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
