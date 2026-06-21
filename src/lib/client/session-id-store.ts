// Browser-only per-tab session ID for the public chat surface.
//
// Stage 6 §6.1: the chat orchestrator UPSERTs a `conversations` row keyed by
// (bot_id, session_id). A recruiter is anonymous, so the session ID is a
// client-generated UUID persisted in `sessionStorage` - fresh per browser
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
  // Bind the global `crypto` to a local so TypeScript's narrowing on the
  // randomUUID early-return doesn't collapse the remaining branch to
  // `never` (the global Crypto type's flow analysis interacts poorly with
  // the `in` operator narrowing).
  const c: Crypto | undefined =
    typeof crypto !== "undefined" ? crypto : undefined;
  if (c && typeof c.randomUUID === "function") {
    return c.randomUUID();
  }
  if (!c || typeof c.getRandomValues !== "function") {
    // No crypto namespace at all - extreme legacy runtime. Bubble a
    // recognizable invalid UUID so the server's Zod check rejects with
    // a clean 400 instead of corrupting analytics with a deterministic
    // string that every such client would share.
    throw new Error("no crypto namespace available");
  }
  // Fallback for runtimes without crypto.randomUUID (very old WebView).
  // crypto.getRandomValues is universally available wherever any crypto
  // namespace exists - and crucially cryptographically random, so the
  // sessionId is not guessable. A guessable sessionId would let an
  // adversary forge another recruiter's conversation key.
  const bytes = new Uint8Array(16);
  c.getRandomValues(bytes);
  // Set version (4) and variant (10xx) bits per RFC 4122.
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
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
