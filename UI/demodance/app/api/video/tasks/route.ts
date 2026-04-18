import { NextRequest, NextResponse } from "next/server";

import { getBytePlusConfig } from "@/lib/server/config";
import { jsonError, readJsonBody, readResponseDetails } from "@/lib/server/http";

export const runtime = "nodejs";

const ALLOWED_LIST_STATUSES = new Set(["queued", "running", "cancelled", "succeeded", "failed"]);
const ALLOWED_SERVICE_TIERS = new Set(["default", "flex"]);

function buildVideoTaskPayload(data: Record<string, unknown>, defaultModel: string) {
  const model = (data.model as string | undefined) ?? defaultModel;
  const prompt = typeof data.prompt === "string" ? data.prompt : undefined;

  let content = data.content;
  if (!Array.isArray(content)) {
    if (!prompt) {
      return { error: jsonError("Provide either 'content' or 'prompt'", 400) };
    }
    content = [{ type: "text", text: prompt }];
  }

  if (!Array.isArray(content) || content.length === 0) {
    return { error: jsonError("'content' must be a non-empty array", 400) };
  }

  const payload: Record<string, unknown> = {
    model,
    content,
  };

  const optionalKeys = [
    "callback_url",
    "return_last_frame",
    "service_tier",
    "execution_expires_after",
    "generate_audio",
    "draft",
    "safety_identifier",
    "resolution",
    "ratio",
    "duration",
    "frames",
    "seed",
    "camera_fixed",
    "watermark",
  ] as const;

  for (const key of optionalKeys) {
    const value = data[key];
    if (value !== undefined && value !== null) {
      payload[key] = value;
    }
  }

  return { payload };
}

export async function POST(request: Request) {
  const config = getBytePlusConfig();
  if (!config.apiKey) {
    return jsonError("BYTEPLUS_ARK_API_KEY is not set", 500);
  }

  const data = await readJsonBody(request);
  const built = buildVideoTaskPayload(data, config.defaultVideoModel);
  if (built.error) {
    return built.error;
  }

  try {
    const response = await fetch(`${config.baseUrl}/contents/generations/tasks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(built.payload),
    });

    if (!response.ok) {
      const details = await readResponseDetails(response);
      return jsonError("BytePlus video API request failed", response.status, details);
    }

    const result = await response.json();
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    return jsonError("BytePlus video API unavailable", 502, details);
  }
}

export async function GET(request: NextRequest) {
  const config = getBytePlusConfig();
  if (!config.apiKey) {
    return jsonError("BYTEPLUS_ARK_API_KEY is not set", 500);
  }

  const params = request.nextUrl.searchParams;
  const upstream = new URL(`${config.baseUrl}/contents/generations/tasks`);

  for (const key of ["page_num", "page_size"] as const) {
    const raw = params.get(key);
    if (!raw) continue;
    const parsed = Number.parseInt(raw, 10);
    if (Number.isNaN(parsed)) {
      return jsonError(`'${key}' must be an integer`, 400);
    }
    if (parsed < 1 || parsed > 500) {
      return jsonError(`'${key}' must be in range [1, 500]`, 400);
    }
    upstream.searchParams.set(key, String(parsed));
  }

  const status = params.get("filter.status") ?? params.get("status");
  if (status) {
    if (!ALLOWED_LIST_STATUSES.has(status)) {
      return jsonError("'status' must be one of: queued, running, cancelled, succeeded, failed", 400);
    }
    upstream.searchParams.set("filter.status", status);
  }

  const model = params.get("filter.model") ?? params.get("model");
  if (model) {
    upstream.searchParams.set("filter.model", model);
  }

  const serviceTier = params.get("filter.service_tier") ?? params.get("service_tier");
  if (serviceTier) {
    if (!ALLOWED_SERVICE_TIERS.has(serviceTier)) {
      return jsonError("'service_tier' must be one of: default, flex", 400);
    }
    upstream.searchParams.set("filter.service_tier", serviceTier);
  }

  const taskIdsRaw = [...params.getAll("task_ids"), ...params.getAll("filter.task_ids")];
  const taskIds = taskIdsRaw
    .flatMap((idList) => idList.split(","))
    .map((taskId) => taskId.trim())
    .filter(Boolean);

  for (const taskId of taskIds) {
    upstream.searchParams.append("filter.task_ids", taskId);
  }

  try {
    const response = await fetch(upstream, {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
    });

    if (!response.ok) {
      const details = await readResponseDetails(response);
      return jsonError("BytePlus video API request failed", response.status, details);
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    return jsonError("BytePlus video API unavailable", 502, details);
  }
}
