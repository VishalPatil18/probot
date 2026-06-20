import Link from "next/link";

import type { UserLeadRow } from "@/lib/leads/queries";

import { EmptyState } from "./EmptyState";

type Props = {
  leads: UserLeadRow[];
};

// Company signal pill — derives a human-readable company name from the
// recruiter's email domain. Strips common public providers so a personal
// gmail doesn't render as "Gmail" (it stays unlabeled).
const PUBLIC_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "yahoo.com",
  "icloud.com",
  "proton.me",
  "protonmail.com",
]);

function companyFromEmail(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at === -1) return null;
  const domain = email.slice(at + 1).toLowerCase();
  if (PUBLIC_DOMAINS.has(domain)) return null;
  // Use the second-to-last segment as the registrable name when the
  // domain has 3+ parts (so `mail.stripe.com` → "Stripe", not "Mail").
  // For two-part domains (`stripe.com`) the first segment IS the name.
  // This heuristic misses public-suffix-list edge cases like `.co.uk`
  // but is good enough for a decorative pill.
  const parts = domain.split(".");
  if (parts.length === 0) return null;
  const base =
    parts.length >= 3
      ? parts[parts.length - 2] ?? ""
      : parts[0] ?? "";
  if (base.length === 0) return null;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

function relTime(d: Date): string {
  const diffMs = Date.now() - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "Just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "Yesterday";
  if (day < 30) return `${day} days ago`;
  return d.toLocaleDateString();
}

export function RecentLeadsTable({ leads }: Props) {
  return (
    <div
      id="leads"
      className="mt-6 overflow-hidden rounded-2xl border border-border-base bg-white shadow-soft"
    >
      <div className="flex items-center justify-between p-6 pb-4">
        <div>
          <h3 className="font-bold">Recent leads</h3>
          <p className="text-xs text-muted">Recruiters who left their email</p>
        </div>
        {leads.length > 0 && leads[0] ? (
          <Link
            href={`/dashboard/bots/${leads[0].botId}/leads`}
            className="btn btn-secondary !py-2 !px-3 text-xs"
          >
            View all
          </Link>
        ) : null}
      </div>
      {leads.length === 0 ? (
        <div className="px-6 pb-6">
          <EmptyState
            title="No leads captured yet."
            body="When recruiters share their email during a chat, your bot captures it here."
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-border-base bg-neutral-50/50 text-left text-[11px] font-bold uppercase tracking-wider text-muted">
                <th className="px-6 py-2.5 font-bold">Email</th>
                <th className="px-6 py-2.5 font-bold">Asked about</th>
                <th className="hidden px-6 py-2.5 font-bold sm:table-cell">
                  Company signal
                </th>
                <th className="px-6 py-2.5 font-bold">When</th>
                <th className="px-6 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border-base">
              {leads.map((lead) => {
                const company = companyFromEmail(lead.email);
                return (
                  <tr key={lead.id} className="hover:bg-neutral-50/50">
                    <td className="truncate px-6 py-3 font-medium">
                      {lead.email}
                    </td>
                    <td className="px-6 py-3 text-muted">
                      {lead.contextSummary ?? "—"}
                    </td>
                    <td className="hidden px-6 py-3 sm:table-cell">
                      {company ? (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-brand">
                          {company}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-6 py-3 text-xs text-muted">
                      {relTime(lead.capturedAt)}
                    </td>
                    <td className="px-6 py-3 text-right">
                      {lead.conversationId ? (
                        <Link
                          href={`/dashboard/bots/${lead.botId}/conversations/${lead.conversationId}`}
                          className="text-xs font-semibold text-brand hover:underline"
                        >
                          View chat
                        </Link>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
