import {
  MAX_CHARS_DEFAULT,
  PER_DAY_DEFAULT,
  PER_MINUTE_DEFAULT,
} from "@/lib/ai/rate-limit";

import { SecurityActions } from "./SecurityActions";

// Stage 7 Phase 5: Security & privacy tab. Rate-limit values come straight
// from the live rate limiter so the display reflects whatever env
// overrides the deployment uses. Export and Delete-account are now live;
// the conversation-retention row is still a display-only value (operator
// configures via env when self-hosting).

const RETENTION_DAYS = 90;

interface Props {
  username: string;
  pendingDeletion: { scheduledPurgeAt: string } | null;
}

export function SecurityTab({ username, pendingDeletion }: Props) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border-base bg-white p-6 shadow-soft">
        <h3 className="mb-1 font-bold">Rate limits</h3>
        <p className="mb-5 text-xs text-muted">
          Server-default limits. Each bot can override via its settings tab.
        </p>
        <div className="grid gap-4 text-center sm:grid-cols-3">
          <LimitCard
            value={PER_MINUTE_DEFAULT}
            suffix="/min"
            label="Per recruiter"
          />
          <LimitCard
            value={PER_DAY_DEFAULT}
            suffix="/day"
            label="Per bot"
          />
          <LimitCard
            value={`${Math.round(MAX_CHARS_DEFAULT / 1000)}k`}
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
          GDPR-aware controls. Conversation retention is configurable when
          self-hosting.
        </p>
        <div className="divide-y divide-border-base">
          <div className="flex items-center justify-between gap-4 py-3">
            <div>
              <p className="text-sm font-medium">Export my data</p>
              <p className="text-xs text-muted">
                Download a JSON of every row associated with your account
                (bots, knowledge, conversations, leads).
              </p>
            </div>
            <a
              href="/api/users/me/export"
              download
              className="btn btn-secondary !py-2 text-xs"
            >
              Export
            </a>
          </div>
          <div className="flex items-center justify-between gap-4 py-3">
            <div>
              <p className="text-sm font-medium">Conversation retention</p>
              <p className="text-xs text-muted">
                Keep {RETENTION_DAYS} days of logs (configurable when
                self-hosting).
              </p>
            </div>
            <span className="text-sm font-semibold text-muted">
              {RETENTION_DAYS} days
            </span>
          </div>
        </div>
      </section>

      <SecurityActions
        username={username}
        pendingDeletion={pendingDeletion}
      />
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
