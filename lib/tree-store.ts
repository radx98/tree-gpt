'use client';

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SCHEMA_VERSION, STORAGE_KEY } from "./constants";
import {
  HistoryMessage,
  Message,
  NodeColumn,
  SelectionRange,
  Session,
  TreeState,
} from "./types";
import { generateId, nowIso } from "./utils";

type StartBranchInput = {
  parentNodeId: string;
  parentMessageId: string;
  selection: SelectionRange;
  prompt: string;
};

type TreeStore = TreeState & {
  isHydrated: boolean;
  setHydrated: (value: boolean) => void;
  ensureSession: () => string | null;
  createSession: () => string;
  setActiveSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  focusNode: (nodeId: string) => void;
  sendUserMessage: (nodeId: string, text: string) => { nodeId: string; messageId: string } | null;
  startBranchFromSelection: (
    input: StartBranchInput,
  ) => { nodeId: string; messageId: string } | null;
  appendAssistantMessage: (
    nodeId: string,
    payload: { header: string | null; message: string },
  ) => void;
  switchBranchToNode: (nodeId: string) => void;
  buildHistoryFromBranch: (omitMessageId?: string) => HistoryMessage[];
};

const makeInitialState = (): TreeState => ({
  version: SCHEMA_VERSION,
  activeSessionId: null,
  activeBranchNodeIds: [],
  currentNodeId: null,
  sessions: {},
});

const createRootNode = (): NodeColumn => ({
  id: generateId("node"),
  depth: 0,
  header: null,
  parent: null,
  children: [],
  messages: [],
});

const createBlankSession = (): Session => {
  const now = nowIso();
  const rootNode = createRootNode();
  return {
    id: generateId("session"),
    title: null,
    rootNodeId: rootNode.id,
    nodes: {
      [rootNode.id]: rootNode,
    },
    createdAt: now,
    updatedAt: now,
    lastFocusedNodeId: rootNode.id,
  };
};

const buildParentToChildMap = (branch: string[]) => {
  const map = new Map<string, string>();
  for (let i = 0; i < branch.length - 1; i += 1) {
    map.set(branch[i], branch[i + 1]);
  }
  return map;
};

const applyHighlightState = (session: Session, branch: string[]): Session => {
  const parentToChild = buildParentToChildMap(branch);
  let sessionMutated = false;
  const nodes: Record<string, NodeColumn> = {};

  Object.values(session.nodes).forEach((node) => {
    let nodeMutated = false;
    const messages: Message[] = node.messages.map((message) => {
      if (!message.highlights.length) {
        return message;
      }
      let messageMutated = false;
      const highlights = message.highlights.map((highlight) => {
        const shouldBeActive = parentToChild.get(node.id) === highlight.childNodeId;
        if ((highlight.isActive ?? false) === shouldBeActive) {
          return highlight;
        }
        messageMutated = true;
        return { ...highlight, isActive: shouldBeActive };
      });
      if (!messageMutated) {
        return message;
      }
      nodeMutated = true;
      return { ...message, highlights };
    });

    if (nodeMutated) {
      sessionMutated = true;
      nodes[node.id] = { ...node, messages };
    } else {
      nodes[node.id] = node;
    }
  });

  if (!sessionMutated) {
    return session;
  }

  return {
    ...session,
    nodes,
  };
};

const updateSessionTimestamp = (session: Session) => ({
  ...session,
  updatedAt: nowIso(),
});

const getActiveSession = (state: TreeStore): Session | null => {
  if (!state.activeSessionId) {
    return null;
  }
  return state.sessions[state.activeSessionId] ?? null;
};

const rebuildBranchForNode = (session: Session, nodeId: string) => {
  const branch: string[] = [];
  let current: NodeColumn | null = session.nodes[nodeId] ?? null;
  while (current) {
    branch.push(current.id);
    if (!current.parent) break;
    current = session.nodes[current.parent.parentNodeId] ?? null;
  }
  return branch.reverse();
};

