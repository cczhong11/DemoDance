import { NextResponse } from "next/server";

import { createButterbaseRow, getButterbaseRow, updateButterbaseRow } from "@/lib/server/butterbase/client";
import { jsonError, readJsonBody } from "@/lib/server/http";

export const runtime = "nodejs";

const STEP_ORDER = ["audience", "importance", "product", "features", "tech", "impact"] as const;

type SyncRequestBody = {
  projectId?: string;
  projectName?: string;
  submission?: string;
  demoVideo?: unknown;
  activeStepId?: string;
  fieldValues?: Record<string, string>;
  stepScripts?: Record<string, string>;
  chat?: unknown[];
  renderSections?: unknown[];
};

type ButterbaseRow = {
  id?: string;
};

function trimText(value: unknown, limit: number) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > limit ? text.slice(0, limit) : text;
}

function sanitizeFieldValues(input: unknown) {
  if (!input || typeof input !== "object") return {};
  return Object.fromEntries(
    Object.entries(input as Record<string, unknown>).map(([key, value]) => [
      key,
      typeof value === "string" && value.startsWith("data:") ? "[inline asset omitted from autosave]" : trimText(value, 4000),
    ]),
  );
}

function sanitizeChat(input: unknown[]) {
  return input.slice(-12).map((message) => {
    if (!message || typeof message !== "object") {
      return { role: "ai", text: "" };
    }
    const row = message as Record<string, unknown>;
    return {
      role: row.role === "user" ? "user" : "ai",
      text: trimText(row.text, 1500),
      tag: trimText(row.tag, 120) || undefined,
    };
  });
}

function sanitizeRenderSections(input: unknown[]) {
  return input.map((section) => {
    const row = section && typeof section === "object" ? (section as Record<string, unknown>) : {};
    return {
      id: trimText(row.id, 50),
      title: trimText(row.title, 120),
      summary: trimText(row.summary, 2000),
      status: trimText(row.status, 40) || "idle",
      durationSec: typeof row.durationSec === "number" ? row.durationSec : Number(row.durationSec) || 0,
      version: typeof row.version === "number" ? row.version : Number(row.version) || 0,
      storyboardFrames: Array.isArray(row.storyboardFrames)
        ? row.storyboardFrames
            .filter((frame): frame is string => typeof frame === "string" && frame.length > 0 && !frame.startsWith("data:"))
            .slice(0, 4)
            .map((frame) => trimText(frame, 2000))
        : undefined,
      taskId: trimText(row.taskId, 200) || undefined,
      apiState: trimText(row.apiState, 120) || undefined,
      progress: typeof row.progress === "number" ? row.progress : Number(row.progress) || undefined,
      videoUrl:
        typeof row.videoUrl === "string" && !row.videoUrl.startsWith("data:") ? trimText(row.videoUrl, 2000) : undefined,
    };
  });
}

function createProjectMetadata(body: SyncRequestBody) {
  return {
    submission: trimText(body.submission, 8000),
    demoVideo:
      body.demoVideo && typeof body.demoVideo === "object"
        ? {
            name: trimText((body.demoVideo as Record<string, unknown>).name, 300),
            size:
              typeof (body.demoVideo as Record<string, unknown>).size === "number"
                ? (body.demoVideo as Record<string, number>).size
                : Number((body.demoVideo as Record<string, unknown>).size) || 0,
          }
        : null,
    fieldValues: sanitizeFieldValues(body.fieldValues),
    stepScripts: sanitizeFieldValues(body.stepScripts),
    chat: Array.isArray(body.chat) ? sanitizeChat(body.chat) : [],
    renderSections: Array.isArray(body.renderSections) ? sanitizeRenderSections(body.renderSections) : [],
    syncedAt: new Date().toISOString(),
  };
}

async function ensureProjectSteps(projectId: string) {
  await Promise.all(
    STEP_ORDER.map((step, index) =>
      createButterbaseRow("project_steps", {
        project_id: projectId,
        step,
        position: index + 1,
        status: "pending",
      }).catch(() => null),
    ),
  );
}

export async function POST(request: Request) {
  const body = (await readJsonBody(request)) as SyncRequestBody;
  const projectName = (body.projectName ?? "").trim() || "Untitled Project";
  const activeStepId = typeof body.activeStepId === "string" ? body.activeStepId : "audience";
  const metadata = createProjectMetadata(body);

  try {
    let projectId = typeof body.projectId === "string" ? body.projectId : "";

    if (projectId) {
      try {
        await getButterbaseRow<ButterbaseRow>("projects", projectId);
      } catch (error) {
        const status =
          error && typeof error === "object" && "status" in error
            ? Number((error as { status?: number }).status) || 500
            : 500;
        if (status === 404) {
          projectId = "";
        } else {
          throw error;
        }
      }
    }

    if (!projectId) {
      const created = await createButterbaseRow<ButterbaseRow>("projects", {
        name: projectName,
        status: "draft",
        active_step: activeStepId,
        metadata,
      });
      projectId = created.id ?? "";
      if (!projectId) {
        throw new Error("Butterbase did not return a project id");
      }
      await ensureProjectSteps(projectId);
    } else {
      await updateButterbaseRow("projects", projectId, {
        name: projectName,
        active_step: activeStepId,
        metadata,
      });
    }

    return NextResponse.json({
      ok: true,
      projectId,
      savedAt: metadata.syncedAt,
    });
  } catch (error) {
    const details =
      error && typeof error === "object" && "details" in error
        ? JSON.stringify((error as { details?: unknown }).details)
        : error instanceof Error
          ? error.message
          : String(error);

    const status =
      error && typeof error === "object" && "status" in error
        ? Number((error as { status?: number }).status) || 500
        : 500;

    return jsonError("Butterbase autosave failed", status, details);
  }
}
