import { NextResponse } from "next/server";

import { getIonRouterConfig, resolveIonRouterBaseUrlByModel } from "@/lib/server/config";
import { jsonError, readJsonBody, readResponseDetails } from "@/lib/server/http";

export const runtime = "nodejs";

type ChatMessage = {
  role: string;
  content: string;
};

function extractAssistantText(payload: unknown): string {
  const root = payload as {
    choices?: Array<{
      message?: {
        content?: unknown;
      };
    }>;
  };
  const content = root?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          const text = (part as { text?: unknown }).text;
          return typeof text === "string" ? text : "";
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

export async function POST(request: Request) {
  const data = await readJsonBody(request);
  const config = getIonRouterConfig();

  if (!config.apiKey) {
    return jsonError("IONROUTER_API_KEY is not set", 500);
  }

  const model = (data.model as string | undefined) ?? config.defaultTextModel;
  const baseUrl = resolveIonRouterBaseUrlByModel(model, config.baseUrl);
  const prompt = typeof data.prompt === "string" ? data.prompt : undefined;
  const messages = Array.isArray(data.messages) ? (data.messages as ChatMessage[]) : undefined;

  let payloadMessages = messages;
  if (!payloadMessages || payloadMessages.length === 0) {
    if (!prompt) {
      return jsonError("Provide either 'messages' or 'prompt'", 400);
    }
    payloadMessages = [{ role: "user", content: prompt }];
  }

  const payload = {
    model,
    messages: payloadMessages,
    temperature: typeof data.temperature === "number" ? data.temperature : 0.7,
    max_tokens: Math.max(typeof data.max_tokens === "number" ? data.max_tokens : 5000, 5000),
  };

  try {
    const requestOnce = async (body: Record<string, unknown>) => {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const details = await readResponseDetails(response);
        return { ok: false as const, status: response.status, details };
      }

      const result = await response.json();
      return { ok: true as const, result };
    };

    const first = await requestOnce(payload as Record<string, unknown>);
    if (!first.ok) {
      return jsonError("IonRouter text API request failed", first.status, first.details);
    }

    const firstText = extractAssistantText(first.result).trim();
    if (firstText.length > 0) {
      return NextResponse.json(first.result);
    }

    const retryPayload = {
      ...payload,
      temperature: 0.2,
      max_tokens: Math.max(payload.max_tokens, 5000),
      messages: [
        ...payloadMessages,
        {
          role: "user",
          content: "Return only the final answer now. Output strict JSON only.",
        },
      ],
    };
    const second = await requestOnce(retryPayload as Record<string, unknown>);
    if (!second.ok) {
      return jsonError("IonRouter text API request failed", second.status, second.details);
    }

    const secondText = extractAssistantText(second.result).trim();
    if (secondText.length > 0) {
      return NextResponse.json(second.result);
    }

    return jsonError("IonRouter returned empty assistant content", 502, second.result);
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    return jsonError("IonRouter text API unavailable", 502, details);
  }
}
