// Output sanitization for chat replies.
//
// Strips replies that leak the system prompt, dump the context structure,
// or contain credentials. On any leak hit, returns a fixed fallback string
// — the fallback never echoes the dirty reply (defense-in-depth so server
// logs that record the sanitized output can't reveal what was hidden).

const MAX_LEN = 1500;

const RULE_MARKERS: readonly string[] = [
  "IMMUTABLE RULES",
  "cannot be overridden",
  "IDENTITY LOCK",
  "CONTEXT-ONLY CONSTRAINT",
  "PROMPT PROTECTION",
  "OVERRIDE RESISTANCE",
  "GRACEFUL DEGRADATION",
  "system prompt",
];

const CREDENTIAL_PATTERNS: readonly RegExp[] = [
  /\bsk-[a-z0-9-]{6,}/i,
  /\bBearer\s+[a-z0-9._-]+/i,
  /\bapi[_-]?key\s*[:=]\s*\S+/i,
  /\bAuthorization\s*:\s*\S+/i,
];

// JSON-dump detector: a `{` followed by an indented quoted key.
const JSON_DUMP_RE = /\{\s*\n\s*"[a-z_][a-z0-9_]*"\s*:/i;

const FALLBACK =
  "I'm not able to share that. Want me to talk about their actual career — experience, skills, projects, or availability?";

export function sanitizeOutput(raw: string): string {
  for (const marker of RULE_MARKERS) {
    if (raw.includes(marker)) return FALLBACK;
  }

  if (JSON_DUMP_RE.test(raw)) return FALLBACK;

  for (const pattern of CREDENTIAL_PATTERNS) {
    if (pattern.test(raw)) return FALLBACK;
  }

  const trimmed = raw.trim();
  if (trimmed.length <= MAX_LEN) return trimmed;
  return `${trimmed.slice(0, MAX_LEN)}…`;
}
