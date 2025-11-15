'use client';

import { FormEvent, KeyboardEvent, forwardRef, useState } from "react";
import { Send, X } from "lucide-react";
import clsx from "clsx";

type ContextInputProps = {
  rect: DOMRect;
  onCancel: () => void;
  onSubmit: (value: string) => Promise<void>;
};

export const ContextInput = forwardRef<HTMLFormElement, ContextInputProps>(function ContextInput(
  { rect, onCancel, onSubmit }: ContextInputProps,
  ref,
) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!value.trim() || sending) return;
    setSending(true);
    await onSubmit(value.trim());
    setValue("");
    setSending(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
    }
  };

  return (
    <form
      ref={ref}
      onSubmit={handleSubmit}
      className="fixed z-30 w-72 rounded-xl border border-neutral-200 bg-white shadow-xl"
      style={{
        top: rect.top + window.scrollY - 80,
        left: rect.left + rect.width / 2,
        transform: "translateX(-50%)",
      }}
    >
      <div className="flex items-center justify-between border-b border-neutral-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Context prompt
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full p-1 hover:bg-neutral-100"
          aria-label="Cancel context prompt"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="p-3">
        <textarea
          rows={3}
          className="w-full resize-none text-sm text-neutral-800 outline-none"
          placeholder="Ask about this selection"
          disabled={sending}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="mt-2 flex justify-end">
          <button
            type="submit"
            disabled={!value.trim() || sending}
            className={clsx(
              "flex items-center gap-2 rounded-full bg-neutral-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white",
              (!value.trim() || sending) && "opacity-50",
            )}
          >
            <Send className="h-3.5 w-3.5" />
            Send
          </button>
        </div>
      </div>
    </form>
  );
});
