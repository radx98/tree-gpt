import type { ChatBlock, SelectionRange } from "./types";

export function cn(
  ...classes: Array<string | undefined | null | false>
): string {
  return classes.filter(Boolean).join(" ");
}

export function nowIso() {
  return new Date().toISOString();
}

export function deriveAnchorOrder(
  parentBlock: ChatBlock,
  parentMessageId: string,
  selection: SelectionRange,
) {
  const index = parentBlock.messages.findIndex(
    (message) => message.id === parentMessageId,
  );
  const base = index === -1 ? 0 : index * 1000;
  return base + selection.startOffset;
}
