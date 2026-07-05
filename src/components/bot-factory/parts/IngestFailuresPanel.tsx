"use client";

import type { IngestFailure } from "../ingest-helpers";

export function IngestFailuresPanel({
  failures,
  retryingName,
  onRetry,
}: {
  failures: IngestFailure[];
  retryingName: string | null;
  onRetry: (name: string) => void;
}) {
  return (
    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <p className="text-sm font-semibold text-amber-900">
        Some files couldn&apos;t be processed
      </p>
      <p className="mt-0.5 text-xs text-amber-800">
        Your bot was created and the rest of your knowledge is saved. Retry the
        files below, or fix and re-upload them later from settings.
      </p>
      <ul className="mt-3 space-y-2">
        {failures.map((f) => (
          <li
            key={f.name}
            className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs"
          >
            <span className="min-w-0 truncate">
              <span className="font-medium">{f.name}</span>{" "}
              <span className="text-muted">· {f.error}</span>
            </span>
            <button
              type="button"
              onClick={() => onRetry(f.name)}
              disabled={retryingName !== null}
              className="shrink-0 rounded-lg border border-amber-300 px-2.5 py-1 font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
            >
              {retryingName === f.name ? "Retrying…" : "Retry"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
