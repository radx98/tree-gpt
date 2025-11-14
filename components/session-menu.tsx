"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type SessionMenuProps = {
  sessionTitle?: string | null;
  rootHeader?: string | null;
  onNewSession: () => void;
};

export function SessionMenu({
  sessionTitle,
  rootHeader,
  onNewSession,
}: SessionMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        event.target instanceof Node &&
        !wrapperRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const label = rootHeader || sessionTitle || "New session";

  return (
    <div
      ref={wrapperRef}
      className="fixed left-6 top-6 z-40 flex items-center gap-3"
    >
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className={cn(
            "flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm",
            open && "bg-slate-900 text-white",
          )}
        >
          {label}
          <span className="text-xs">{open ? "▲" : "▼"}</span>
        </button>
        {open && (
          <div className="absolute left-0 top-full mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-2xl">
            <div className="text-xs uppercase tracking-wide text-slate-400">
              Current session
            </div>
            <p className="mt-1 font-semibold text-slate-900">{label}</p>
            <p className="mt-2 text-xs text-slate-500">
              The root header is always synced with the session title.
            </p>
            <button
              type="button"
              onClick={() => {
                onNewSession();
                setOpen(false);
              }}
              className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white"
            >
              Start new session
            </button>
          </div>
        )}
      </div>
      <div className="rounded-full bg-white/80 px-4 py-2 text-xs font-semibold tracking-[0.2em] text-slate-500 shadow">
        TREE GPT
      </div>
    </div>
  );
}
