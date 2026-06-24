import Link from "next/link";

type Props = {
  basePath: string;
  page: number;
  limit: number;
  total: number;
  // Other query params that need to be preserved across pagination clicks
  // (e.g. `q` for the conversations list search). Keys with empty/undefined
  // values are dropped.
  extraParams?: Record<string, string | null | undefined>;
};

// Shared pagination control for the dashboard list pages.
// URL-driven (no JS) so that prev/next is bookmarkable and browser back
// works out of the box. Renders nothing when the result fits in a single
// page - caller doesn't need to gate.
export function Pagination({
  basePath,
  page,
  limit,
  total,
  extraParams,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (totalPages <= 1) return null;

  const buildHref = (targetPage: number): string => {
    const params = new URLSearchParams();
    if (extraParams) {
      for (const [k, v] of Object.entries(extraParams)) {
        if (v !== null && v !== undefined && v !== "") {
          params.set(k, v);
        }
      }
    }
    if (targetPage !== 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return qs.length > 0 ? `${basePath}?${qs}` : basePath;
  };

  const prevPage = page > 1 ? page - 1 : null;
  const nextPage = page < totalPages ? page + 1 : null;

  return (
    <nav
      aria-label="Pagination"
      className="mt-6 flex items-center justify-between border-t border-border-base pt-4 text-sm"
    >
      <div className="text-muted">
        Page {page} of {totalPages}
      </div>
      <div className="flex items-center gap-2">
        {prevPage !== null ? (
          <Link
            href={buildHref(prevPage)}
            className="rounded-lg border border-border-base px-3 py-1.5 font-medium hover:bg-gray-50"
          >
            ← Prev
          </Link>
        ) : (
          <span className="rounded-lg border border-border-base px-3 py-1.5 font-medium text-muted opacity-50">
            ← Prev
          </span>
        )}
        {nextPage !== null ? (
          <Link
            href={buildHref(nextPage)}
            className="rounded-lg border border-border-base px-3 py-1.5 font-medium hover:bg-gray-50"
          >
            Next →
          </Link>
        ) : (
          <span className="rounded-lg border border-border-base px-3 py-1.5 font-medium text-muted opacity-50">
            Next →
          </span>
        )}
      </div>
    </nav>
  );
}
