'use client';

import { SessionDropdown } from "./session-dropdown";
import { useTreeStore } from "@/lib/tree-store";

export const HeaderBar = () => {
  const activeSessionId = useTreeStore((state) => state.activeSessionId);
  const sessionTitle = useTreeStore((state) =>
    state.activeSessionId
      ? state.sessions[state.activeSessionId]?.title
      : null,
  );

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-4">
      <div className="flex items-center gap-3">
        <SessionDropdown />
        <span className="text-sm font-semibold uppercase tracking-widest text-neutral-600">
          Tree GPT
        </span>
      </div>
      <div className="text-right text-xs text-neutral-500">
        {activeSessionId ? sessionTitle ?? "Untitled session" : "No session"}
      </div>
    </header>
  );
};
