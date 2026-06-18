"use client";

import { useEffect, useState } from "react";

const CYCLE_MS = 3000;
const DEFAULT_MESSAGE = "Thinking…";

type Props = {
  messages: string[];
};

export function LoadingAnimation({ messages }: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (messages.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % messages.length);
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, [messages]);

  const current = messages[index] ?? messages[0] ?? DEFAULT_MESSAGE;

  return (
    <div className="flex gap-3">
      <div
        aria-hidden
        className="size-8 rounded-full brand-blue-gradient grid place-items-center text-white shrink-0 mt-0.5 text-xs font-bold"
      >
        AI
      </div>
      <div
        role="status"
        aria-live="polite"
        className="bg-white border border-border-base rounded-2xl rounded-tl-md px-4 py-3 shadow-soft flex items-center gap-3"
      >
        <span className="flex gap-1" aria-hidden>
          <span className="size-1.5 rounded-full bg-muted animate-bounce [animation-delay:-0.3s]" />
          <span className="size-1.5 rounded-full bg-muted animate-bounce [animation-delay:-0.15s]" />
          <span className="size-1.5 rounded-full bg-muted animate-bounce" />
        </span>
        <span className="text-xs text-muted">{current}</span>
      </div>
    </div>
  );
}
