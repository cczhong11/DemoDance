"use client";

import { createContext, ReactNode, startTransition, useContext, useEffect, useMemo, useState } from "react";

import { useLocale } from "../locale-provider";
import type { ChatMsg, Step, StepId } from "../home/types";
import { getInitialChat, getInitialSteps } from "../home/types";

export type DemoVideoMeta = {
  name: string;
  size: number;
  url?: string;
};

export type StoredAssetRef = {
  objectId: string;
  url: string;
  fileName?: string;
  contentType?: string;
  sizeBytes?: number;
};

export type SectionRender = {
  id: StepId;
  title: string;
  summary: string;
  status: "idle" | "generating" | "done";
  durationSec: number;
  version: number;
  prompt?: string;
  storyboardFrames?: string[];
  storyboardAssets?: StoredAssetRef[];
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
    storyboardAssets?: StoredAssetRef[];
    taskId?: string;
    apiState?: string;
    progress?: number;
    videoUrl?: string;
    generatedVideoUrl?: string;
  }>;
  logoAsset?: StoredAssetRef | null;
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
  logoAsset: StoredAssetRef | null;
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
  logoAsset: StoredAssetRef | null;
  setLogoAsset: (asset: StoredAssetRef | null) => void;
  chat: ChatMsg[];
  setChat: (next: ChatMsg[] | ((prev: ChatMsg[]) => ChatMsg[])) => void;
  renderSections: SectionRender[];
  setRenderSections: (next: SectionRender[] | ((prev: SectionRender[]) => SectionRender[])) => void;
  loadProject: (project: Partial<StoreState> & { projectId?: string | null }) => void;
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
    const hasStoryboardFrames = Array.isArray(section.storyboardFrames) && section.storyboardFrames.length > 0;
    const isStuckStoryboardGeneration =
      section.status === "generating" &&
      !hasStoryboardFrames &&
      (!section.apiState || section.apiState === "queued") &&
      (section.progress ?? 0) <= 0;

    return {
      ...section,
      durationSec: normalizeDurationSec(section.durationSec, fallback),
      status: isStuckStoryboardGeneration ? "idle" : section.status,
      apiState: isStuckStoryboardGeneration ? undefined : section.apiState,
      progress: isStuckStoryboardGeneration ? undefined : section.progress,
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
    logoAsset: null,
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
      logoAsset:
        parsed.logoAsset &&
        typeof parsed.logoAsset === "object" &&
        typeof (parsed.logoAsset as StoredAssetRef).objectId === "string" &&
        typeof (parsed.logoAsset as StoredAssetRef).url === "string"
          ? (parsed.logoAsset as StoredAssetRef)
          : null,
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

function normalizeLoadedStepScripts(input: unknown): Record<StepId, string> {
  const row = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  return {
    audience: typeof row.audience === "string" ? row.audience : DEFAULT_STEP_SCRIPTS.audience,
    importance: typeof row.importance === "string" ? row.importance : DEFAULT_STEP_SCRIPTS.importance,
    product: typeof row.product === "string" ? row.product : DEFAULT_STEP_SCRIPTS.product,
    features: typeof row.features === "string" ? row.features : DEFAULT_STEP_SCRIPTS.features,
    tech: typeof row.tech === "string" ? row.tech : DEFAULT_STEP_SCRIPTS.tech,
    impact: typeof row.impact === "string" ? row.impact : DEFAULT_STEP_SCRIPTS.impact,
  };
}

function buildStateFromLoadedProject(
  project: Partial<StoreState> & { projectId?: string | null },
  locale: "en" | "zh",
): StoreState {
  const base = buildDefaultState(locale);
  const renderSections =
    Array.isArray(project.renderSections) && project.renderSections.length > 0
      ? normalizeRenderSections(project.renderSections as SectionRender[])
      : base.renderSections;

  return {
    projectId: typeof project.projectId === "string" && project.projectId.trim() ? project.projectId : null,
    projectName: typeof project.projectName === "string" ? project.projectName : base.projectName,
    submission: typeof project.submission === "string" ? project.submission : base.submission,
    demoVideo: project.demoVideo && typeof project.demoVideo === "object" ? (project.demoVideo as DemoVideoMeta) : base.demoVideo,
    activeStepId: stepOrder.includes(project.activeStepId as StepId) ? (project.activeStepId as StepId) : base.activeStepId,
    fieldValues:
      project.fieldValues && typeof project.fieldValues === "object"
        ? { ...DEFAULT_FIELD_VALUES, ...(project.fieldValues as Record<string, string>) }
        : base.fieldValues,
    stepScripts: normalizeLoadedStepScripts(project.stepScripts),
    chat: Array.isArray(project.chat) && project.chat.length > 0 ? (project.chat as ChatMsg[]) : getInitialChat(locale),
    renderSections,
    logoAsset:
      project.logoAsset &&
      typeof project.logoAsset === "object" &&
      typeof (project.logoAsset as StoredAssetRef).objectId === "string" &&
      typeof (project.logoAsset as StoredAssetRef).url === "string"
        ? (project.logoAsset as StoredAssetRef)
        : base.logoAsset,
  };
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
    audience: trimText(snapshot.stepScripts.audience ?? "", 1200),
    importance: trimText(snapshot.stepScripts.importance ?? "", 1200),
    product: trimText(snapshot.stepScripts.product ?? "", 1200),
    features: trimText(snapshot.stepScripts.features ?? "", 1200),
    tech: trimText(snapshot.stepScripts.tech ?? "", 1200),
    impact: trimText(snapshot.stepScripts.impact ?? "", 1200),
  } satisfies Record<StepId, string>;

  const chat = snapshot.chat.slice(-4).map((message) => ({
    ...message,
    text: typeof message.text === "string" ? trimText(message.text, 500) : "",
    tag: typeof message.tag === "string" ? trimText(message.tag, 120) : undefined,
  }));

  const renderSections = snapshot.renderSections.map((section) => ({
    id: section.id,
    title: trimText(section.title, 120),
    summary: trimText(section.summary, 500),
    status: section.status,
    durationSec: section.durationSec,
    version: section.version,
    storyboardFrames: Array.isArray(section.storyboardFrames)
      ? section.storyboardFrames
          .filter((frame): frame is string => typeof frame === "string" && frame.length > 0 && !frame.startsWith("data:"))
          .slice(0, 4)
          .map((frame) => trimText(frame, 2000))
      : undefined,
    storyboardAssets: Array.isArray(section.storyboardAssets)
      ? section.storyboardAssets
          .filter(
            (asset): asset is StoredAssetRef =>
              typeof asset?.objectId === "string" &&
              asset.objectId.length > 0 &&
              typeof asset.url === "string" &&
              asset.url.length > 0,
          )
          .slice(0, 4)
          .map((asset) => ({
            objectId: trimText(asset.objectId, 200),
            url: trimText(asset.url, 2000),
            fileName: typeof asset.fileName === "string" ? trimText(asset.fileName, 300) : undefined,
            contentType: typeof asset.contentType === "string" ? trimText(asset.contentType, 120) : undefined,
            sizeBytes: typeof asset.sizeBytes === "number" ? asset.sizeBytes : undefined,
          }))
      : undefined,
    taskId: typeof section.taskId === "string" ? trimText(section.taskId, 200) : undefined,
    apiState: typeof section.apiState === "string" ? trimText(section.apiState, 120) : undefined,
    progress: typeof section.progress === "number" ? section.progress : undefined,
    videoUrl:
      typeof section.videoUrl === "string" && !section.videoUrl.startsWith("data:")
        ? trimText(section.videoUrl, 2000)
        : undefined,
    generatedVideoUrl:
      typeof section.videoUrl === "string" && !section.videoUrl.startsWith("data:")
        ? trimText(section.videoUrl, 2000)
        : undefined,
  }));

  return {
    projectId: snapshot.projectId,
    projectName: trimText(snapshot.projectName, 200),
    submission: trimText(snapshot.submission, 2000),
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
    logoAsset:
      snapshot.logoAsset && snapshot.logoAsset.objectId && snapshot.logoAsset.url
        ? {
            objectId: trimText(snapshot.logoAsset.objectId, 200),
            url: trimText(snapshot.logoAsset.url, 2000),
            fileName: typeof snapshot.logoAsset.fileName === "string" ? trimText(snapshot.logoAsset.fileName, 300) : undefined,
            contentType:
              typeof snapshot.logoAsset.contentType === "string" ? trimText(snapshot.logoAsset.contentType, 120) : undefined,
            sizeBytes: typeof snapshot.logoAsset.sizeBytes === "number" ? snapshot.logoAsset.sizeBytes : undefined,
          }
        : null,
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

    const timeoutId = window.setTimeout(() => {
      setHasHydrated(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
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
      logoAsset: state.logoAsset,
      setLogoAsset: (logoAsset) =>
        setStateAndPersist((prev) => ({
          ...prev,
          logoAsset,
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
      loadProject: (project) =>
        setStateAndPersist(() => buildStateFromLoadedProject(project, locale)),
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
          logoAsset: null,
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
