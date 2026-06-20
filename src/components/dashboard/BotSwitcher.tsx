"use client";

import { useEffect, useRef, useState } from "react";

import { selectBotAction } from "@/app/(dashboard)/actions";

type Bot = {
  id: string;
  name: string;
};

type Props = {
  bots: Bot[];
  selectedBotId: string;
  selectedBotName: string;
  publicUrl: string;
};

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

// Sidebar's per-user bot selector. Above the workspace nav. Click opens
// a dropdown of the user's owned bots; picking one submits a hidden form
// that fires the `selectBotAction` server action - the action writes
// the cookie and triggers a server revalidation so the rest of the
// shell (URL pill, embed snippet, "View live bot") re-renders against
// the new selection.
//
// Single-bot users see a static card with no dropdown (the disclosure
// caret is hidden) - no value in clicking when there's nothing to
// switch to. The "+ New bot" footer is always visible.
export function BotSwitcher({
  bots,
  selectedBotId,
  selectedBotName,
  publicUrl,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const hasMultiple = bots.length > 1;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => hasMultiple && setOpen((v) => !v)}
        disabled={!hasMultiple}
        aria-expanded={open}
        aria-haspopup={hasMultiple ? "menu" : undefined}
        className="flex w-full items-center gap-3 rounded-xl border border-border-base bg-white p-2.5 text-left transition-colors hover:bg-neutral-50 disabled:cursor-default disabled:hover:bg-white"
      >
        <div className="brand-blue-gradient font-display grid size-9 shrink-0 place-items-center rounded-lg text-sm font-bold text-white">
          {initials(selectedBotName)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{selectedBotName}</p>
          <p className="truncate text-[11px] text-muted">{publicUrl}</p>
        </div>
        {hasMultiple ? (
          <svg
            aria-hidden
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 text-muted"
          >
            <path d="M7 15l5 5 5-5M7 9l5-5 5 5" />
          </svg>
        ) : null}
      </button>

      {open && hasMultiple ? (
        <div
          role="menu"
          aria-label="Switch bot"
          className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-border-base bg-white shadow-lg"
        >
          <ul className="max-h-72 overflow-y-auto py-1">
            {bots.map((b) => (
              <li key={b.id}>
                <form action={selectBotAction}>
                  <input type="hidden" name="botId" value={b.id} />
                  <button
                    type="submit"
                    onClick={() => setOpen(false)}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-neutral-50 ${
                      b.id === selectedBotId
                        ? "bg-blue-50 font-bold text-brand"
                        : "text-ink"
                    }`}
                  >
                    <div className="brand-blue-gradient grid size-7 shrink-0 place-items-center rounded-md text-xs font-bold text-white">
                      {initials(b.name)}
                    </div>
                    <span className="min-w-0 flex-1 truncate">{b.name}</span>
                    {b.id === selectedBotId ? (
                      <svg
                        aria-hidden
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : null}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
