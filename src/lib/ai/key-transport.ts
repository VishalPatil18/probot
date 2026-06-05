const HEADER_NAME = "x-llm-api-key";
const MIN_LEN = 8;
const MAX_LEN = 256;

export type KeyTransportErrorReason =
  | "missing"
  | "empty"
  | "too_short"
  | "too_long";

export class KeyTransportError extends Error {
  readonly reason: KeyTransportErrorReason;

  constructor(reason: KeyTransportErrorReason, message: string) {
    super(message);
    this.name = "KeyTransportError";
    this.reason = reason;
  }
}

export function readApiKey(headers: Headers): string {
  const raw = headers.get(HEADER_NAME);
  if (raw === null) {
    throw new KeyTransportError("missing", `Missing ${HEADER_NAME} header`);
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw new KeyTransportError("empty", `${HEADER_NAME} header is empty`);
  }
  if (trimmed.length < MIN_LEN) {
    throw new KeyTransportError(
      "too_short",
      `${HEADER_NAME} header is shorter than ${MIN_LEN} characters`,
    );
  }
  if (trimmed.length > MAX_LEN) {
    throw new KeyTransportError(
      "too_long",
      `${HEADER_NAME} header exceeds ${MAX_LEN} characters`,
    );
  }
  return trimmed;
}

export function redactKey(key: string): string {
  if (key.length <= 8) return "***";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}
