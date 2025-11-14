"use client";

import { AppStateProvider } from "./app-state-context";
import { Workspace } from "./workspace";

export function TreeApp() {
  return (
    <AppStateProvider>
      <Workspace />
    </AppStateProvider>
  );
}
