"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { requestAssistant } from "@/lib/api";
import { createId } from "@/lib/id";
import {
  buildBranchPath,
  createBlockFromSelection,
  createInitialState,
  createSession,
  getColumns,
  STORAGE_KEY,
} from "@/lib/state";
import type {
  AppState,
  BranchPathBlock,
  ChatBlock,
  LlmResponsePayload,
  PendingTurn,
  SelectionOverlay,
} from "@/lib/types";
import { nowIso } from "@/lib/utils";

type AppContextValue = {
  state: AppState;
  hydrated: boolean;
  pendingTurns: Record<string, PendingTurn | undefined>;
  selection: SelectionOverlay | null;
  columns: { depth: number; blocks: ChatBlock[] }[];
  actions: {
    setCurrentColumn: (depth: number) => void;
    toggleBlockCollapsed: (blockId: string) => void;
    sendLinearPrompt: (blockId: string, text: string) => Promise<void>;
    startBranchFromSelection: (
      selection: SelectionOverlay,
      text: string,
    ) => Promise<void>;
    setSelection: (selection: SelectionOverlay | null) => void;
    createNewSession: () => void;
  };
};

const AppStateContext = createContext<AppContextValue | undefined>(undefined);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => createInitialState());
  const [hydrated, setHydrated] = useState(false);
  const [pendingTurns, setPendingTurns] = useState<
    Record<string, PendingTurn | undefined>
  >({});
  const [selection, setSelection] = useState<SelectionOverlay | null>(null);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: AppState = JSON.parse(saved);
        const repaired = repairState(parsed);
        stateRef.current = repaired;
        setState(repaired);
      } else {
        setState((prev) => {
          const repaired = repairState(prev);
          stateRef.current = repaired;
          return repaired;
        });
      }
    } catch (error) {
      console.warn("Failed to load state", error);
      setState((prev) => {
        const repaired = repairState(prev);
        stateRef.current = repaired;
        return repaired;
      });
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const handle = window.setTimeout(() => {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }, 300);

    return () => window.clearTimeout(handle);
  }, [state, hydrated]);

  const updateState = useCallback((mutator: (draft: AppState) => void) => {
    setState((prev) => {
      const next = cloneAppState(prev);
      mutator(next);
      stateRef.current = next;
      return next;
    });
  }, []);

  const commitAssistantTurn = useCallback(
    (
      sessionId: string,
      blockId: string,
      userInput: string,
      response: LlmResponsePayload,
    ) => {
      updateState((draft) => {
        const session = draft.sessions[sessionId];
        if (!session) {
          return;
        }
        const block = session.blocks[blockId];
        if (!block) {
          return;
        }

        const userMessageId = createId("msg");
        const assistantMessageId = createId("msg");
        const timestamp = nowIso();

        block.messages.push(
          {
            id: userMessageId,
            role: "user",
            text: userInput,
            createdAt: timestamp,
          },
          {
            id: assistantMessageId,
            role: "assistant",
            text: response.assistant_message || "",
            createdAt: nowIso(),
          },
        );

        const header = response.block_header?.trim();
        if (header && (!block.header || block.depth === 0)) {
          block.header = header;
        }

        if (block.depth === 0 && block.header) {
          session.title = block.header;
        }

        block.updatedAt = nowIso();
        session.updatedAt = nowIso();
        draft.ui.lastFocusedBlockId = block.id;
      });
    },
    [updateState],
  );

  const sendPrompt = useCallback(
    async (
      blockId: string,
      text: string,
      kind: PendingTurn["kind"],
      manualBranchPath?: BranchPathBlock[],
    ) => {
      const trimmed = text.trim();
      if (!trimmed) {
        return;
      }

      const snapshot = stateRef.current;
      const sessionId = snapshot.activeSessionId;
      if (!sessionId) {
        return;
      }
      const session = snapshot.sessions[sessionId];
      if (!session) {
        return;
      }
      const block = session.blocks[blockId];
      if (!block) {
        return;
      }

      const branch_path =
        manualBranchPath || buildBranchPath(session, blockId);
      const payload = {
        request_type: "chat_block_turn",
        session: {
          id: session.id,
          title: session.title,
        },
        branch_path,
        current_user_input: trimmed,
        options: {
          should_suggest_block_header: !block.header,
          should_suggest_session_title:
            block.depth === 0 && (!session.title || !session.title.trim()),
          language: "en",
        },
      } as const;

      setPendingTurns((prev) => ({
        ...prev,
        [blockId]: {
          blockId,
          input: trimmed,
          startedAt: nowIso(),
          kind,
        },
      }));

      try {
        const response = await requestAssistant(payload);
        commitAssistantTurn(session.id, blockId, trimmed, response);
        setPendingTurns((prev) => {
          const next = { ...prev };
          delete next[blockId];
          return next;
        });
      } catch (error) {
        setPendingTurns((prev) => ({
          ...prev,
          [blockId]: {
            blockId,
            input: trimmed,
            startedAt: prev[blockId]?.startedAt ?? nowIso(),
            kind,
            error:
              error instanceof Error ? error.message : "Failed to reach model",
          },
        }));
      }
    },
    [commitAssistantTurn],
  );

  const sendLinearPrompt = useCallback(
    async (blockId: string, text: string) => {
      await sendPrompt(blockId, text, "linear");
    },
    [sendPrompt],
  );

  const startBranchFromSelection = useCallback(
    async (selectionData: SelectionOverlay, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) {
        return;
      }
      const snapshot = stateRef.current;
      const sessionId = snapshot.activeSessionId;
      if (!sessionId) {
        return;
      }
      const session = snapshot.sessions[sessionId];
      if (!session) {
        return;
      }
      const parentBlock = session.blocks[selectionData.blockId];
      if (!parentBlock) {
        return;
      }
      const newBlock = createBlockFromSelection({
        parentBlock,
        parentMessageId: selectionData.messageId,
        selection: {
          text: selectionData.text,
          startOffset: selectionData.startOffset,
          endOffset: selectionData.endOffset,
        },
      });

      updateState((draft) => {
        const sessionDraft = draft.sessions[sessionId];
        if (!sessionDraft) {
          return;
        }
        sessionDraft.blocks[newBlock.id] = newBlock;
        sessionDraft.updatedAt = nowIso();
        draft.ui.currentColumnDepth = newBlock.depth;
        draft.ui.lastFocusedBlockId = newBlock.id;
      });

      setSelection(null);

      const parentPath = buildBranchPath(session, parentBlock.id);
      const branchPath: BranchPathBlock[] = [
        ...parentPath,
        {
          block_id: newBlock.id,
          header: newBlock.header,
          source: newBlock.source,
          messages: [],
        },
      ];

      await sendPrompt(newBlock.id, trimmed, "branch", branchPath);
    },
    [sendPrompt, updateState],
  );

  const toggleBlockCollapsed = useCallback(
    (blockId: string) => {
      updateState((draft) => {
        const session = getActiveSession(draft);
        if (!session) {
          return;
        }
        const block = session.blocks[blockId];
        if (block) {
          block.collapsed = !block.collapsed;
        }
      });
    },
    [updateState],
  );

  const setCurrentColumn = useCallback(
    (depth: number) => {
      updateState((draft) => {
        const session = getActiveSession(draft);
        if (!session) {
          return;
        }
        const columns = getColumns(session);
        const validDepths = columns.map((column) => column.depth);
        if (!validDepths.includes(depth)) {
          return;
        }
        draft.ui.currentColumnDepth = depth;
      });
    },
    [updateState],
  );

  const createNewSessionHandler = useCallback(() => {
    const session = createSession();
    updateState((draft) => {
      draft.sessions[session.id] = session;
      draft.activeSessionId = session.id;
      draft.ui.currentColumnDepth = 0;
      draft.ui.lastFocusedBlockId = session.rootBlockId;
    });
    setPendingTurns({});
    setSelection(null);
  }, [updateState]);

  const columns = useMemo(() => {
    const session = getActiveSession(state);
    if (!session) {
      return [];
    }
    return getColumns(session);
  }, [state]);

  const contextValue = useMemo<AppContextValue>(() => {
    return {
      state,
      hydrated,
      pendingTurns,
      selection,
      columns,
      actions: {
        setCurrentColumn,
        toggleBlockCollapsed,
        sendLinearPrompt,
        startBranchFromSelection,
        setSelection,
        createNewSession: createNewSessionHandler,
      },
    };
  }, [
    state,
    hydrated,
    pendingTurns,
    selection,
    columns,
    setCurrentColumn,
    toggleBlockCollapsed,
    sendLinearPrompt,
    startBranchFromSelection,
    createNewSessionHandler,
  ]);

  return (
    <AppStateContext.Provider value={contextValue}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error("useAppState must be used within AppStateProvider");
  }
  return ctx;
}

function repairState(state: AppState) {
  const next = cloneAppState(state);
  const sessionIds = Object.keys(next.sessions);
  if (!sessionIds.length) {
    const session = createSession();
    next.sessions[session.id] = session;
    next.activeSessionId = session.id;
    next.ui.currentColumnDepth = 0;
    next.ui.lastFocusedBlockId = session.rootBlockId;
    return next;
  }

  if (!next.activeSessionId || !next.sessions[next.activeSessionId]) {
    next.activeSessionId = sessionIds[0];
  }

  if (!next.ui) {
    next.ui = {
      currentColumnDepth: 0,
      lastFocusedBlockId: next.sessions[next.activeSessionId].rootBlockId,
    };
  }

  return next;
}

function getActiveSession(state: AppState) {
  if (!state.activeSessionId) {
    return null;
  }
  return state.sessions[state.activeSessionId] ?? null;
}

function cloneAppState(state: AppState): AppState {
  if (typeof structuredClone === "function") {
    return structuredClone(state);
  }
  return JSON.parse(JSON.stringify(state)) as AppState;
}
