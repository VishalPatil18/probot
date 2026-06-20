import { describeProvider, PROVIDER_LABELS } from "@/lib/ai/provider-labels";
import type { ProviderName } from "@/lib/ai/providers";
import { PROVIDER_NAMES } from "@/lib/ai/providers";

import { ComingSoonPill } from "../ComingSoonPill";

type Props = {
  provider: string | null;
  model: string | null;
};

// Slice B - AI model & API key tab. Entire tab is Coming Soon for the
// dashboard: today's BYO-key flow happens during onboarding + via the
// browser key-store; this surface lands in Stage 7 when the in-app
// provider/key editor ships. We render a faded preview of the design's
// reference shape so users can see what's coming.
export function AIModelKeyTab({ provider, model }: Props) {
  const current = describeProvider(provider, model);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
        <svg
          aria-hidden
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mt-0.5 shrink-0 text-brand"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <p className="text-sm leading-relaxed text-ink">
          <strong>Your API key never leaves this device.</strong> ProBot stores
          it locally in your browser and never transmits or tracks it. You bring
          the model, you own the credentials.
        </p>
      </div>

      <section className="rounded-2xl border border-border-base bg-white p-6 shadow-soft">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="font-bold">Provider &amp; model</h3>
          <ComingSoonPill />
        </div>
        <p className="mb-5 text-xs text-muted">
          Choose any supported LLM. Switch any time - answers stay grounded in
          your knowledge base via RAG.
        </p>

        <label className="mb-2 block text-xs font-semibold">Provider</label>
        <div className="mb-5 grid grid-cols-2 gap-2 opacity-60 sm:grid-cols-4">
          {PROVIDER_NAMES.map((p) => {
            const isCurrent = provider === p;
            const meta = PROVIDER_LABELS[p as ProviderName];
            return (
              <div
                key={p}
                className={`rounded-xl border-2 p-3 text-center ${
                  isCurrent
                    ? "border-brand bg-blue-50/50"
                    : "border-border-base"
                }`}
              >
                <p className="text-sm font-bold">{meta.name}</p>
                <p className="text-[11px] text-muted">{meta.family}</p>
              </div>
            );
          })}
        </div>

        <label className="mb-1.5 block text-xs font-semibold">Model</label>
        <div className="w-full cursor-not-allowed rounded-xl border border-border-base bg-neutral-50 px-3 py-2.5 text-sm opacity-60">
          {current.model}
        </div>
      </section>

      <section className="rounded-2xl border border-border-base bg-white p-6 shadow-soft">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="font-bold">API key</h3>
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-success">
            <svg
              aria-hidden
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Stored locally only
          </span>
        </div>
        <p className="mb-5 text-xs text-muted">
          The dashboard provider/key editor lands in Stage 7. Until then, set up
          keys via the bot wizard at /dashboard/bots/new.
        </p>
        <div className="flex items-center gap-2 rounded-xl border border-border-base bg-neutral-50 p-2 opacity-60">
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
            className="ml-1 shrink-0 text-muted"
          >
            <circle cx="9" cy="12" r="3" />
            <path d="M12 12h9M16 12v3M19 12v2" />
          </svg>
          <span className="flex-1 truncate font-mono text-sm text-muted">
            sk-…
          </span>
          <button
            type="button"
            disabled
            className="cursor-not-allowed px-3 text-xs font-semibold text-brand opacity-60"
          >
            Show
          </button>
        </div>
      </section>
    </div>
  );
}
