// Browser-only store for the user's OpenAI embedding API key (Stage 3 RAG).
//
// Mirrors src/lib/client/llm-key-store.ts but keyed to a separate
// localStorage slot. Independent of the chat key so the user can:
//   - use Anthropic/Google/Azure for chat + OpenAI for embeddings, or
//   - skip embeddings entirely (no key → server falls back to full-context).
// Attached to upload + chat requests via the `x-embedding-api-key` header.

const STORAGE_KEY = "probot.embedding.key.v1";

function isBrowser(): boolean {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}

export function getEmbeddingApiKey(): string | null {
  if (!isBrowser()) return null;
  const value = window.localStorage.getItem(STORAGE_KEY);
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function setEmbeddingApiKey(key: string): void {
  if (!isBrowser()) return;
  const trimmed = key.trim();
  if (trimmed.length === 0) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, trimmed);
}

export function clearEmbeddingApiKey(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}
