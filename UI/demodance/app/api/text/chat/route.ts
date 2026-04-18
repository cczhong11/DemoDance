import { NextResponse } from "next/server";

import { getIonRouterConfig } from "@/lib/server/config";
import { jsonError, readJsonBody, readResponseDetails } from "@/lib/server/http";

export const runtime = "nodejs";

type ChatMessage = {
  role: string;
  content: string;
};

export async function POST(request: Request) {
  const data = await readJsonBody(request);
  const config = getIonRouterConfig();

  if (!config.apiKey) {
    return jsonError("IONROUTER_API_KEY is not set", 500);
  }

  const model = (data.model as string | undefined) ?? config.defaultTextModel;
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
    max_tokens: typeof data.max_tokens === "number" ? data.max_tokens : 5000,
  };

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const details = await readResponseDetails(response);
      return jsonError("IonRouter text API request failed", response.status, details);
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    return jsonError("IonRouter text API unavailable", 502, details);
  }
}
