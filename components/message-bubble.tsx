"use client";

import { useMemo, useRef } from "react";
import type { Message, SelectionRange } from "@/lib/types";
import { useAppState } from "./app-state-context";
import { cn } from "@/lib/utils";

type MessageBubbleProps = {
  blockId: string;
  blockDepth?: number;
  message: Message;
  highlights: SelectionRange[];
};

type Segment = {
  text: string;
  kind: "normal" | "branch" | "active";
};

export function MessageBubble({
  blockId,
  blockDepth = 0,
  message,
  highlights,
}: MessageBubbleProps) {
  const { state, selection, actions } = useAppState();
  const contentRef = useRef<HTMLDivElement | null>(null);
  const isUser = message.role === "user";

  const segments = useMemo(() => {
    const ranges: Array<SelectionRange & { kind: Segment["kind"] }> = [
      ...highlights.map((range) => ({ ...range, kind: "branch" as const })),
    ];

    if (selection && selection.messageId === message.id) {
      ranges.push({
        text: selection.text,
        startOffset: selection.startOffset,
        endOffset: selection.endOffset,
        kind: "active",
      });
    }

    if (!ranges.length) {
      return [{ text: message.text, kind: "normal" as const }];
    }

    const sorted = ranges
      .map((range) => ({
        startOffset: Math.max(0, range.startOffset),
        endOffset: Math.min(message.text.length, range.endOffset),
        kind: range.kind,
      }))
      .filter((range) => range.endOffset > range.startOffset)
      .sort((a, b) => a.startOffset - b.startOffset);

    const nodes: Segment[] = [];
    let cursor = 0;
    for (const range of sorted) {
      if (range.startOffset > cursor) {
        nodes.push({
          text: message.text.slice(cursor, range.startOffset),
          kind: "normal",
        });
      }
      nodes.push({
        text: message.text.slice(range.startOffset, range.endOffset),
        kind: range.kind,
      });
      cursor = range.endOffset;
    }
    if (cursor < message.text.length) {
      nodes.push({
        text: message.text.slice(cursor),
        kind: "normal",
      });
    }
    return nodes.filter((segment) => segment.text.length > 0);
  }, [highlights, message.text, selection, message.id]);

  const handleMouseUp = () => {
    const element = contentRef.current;
    if (!element) {
      return;
    }

    const selectionObj = window.getSelection();
    if (!selectionObj || selectionObj.isCollapsed) {
      return;
    }

    const range = selectionObj.getRangeAt(0);
    if (
      !element.contains(range.commonAncestorContainer) &&
      (!element.contains(range.startContainer) ||
        !element.contains(range.endContainer))
    ) {
      return;
    }

    const selectedText = selectionObj.toString();
    if (!selectedText.trim()) {
      return;
    }

    const start = measureOffset(element, range);
    const end = start + selectedText.length;

    const rect = range.getBoundingClientRect();
    if (!state.activeSessionId) {
      return;
    }

    actions.setSelection({
      sessionId: state.activeSessionId,
      blockId,
      messageId: message.id,
      depth: blockDepth,
      text: selectedText,
      startOffset: start,
      endOffset: end,
      rect: {
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height,
      },
    });
  };

  return (
    <div
      className={cn(
        "flex w-full",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow",
          isUser
            ? "bg-sky-500 text-white"
            : "bg-slate-100 text-slate-900 shadow-none",
        )}
      >
        <div
          ref={contentRef}
          onMouseUp={handleMouseUp}
          className="whitespace-pre-wrap"
        >
          {segments.map((segment, index) => (
            <span
              key={`${segment.kind}-${index}`}
              className={cn(
                segment.kind === "branch" && "bg-amber-100 text-amber-900",
                segment.kind === "active" && "bg-sky-200 text-sky-900",
              )}
            >
              {segment.text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function measureOffset(container: HTMLElement, range: Range) {
  const clone = range.cloneRange();
  clone.selectNodeContents(container);
  clone.setEnd(range.startContainer, range.startOffset);
  return clone.toString().length;
}
