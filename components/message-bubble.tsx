'use client';

import { ReactNode, useRef } from "react";
import clsx from "clsx";
import { Message } from "@/lib/types";

type MessageBubbleProps = {
  message: Message;
  nodeId: string;
  isCurrentColumn: boolean;
  onHighlightClick?: (childNodeId: string) => void;
  onSelection?: (payload: {
    nodeId: string;
    messageId: string;
    text: string;
    startOffset: number;
    endOffset: number;
    rect: DOMRect;
  }) => void;
};

const renderSegments = (
  text: string,
  highlights: Message["highlights"],
  onHighlightClick?: (childNodeId: string) => void,
) => {
  if (!highlights.length) return text;
  const sorted = [...highlights].sort((a, b) => a.startOffset - b.startOffset);
  const nodes: ReactNode[] = [];
  let cursor = 0;

  sorted.forEach((highlight) => {
    if (highlight.startOffset > cursor) {
      nodes.push(text.slice(cursor, highlight.startOffset));
    }
    nodes.push(
      <button
        key={highlight.highlightId}
        type="button"
        onClick={() => onHighlightClick?.(highlight.childNodeId)}
        className={clsx(
          "rounded-sm px-0.5 py-0.5 text-left transition-colors",
          highlight.isActive
            ? "bg-amber-200 text-neutral-900"
            : "bg-amber-100 text-neutral-600 hover:bg-amber-200",
        )}
      >
        {text.slice(highlight.startOffset, highlight.endOffset)}
      </button>,
    );
    cursor = highlight.endOffset;
  });

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
};

export const MessageBubble = ({
  message,
  nodeId,
  isCurrentColumn,
  onHighlightClick,
  onSelection,
}: MessageBubbleProps) => {
  const isUser = message.role === "user";
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleMouseUp = () => {
    if (!onSelection) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    const selectedText = selection.toString();
    if (!selectedText.trim().length) return;
    const range = selection.getRangeAt(0);
    if (
      !containerRef.current ||
      !containerRef.current.contains(range.startContainer) ||
      !containerRef.current.contains(range.endContainer)
    ) {
      return;
    }
    const measure = range.cloneRange();
    measure.selectNodeContents(containerRef.current);
    measure.setEnd(range.startContainer, range.startOffset);
    const startOffset = measure.toString().length;
    const endOffset = startOffset + range.toString().length;
    onSelection({
      nodeId,
      messageId: message.id,
      text: selectedText,
      startOffset,
      endOffset,
      rect: range.getBoundingClientRect(),
    });
  };

  return (
    <div
      data-message-id={message.id}
      data-node-id={nodeId}
      className={clsx(
        "flex w-full",
        isUser ? "justify-end" : "justify-start",
        !isCurrentColumn && "opacity-75",
      )}
    >
      <div
        className={clsx(
          "max-w-[80%] rounded-2xl border border-neutral-200 px-4 py-3 text-sm leading-relaxed",
          isUser ? "bg-neutral-100 text-neutral-800" : "bg-white text-neutral-900",
        )}
      >
        <div className="whitespace-pre-wrap">
          <span ref={containerRef} onMouseUp={handleMouseUp}>
            {renderSegments(message.text, message.highlights, onHighlightClick)}
          </span>
        </div>
      </div>
    </div>
  );
};
