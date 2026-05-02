import { NextResponse } from "next/server";

import { createButterbaseDownloadUrl, getButterbaseRow, listButterbaseRows } from "@/lib/server/butterbase/client";
import { jsonError } from "@/lib/server/http";

export const runtime = "nodejs";

type ButterbaseProjectRow = {
  id?: unknown;
  name?: unknown;
  active_step?: unknown;
  metadata?: unknown;
};

type ButterbaseFieldRow = {
  project_id?: unknown;
  step?: unknown;
  field_key?: unknown;
  value_text?: unknown;
};

type ButterbaseDocumentRow = {
  project_id?: unknown;
  step?: unknown;
  slug?: unknown;
  content_md?: unknown;
};

type ButterbaseAssetRow = {
  project_id?: unknown;
  kind?: unknown;
  storage_url?: unknown;
  provider_asset_id?: unknown;
  file_name?: unknown;
  mime_type?: unknown;
  file_size_bytes?: unknown;
  metadata?: unknown;
};

type ButterbaseExternalTaskRow = {
  project_id?: unknown;
  external_task_id?: unknown;
  status?: unknown;
  video_url?: unknown;
  response_payload?: unknown;
};

const DEFAULT_RENDER_SECTIONS = [
  { id: "audience", title: "Target User & Problem", durationSec: 12 },
  { id: "importance", title: "Why It Matters", durationSec: 12 },
  { id: "product", title: "Product Intro", durationSec: 15 },
  { id: "features", title: "Features", durationSec: 15 },
  { id: "impact", title: "Future Impact", durationSec: 12 },
] as const;

