"use client";

import { type AuditResponse, formatRelative } from "./audit";

export function ManagedKeyStatusPill({ audit }: { audit: AuditResponse | null }) {
  if (!audit) {
    return (
      <span className="text-[11px] font-semibold text-muted">Loading…</span>
    );
  }
  if (!audit.stored) {
    return (
      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-muted">
        Not stored
      </span>
    );
  }
  const last = audit.lastDecryptedAt
    ? formatRelative(audit.lastDecryptedAt)
    : "never used";
  return (
    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
      Encrypted · last decrypted {last}
    </span>
  );
}
