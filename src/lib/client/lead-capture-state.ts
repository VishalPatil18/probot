// Browser-only persistence for the in-chat lead-capture card state.
//
// The card appears after the 3rd assistant reply, exactly
// once per conversation. To survive a page reload mid-conversation
// without re-prompting the recruiter (annoying) or hiding the card on
// resume (worse), we persist the lifecycle status in `sessionStorage`
// keyed by `(botId, sessionId)`.
//
// Statuses form a state machine:
//   pending  → not yet shown
//   shown    → card has appeared at least once
//   captured → email submitted successfully
//   dismissed → recruiter clicked Skip (no re-show in this conversation)
//
// Once captured or dismissed, ChatWindow never renders the card again
// for this (botId, sessionId) pair.

const KEY_PREFIX = "probot.lead.v1";

export type LeadCaptureStatus =
  | "pending"
  | "shown"
  | "captured"
  | "dismissed";

function isBrowser(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.sessionStorage !== "undefined"
  );
}

function storageKey(botId: string, sessionId: string): string {
  return `${KEY_PREFIX}:${botId}:${sessionId}`;
}

const VALID: ReadonlyArray<LeadCaptureStatus> = [
  "pending",
  "shown",
  "captured",
  "dismissed",
];

function isStatus(value: string | null): value is LeadCaptureStatus {
  return value !== null && (VALID as ReadonlyArray<string>).includes(value);
}

export function readLeadCaptureState(
  botId: string,
  sessionId: string,
): LeadCaptureStatus {
  if (!isBrowser()) return "pending";
  try {
    const raw = window.sessionStorage.getItem(storageKey(botId, sessionId));
    return isStatus(raw) ? raw : "pending";
  } catch {
    return "pending";
  }
}

export function writeLeadCaptureState(
  botId: string,
  sessionId: string,
  status: LeadCaptureStatus,
): void {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.setItem(storageKey(botId, sessionId), status);
  } catch {
    // sessionStorage can throw in private mode / quota exceeded; the
    // worst outcome is a re-prompt on the next render, which is the
    // benign baseline behavior.
  }
}
