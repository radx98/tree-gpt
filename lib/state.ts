import { createId } from "./id";
import type {
  AppState,
  BranchPathBlock,
  ChatBlock,
  SelectionRange,
  Session,
} from "./types";
import { deriveAnchorOrder, nowIso } from "./utils";

export const STORAGE_KEY = "branching_chat_state";
const STATE_VERSION = 1;

export function createInitialState(): AppState {
  const session = createSession();
  return {
    version: STATE_VERSION,
    activeSessionId: session.id,
    sessions: {
      [session.id]: session,
    },
    ui: {
      currentColumnDepth: 0,
      lastFocusedBlockId: session.rootBlockId,
    },
  };
}

export function createSession(): Session {
  const id = createId("session");
  const now = nowIso();
  const rootBlock = createRootBlock();
  return {
    id,
    title: rootBlock.header,
    rootBlockId: rootBlock.id,
    blocks: {
      [rootBlock.id]: rootBlock,
    },
    createdAt: now,
    updatedAt: now,
  };
}

function createRootBlock(): ChatBlock {
  const id = createId("block");
  const now = nowIso();
  return {
    id,
    depth: 0,
    header: null,
    source: null,
    messages: [],
    collapsed: false,
    anchorOrder: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export function createBlockFromSelection(params: {
  parentBlock: ChatBlock;
  parentMessageId: string;
  selection: SelectionRange;
}): ChatBlock {
  const { parentBlock, parentMessageId, selection } = params;
  const now = nowIso();
  return {
    id: createId("block"),
    depth: parentBlock.depth + 1,
    header: null,
    source: {
      parentBlockId: parentBlock.id,
      parentMessageId,
      selection,
    },
    messages: [],
    collapsed: false,
    anchorOrder: deriveAnchorOrder(parentBlock, parentMessageId, selection),
    createdAt: now,
    updatedAt: now,
  };
}

export function buildBranchPath(
  session: Session,
  blockId: string,
): BranchPathBlock[] {
  const result: BranchPathBlock[] = [];
  let cursor: ChatBlock | undefined = session.blocks[blockId];

  while (cursor) {
    result.push({
      block_id: cursor.id,
      header: cursor.header,
      source: cursor.source,
      messages: cursor.messages.map((message) => ({
        role: message.role,
        text: message.text,
      })),
    });

    if (!cursor.source) {
      break;
    }
    cursor = session.blocks[cursor.source.parentBlockId];
  }

  return result.reverse();
}

export function getColumns(session: Session) {
  const map = new Map<number, ChatBlock[]>();

  Object.values(session.blocks).forEach((block) => {
    if (!map.has(block.depth)) {
      map.set(block.depth, []);
    }
    map.get(block.depth)!.push(block);
  });

  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([depth, blocks]) => ({
      depth,
      blocks: blocks.sort((a, b) => a.anchorOrder - b.anchorOrder),
    }));
}
