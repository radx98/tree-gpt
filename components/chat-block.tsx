"use client";

import type { ChatBlock, Message, PendingTurn, Session } from "@/lib/types";
import { useAppState } from "./app-state-context";
import { cn } from "@/lib/utils";
import { MessageBubble } from "./message-bubble";
import { LinearInput } from "./linear-input";

type ChatBlockProps = {
  session: Session;
  block: ChatBlock;
  highlightMap: Record<
    string,
    { blockId: string; selection: { startOffset: number; endOffset: number } }[]
  >;
  isCurrentColumn: boolean;
  isAutoCollapsed: boolean;
  pendingTurn?: PendingTurn;
};

export function ChatBlockCard({
  session,
  block,
  highlightMap,
  isCurrentColumn,
  isAutoCollapsed,
  pendingTurn,
}: ChatBlockProps) {
  const { actions } = useAppState();
  const isCollapsed = isAutoCollapsed ? !block.collapsed : block.collapsed;
  const header = block.header || (block.depth === 0 ? "New session" : "New thread");
  const parentHeader =
    block.source && session.blocks[block.source.parentBlockId]
      ? session.blocks[block.source.parentBlockId].header
      : null;
  const blockMessages: Message[] = block.messages;

  return (
    <div
      className={cn(
        "relative rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm",
        isCollapsed && "cursor-pointer bg-slate-50",
        isCurrentColumn ? "ring-1 ring-slate-200" : "opacity-90",
      )}
    >
      {block.source && (
        <div className="absolute -left-8 top-8 flex flex-col items-center gap-2 text-slate-300">
          <span className="h-12 w-px bg-slate-300" />
          <span className="h-2 w-2 rounded-full bg-slate-400" />
        </div>
      )}

      <div className="mb-4 flex items-center gap-2">
        <h3 className="flex-1 text-lg font-semibold text-slate-900">{header}</h3>
        <button
          type="button"
          onClick={() => actions.toggleBlockCollapsed(block.id)}
          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
        >
          {isCollapsed ? "Expand" : "Collapse"}
        </button>
      </div>

      {block.source && (
        <div className="mb-4 rounded-xl bg-slate-100/70 p-3 text-xs text-slate-600">
          Branched from “{block.source.selection.text}”
          {parentHeader ? ` • ${parentHeader}` : null}
        </div>
      )}

      {isCollapsed ? (
        <div className="text-sm text-slate-500">
          {blockMessages.length} message
          {blockMessages.length === 1 ? "" : "s"} hidden.
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {blockMessages.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                Start the conversation in this block.
              </div>
            ) : (
              blockMessages.map((message) => (
                <MessageBubble
                  key={message.id}
                  blockId={block.id}
                  blockDepth={block.depth}
                  message={message}
                  highlights={
                    (highlightMap[message.id] ?? []).map(
                      (item) => item.selection,
                    )
                  }
                />
              ))
            )}
          </div>

          {pendingTurn && !pendingTurn.error && (
            <div className="mt-3 text-xs text-slate-500">
              Model is composing a reply…
            </div>
          )}

          {pendingTurn?.error && (
            <div className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-600">
              {pendingTurn.error}
            </div>
          )}

          <LinearInput
            blockId={block.id}
            disabled={!isCurrentColumn}
            busy={Boolean(pendingTurn && !pendingTurn.error)}
            placeholder={
              isCurrentColumn
                ? "Ask a follow-up…"
                : "Select this column to continue…"
            }
          />
        </>
      )}
    </div>
  );
}
