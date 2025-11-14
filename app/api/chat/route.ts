import { NextResponse } from "next/server";
import type { LlmRequestPayload } from "@/lib/types";

export async function POST(request: Request) {
  const payload = (await request.json()) as LlmRequestPayload;
  const assistant_message = buildAssistantMessage(payload);
  const block_header = buildHeaderSuggestion(payload);
  const shouldUpdateSessionTitle =
    payload.branch_path.length === 1 && Boolean(block_header);

  return NextResponse.json({
    assistant_message,
    block_header,
    session_title: shouldUpdateSessionTitle ? block_header : null,
    notes: null,
  });
}

function buildAssistantMessage(payload: LlmRequestPayload) {
  const { branch_path, current_user_input } = payload;
  const breadcrumbs = branch_path
    .map((item) => item.header)
    .filter(Boolean)
    .join(" → ");
  const intro = breadcrumbs
    ? `Following the branch ${breadcrumbs}, here's a focused reply:\n\n`
    : "";
  const normalizedInput = current_user_input.trim();
  return `${intro}${normalizedInput}\n\nThis sandboxed model stub mirrors your prompt because no real LLM is configured.`;
}

function buildHeaderSuggestion(payload: LlmRequestPayload) {
  const text = payload.current_user_input.trim();
  if (!text) {
    return "New thread";
  }

  const clean = text.replace(/\s+/g, " ");
  const max = 48;
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`;
}
