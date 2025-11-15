'use client';

import { useCallback, useEffect, useRef, useState } from "react";
import { HeaderBar } from "@/components/header-bar";
import { ActiveBranch } from "@/components/active-branch";
import { ContextInput } from "@/components/context-input";
import { useTreeStore } from "@/lib/tree-store";
import { useChatActions } from "@/hooks/use-chat-actions";

type SelectionTarget = {
  nodeId: string;
  messageId: string;
  text: string;
  startOffset: number;
  endOffset: number;
  rect: DOMRect;
};

export default function HomePage() {
  const isHydrated = useTreeStore((state) => state.isHydrated);
  const ensureSession = useTreeStore((state) => state.ensureSession);
  const switchBranchToNode = useTreeStore((state) => state.switchBranchToNode);
  const { busyNodeId, handleLinearPrompt, handleContextPrompt } =
    useChatActions();
  const [selectionTarget, setSelectionTarget] = useState<SelectionTarget | null>(
    null,
  );
  const contextInputRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (isHydrated) {
      ensureSession();
    }
  }, [ensureSession, isHydrated]);

  const handleSelection = useCallback(
    (payload: SelectionTarget) => {
      setSelectionTarget(payload);
    },
    [],
  );

  const clearSelection = useCallback(() => {
    setSelectionTarget(null);
    const selection = window.getSelection();
    selection?.removeAllRanges();
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        clearSelection();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [clearSelection]);

  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (
        selectionTarget &&
        contextInputRef.current &&
        !contextInputRef.current.contains(event.target as Node)
      ) {
        clearSelection();
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [clearSelection, selectionTarget]);

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-neutral-500">
        Loading session…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-neutral-900">
      <HeaderBar />
      <ActiveBranch
        busyNodeId={busyNodeId}
        onLinearSubmit={handleLinearPrompt}
        onHighlightClick={(nodeId) => switchBranchToNode(nodeId)}
        onSelection={handleSelection}
      />
      {selectionTarget ? (
        <ContextInput
          ref={contextInputRef}
          rect={selectionTarget.rect}
          onCancel={clearSelection}
          onSubmit={async (value) => {
            const payload = {
              parentMessageId: selectionTarget.messageId,
              parentNodeId: selectionTarget.nodeId,
              selection: {
                text: selectionTarget.text,
                startOffset: selectionTarget.startOffset,
                endOffset: selectionTarget.endOffset,
              },
              prompt: value,
            };
            clearSelection();
            await handleContextPrompt(payload);
          }}
        />
      ) : null}
    </div>
  );
}
