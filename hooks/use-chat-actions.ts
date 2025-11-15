'use client';

import { useCallback, useState } from "react";
import { useTreeStore } from "@/lib/tree-store";
import { SelectionRange } from "@/lib/types";

type ContextPayload = {
  parentNodeId: string;
  parentMessageId: string;
  selection: SelectionRange;
  prompt: string;
};

const postChat = async (payload: {
  history: { role: "user" | "assistant"; text: string }[];
  prompt: string;
}) => {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error("Chat API failed");
  }
  return (await response.json()) as { header: string | null; message: string };
};

export const useChatActions = () => {
  const [busyNodeId, setBusyNodeId] = useState<string | null>(null);
  const ensureSession = useTreeStore((state) => state.ensureSession);
  const sendUserMessage = useTreeStore((state) => state.sendUserMessage);
  const appendAssistantMessage = useTreeStore(
    (state) => state.appendAssistantMessage,
  );
  const buildHistoryFromBranch = useTreeStore(
    (state) => state.buildHistoryFromBranch,
  );
  const startBranchFromSelection = useTreeStore(
    (state) => state.startBranchFromSelection,
  );

  const handleLinearPrompt = useCallback(
    async (nodeId: string, prompt: string) => {
      if (!prompt.trim()) return;
      ensureSession();
      setBusyNodeId(nodeId);
      const result = sendUserMessage(nodeId, prompt);
      if (!result) {
        setBusyNodeId(null);
        return;
      }
      try {
        const history = buildHistoryFromBranch(result.messageId);
        const payload = await postChat({ history, prompt });
        appendAssistantMessage(nodeId, payload);
      } catch (error) {
        appendAssistantMessage(nodeId, {
          header: null,
          message:
            "I could not reach the AI right now. Please retry in a moment.",
        });
        console.error(error);
      } finally {
        setBusyNodeId(null);
      }
    },
    [
      appendAssistantMessage,
      buildHistoryFromBranch,
      ensureSession,
      sendUserMessage,
    ],
  );

  const handleContextPrompt = useCallback(
    async (payload: ContextPayload) => {
      if (!payload.prompt.trim()) return;
      ensureSession();
      const result = startBranchFromSelection(payload);
      if (!result) return;
      setBusyNodeId(result.nodeId);
      try {
        const history = buildHistoryFromBranch(result.messageId);
        const aiResponse = await postChat({
          history,
          prompt: payload.prompt,
        });
        appendAssistantMessage(result.nodeId, aiResponse);
      } catch (error) {
        appendAssistantMessage(result.nodeId, {
          header: null,
          message:
            "This branch failed to load an AI response. Please send again.",
        });
        console.error(error);
      } finally {
        setBusyNodeId(null);
      }
    },
    [
      appendAssistantMessage,
      buildHistoryFromBranch,
      ensureSession,
      startBranchFromSelection,
    ],
  );

  return {
    busyNodeId,
    handleLinearPrompt,
    handleContextPrompt,
  };
};
