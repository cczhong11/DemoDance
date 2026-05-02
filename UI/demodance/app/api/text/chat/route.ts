import { NextResponse } from "next/server";

import { getOpenAIConfig, readOpenAIApiKeyOverride } from "@/lib/server/config";
import { jsonError, readJsonBody, readResponseDetails } from "@/lib/server/http";

export const runtime = "nodejs";

type ChatMessage = {
  role: string;
  content: string;
};

function readMode(value: unknown): "chat" | "json" {
  return value === "json" ? "json" : "chat";
}

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
  const config = getOpenAIConfig();
  const openaiApiKey = readOpenAIApiKeyOverride(request) || config.apiKey;

  if (!openaiApiKey) {
    return jsonError("OPENAI_API_KEY is not set", 500);
  }

  const model = (data.model as string | undefined) ?? config.defaultTextModel;
  const mode = readMode(data.mode);
  const prompt = typeof data.prompt === "string" ? data.prompt : undefined;
  const messages = Array.isArray(data.messages) ? (data.messages as ChatMessage[]) : undefined;

  let payloadMessages = messages;
  if (!payloadMessages || payloadMessages.length === 0) {
    if (!prompt) {
      return jsonError("Provide either 'messages' or 'prompt'", 400);
    }
    payloadMessages = [{ role: "user", content: prompt }];
  }

  const payload: Record<string, unknown> = {
    model,
    messages: payloadMessages,
    max_completion_tokens: typeof data.max_completion_tokens === "number"
      ? data.max_completion_tokens
      : typeof data.max_tokens === "number"
        ? data.max_tokens
        : 5000,
  };
  if (typeof data.temperature === "number") payload.temperature = data.temperature;
  else if (mode === "json") payload.temperature = 0.2;
  if (typeof data.reasoning_effort === "string") payload.reasoning_effort = data.reasoning_effort;
  if (mode === "json") payload.response_format = { type: "json_object" };

  try {
    const requestOnce = async (body: Record<string, unknown>) => {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
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
      return jsonError("OpenAI text API request failed", first.status, first.details);
    }

    const firstText = extractAssistantText(first.result).trim();
    if (firstText.length > 0) {
      return NextResponse.json(first.result);
    }

    const retryPayload: Record<string, unknown> = {
      ...payload,
      max_completion_tokens: Math.max(Number(payload.max_completion_tokens), 5000),
      messages: [
        ...payloadMessages,
        {
          role: "user",
          content: mode === "json" ? "Return only the final answer now. Output strict JSON only." : "Return only the final answer now.",
        },
      ],
    };
    const second = await requestOnce(retryPayload as Record<string, unknown>);
    if (!second.ok) {
      return jsonError("OpenAI text API request failed", second.status, second.details);
    }

    const secondText = extractAssistantText(second.result).trim();
    if (secondText.length > 0) {
      return NextResponse.json(second.result);
    }

    return jsonError("OpenAI returned empty assistant content", 502, second.result);
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    return jsonError("OpenAI text API unavailable", 502, details);
  }
}
