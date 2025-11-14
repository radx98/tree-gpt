"use client";

import { useState } from "react";
import { useAppState } from "./app-state-context";

type LinearInputProps = {
  blockId: string;
  disabled?: boolean;
  busy?: boolean;
  placeholder?: string;
};

export function LinearInput({
  blockId,
  disabled = false,
  busy = false,
  placeholder,
}: LinearInputProps) {
  const { actions } = useAppState();
  const [value, setValue] = useState("");

  const submit = async () => {
    if (!value.trim() || disabled || busy) {
      return;
    }
    await actions.sendLinearPrompt(blockId, value);
    setValue("");
  };

  return (
    <div className="mt-5 flex justify-end">
      <div className="w-[90%] rounded-2xl bg-sky-100/70 p-3 shadow-inner">
        <textarea
          value={value}
          disabled={disabled || busy}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder={placeholder}
          className="h-20 w-full resize-none rounded-xl border border-sky-200 bg-white p-3 text-sm text-slate-800 outline-none disabled:cursor-not-allowed disabled:opacity-70"
        />
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
          <span>{disabled ? "Column inactive" : "Press Enter to send"}</span>
          <button
            type="button"
            onClick={submit}
            disabled={disabled || busy}
            className="rounded-full bg-sky-500 px-4 py-1.5 font-medium text-white disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
