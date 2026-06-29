import { Icon } from "@/components/ui/Icon";

import { EMBED_SNIPPET } from "./constants";

export function FeaturesSection() {
  return (
    <section
      id="features"
      className="dot-pattern border-b border-border-base"
    >
      <div className="mx-auto max-w-[1180px] px-6 py-20">
        <div className="max-w-2xl mb-14">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand mb-3">
            Features
          </p>
          <h2 className="font-display text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.05]">
            Everything your bot needs to land you the interview.
          </h2>
        </div>
        <div className="grid md:grid-cols-12 gap-6">
          {/* RAG (big) */}
          <div className="md:col-span-7 bg-white rounded-2xl border border-border-base overflow-hidden shadow-soft flex flex-col">
            <div className="p-8 pb-0">
              <div className="size-11 rounded-xl bg-blue-50 grid place-items-center text-brand mb-4">
                <Icon name="manage_search" />
              </div>
              <h3 className="font-display text-2xl font-bold mb-2">
                RAG-powered, never made-up
              </h3>
              <p className="text-sm text-muted leading-relaxed max-w-md">
                Each question is embedded and matched against the top-3 most
                relevant chunks of your data. If it&apos;s not in your
                history, the bot says so and points to you directly.
              </p>
            </div>
            <div className="mt-6 mx-8 mb-8 rounded-xl border border-border-base bg-bg-app/50 p-4 font-mono text-[11px] space-y-1.5">
              <p className="text-muted">
                {'// recruiter: "Has he led a team?"'}
              </p>
              <p className="text-brand">
                → retrieve top-3 chunks · namespace: vishal
              </p>
              <p className="text-ink">
                matched: positions_of_responsibility (0.91)
              </p>
              <p className="text-success">
                {'"Yes - GDSC Lead & Community of Coders core team…"'}
              </p>
            </div>
          </div>
          {/* Security */}
          <div className="md:col-span-5 brand-deep-gradient dot-pattern-light rounded-2xl border border-brand-deep/30 overflow-hidden text-white p-8 flex flex-col">
            <div className="size-11 rounded-xl bg-white/10 grid place-items-center mb-4 border border-white/10">
              <Icon name="shield_lock" />
            </div>
            <h3 className="font-display text-2xl font-bold mb-2">
              Security-hardened by default
            </h3>
            <p className="text-sm text-white/60 leading-relaxed mb-6">
              Inherits a battle-tested defense stack: 40+ prompt-injection
              patterns, unicode homoglyph normalization, output
              sanitization, and per-bot rate limiting. Your LLM key never
              leaves your machine.
            </p>
            <div className="mt-auto grid grid-cols-2 gap-2 text-[11px]">
              {[
                "Identity lock",
                "Prompt protection",
                "Output scanning",
                "Rate limiting",
              ].map((t) => (
                <span
                  key={t}
                  className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
          {/* Widget */}
          <div className="md:col-span-4 bg-white rounded-2xl border border-border-base p-8 shadow-soft">
            <div className="size-11 rounded-xl bg-blue-50 grid place-items-center text-brand mb-4">
              <Icon name="code" />
            </div>
            <h3 className="font-display text-xl font-bold mb-2">
              One-line embed widget
            </h3>
            <p className="text-sm text-muted leading-relaxed mb-4">
              Drop a floating chat bubble on any site. Shadow-DOM isolated,
              &lt;50KB, zero CSS conflicts.
            </p>
            <code className="block text-[10px] bg-ink text-blue-200 rounded-lg p-3 font-mono break-all">
              {EMBED_SNIPPET}
            </code>
          </div>
          {/* Leads */}
          <div className="md:col-span-4 bg-white rounded-2xl border border-border-base p-8 shadow-soft">
            <div className="size-11 rounded-xl bg-blue-50 grid place-items-center text-brand mb-4">
              <Icon name="contact_mail" />
            </div>
            <h3 className="font-display text-xl font-bold mb-2">
              Automatic lead capture
            </h3>
            <p className="text-sm text-muted leading-relaxed">
              After a few messages, the bot politely asks recruiters for
              their email - and notifies you, with full context.
            </p>
          </div>
          {/* BYO model */}
          <div className="md:col-span-4 bg-white rounded-2xl border border-border-base p-8 shadow-soft">
            <div className="size-11 rounded-xl bg-blue-50 grid place-items-center text-brand mb-4">
              <Icon name="hub" />
            </div>
            <h3 className="font-display text-xl font-bold mb-2">
              Bring your own model
            </h3>
            <p className="text-sm text-muted leading-relaxed mb-4">
              Pick Claude, Gemini, OpenAI, or Azure - whatever you prefer.
              Your key is{" "}
              <strong className="text-ink">
                envelope-encrypted on our infra or never sent at all
              </strong>{" "}
              if you self-host. Your call, your trust level.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {["Claude", "Gemini", "OpenAI"].map((m) => (
                <span
                  key={m}
                  className="px-2 py-1 rounded-md bg-neutral-100 text-[11px] font-semibold"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
