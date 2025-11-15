'use client';

import { ArrowDown } from "lucide-react";
import { forwardRef } from "react";
import clsx from "clsx";
import { NodeColumn as NodeColumnType } from "@/lib/types";
import { LinearInput } from "./linear-input";
import { MessageBubble } from "./message-bubble";
import { useTreeStore } from "@/lib/tree-store";

type NodeColumnProps = {
  node: NodeColumnType;
  isCurrent: boolean;
  onSubmit: (value: string) => Promise<void> | void;
  onHighlightClick: (childNodeId: string) => void;
  onSelection?: (payload: {
    nodeId: string;
    messageId: string;
    text: string;
    startOffset: number;
    endOffset: number;
    rect: DOMRect;
  }) => void;
  isBlocking?: boolean;
  onFocusRequest?: (nodeId: string) => void;
};

export const NodeColumn = forwardRef<HTMLDivElement, NodeColumnProps>(function NodeColumn(
  {
    node,
    isCurrent,
    onSubmit,
    onHighlightClick,
    onSelection,
    isBlocking,
    onFocusRequest,
  }: NodeColumnProps,
  ref,
) {
  const focusNode = useTreeStore((state) => state.focusNode);
  const hasMessages = node.messages.length > 0;
  const placeholderVisible = node.depth === 0 && !hasMessages;

  return (
    <section
      className={clsx(
        "flex h-full w-[420px] max-w-3xl flex-shrink-0 flex-col border-r border-neutral-200 bg-white px-4",
        !isCurrent && "opacity-80",
      )}
      ref={ref}
      onClick={() => {
        onFocusRequest?.(node.id);
        focusNode(node.id);
      }}
    >
      <div className="sticky top-0 z-10 flex flex-col gap-1 border-b border-neutral-100 bg-white py-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          {node.header ?? (
            <span className="inline-flex h-5 w-24 rounded-full bg-neutral-100" />
          )}
        </h3>
        {node.parent ? (
          <p className="text-xs text-neutral-400">
            From: {node.parent.selection.text}
          </p>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto py-6">
        {placeholderVisible ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-sm text-neutral-500">
            <p>A new rabbithole entrance is right here</p>
            <ArrowDown className="h-5 w-5 text-neutral-400" />
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-4">
            {node.messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                nodeId={node.id}
                isCurrentColumn={isCurrent}
                onHighlightClick={onHighlightClick}
                onSelection={onSelection}
              />
            ))}
          </div>
        )}
      </div>
      <div className="sticky bottom-2 mt-4 bg-white pb-4">
        <LinearInput
          placeholder="Ask anything"
          disabled={!isCurrent || isBlocking}
          onSubmit={onSubmit}
        />
      </div>
    </section>
  );
});