export const useTreeStore = create<TreeStore>()(
  persist(
    (set, get) => ({
      ...makeInitialState(),
      isHydrated: false,
      setHydrated: (value) => set(() => ({ isHydrated: value })),
      ensureSession: () => {
        const state = get();
        if (state.activeSessionId && state.sessions[state.activeSessionId]) {
          return state.activeSessionId;
        }
        return state.createSession();
      },
      createSession: () => {
        const session = createBlankSession();
        set((state) => {
          const sessions = { ...state.sessions, [session.id]: session };
          return {
            ...state,
            sessions,
            activeSessionId: session.id,
            activeBranchNodeIds: [session.rootNodeId],
            currentNodeId: session.rootNodeId,
          };
        });
        return session.id;
      },
      setActiveSession: (sessionId) =>
        set((state) => {
          const target = state.sessions[sessionId];
          if (!target) return state;
          const targetNodeId = target.lastFocusedNodeId ?? target.rootNodeId;
          const branch = rebuildBranchForNode(target, targetNodeId ?? target.rootNodeId);
          const sessionWithHighlights = applyHighlightState(target, branch);
          return {
            ...state,
            activeSessionId: sessionId,
            activeBranchNodeIds: branch,
            currentNodeId: targetNodeId ?? target.rootNodeId,
            sessions: {
              ...state.sessions,
              [sessionId]: updateSessionTimestamp({
                ...sessionWithHighlights,
                lastFocusedNodeId: targetNodeId ?? target.rootNodeId,
              }),
            },
          };
        }),
      deleteSession: (sessionId) => {
        set((state) => {
          if (!state.sessions[sessionId]) return state;
          const sessions = { ...state.sessions };
          delete sessions[sessionId];
          let activeSessionId = state.activeSessionId;
          let activeBranchNodeIds = state.activeBranchNodeIds;
          let currentNodeId = state.currentNodeId;

          if (state.activeSessionId === sessionId) {
            const remainingIds = Object.keys(sessions);
            if (remainingIds.length) {
              const nextId = remainingIds[0];
              const nextSession = sessions[nextId];
              const targetNodeId =
                nextSession.lastFocusedNodeId ?? nextSession.rootNodeId;
              const branch = rebuildBranchForNode(
                nextSession,
                targetNodeId ?? nextSession.rootNodeId,
              );
              const sessionWithHighlights = applyHighlightState(
                nextSession,
                branch,
              );
              sessions[nextId] = updateSessionTimestamp({
                ...sessionWithHighlights,
                lastFocusedNodeId: targetNodeId ?? nextSession.rootNodeId,
              });
              activeSessionId = nextId;
              activeBranchNodeIds = branch;
              currentNodeId = targetNodeId ?? nextSession.rootNodeId;
            } else {
              activeSessionId = null;
              activeBranchNodeIds = [];
              currentNodeId = null;
            }
          }

          return {
            ...state,
            sessions,
            activeSessionId,
            activeBranchNodeIds,
            currentNodeId,
          };
        });
      },
      focusNode: (nodeId) =>
        set((state) => {
          if (!state.activeSessionId) return state;
          if (!state.activeBranchNodeIds.includes(nodeId)) return state;
          const session = getActiveSession(state);
          if (!session) return state;
          const updatedSession = updateSessionTimestamp({
            ...session,
            lastFocusedNodeId: nodeId,
          });
          return {
            ...state,
            sessions: {
              ...state.sessions,
              [session.id]: updatedSession,
            },
            currentNodeId: nodeId,
          };
        }),
      sendUserMessage: (nodeId, text) => {
        const session = getActiveSession(get());
        if (!session) return null;
        const targetNode = session.nodes[nodeId];
        if (!targetNode) return null;
        const message: Message = {
          id: generateId("msg"),
          role: "user",
          text,
          createdAt: nowIso(),
          highlights: [],
        };

        set((state) => {
          const currentSession = getActiveSession(state);
          if (!currentSession) return state;
          const node = currentSession.nodes[nodeId];
          if (!node) return state;
          const updatedNode: NodeColumn = {
            ...node,
            messages: [...node.messages, message],
          };
          const nodes = {
            ...currentSession.nodes,
            [nodeId]: updatedNode,
          };
          const updatedSession = updateSessionTimestamp({
            ...currentSession,
            nodes,
          });
          return {
            ...state,
            sessions: {
              ...state.sessions,
              [updatedSession.id]: updatedSession,
            },
          };
        });

        return { nodeId, messageId: message.id };
      },
      startBranchFromSelection: (input) => {
        const session = getActiveSession(get());
        if (!session) return null;
        const parent = session.nodes[input.parentNodeId];
        if (!parent) return null;
        const parentMessage = parent.messages.find(
          (message) => message.id === input.parentMessageId,
        );
        if (!parentMessage) return null;

        const childNodeId = generateId("node");
        const highlight = {
          highlightId: generateId("hl"),
          startOffset: input.selection.startOffset,
          endOffset: input.selection.endOffset,
          text: input.selection.text,
          childNodeId,
          isActive: true,
        };

        const childNode: NodeColumn = {
          id: childNodeId,
          depth: parent.depth + 1,
          header: null,
          parent: {
            parentNodeId: parent.id,
            parentMessageId: input.parentMessageId,
            selection: input.selection,
          },
          children: [],
          messages: [],
        };

        const userMessage: Message = {
          id: generateId("msg"),
          role: "user",
          text: input.prompt,
          createdAt: nowIso(),
          highlights: [],
        };

        set((state) => {
          const currentSession = getActiveSession(state);
          if (!currentSession) return state;
          const existingParent = currentSession.nodes[parent.id];
          if (!existingParent) return state;
          const messageIndex = existingParent.messages.findIndex(
            (message) => message.id === input.parentMessageId,
          );
          if (messageIndex === -1) return state;
          const updatedMessage = {
            ...existingParent.messages[messageIndex],
            highlights: [
              ...existingParent.messages[messageIndex].highlights,
              highlight,
            ],
          };
          const updatedParent: NodeColumn = {
            ...existingParent,
            children: [...existingParent.children, childNodeId],
            messages: existingParent.messages.map((message, index) =>
              index === messageIndex ? updatedMessage : message,
            ),
          };

          const nodes = {
            ...currentSession.nodes,
            [updatedParent.id]: updatedParent,
            [childNode.id]: { ...childNode, messages: [userMessage] },
          };

          const parentIndex = state.activeBranchNodeIds.indexOf(parent.id);
          const newBranch =
            parentIndex >= 0
              ? [
                  ...state.activeBranchNodeIds.slice(0, parentIndex + 1),
                  childNode.id,
                ]
              : rebuildBranchForNode(
                  {
                    ...currentSession,
                    nodes,
                  },
                  childNode.id,
                );

          const sessionWithHighlights = applyHighlightState(
            {
              ...currentSession,
              nodes,
            },
            newBranch,
          );

          const sessionWithFocus = {
            ...sessionWithHighlights,
            lastFocusedNodeId: childNode.id,
          };
          return {
            ...state,
            sessions: {
              ...state.sessions,
              [sessionWithFocus.id]: updateSessionTimestamp(
                sessionWithFocus,
              ),
            },
            activeBranchNodeIds: newBranch,
            currentNodeId: childNode.id,
          };
        });

        return { nodeId: childNode.id, messageId: userMessage.id };
      },
      appendAssistantMessage: (nodeId, payload) =>
        set((state) => {
          const session = getActiveSession(state);
          if (!session) return state;
          const node = session.nodes[nodeId];
          if (!node) return state;
          const assistantMessage: Message = {
            id: generateId("msg"),
            role: "assistant",
            text: payload.message,
            createdAt: nowIso(),
            highlights: [],
          };
          const updatedNode: NodeColumn = {
            ...node,
            header: node.header ?? payload.header ?? node.header,
            messages: [...node.messages, assistantMessage],
          };
          let title = session.title;
          if (!node.parent && !node.header && payload.header) {
            title = payload.header;
          }

          const nodes = {
            ...session.nodes,
            [nodeId]: updatedNode,
          };

          const updatedSession = updateSessionTimestamp({
            ...session,
            nodes,
            title,
          });

          return {
            ...state,
            sessions: {
              ...state.sessions,
              [updatedSession.id]: updatedSession,
            },
          };
        }),
      switchBranchToNode: (nodeId) =>
        set((state) => {
          const session = getActiveSession(state);
          if (!session) return state;
          if (!session.nodes[nodeId]) return state;
          const branch = rebuildBranchForNode(session, nodeId);
          const sessionWithHighlights = applyHighlightState(session, branch);
          const withFocus = {
            ...sessionWithHighlights,
            lastFocusedNodeId: nodeId,
          };
          return {
            ...state,
            sessions: {
              ...state.sessions,
              [session.id]: updateSessionTimestamp(withFocus),
            },
            activeBranchNodeIds: branch,
            currentNodeId: nodeId,
          };
        }),
      buildHistoryFromBranch: (omitMessageId) => {
        const state = get();
        const session = getActiveSession(state);
        if (!session) return [];
        const history: HistoryMessage[] = [];
        state.activeBranchNodeIds.forEach((nodeId, idx) => {
          const node = session.nodes[nodeId];
          if (!node) return;
          if (idx > 0 && node.parent?.selection) {
            history.push({
              role: "user",
              text: `[Branch created from previous text: "${node.parent.selection.text}"]`,
            });
          }
          node.messages.forEach((message) => {
            if (omitMessageId && message.id === omitMessageId) {
              return;
            }
            history.push({ role: message.role, text: message.text });
          });
        });
        return history;
      },
    }),
    {
      name: STORAGE_KEY,
      version: SCHEMA_VERSION,
      partialize: (state) => ({
        version: state.version,
        activeSessionId: state.activeSessionId,
        activeBranchNodeIds: state.activeBranchNodeIds,
        currentNodeId: state.currentNodeId,
        sessions: state.sessions,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error("Failed to hydrate tree store", error);
        }
        state?.setHydrated(true);
      },
    },
  ),
);
