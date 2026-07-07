import { DataActions } from "./DataActions";
import { SecurityActions } from "./SecurityActions";

// Security & privacy tab. Rate-limit values come straight
// from the live rate limiter so the display reflects whatever env
// overrides the deployment uses. Export supports per-type slicing (bots /
// knowledge / conversations / leads / all) via the `?scope=` query param
// on /api/users/me/export. Delete-all-data (irreversible wipe of every
// bot + notifications, keeps the account) sits beside export as a
// user-controlled reset. Full account deletion is a separate flow with a
// 7-day grace window.

interface Props {
  username: string;
  pendingDeletion: { scheduledPurgeAt: string } | null;
}

interface ExportChoice {
  scope: "bots" | "knowledge" | "conversations" | "leads" | "all";
  label: string;
  description: string;
}

const EXPORTS: ExportChoice[] = [
  {
    scope: "bots",
    label: "Bots",
    description: "Bot config: name, persona, theme, custom instructions.",
  },
  {
    scope: "knowledge",
    label: "Knowledge",
    description: "Every knowledge base chunk grouped by bot.",
  },
  {
    scope: "conversations",
    label: "Conversations",
    description: "Full conversation transcripts (users + assistant turns).",
  },
  {
    scope: "leads",
    label: "Leads",
    description: "Every recruiter lead captured across all bots.",
  },
];

export function SecurityTab({ username, pendingDeletion }: Props) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border-base bg-white p-6 shadow-soft">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="font-bold">Data &amp; privacy</h3>
        </div>
        <p className="mb-5 text-xs text-muted">
          GDPR-aware controls. Conversation retention is configurable when
          self-hosting.
        </p>
        <div className="divide-y divide-border-base">
          <div className="py-3">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Export my data</p>
                <p className="text-xs text-muted">
                  Download a JSON of a single category, or the whole account.
                </p>
              </div>
              <a
                href="/api/users/me/export?scope=all"
                download
                className="btn btn-primary !py-2 text-xs"
              >
                Export all
              </a>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {EXPORTS.map((choice) => (
                <div
                  key={choice.scope}
                  className="flex items-start justify-between gap-3 rounded-xl border border-border-base bg-bg-app p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{choice.label}</p>
                    <p className="text-[11px] text-muted">
                      {choice.description}
                    </p>
                  </div>
                  <a
                    href={`/api/users/me/export?scope=${choice.scope}`}
                    download
                    className="shrink-0 rounded-lg border border-border-base bg-white px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-neutral-50"
                  >
                    Export
                  </a>
                </div>
              ))}
            </div>
          </div>

          <DataActions username={username} />

          <div className="flex items-center justify-between gap-4 py-3">
            <div>
              <p className="text-sm font-medium">Conversation retention</p>
              <p className="text-xs text-muted">
                Conversations and leads are kept until you delete the bot or
                your account - there&apos;s no automatic time-based purge today.
                Deleting your account removes everything after the 7-day grace
                window.
              </p>
            </div>
          </div>
        </div>
      </section>

      <SecurityActions username={username} pendingDeletion={pendingDeletion} />
    </div>
  );
}
