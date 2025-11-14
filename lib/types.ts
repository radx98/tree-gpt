export type MessageRole = "user" | "assistant";

export type Message = {
  id: string;
  role: MessageRole;
  text: string;
  createdAt: string;
};

export type SelectionRange = {
  text: string;
  startOffset: number;
  endOffset: number;
};

export type BlockSource = {
  parentBlockId: string;
  parentMessageId: string;
  selection: SelectionRange;
};

export type ChatBlock = {
  id: string;
  depth: number;
  header: string | null;
  source: BlockSource | null;
  messages: Message[];
  collapsed: boolean;
  anchorOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type Session = {
  id: string;
  title: string | null;
  rootBlockId: string;
  blocks: Record<string, ChatBlock>;
  createdAt: string;
  updatedAt: string;
};

export type AppState = {
  version: number;
  activeSessionId: string | null;
  sessions: Record<string, Session>;
  ui: {
    currentColumnDepth: number;
    lastFocusedBlockId: string | null;
  };
};

export type BranchPathMessage = {
  role: MessageRole;
  text: string;
};

export type BranchPathBlock = {
  block_id: string;
  header: string | null;
  source: BlockSource | null;
  messages: BranchPathMessage[];
};

export type LlmRequestPayload = {
  request_type: "chat_block_turn";
  session: {
    id: string;
    title: string | null;
  };
  branch_path: BranchPathBlock[];
  current_user_input: string;
  options: {
    should_suggest_block_header: boolean;
    should_suggest_session_title: boolean;
    language: string;
  };
};

export type LlmResponsePayload = {
  assistant_message: string;
  block_header?: string | null;
  session_title?: string | null;
  notes?: string | null;
};

export type PendingTurn = {
  blockId: string;
  input: string;
  startedAt: string;
  kind: "linear" | "branch";
  error?: string | null;
};

export type SelectionOverlay = SelectionRange & {
  sessionId: string;
  blockId: string;
  messageId: string;
  depth: number;
  rect: { top: number; left: number; width: number; height: number };
};
