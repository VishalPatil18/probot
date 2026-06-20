// Browser-only per-tab session ID for the public chat surface.
//
// Stage 6 §6.1: the chat orchestrator UPSERTs a `conversations` row keyed by
// (bot_id, session_id). A recruiter is anonymous, so the session ID is a
// client-generated UUID persisted in `sessionStorage` — fresh per browser
// tab (not per visit, so reloading a tab continues the same conversation),
// dropped on tab close. No cookie is set, so the consent surface stays in
// Stage 7 territory.

const STORAGE_KEY = "probot.chat.sessionId";

function isBrowser(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.sessionStorage !== "undefined"
  );
}

function newUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback for runtimes without crypto.randomUUID (very old WebView).
  // We use crypto.getRandomValues — universally available wherever any
  // crypto namespace exists — rather than Math.random, so the sessionId
  // is not guessable. A guessable sessionId would let an adversary forge
  // another recruiter's conversation key and pollute metrics.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // Set version (4) and variant (10xx) bits per RFC 4122.
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function getOrCreateSessionId(): string {
  if (!isBrowser()) return newUuid();
  try {
    const existing = window.sessionStorage.getItem(STORAGE_KEY);
    if (existing && existing.length > 0) return existing;
    const fresh = newUuid();
    window.sessionStorage.setItem(STORAGE_KEY, fresh);
    return fresh;
  } catch {
    // sessionStorage can throw in private-mode / quota-exceeded scenarios.
    // Falling back to a fresh UUID means conversation coalescence is lost
    // for this turn, but the chat still works.
    return newUuid();
  }
}
