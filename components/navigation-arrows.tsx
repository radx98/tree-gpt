"use client";

import { useMemo } from "react";
import { useAppState } from "./app-state-context";

export function NavigationArrows() {
  const { state, columns, actions } = useAppState();
  const currentDepth = state.ui.currentColumnDepth;

  const { prevDepth, nextDepth } = useMemo(() => {
    const depths = columns.map((column) => column.depth);
    const index = depths.indexOf(currentDepth);
    return {
      prevDepth: index > 0 ? depths[index - 1] : null,
      nextDepth: index >= 0 && index < depths.length - 1 ? depths[index + 1] : null,
    };
  }, [columns, currentDepth]);

  if (!columns.length) {
    return null;
  }

  return (
    <>
      {prevDepth !== null && (
        <button
          type="button"
          className="fixed left-4 top-1/2 z-30 -translate-y-1/2 rounded-full bg-white p-3 shadow-lg ring-1 ring-slate-200 hover:bg-slate-50"
          onClick={() => actions.setCurrentColumn(prevDepth)}
        >
          <ArrowLeft />
        </button>
      )}
      {nextDepth !== null && (
        <button
          type="button"
          className="fixed right-4 top-1/2 z-30 -translate-y-1/2 rounded-full bg-white p-3 shadow-lg ring-1 ring-slate-200 hover:bg-slate-50"
          onClick={() => actions.setCurrentColumn(nextDepth)}
        >
          <ArrowRight />
        </button>
      )}
    </>
  );
}

function ArrowLeft() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-slate-600"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-slate-600"
    >
      <polyline points="9 6 15 12 9 18" />
    </svg>
  );
}
