// Browser-only store for the user's LLM API key.
//
// The key is persisted under a single per-origin localStorage entry and
// attached to chat requests via the `x-llm-api-key` header. It is never
// sent in JSON bodies (so accidental request-body logging cannot leak it)
// and never round-tripped through any ProBot API endpoint.

const STORAGE_KEY = "probot.llm.key.v1";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getApiKey(): string | null {
  if (!isBrowser()) return null;
  const value = window.localStorage.getItem(STORAGE_KEY);
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function setApiKey(key: string): void {
  if (!isBrowser()) return;
  const trimmed = key.trim();
  if (trimmed.length === 0) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, trimmed);
}

export function clearApiKey(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}
