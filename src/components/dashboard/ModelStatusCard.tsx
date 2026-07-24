import Link from "next/link";

import { describeProvider } from "@/lib/ai/provider-labels";

type Props = {
  provider: string | null;
  model: string | null;
  manageHref: string;
};

export function ModelStatusCard({ provider, model, manageHref }: Props) {
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
        {name} · key encrypted
      </p>
      <Link
        href={manageHref}
        className="block rounded-lg bg-white py-2 text-center text-xs font-bold text-brand-deep"
      >
        Manage model &amp; key
      </Link>
    </div>
  );
}
