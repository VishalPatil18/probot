import { PER_DAY, PER_MINUTE } from "@/lib/ai/rate-limit";

import { ComingSoonPill } from "../ComingSoonPill";

// Slice B - Security & privacy tab. Rate-limit values come straight
// from the live rate limiter so the display reflects whatever
// `PROBOT_RATE_PER_MINUTE` / `PROBOT_RATE_PER_DAY` env overrides the
// deployment uses, not stale hardcoded numbers. Export, retention, and
// Delete account are Coming Soon - those endpoints land in Stage 7
// alongside the broader GDPR workstream.
//
// `MESSAGE_INPUT_MAX` mirrors the Zod `.max(8000)` cap on the chat
// input field in /api/chat/[botId]. Kept as a local constant for now;
// extracting a shared limits module is a Slice C follow-up.
const MESSAGE_INPUT_MAX = 8000;

const RETENTION_DAYS = 90;

export function SecurityTab() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border-base bg-white p-6 shadow-soft">
        <h3 className="mb-1 font-bold">Rate limits</h3>
        <p className="mb-5 text-xs text-muted">
          Protect your bot (and your LLM credits) from abuse. Fully configurable
          when self-hosting.
        </p>
        <div className="grid gap-4 text-center sm:grid-cols-3">
          <LimitCard value={PER_MINUTE} suffix="/min" label="Per recruiter" />
          <LimitCard value={PER_DAY} suffix="/day" label="Per bot" />
          <LimitCard
            value={`${MESSAGE_INPUT_MAX / 1000}k`}
            suffix="/msg"
            label="Max chars"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-border-base bg-white p-6 shadow-soft">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="font-bold">Data &amp; privacy</h3>
        </div>
        <p className="mb-5 text-xs text-muted">
          GDPR-aware controls. Full export + retention configuration land
          alongside the Stage 7 compliance work.
        </p>
        <div className="divide-y divide-border-base">
          <Row
            title="Export my data"
            body="Download all conversations, leads, and knowledge base as JSON."
            action={
              <button
                type="button"
                disabled
                className="btn btn-secondary !py-2 cursor-not-allowed text-xs opacity-60"
              >
                Export
              </button>
            }
            comingSoon
          />
          <Row
            title="Conversation retention"
            body={`Keep ${RETENTION_DAYS} days of logs (configurable when self-hosting).`}
            action={
              <span className="text-sm font-semibold text-muted">
                {RETENTION_DAYS} days
              </span>
            }
            comingSoon
          />
        </div>
      </section>

      <section className="rounded-2xl border border-rose-200 bg-white p-6 shadow-soft">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="font-bold text-rose-600">Danger zone</h3>
          <ComingSoonPill />
        </div>
        <p className="mb-4 text-xs text-muted">
          Deletes your bot, knowledge base, and all data within 30 days. This
          cannot be undone.
        </p>
        <button
          type="button"
          disabled
          className="btn cursor-not-allowed border border-rose-200 !bg-rose-50 !text-rose-600 opacity-60"
        >
          Delete account
        </button>
      </section>
    </div>
  );
}

function LimitCard({
  value,
  suffix,
  label,
}: {
  value: number | string;
  suffix: string;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-border-base bg-bg-app p-4">
      <p className="font-display text-2xl font-extrabold">
        {value}
        <span className="text-sm text-muted">{suffix}</span>
      </p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  );
}

function Row({
  title,
  body,
  action,
  comingSoon = false,
}: {
  title: string;
  body: string;
  action: React.ReactNode;
  comingSoon?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="flex items-center gap-2 text-sm font-medium">
          {title}
          {comingSoon ? <ComingSoonPill /> : null}
        </p>
        <p className="text-xs text-muted">{body}</p>
      </div>
      {action}
    </div>
  );
}
