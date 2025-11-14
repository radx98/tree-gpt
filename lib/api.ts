import type { LlmRequestPayload, LlmResponsePayload } from "./types";

export async function requestAssistant(payload: LlmRequestPayload) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Request failed");
  }

  const data = (await response.json()) as LlmResponsePayload;
  return data;
}
