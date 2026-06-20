import Link from "next/link";

import { describeProvider } from "@/lib/ai/provider-labels";

type Props = {
  provider: string | null;
  model: string | null;
};

// Sidebar widget showing the user's BYO LLM selection. The active dot
// indicates the key is configured locally (the actual key never leaves
// the browser, so the server cannot truly verify "active" beyond
// "they set a provider preference"). Links to the AI model & key tab
// (Coming Soon in Slice A — wires up in a later slice).
export function ModelStatusCard({ provider, model }: Props) {
  const { name, model: modelLabel } = describeProvider(provider, model);
  return (
    <div className="brand-deep-gradient rounded-xl p-4 text-white">
      <div className="mb-1 flex items-center gap-2">
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
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" />
        </svg>
        <p className="text-sm font-bold">{modelLabel}</p>
      </div>
      <p className="mb-3 flex items-center gap-1.5 text-[11px] text-white/60">
        <span className="size-1.5 rounded-full bg-emerald-400" />
        {name} · key stored locally
      </p>
      <Link
        href="/dashboard/bots/new"
        className="block rounded-lg bg-white py-2 text-center text-xs font-bold text-brand-deep"
      >
        Manage model &amp; key
      </Link>
    </div>
  );
}
