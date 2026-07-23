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
  }
}
