'use client';

import { FormEvent, KeyboardEvent, useState } from "react";
import { Send } from "lucide-react";
import clsx from "clsx";

type LinearInputProps = {
  placeholder?: string;
  disabled?: boolean;
  onSubmit: (value: string) => Promise<void> | void;
};

export const LinearInput = ({
  placeholder = "Ask anything",
  disabled,
  onSubmit,
}: LinearInputProps) => {
  const [value, setValue] = useState("");

  const handleSubmit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!value.trim() || disabled) return;
    await onSubmit(value.trim());
    setValue("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-2 rounded-xl border border-neutral-300 bg-white p-3 shadow-sm"
    >
      <textarea
        rows={1}
        className="h-12 flex-1 resize-none text-sm outline-none"
        placeholder={placeholder}
        disabled={disabled}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className={clsx(
          "rounded-full bg-neutral-900 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white",
          (disabled || !value.trim()) && "opacity-50",
        )}
      >
        <Send className="h-4 w-4" />
      </button>
    </form>
  );
};
