"use client";

import { useEffect, useRef } from "react";
import type { ChatBlock, Session } from "@/lib/types";
import { useAppState } from "./app-state-context";
import { ColumnView } from "./column";

type ColumnRailProps = {
  session: Session | null;
  columns: { depth: number; blocks: ChatBlock[] }[];
  highlightMap: Record<
    string,
    { blockId: string; selection: { startOffset: number; endOffset: number } }[]
  >;
};

export function ColumnRail({
  session,
  columns,
  highlightMap,
}: ColumnRailProps) {
  const { state } = useAppState();
  const currentDepth = state.ui.currentColumnDepth;
  const columnRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    const node = columnRefs.current[currentDepth];
    if (node && node.scrollIntoView) {
      node.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [currentDepth, columns.length]);

  if (!session) {
    return (
      <div className="flex flex-1 items-center justify-center pt-36 text-sm text-slate-500">
        No session found.
      </div>
    );
  }

  const columnWidth = "min(82vw, 720px)";

  return (
    <div className="relative flex flex-1 overflow-x-auto px-8 pb-24 pt-32">
      <div className="flex min-h-full w-full gap-10">
        {columns.map((column) => {
          const isCurrent = column.depth === currentDepth;
          return (
            <div
              key={column.depth}
              ref={(node) => {
                columnRefs.current[column.depth] = node;
              }}
              className={`shrink-0 snap-center transition-all duration-300 ${
                isCurrent ? "opacity-100" : "opacity-60"
              }`}
              style={{
                width: columnWidth,
              }}
            >
              <ColumnView
                session={session}
                column={column}
                highlightMap={highlightMap}
                isCurrent={isCurrent}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
