export type MessageRole = "user" | "assistant";

export type HighlightLink = {
  highlightId: string;
  startOffset: number;
  endOffset: number;
  text: string;
  childNodeId: string;
  isActive?: boolean;
};

export type Message = {
  id: string;
  role: MessageRole;
  text: string;
  createdAt: string;
  highlights: HighlightLink[];
};

export type SelectionRange = {
  text: string;
  startOffset: number;
  endOffset: number;
};

export type NodeParent =
  | null
  | {
      parentNodeId: string;
      parentMessageId: string;
      selection: SelectionRange;
    };

export type NodeColumn = {
  id: string;
  depth: number;
  header: string | null;
  parent: NodeParent;
  messages: Message[];
  children: string[];
};

export type Session = {
  id: string;
  title: string | null;
  rootNodeId: string;
  nodes: Record<string, NodeColumn>;
  createdAt: string;
  updatedAt: string;
  lastFocusedNodeId?: string | null;
};

export type TreeState = {
  version: number;
  activeSessionId: string | null;
  activeBranchNodeIds: string[];
  currentNodeId: string | null;
  sessions: Record<string, Session>;
};

export type HistoryMessage = {
  role: MessageRole;
  text: string;
};
