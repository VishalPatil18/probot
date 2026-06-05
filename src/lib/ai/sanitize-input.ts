// Input sanitization for chat messages.
//
// Pipeline: normalize → length-check → pattern-scan. Returns a tagged result
// so the route can map to specific status codes. The rejection reason NEVER
// includes the raw input (defense-in-depth: server logs that echo the reason
// must not leak the user's message verbatim).

const MAX_LEN = 8000;

const ZERO_WIDTH_RE = /[​‌‍⁠﻿­]/g;

// Map Cyrillic letters that look identical to Latin letters → Latin.
// Prevents bypass like 'ignоre' (Cyrillic о).
const HOMOGLYPH_MAP: Record<string, string> = {
  "а": "a", // Cyrillic а
  "е": "e", // Cyrillic е
  "о": "o", // Cyrillic о
  "р": "p", // Cyrillic р
  "с": "c", // Cyrillic с
  "у": "y", // Cyrillic у
  "і": "i", // Cyrillic і
  "ѕ": "s", // Cyrillic ѕ
};

const BLOCKED_PATTERNS: readonly RegExp[] = [
  // Prompt-injection prefixes
  /\bignore\s+(previous|all|prior|above)\b/i,
  /\b(override|disregard|forget)\s+(your|all|the|previous)\s+(rules|instructions|prompt)/i,
  /\bfrom\s+now\s+on\b/i,
  /\breset\s+(context|conversation|chat)\b/i,
  /\bnew\s+conversation\b/i,

  // Role overrides
  /\byou\s+are\s+(now|a|an)\b.*\b(unrestricted|uncensored|jailbroken|free)\b/i,
  /\bact\s+as\b/i,
  /\bpretend\s+(to\s+be|you\s+are)\b/i,
  /\bsimulate\s+(a|an|being)\b/i,

  // Instruction / system markers
  /\[INST\]|\[\/INST\]/i,
  /<<SYS>>|<<\/SYS>>/i,
  /^---+$/m,
  /^===+$/m,

  // Jailbreak handles
  /\bDAN\b/,
  /\bdeveloper\s+mode\b/i,
  /\bgod\s+mode\b/i,
  /\bjailbreak\b/i,
  /\bno\s+restrictions?\b/i,

  // Credential / secret probes
  /\bapi[\s_-]?key\b/i,
  /\b(access|secret|auth|bearer)[\s_-]?token\b/i,
  /\bpasswords?\b/i,
  /\benv(ironment)?[\s_-]?(variables?|vars?)\b/i,
  /\bsk-[a-z0-9]/i,

  // Social engineering
  /\bI'?m\s+(the|a)\s+(developer|admin|owner|engineer|architect)\b/i,
  /\b(this|that)\s+is\s+an?\s+(emergency|urgent|test)\b/i,

  // System-prompt extraction
  /\b(show|reveal|tell|print|display|output|repeat)\s+(me\s+)?(your|the)\s+(system\s+)?(prompt|instructions|rules)\b/i,
  /\bwhat\s+(are|were)\s+your\s+(initial|original|system)\s+(prompt|instructions)\b/i,

  // Image / media generation
  /\b(dall-?e|midjourney|stable\s+diffusion)\b/i,
  /\bdata:image\//i,
  /\b(generate|create|render|make)\s+(an?\s+)?(image|picture|photo|drawing)\b/i,
  /\.(png|jpe?g|gif|webp|svg)\b/i,
];

export type SanitizeReason = "empty" | "too_long" | "blocked";

export type SanitizeResult =
  | { ok: true; message: string }
  | { ok: false; reason: SanitizeReason };

function normalize(raw: string): string {
  let s = raw.replace(ZERO_WIDTH_RE, "");

  // Fullwidth ASCII (U+FF01–U+FF5E) → ASCII (U+0021–U+007E).
  s = s.replace(/[！-～]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xfee0),
  );

  // Cyrillic homoglyph swap.
  s = s.replace(/[аеорсуіѕ]/g, (ch) =>
    HOMOGLYPH_MAP[ch] ?? ch,
  );

  // Collapse whitespace.
  s = s.replace(/\s+/g, " ").trim();

  return s;
}

export function sanitizeInput(raw: string): SanitizeResult {
  // Length check is post-normalization (a 9000-char message of zero-width
  // chars collapses to empty and is rejected as "empty", not "too_long").
  const normalized = normalize(raw);

  if (normalized.length === 0) {
    return { ok: false, reason: "empty" };
  }
  if (normalized.length > MAX_LEN) {
    return { ok: false, reason: "too_long" };
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(normalized)) {
      return { ok: false, reason: "blocked" };
    }
  }

  return { ok: true, message: normalized };
}
