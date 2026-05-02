import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import {
  createButterbaseRow,
  getButterbaseRow,
  updateButterbaseRow,
  upsertButterbaseRow,
} from "@/lib/server/butterbase/client";
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
  logoAsset?: unknown;
  stepScripts?: Record<string, string>;
  chat?: unknown[];
  renderSections?: unknown[];
};

type ButterbaseRow = {
  id?: string;
};

type SanitizedStoredAsset = {
  objectId: string;
  url: string;
  fileName?: string;
  contentType?: string;
  sizeBytes?: number;
};

type SanitizedRenderSection = ReturnType<typeof sanitizeRenderSections>[number];

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
  return input.slice(-4).map((message) => {
    if (!message || typeof message !== "object") {
      return { role: "ai", text: "" };
    }
    const row = message as Record<string, unknown>;
    return {
      role: row.role === "user" ? "user" : "ai",
      text: trimText(row.text, 500),
      tag: trimText(row.tag, 120) || undefined,
    };
  });
}

function sanitizeStoredAsset(input: unknown): SanitizedStoredAsset | null {
  if (!input || typeof input !== "object") return null;
  const row = input as Record<string, unknown>;
  const objectId = trimText(row.objectId, 200);
  const url = trimText(row.url, 2000);
  if (!objectId || !url) return null;
  return {
    objectId,
    url,
    fileName: trimText(row.fileName, 300) || undefined,
    contentType: trimText(row.contentType, 120) || undefined,
    sizeBytes: typeof row.sizeBytes === "number" ? row.sizeBytes : Number(row.sizeBytes) || undefined,
  };
}

function sanitizeRenderSections(input: unknown[]) {
  return input.map((section) => {
    const row = section && typeof section === "object" ? (section as Record<string, unknown>) : {};
    return {
      id: trimText(row.id, 50),
      title: trimText(row.title, 120),
      summary: trimText(row.summary, 500),
      status: trimText(row.status, 40) || "idle",
      durationSec: typeof row.durationSec === "number" ? row.durationSec : Number(row.durationSec) || 0,
      version: typeof row.version === "number" ? row.version : Number(row.version) || 0,
      storyboardFrames: Array.isArray(row.storyboardFrames)
        ? row.storyboardFrames
            .filter((frame): frame is string => typeof frame === "string" && frame.length > 0 && !frame.startsWith("data:"))
            .slice(0, 4)
            .map((frame) => trimText(frame, 2000))
        : undefined,
      storyboardAssets: Array.isArray(row.storyboardAssets) ? row.storyboardAssets.map(sanitizeStoredAsset).filter(Boolean) : undefined,
      taskId: trimText(row.taskId, 200) || undefined,
      apiState: trimText(row.apiState, 120) || undefined,
      progress: typeof row.progress === "number" ? row.progress : Number(row.progress) || undefined,
      videoUrl:
        typeof row.videoUrl === "string" && !row.videoUrl.startsWith("data:") ? trimText(row.videoUrl, 2000) : undefined,
      generatedVideoUrl:
        typeof row.generatedVideoUrl === "string" && !row.generatedVideoUrl.startsWith("data:")
          ? trimText(row.generatedVideoUrl, 2000)
          : typeof row.videoUrl === "string" && !row.videoUrl.startsWith("data:")
            ? trimText(row.videoUrl, 2000)
            : undefined,
    };
  });
}

function createProjectMetadata(body: SyncRequestBody) {
  return {
    submission: trimText(body.submission, 2000),
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
    chat: Array.isArray(body.chat) ? sanitizeChat(body.chat) : [],
    renderSections: sanitizeRenderSections(Array.isArray(body.renderSections) ? body.renderSections : []).map((section) => ({
      id: section.id,
      title: section.title,
      summary: section.summary,
      status: section.status,
      durationSec: section.durationSec,
      version: section.version,
      taskId: section.taskId,
      apiState: section.apiState,
      progress: section.progress,
    })),
    syncedAt: new Date().toISOString(),
  };
}

