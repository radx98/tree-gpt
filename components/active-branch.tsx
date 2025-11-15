'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTreeStore } from "@/lib/tree-store";
import { NodeColumn } from "./node-column";

type ActiveBranchProps = {
  onLinearSubmit: (nodeId: string, text: string) => Promise<void>;
  onHighlightClick: (childNodeId: string) => void;
  busyNodeId?: string | null;
  onSelection?: (payload: {
    nodeId: string;
    messageId: string;
    text: string;
    startOffset: number;
    endOffset: number;
    rect: DOMRect;
  }) => void;
};

export const ActiveBranch = ({
  onLinearSubmit,
  onHighlightClick,
  busyNodeId,
  onSelection,
}: ActiveBranchProps) => {
  const activeSessionId = useTreeStore((state) => state.activeSessionId);
  const activeBranchNodeIds = useTreeStore(
    (state) => state.activeBranchNodeIds,
  );
  const currentNodeId = useTreeStore((state) => state.currentNodeId);
  const sessions = useTreeStore((state) => state.sessions);
  const focusNode = useTreeStore((state) => state.focusNode);

  const nodes = useMemo(() => {
    if (!activeSessionId) return [];
    const session = sessions[activeSessionId];
    if (!session) return [];
    return activeBranchNodeIds
      .map((nodeId) => session.nodes[nodeId])
      .filter(Boolean);
  }, [activeSessionId, activeBranchNodeIds, sessions]);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const columnRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [hiddenLeft, setHiddenLeft] = useState<
    { id: string; label: string }[]
  >([]);
  const [hiddenRight, setHiddenRight] = useState<
    { id: string; label: string }[]
  >([]);
  const manualFocusRef = useRef({ suppressed: false, anchor: 0 });

  const updateHiddenColumns = useCallback(() => {
    if (!scrollRef.current) return;
    const containerRect = scrollRef.current.getBoundingClientRect();
    const left: { id: string; label: string; distance: number }[] = [];
    const right: { id: string; label: string; distance: number }[] = [];
    nodes.forEach((node) => {
      const element = columnRefs.current[node.id];
      if (!element) return;
      const rect = element.getBoundingClientRect();
      if (rect.right < containerRect.left) {
        left.push({
          id: node.id,
          label: node.header ?? "Untitled",
          distance: containerRect.left - rect.right,
        });
      } else if (rect.left > containerRect.right) {
        right.push({
          id: node.id,
          label: node.header ?? "Untitled",
          distance: rect.left - containerRect.right,
        });
      }
    });
    left.sort((a, b) => a.distance - b.distance);
    right.sort((a, b) => a.distance - b.distance);
    setHiddenLeft(left.map(({ id, label }) => ({ id, label })));
    setHiddenRight(right.map(({ id, label }) => ({ id, label })));
  }, [nodes]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    updateHiddenColumns();
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    const maxScroll = scrollWidth - clientWidth;
    if (manualFocusRef.current.suppressed) {
      const delta = Math.abs(scrollLeft - manualFocusRef.current.anchor);
      if (delta > clientWidth * 0.05) {
        manualFocusRef.current.suppressed = false;
      } else {
        return;
      }
    }
    if (maxScroll <= 0) return;
    const progress = scrollLeft / maxScroll;
    const focusPoint =
      scrollRef.current.getBoundingClientRect().left + clientWidth * progress;
    let targetId: string | null = null;
    nodes.forEach((node) => {
      const element = columnRefs.current[node.id];
      if (!element) return;
      const rect = element.getBoundingClientRect();
      if (focusPoint >= rect.left && focusPoint <= rect.right) {
        targetId = node.id;
      }
    });
    if (targetId && targetId !== currentNodeId) {
      focusNode(targetId);
    }
  }, [currentNodeId, focusNode, nodes, updateHiddenColumns]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => updateHiddenColumns());
    const handleResize = () => updateHiddenColumns();
    window.addEventListener("resize", handleResize);
    const container = scrollRef.current;
    container?.addEventListener("scroll", handleScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", handleResize);
      container?.removeEventListener("scroll", handleScroll);
    };
  }, [handleScroll, updateHiddenColumns]);

  useEffect(() => {
    const map = columnRefs.current;
    Object.keys(map).forEach((id) => {
      if (!nodes.find((node) => node.id === id)) {
        delete map[id];
      }
    });
    const frame = requestAnimationFrame(() => updateHiddenColumns());
    return () => cancelAnimationFrame(frame);
  }, [nodes, updateHiddenColumns]);

  if (!activeSessionId) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-neutral-500">
        No session loaded.
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {hiddenLeft.length ? (
        <div className="flex flex-col justify-end border-r border-neutral-200 bg-white px-1">
          {hiddenLeft.map((item) => (
            <button
              key={item.id}
              className="mb-1 flex h-24 w-6 items-center justify-center border border-neutral-200 text-[10px] font-semibold uppercase tracking-widest text-neutral-500"
              onClick={() => {
                if (scrollRef.current) {
                  manualFocusRef.current = {
                    suppressed: true,
                    anchor: scrollRef.current.scrollLeft,
                  };
                }
                const element = columnRefs.current[item.id];
                if (element && scrollRef.current) {
                  scrollRef.current.scrollTo({
                    left:
                      element.offsetLeft -
                      scrollRef.current.clientWidth / 2 +
                      element.clientWidth / 2,
                    behavior: "smooth",
                  });
                }
                focusNode(item.id);
              }}
            >
              <span className="[writing-mode:vertical-rl]">{item.label}</span>
            </button>
          ))}
        </div>
      ) : null}
      <div className="flex flex-1 overflow-x-auto" ref={scrollRef}>
        <div className="flex h-full flex-1 items-stretch">
          {nodes.map((node) => (
            <NodeColumn
              key={node.id}
              node={node}
              isCurrent={node.id === currentNodeId}
              isBlocking={busyNodeId === node.id}
              onHighlightClick={onHighlightClick}
              onSubmit={(value) => onLinearSubmit(node.id, value)}
              onSelection={onSelection}
              onFocusRequest={() => {
                if (!scrollRef.current) return;
                manualFocusRef.current = {
                  suppressed: true,
                  anchor: scrollRef.current.scrollLeft,
                };
              }}
              ref={(element) => {
                columnRefs.current[node.id] = element;
              }}
            />
          ))}
        </div>
      </div>
      {hiddenRight.length ? (
        <div className="flex flex-col justify-end border-l border-neutral-200 bg-white px-1">
          {hiddenRight.map((item) => (
            <button
              key={item.id}
              className="mb-1 flex h-24 w-6 items-center justify-center border border-neutral-200 text-[10px] font-semibold uppercase tracking-widest text-neutral-500"
              onClick={() => {
                if (scrollRef.current) {
                  manualFocusRef.current = {
                    suppressed: true,
                    anchor: scrollRef.current.scrollLeft,
                  };
                }
                const element = columnRefs.current[item.id];
                if (element && scrollRef.current) {
                  scrollRef.current.scrollTo({
                    left:
                      element.offsetLeft -
                      scrollRef.current.clientWidth / 2 +
                      element.clientWidth / 2,
                    behavior: "smooth",
                  });
                }
                focusNode(item.id);
              }}
            >
              <span className="[writing-mode:vertical-rl]">{item.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};