function isRenderSectionId(value: string): value is (typeof DEFAULT_RENDER_SECTIONS)[number]["id"] {
  return DEFAULT_RENDER_SECTIONS.some((section) => section.id === value);
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function readArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

async function resolveAssetUrl(asset: ButterbaseAssetRow) {
  if (typeof asset.provider_asset_id === "string" && asset.provider_asset_id) {
    try {
      const download = await createButterbaseDownloadUrl(asset.provider_asset_id);
      if (download.downloadUrl) {
        return download.downloadUrl;
      }
    } catch {
      // fall back to stored URL below if download URL refresh fails
    }
  }

  return typeof asset.storage_url === "string" ? asset.storage_url : "";
}

export async function GET(_request: Request, context: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await context.params;

  try {
    const row = await getButterbaseRow<ButterbaseProjectRow>("projects", projectId);
    const metadata = readRecord(row.metadata);
    const [fieldRows, documentRows, assetRows, taskRows] = await Promise.all([
      listButterbaseRows<ButterbaseFieldRow[] | { data?: ButterbaseFieldRow[] }>("project_step_fields").catch(() => []),
      listButterbaseRows<ButterbaseDocumentRow[] | { data?: ButterbaseDocumentRow[] }>("project_step_documents").catch(() => []),
      listButterbaseRows<ButterbaseAssetRow[] | { data?: ButterbaseAssetRow[] }>("project_assets").catch(() => []),
      listButterbaseRows<ButterbaseExternalTaskRow[] | { data?: ButterbaseExternalTaskRow[] }>("external_video_tasks").catch(() => []),
    ]);

    const normalizedFieldRows = readArray<ButterbaseFieldRow>(Array.isArray(fieldRows) ? fieldRows : fieldRows.data);
    const normalizedDocumentRows = readArray<ButterbaseDocumentRow>(Array.isArray(documentRows) ? documentRows : documentRows.data);
    const normalizedAssetRows = readArray<ButterbaseAssetRow>(Array.isArray(assetRows) ? assetRows : assetRows.data);
    const normalizedTaskRows = readArray<ButterbaseExternalTaskRow>(Array.isArray(taskRows) ? taskRows : taskRows.data);

    const fieldValues: Record<string, string> = {};
    for (const field of normalizedFieldRows) {
      if (field.project_id !== projectId) continue;
      if (typeof field.step !== "string" || typeof field.field_key !== "string") continue;
      fieldValues[`${field.step}.${field.field_key}`] = typeof field.value_text === "string" ? field.value_text : "";
    }

    const stepScripts: Record<string, string> = {};
    for (const doc of normalizedDocumentRows) {
      if (doc.project_id !== projectId) continue;
      if (doc.slug !== "narration-script" || typeof doc.step !== "string") continue;
      stepScripts[doc.step] = typeof doc.content_md === "string" ? doc.content_md : "";
    }

    const renderSectionMap = new Map<string, {
      id: (typeof DEFAULT_RENDER_SECTIONS)[number]["id"];
      title: string;
      summary: string;
      status: "idle" | "generating" | "done";
      durationSec: number;
      version: number;
      storyboardFrames: string[];
      storyboardAssets: Array<{
        objectId: string;
        url: string;
        fileName?: string;
        contentType?: string;
        sizeBytes?: number;
      }>;
      taskId?: string;
      apiState?: string;
      progress?: number;
      videoUrl?: string;
    }>(
      DEFAULT_RENDER_SECTIONS.map((section) => [
        section.id,
        {
          id: section.id,
          title: section.title,
          summary: "",
          status: "idle",
          durationSec: section.durationSec,
          version: 0,
          storyboardFrames: [] as string[],
          storyboardAssets: [] as Array<{
            objectId: string;
            url: string;
            fileName?: string;
            contentType?: string;
            sizeBytes?: number;
          }>,
          taskId: undefined as string | undefined,
          apiState: undefined as string | undefined,
          progress: undefined as number | undefined,
          videoUrl: undefined as string | undefined,
        },
      ]),
    );

    for (const section of readArray<Record<string, unknown>>(metadata.renderSections)) {
      const id = typeof section.id === "string" ? section.id : "";
      if (!isRenderSectionId(id)) continue;
      const current = renderSectionMap.get(id);
      if (!current) continue;
      renderSectionMap.set(id, {
        ...current,
        title: typeof section.title === "string" ? section.title : current.title,
        summary: typeof section.summary === "string" ? section.summary : current.summary,
        status:
          section.status === "done" || section.status === "generating" || section.status === "idle" ? section.status : current.status,
        durationSec: typeof section.durationSec === "number" ? section.durationSec : current.durationSec,
        version: typeof section.version === "number" ? section.version : current.version,
        taskId: typeof section.taskId === "string" ? section.taskId : current.taskId,
        apiState: typeof section.apiState === "string" ? section.apiState : current.apiState,
        progress: typeof section.progress === "number" ? section.progress : current.progress,
      });
    }

    const resolvedAssetUrls = await Promise.all(normalizedAssetRows.map((asset) => resolveAssetUrl(asset)));
    const logoAssetPair = normalizedAssetRows
      .map((asset, index) => ({
        asset,
        url: resolvedAssetUrls[index] || "",
      }))
      .find(({ asset, url }) => asset.project_id === projectId && asset.kind === "logo" && url);

    for (const [index, asset] of normalizedAssetRows.entries()) {
      if (asset.project_id !== projectId) continue;
      const meta = readRecord(asset.metadata);
      const sectionId = typeof meta.section_id === "string" ? meta.section_id : "";
      if (!isRenderSectionId(sectionId)) {
        if (asset.kind === "logo" && resolvedAssetUrls[index]) {
          fieldValues["product.logo"] = resolvedAssetUrls[index] || "";
        }
        continue;
      }
      const current = renderSectionMap.get(sectionId);
      const storageUrl = resolvedAssetUrls[index] || "";
      if (!storageUrl) continue;
      if (!current) continue;

      if (asset.kind === "image") {
        current.storyboardFrames = [...current.storyboardFrames, storageUrl];
        current.storyboardAssets = [
          ...(current.storyboardAssets ?? []),
          {
            objectId: typeof asset.provider_asset_id === "string" ? asset.provider_asset_id : "",
            url: storageUrl,
            fileName: typeof asset.file_name === "string" ? asset.file_name : undefined,
            contentType: typeof asset.mime_type === "string" ? asset.mime_type : undefined,
            sizeBytes: typeof asset.file_size_bytes === "number" ? asset.file_size_bytes : Number(asset.file_size_bytes) || undefined,
          },
        ].filter((item) => item.objectId && item.url);
      }
      if (asset.kind === "final_video") {
        current.videoUrl = storageUrl;
      }
    }

    for (const task of normalizedTaskRows) {
      if (task.project_id !== projectId) continue;
      const payload = readRecord(task.response_payload);
      const sectionId = typeof payload.section_id === "string" ? payload.section_id : "";
      const current = renderSectionMap.get(sectionId);
      if (!current) continue;
      current.taskId = typeof task.external_task_id === "string" ? task.external_task_id : current.taskId;
      current.apiState = typeof payload.api_state === "string" ? payload.api_state : typeof task.status === "string" ? task.status : current.apiState;
      current.progress = typeof payload.progress === "number" ? payload.progress : current.progress;
      current.videoUrl = typeof task.video_url === "string" ? task.video_url : current.videoUrl;
      if (task.status === "succeeded" || current.videoUrl) {
        current.status = "done";
      } else if (task.status === "running" || task.status === "queued") {
        current.status = "generating";
      }
    }

    return NextResponse.json({
      projectId: typeof row.id === "string" ? row.id : projectId,
      projectName: typeof row.name === "string" ? row.name : "",
      submission: typeof metadata.submission === "string" ? metadata.submission : "",
      demoVideo: metadata.demoVideo ?? null,
      activeStepId:
        typeof row.active_step === "string"
          ? row.active_step
          : typeof metadata.activeStepId === "string"
            ? metadata.activeStepId
            : "audience",
      fieldValues,
      stepScripts,
      logoAsset:
        logoAssetPair && typeof logoAssetPair.asset.provider_asset_id === "string"
          ? {
              objectId: logoAssetPair.asset.provider_asset_id,
              url: logoAssetPair.url,
              fileName: typeof logoAssetPair.asset.file_name === "string" ? logoAssetPair.asset.file_name : undefined,
              contentType: typeof logoAssetPair.asset.mime_type === "string" ? logoAssetPair.asset.mime_type : undefined,
              sizeBytes:
                typeof logoAssetPair.asset.file_size_bytes === "number"
                  ? logoAssetPair.asset.file_size_bytes
                  : Number(logoAssetPair.asset.file_size_bytes) || undefined,
            }
          : null,
      chat: Array.isArray(metadata.chat) ? metadata.chat : [],
      renderSections: [...renderSectionMap.values()],
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

    return jsonError("Failed to load project", status, details);
  }
}
