export interface AuditResponse {
  stored: boolean;
  provider: string | null;
  lastDecryptedAt: string | null;
  entries: Array<{ decryptedAt: string; ipHashSuffix: string | null }>;
}

export function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toISOString().replace("T", " ").slice(0, 19) + " UTC";
  } catch {
    return iso;
  }
}

export function formatRelative(iso: string): string {
  try {
    const then = new Date(iso).getTime();
    const diffSec = Math.floor((Date.now() - then) / 1000);
    if (diffSec < 60) return "moments ago";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
    if (diffSec < 86_400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86_400)}d ago`;
  } catch {
    return "recently";
  }
}
