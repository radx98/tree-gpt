"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { useAppState } from "./app-state-context";

export function BranchPromptOverlay() {
  const { selection, actions } = useAppState();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const selectionKey = useMemo(() => {
    if (!selection) {
      return null;
    }
    return `${selection.blockId}-${selection.messageId}-${selection.startOffset}-${selection.endOffset}`;
  }, [selection]);
  const value =
    selection && selectionKey ? drafts[selectionKey] ?? "" : "";

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        actions.setSelection(null);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [actions]);

  if (!selection) {
    return null;
  }

  const viewWidth =
    typeof window !== "undefined" ? window.innerWidth : 1200;
  const left = Math.min(
    viewWidth - 40,
    Math.max(40, selection.rect.left + selection.rect.width / 2),
  );

  const submit = async () => {
    if (!value.trim()) {
      return;
    }
    await actions.startBranchFromSelection(selection, value);
    if (selectionKey) {
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[selectionKey];
        return next;
      });
    }
  };

  return createPortal(
    <form
      className="pointer-events-auto fixed z-50 flex max-w-lg items-center gap-2 rounded-2xl bg-white p-3 text-sm shadow-2xl ring-1 ring-slate-200"
      style={{
        top: `${Math.max(selection.rect.top - 24, 16)}px`,
        left: `${left}px`,
        transform: "translate(-50%, -100%)",
      }}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <input
        autoFocus
        value={value}
        onChange={(event) => {
          if (!selectionKey) {
            return;
          }
          setDrafts((prev) => ({
            ...prev,
            [selectionKey]: event.target.value,
          }));
        }}
        className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-slate-900 outline-none"
        placeholder="Ask about the highlighted text…"
      />
      <button
        type="submit"
        className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white"
      >
        Branch
      </button>
      <button
        type="button"
        onClick={() => actions.setSelection(null)}
        className="rounded-full px-2 py-1 text-xs text-slate-400 hover:text-slate-600"
      >
        Cancel
      </button>
    </form>,
    document.body,
  );
}
