// Defence-in-depth helper that removes any header or property that could
// carry a user-supplied LLM API key before the value reaches a logger,
// Sentry breadcrumb, or error response. The chat route already only logs
// shapes that don't include `apiKey`, but operators reaching for
// `console.log(request.headers)` during incident debugging shouldn't be
// able to accidentally leak a key.
//
// Usage:
//   import { redactSensitive } from "@/lib/server/redact";
//   console.warn("[chat] something happened", redactSensitive({ headers, err }));
//
// The Stage 7 Phase 7 CI guard greps for raw `x-llm-api-key` substrings in
// logger calls; this helper is the codified opposite of that grep.

const REDACTED_HEADER_NAMES: ReadonlySet<string> = new Set([
  "x-llm-api-key",
  "x-llm-azure-endpoint",
  "x-llm-azure-api-version",
  "x-embedding-api-key",
  "x-preview-token",
  "authorization",
  "cookie",
]);

const REDACTED_PROPERTY_NAMES: ReadonlySet<string> = new Set([
  "apiKey",
  "api_key",
  "apikey",
  "authorization",
  "cookie",
  "password",
  "secret",
  "token",
  "kek",
  "dek",
]);

const REDACTION_PLACEHOLDER = "[REDACTED]";

export function redactSensitive(value: unknown): unknown {
  return redact(value, new WeakSet());
}

function redact(value: unknown, seen: WeakSet<object>): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;
  if (value instanceof Headers) return redactHeaders(value);
  if (Array.isArray(value)) {
    return value.map((item) => redact(item, seen));
  }
  if (seen.has(value)) return "[Circular]";
  seen.add(value);

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    if (REDACTED_PROPERTY_NAMES.has(k.toLowerCase())) {
      out[k] = REDACTION_PLACEHOLDER;
    } else {
      out[k] = redact(v, seen);
    }
  }
  return out;
}

function redactHeaders(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key] = REDACTED_HEADER_NAMES.has(key.toLowerCase())
      ? REDACTION_PLACEHOLDER
      : value;
  });
  return out;
}
