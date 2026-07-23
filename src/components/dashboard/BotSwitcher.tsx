"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { selectBotAction } from "@/app/(dashboard)/actions";

import { ComingSoonPill } from "./ComingSoonPill";

type Bot = {
  id: string;
  name: string;
  deploymentMode?: "managed" | "self_hosted";
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

export function BotSwitcher({
  bots,
  selectedBotId,
  selectedBotName,
  publicUrl,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex w-full items-center gap-3 rounded-xl border border-border-base bg-white p-2.5 text-left transition-colors hover:bg-neutral-50"
      >
        <div className="brand-blue-gradient font-display grid size-9 shrink-0 place-items-center rounded-lg text-sm font-bold text-white">
          {initials(selectedBotName)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{selectedBotName}</p>
          <p className="truncate text-[11px] text-muted">{publicUrl}</p>
        </div>
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
      </button>

      {open ? (
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
                    {b.deploymentMode === "self_hosted" ? (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700">
                        Self-hosted
                      </span>
                    ) : null}
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
          <div className="border-t border-border-base p-1.5 space-y-0.5">
            <div
              aria-disabled
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-semibold text-muted"
              title="Multi-bot creation is coming soon"
            >
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
                className="shrink-0"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span className="flex-1">Create New Bot</span>
              <ComingSoonPill />
            </div>
            <Link
              href="/dashboard/bots/new-self-hosted"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-semibold text-ink transition-colors hover:bg-neutral-50"
            >
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
                className="shrink-0"
              >
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
              <span className="flex-1">Register self-hosted bot</span>
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
