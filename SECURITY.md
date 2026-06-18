# Security Policy

## Reporting a vulnerability

Please **do not** open public GitHub issues for security problems. Public disclosure before a fix is shipped puts other users at risk.

Use one of these private channels:

1. **GitHub Security Advisories** (preferred) - <https://github.com/vishalpatil18/probot/security/advisories/new>
2. **Email** - `vishal18@umd.edu` with subject line starting `[probot security]`

Include:

- A clear description of the issue and its impact (who is affected, what data is exposed, what an attacker can do).
- Reproduction steps or a proof-of-concept. Minimal repro is fine.
- The version / commit you tested against.
- Any suggested mitigation, if you have one.

## What to expect

| Stage                         | Target window                   |
| ----------------------------- | ------------------------------- |
| Acknowledgment of receipt     | within **72 hours**             |
| Initial assessment + severity | within **7 days**               |
| Coordinated disclosure plan   | within **14 days**              |
| Fix released                  | depends on severity (see below) |

| Severity                                                     | Target fix window      |
| ------------------------------------------------------------ | ---------------------- |
| Critical (RCE, auth bypass, **BYO-key leak**, data loss)     | 7 days                 |
| High (privilege escalation, persistent XSS, info disclosure) | 30 days                |
| Medium (CSRF, reflected XSS, weak crypto)                    | 60 days                |
| Low (informational, minor leakage)                           | next scheduled release |

We coordinate public disclosure with you. Credit goes in the advisory and release notes unless you ask to remain anonymous.

## ProBot-specific threat model

The single most important invariant in this codebase is the **BYO-key non-leak guarantee**:

> The user's LLM API key is held only in the browser's `localStorage`, transported only via the `x-llm-api-key` header, forwarded only to the user's chosen provider, and **never** logged, persisted, echoed in error messages, or written to any response body.

If you find a way to violate any clause of that sentence - for example, a code path where the key value ends up in a server log, in a `ProviderError.message`, in a `JSON.stringify(err)` output, in a Sentry breadcrumb, or in any HTTP response body other than directly to Anthropic/OpenAI/Azure - **that is a Critical severity issue.** Report it. There are canary-key tests at multiple layers (`anthropic.test.ts`, `openai.test.ts`, `azure.test.ts`, the chat-route test, the BotFactoryForm test, the ChatWindow test) - if you find a path they don't cover, that's a gap worth reporting.

Other ProBot-relevant areas where we welcome reports:

- **Prompt-injection bypass.** If you can get past the ~35 input-blocking regexes (Unicode-homoglyph trick, novel jailbreak phrasing, etc.) in `src/lib/ai/sanitize-input.ts`, we want to know.
- **Output-leakage bypass.** If you can get the bot to reveal its system prompt or context-object structure despite `src/lib/ai/sanitize-output.ts`, report it.
- **XSS via markdown.** We use `react-markdown` without `rehype-raw`, plus a `SafeLink` component that forces `rel="noopener noreferrer" target="_blank"`. If you find a way to render an active `<script>`, `<img onerror=…>`, or a non-Safe link, report it.
- **Rate-limit evasion** - bypassing the per-bot 2-tier limiter (`src/lib/ai/rate-limit.ts`) in a way that lets a single bot owner's credits get drained faster than intended.
- **Auth-route abuse** - registration enumeration (e.g. timing attacks that distinguish "username taken" from "email taken"), session hijacking, NextAuth callback manipulation.

## Out of scope

The following are **not** vulnerabilities for this project:

- Anything requiring physical access to the user's machine. (The BYO-key model accepts that anyone with read access to the user's `localStorage` can see the key - that's a fundamental tradeoff of "the key never leaves your device.")
- Anything in Supabase, Next.js, NextAuth, react-markdown, or other upstream dependencies - please report those to the upstream maintainers.
- Self-XSS that requires the user to paste attacker-controlled JavaScript into their own browser console.
- Missing security headers on `localhost` dev builds.
- Rate-limiting in the local dev configuration (the in-memory `Map` is per-process and resets on restart - that is intentional for Stage 1; Stage 7 replaces it with Upstash Redis).
- An LLM provider returning unsafe content despite our sanitization, where the failure is on the provider side (e.g. Azure OpenAI hallucinating a credential). Report content-safety incidents to the LLM provider; we'll layer additional defenses in `sanitize-output.ts` if a pattern emerges.

If you're unsure whether something qualifies, send it anyway - we'd rather sort it out together than miss a real issue.

## Supported versions

| Version                         | Supported           |
| ------------------------------- | ------------------- |
| `main` branch (latest)          | Yes                 |
| Tagged releases ≥ current minor | Yes                 |
| Anything older                  | No - please upgrade |

Stage 1 is pre-1.0; supported versions will tighten once we cut a v1.0.0 release at the end of Stage 7.

## Cryptographic and credential hygiene

If you find a leaked secret in the repo history (API key, password, `NEXTAUTH_SECRET`, database URL, etc.), please report it the same way. We rotate immediately and rewrite history if needed.

The `.env.example` is committed and intentionally empty. The `.env.local` and `.env` files are gitignored - if you ever see a `.env` file with real credentials in a public commit, that's a Critical issue.
