'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, SquareMenu, Trash2 } from "lucide-react";
import clsx from "clsx";
import { useTreeStore } from "@/lib/tree-store";

const useOutsideClick = (onClose: () => void) => {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);
  return ref;
};

export const SessionDropdown = () => {
  const [open, setOpen] = useState(false);
  const activeSessionId = useTreeStore((state) => state.activeSessionId);
  const sessions = useTreeStore((state) => state.sessions);
  const createSession = useTreeStore((state) => state.createSession);
  const deleteSession = useTreeStore((state) => state.deleteSession);
  const setActiveSession = useTreeStore((state) => state.setActiveSession);

  const orderedSessions = useMemo(
    () =>
      Object.values(sessions).sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
    [sessions],
  );

  const dropdownRef = useOutsideClick(() => setOpen(false));

  return (
    <div className="relative">
      <button
        className="flex items-center rounded-full border border-neutral-300 bg-white px-3 py-1 text-sm font-medium hover:bg-neutral-50"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Open sessions menu"
      >
        <SquareMenu className="h-4 w-4" />
      </button>
      {open ? (
        <div
          ref={dropdownRef}
          className="absolute left-0 top-full z-20 mt-2 w-72 rounded-lg border border-neutral-200 bg-white shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-neutral-100 px-3 py-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Sessions
            </p>
            <button
              className="flex items-center gap-1 rounded-full border border-neutral-300 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-neutral-700 hover:bg-neutral-50"
              onClick={() => {
                createSession();
                setOpen(false);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              New
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {orderedSessions.length === 0 ? (
              <p className="px-3 py-4 text-sm text-neutral-500">
                No sessions yet.
              </p>
            ) : (
              orderedSessions.map((session) => (
                <div
                  key={session.id}
                  className={clsx(
                    "flex items-center justify-between px-3 py-2 text-sm",
                    session.id === activeSessionId
                      ? "bg-neutral-100 font-semibold"
                      : "hover:bg-neutral-50",
                  )}
                >
                  <button
                    className="flex flex-1 flex-col text-left"
                    onClick={() => {
                      setActiveSession(session.id);
                      setOpen(false);
                    }}
                  >
                    <span className="truncate">
                      {session.title ?? "Untitled session"}
                    </span>
                    <span className="text-xs text-neutral-500">
                      Updated{" "}
                      {new Date(session.updatedAt).toLocaleString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </button>
                  <button
                    className="ml-2 rounded-full p-1 text-neutral-500 hover:bg-neutral-200"
                    aria-label="Delete session"
                    onClick={() => deleteSession(session.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};
