"use client";

import { useMemo } from "react";
import { useAppState } from "./app-state-context";
import { ColumnRail } from "./column-rail";
import { BranchPromptOverlay } from "./branch-prompt-overlay";
import { SessionMenu } from "./session-menu";
import { NavigationArrows } from "./navigation-arrows";

export function Workspace() {
  const { state, columns, hydrated, actions } = useAppState();
  const session = state.activeSessionId
    ? state.sessions[state.activeSessionId]
    : null;
  const rootBlock =
    session && session.rootBlockId ? session.blocks[session.rootBlockId] : null;

  const highlightMap = useMemo(() => {
    const map: Record<
      string,
      { blockId: string; selection: { startOffset: number; endOffset: number } }[]
    > = {};
    if (!session) {
      return map;
    }
    Object.values(session.blocks).forEach((block) => {
      if (!block.source) {
        return;
      }
      const { parentMessageId, selection } = block.source;
      if (!map[parentMessageId]) {
        map[parentMessageId] = [];
      }
      map[parentMessageId].push({
        blockId: block.id,
        selection: {
          startOffset: selection.startOffset,
          endOffset: selection.endOffset,
        },
      });
    });
    return map;
  }, [session]);

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-900">
      <SessionMenu
        sessionTitle={session?.title}
        rootHeader={rootBlock?.header}
        onNewSession={actions.createNewSession}
      />

      <main className="relative flex min-h-screen flex-col">
        {!hydrated ? (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
            Loading session…
          </div>
        ) : (
          <>
            <ColumnRail
              session={session}
              columns={columns}
              highlightMap={highlightMap}
            />
            <NavigationArrows />
            <BranchPromptOverlay />
          </>
        )}
      </main>
    </div>
  );
}