function stableUuid(...parts: string[]) {
  const hex = createHash("sha1").update(parts.join(":")).digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function parseFieldKey(key: string) {
  const dot = key.indexOf(".");
  if (dot <= 0) return null;
  const step = key.slice(0, dot);
  const fieldKey = key.slice(dot + 1);
  if (!STEP_ORDER.includes(step as (typeof STEP_ORDER)[number]) || !fieldKey) return null;
  return { step, fieldKey };
}

function sanitizeStepScripts(input: unknown) {
  return Object.fromEntries(
    Object.entries((input && typeof input === "object" ? input : {}) as Record<string, unknown>).map(([key, value]) => [key, trimText(value, 1200)]),
  );
}

function mapTaskStatus(apiState: string | undefined) {
  if (!apiState) return "queued";
  if (apiState === "succeeded") return "succeeded";
  if (apiState === "failed" || apiState.startsWith("error:")) return "failed";
  if (apiState === "cancelled") return "canceled";
  if (apiState === "queued" || apiState === "video-queued") return "queued";
  if (apiState === "running" || apiState === "storyboard-ready") return "running";
  return "running";
}

async function syncProjectStepFields(projectId: string, fieldValues: Record<string, string>) {
  const tasks = Object.entries(fieldValues)
    .map(([fullKey, valueText]) => {
      const parsed = parseFieldKey(fullKey);
      if (!parsed) return null;
      const id = stableUuid("project_step_field", projectId, parsed.step, parsed.fieldKey);
      return upsertButterbaseRow("project_step_fields", id, {
        project_id: projectId,
        step: parsed.step,
        field_key: parsed.fieldKey,
        value_text: valueText,
        source: "user",
      });
    })
    .filter(Boolean);

  await Promise.all(tasks);
}

async function syncStepScriptDocuments(projectId: string, stepScripts: Record<string, string>) {
  const tasks = Object.entries(stepScripts).map(([step, content]) => {
    if (!STEP_ORDER.includes(step as (typeof STEP_ORDER)[number])) return null;
    const id = stableUuid("project_step_document", projectId, step, "narration-script");
    return upsertButterbaseRow("project_step_documents", id, {
      project_id: projectId,
      step,
      slug: "narration-script",
      title: `${step} narration script`,
      status: content ? "ready" : "draft",
      content_md: content,
      created_by_role: "user",
    });
  });

  await Promise.all(tasks.filter(Boolean));
}

async function syncProjectAssets(
  projectId: string,
  demoVideo: unknown,
  renderSections: SanitizedRenderSection[],
  logoAsset: SanitizedStoredAsset | null,
  fieldValues: Record<string, string>,
) {
  const tasks: Promise<unknown>[] = [];

  if (demoVideo && typeof demoVideo === "object") {
    const row = demoVideo as Record<string, unknown>;
    const id = stableUuid("project_asset", projectId, "demo_video", "primary");
    tasks.push(
      upsertButterbaseRow("project_assets", id, {
        project_id: projectId,
        kind: "demo_video",
        file_name: trimText(row.name, 300) || undefined,
        file_size_bytes: typeof row.size === "number" ? row.size : Number(row.size) || undefined,
        storage_url: typeof row.url === "string" && !row.url.startsWith("blob:") && !row.url.startsWith("data:") ? trimText(row.url, 2000) : undefined,
        metadata: {
          source: "autosave",
        },
      }),
    );
  }

  if (logoAsset || fieldValues["product.logo"]) {
    const id = stableUuid("project_asset", projectId, "product", "logo");
    tasks.push(
      upsertButterbaseRow("project_assets", id, {
        project_id: projectId,
        kind: "logo",
        file_name: logoAsset?.fileName || "logo",
        mime_type: logoAsset?.contentType,
        file_size_bytes: logoAsset?.sizeBytes,
        storage_url: logoAsset?.url || fieldValues["product.logo"],
        provider: "openai",
        provider_asset_id: logoAsset?.objectId,
        metadata: {
          step: "product",
          field_key: "logo",
          source: logoAsset ? "generated-logo" : "legacy-logo-url",
        },
      }),
    );
  }

  for (const section of renderSections) {
    const frames: SanitizedStoredAsset[] =
      Array.isArray(section.storyboardAssets) && section.storyboardAssets.length > 0
        ? section.storyboardAssets.filter((asset): asset is SanitizedStoredAsset => Boolean(asset))
        : Array.isArray(section.storyboardFrames)
          ? section.storyboardFrames.map((frame) => ({
              objectId: "",
              url: frame,
            }))
          : [];
    frames.forEach((frame, index) => {
      const id = stableUuid("project_asset", projectId, section.id, "image", String(index));
      tasks.push(
        upsertButterbaseRow("project_assets", id, {
          project_id: projectId,
          kind: "image",
          file_name: frame.fileName || `${section.id}-storyboard-${index + 1}.png`,
          mime_type: frame.contentType,
          file_size_bytes: frame.sizeBytes,
          storage_url: frame.url,
          provider: "openai",
          provider_asset_id: frame.objectId || undefined,
          metadata: {
            section_id: section.id,
            section_title: section.title,
            frame_index: index,
            source: frame.objectId ? "storyboard" : "legacy-storyboard-url",
          },
        }),
      );
    });

    if (section.generatedVideoUrl || section.videoUrl) {
      const id = stableUuid("project_asset", projectId, section.id, "final_video");
      tasks.push(
        upsertButterbaseRow("project_assets", id, {
          project_id: projectId,
          kind: "final_video",
          file_name: `${section.id}.mp4`,
          storage_url: section.generatedVideoUrl || section.videoUrl,
          provider: "byteplus",
          metadata: {
            section_id: section.id,
            section_title: section.title,
            source: "section-video",
          },
        }),
      );
    }
  }

  await Promise.all(tasks);
}

async function syncExternalVideoTasks(projectId: string, renderSections: SanitizedRenderSection[]) {
  const tasks = renderSections
    .filter((section) => section.taskId)
    .map((section) => {
      const id = stableUuid("external_video_task", projectId, section.id);
      return upsertButterbaseRow("external_video_tasks", id, {
        project_id: projectId,
        provider: "byteplus",
        external_task_id: section.taskId,
        status: mapTaskStatus(section.apiState),
        video_url: section.generatedVideoUrl || section.videoUrl || undefined,
        response_payload: {
          section_id: section.id,
          section_title: section.title,
          progress: section.progress,
          api_state: section.apiState,
        },
      });
    });

  await Promise.all(tasks);
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
  const fieldValues = sanitizeFieldValues(body.fieldValues);
  const logoAsset = sanitizeStoredAsset(body.logoAsset);
  const stepScripts = sanitizeStepScripts(body.stepScripts);
  const renderSections = sanitizeRenderSections(Array.isArray(body.renderSections) ? body.renderSections : []);
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

    await Promise.all([
      syncProjectStepFields(projectId, fieldValues),
      syncStepScriptDocuments(projectId, stepScripts),
      syncProjectAssets(projectId, body.demoVideo ?? null, renderSections, logoAsset, fieldValues),
      syncExternalVideoTasks(projectId, renderSections),
    ]);

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
