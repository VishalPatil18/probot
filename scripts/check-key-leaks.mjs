#!/usr/bin/env node
// Stage 7 Phase 7: CI key-leak grep guard.
//
// Greps every file under src/ for patterns that mean "the LLM API key
// might be flowing into a logger or response body." Anything matched is
// a build break.
//
// The fix when this fires is one of:
//   - Pass the offending value through src/lib/server/redact.ts first.
//   - Or restructure the log line so it doesn't reach the value at all.
//
// Allowed locations (these files actually need to handle the key on
// purpose - they're allow-listed so they don't trip the guard):
//   - src/lib/ai/key-transport.ts          (reads the header)
//   - src/lib/crypto/envelope.ts           (decrypt path)
//   - src/lib/client/llm-key-store.ts      (browser store)
//   - src/lib/client/embedding-key-store.ts (browser store)
//   - src/lib/client/secure-key-store.ts   (browser primitive)
//   - src/lib/server/redact.ts             (defines the header names)
//   - src/app/api/bots/[botId]/llm-key/route.ts (managed-key writer)
//   - src/components/bot-factory/BotFactoryForm.tsx (collects key)
//   - src/components/dashboard/settings/AIModelKeyTab.tsx (manages key)
//   - src/components/chat/ChatWindow.tsx (sends header)
//
// All test files (`*.test.ts`, `*.test.tsx`) are allow-listed too -
// they intentionally use literal canary strings to assert that the key
// is NOT echoed.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("../src", import.meta.url).pathname;

// Files that legitimately reference these patterns. Paths are relative
// to src/.
const ALLOWLIST = new Set([
  "lib/ai/key-transport.ts",
  "lib/crypto/envelope.ts",
  "lib/crypto/constants.ts",
  "lib/client/llm-key-store.ts",
  "lib/client/embedding-key-store.ts",
  "lib/client/secure-key-store.ts",
  "lib/server/redact.ts",
  "app/api/bots/[botId]/llm-key/route.ts",
  "app/api/bots/[botId]/llm-key/audit/route.ts",
  "app/api/chat/[botId]/route.ts",
  "components/bot-factory/BotFactoryForm.tsx",
  "components/dashboard/settings/AIModelKeyTab.tsx",
  "components/chat/ChatWindow.tsx",
]);

// Patterns we treat as "uh oh." A console.* / logger.* / Sentry call
// that takes an apiKey-named property OR an x-llm-api-key header value
// is the failure shape.
const CONSOLE_LOG_RE = /\b(?:console\.(?:log|warn|error|info|debug)|Sentry\.)\s*\(/;
const LEAK_TOKEN_RE =
  /(?:x-llm-api-key|x-embedding-api-key|x-llm-azure-endpoint|apiKey|api_key|embeddingApiKey)/i;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      out.push(...walk(full));
    } else if (
      stats.isFile() &&
      (full.endsWith(".ts") || full.endsWith(".tsx"))
    ) {
      out.push(full);
    }
  }
  return out;
}

function isTestFile(rel) {
  return (
    rel.endsWith(".test.ts") ||
    rel.endsWith(".test.tsx") ||
    rel.endsWith(".spec.ts") ||
    rel.endsWith(".spec.tsx") ||
    rel.includes("/test/")
  );
}

function findViolations(path, source) {
  const violations = [];
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!CONSOLE_LOG_RE.test(line)) continue;

    // Multi-line log call - peek at the next few lines until we find
    // the closing `)`. Bounded at 10 lines so we don't loop on a stray
    // unbalanced paren.
    const startLine = i;
    const endLine = Math.min(startLine + 10, lines.length);
    const window = lines.slice(startLine, endLine).join("\n");

    if (LEAK_TOKEN_RE.test(window)) {
      violations.push({
        line: startLine + 1,
        snippet: window.split("\n").slice(0, 3).join(" / ").slice(0, 160),
      });
    }
  }
  return violations;
}

let totalViolations = 0;
const files = walk(ROOT);

for (const full of files) {
  const rel = relative(ROOT, full);
  if (ALLOWLIST.has(rel) || isTestFile(rel)) continue;
  const source = readFileSync(full, "utf8");
  const violations = findViolations(full, source);
  for (const v of violations) {
    console.error(
      `[key-leak] ${rel}:${v.line}  ← ${v.snippet}`,
    );
    totalViolations += 1;
  }
}

if (totalViolations > 0) {
  console.error("");
  console.error(
    `❌ Found ${totalViolations} potential key-leak${
      totalViolations === 1 ? "" : "s"
    } in logger calls.`,
  );
  console.error(
    "Route the offending value through src/lib/server/redact.ts (redactSensitive)",
  );
  console.error(
    "or restructure the log so it doesn't reference key-shaped properties.",
  );
  process.exit(1);
}

console.log(
  `✅ No key-leak patterns found in ${files.length} source files (allowlist: ${ALLOWLIST.size}).`,
);
