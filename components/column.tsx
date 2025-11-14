"use client";

import type { ChatBlock, Session } from "@/lib/types";
import { useAppState } from "./app-state-context";
import { ChatBlockCard } from "./chat-block";

type ColumnProps = {
  session: Session;
  column: { depth: number; blocks: ChatBlock[] };
  highlightMap: Record<
    string,
    { blockId: string; selection: { startOffset: number; endOffset: number } }[]
  >;
  isCurrent: boolean;
};

export function ColumnView({
  session,
  column,
  highlightMap,
  isCurrent,
}: ColumnProps) {
  const { pendingTurns } = useAppState();
  const autoCollapsed = getCrowdedBlocks(column.blocks);

  return (
    <div
      className={`relative rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur ${
        isCurrent ? "shadow-xl" : ""
      }`}
    >
      <div className="mb-6 flex items-center justify-between text-xs uppercase tracking-wider text-slate-400">
        <span>
          {column.depth === 0 ? "Root column" : `Depth ${column.depth}`}
        </span>
        <span>{column.blocks.length} blocks</span>
      </div>

      <div className="flex flex-col gap-6">
        {column.blocks.map((block) => (
          <ChatBlockCard
            key={block.id}
            session={session}
            block={block}
            highlightMap={highlightMap}
            isCurrentColumn={isCurrent}
            isAutoCollapsed={autoCollapsed.has(block.id)}
            pendingTurn={pendingTurns[block.id]}
          />
        ))}
      </div>
    </div>
  );
}

function getCrowdedBlocks(blocks: ChatBlock[]) {
  const crowded = new Set<string>();
  const minGap = 150;

  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const a = blocks[i];
      const b = blocks[j];
      if (Math.abs(a.anchorOrder - b.anchorOrder) < minGap) {
        crowded.add(a.id);
        crowded.add(b.id);
      }
    }
  }

  return crowded;
}
