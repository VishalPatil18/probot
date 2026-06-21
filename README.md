<p align="center">
  <img src="./src/app/icon.svg" alt="ProBot logo" width="80" height="80">
</p>

<h1 align="center">ProBot</h1>

<p align="center">
  <strong>Your career, answering questions while you sleep.</strong><br>
  Job seekers build an AI chatbot from their own resume and bio; recruiters chat with it at a public URL or an embedded widget. Open-source, MIT-licensed, BYO-key - your LLM API key either lives in your browser (encrypted with Web Crypto in IndexedDB) or, if you opt in to managed mode, is envelope-encrypted on our infra with a KEK that never touches the database.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-000000?logo=nextdotjs&logoColor=white" alt="Next.js 14">
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white" alt="TypeScript 5.6">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black" alt="React 18">
  <img src="https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwindcss&logoColor=white" alt="Tailwind 3.4">
  <img src="https://img.shields.io/badge/Postgres-Supabase-3ECF8E?logo=postgresql&logoColor=white" alt="Postgres on Supabase">
  <img src="https://img.shields.io/badge/Drizzle-ORM-C5F74F?logo=drizzle&logoColor=black" alt="Drizzle ORM">
  <img src="https://img.shields.io/badge/Auth-NextAuth-000000?logo=auth0&logoColor=white" alt="NextAuth">
  <img src="https://img.shields.io/badge/LLM-BYO%20Key-2563eb" alt="BYO LLM Key">
  <img src="https://img.shields.io/badge/Tests-803%2F803-brightgreen" alt="803 tests passing">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License">
</p>

---

ProBot is a multi-tenant, BYO-key chatbot platform for job seekers. You paste your resume and bio, pick an LLM provider (Anthropic, OpenAI, Azure OpenAI, Google Gemini), and paste **your own** API key. Two ways to deploy:

- **Managed (pro-bot.dev)** - Your key is encrypted with [envelope encryption](#key-storage--kek-rotation) under a KEK that lives in the deployment environment, never in the database. Decrypted in-memory per chat request, never logged.
- **Self-hosted** - Clone the repo, deploy under your own domain, leave the KEK env var unset; your key never leaves your server. See [`/self-hosting`](https://pro-bot.dev/self-hosting) for the full guide.

Recruiters chat with your bot at a public URL or via an embeddable `<script>` tag. Both deploy modes are free.

## What it does

- **Build your bot in minutes.** A 5-step bot factory: identity → knowledge (paste resume text) → personality preset → AI model + BYO key → deploy.
- **Chat with your own LLM key.** The key is held only in your browser; ProBot servers never see, log, or persist it. Each chat request rides it over the `x-llm-api-key` header straight to the provider.
- **Pick the provider you already use.** Anthropic Claude, OpenAI GPT, Google Gemini, and Azure OpenAI ship today.
- **Defense-in-depth security.** ~35 input-blocking patterns (prompt-injection / role-overrides / credential probes), 4 output-leakage checks, Unicode-normalization before pattern scan (no Cyrillic-homoglyph bypass), `react-markdown` with `rel="noopener noreferrer"` link safety, never echoing the BYO key in error messages or response bodies.
- **In-app lead capture** when a recruiter leaves their email mid-chat, the bot owner sees an in-app notification with an unread badge in the dashboard.

## Quickstart

```bash
git clone https://github.com/vishalpatil18/probot.git
cd probot

npm install
cp .env.example .env.local        # fill DATABASE_URL + NEXTAUTH_SECRET
npm run db:migrate                # apply both Drizzle migrations
npm run dev                       # http://localhost:3000
```

You need:

1. A Postgres database with `gen_random_uuid()` (Supabase or Neon free tier works; local Docker `postgres:16` also works)
2. A `NEXTAUTH_SECRET` (`openssl rand -base64 32`)
3. An LLM API key from at least one supported provider - pasted in the bot factory at chat time, never in env vars

Open <http://localhost:3000/register>, create an account, navigate to `/dashboard/bots/new`, walk through the 5 steps, then click **Preview bot** to chat.

Full walkthrough: [`claude/plan.md` Stage 1](claude/plan.md).

## Architecture

ProBot is a single Next.js 14 App Router app - frontend pages and `/api/*` routes co-deployed on Vercel. There is no separate backend service.

### Stack at a glance

| Layer             | Choice                                                                                               | Notes                                                                      |
| ----------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **Framework**     | Next.js 14 (App Router) + TypeScript 5.6 strict                                                      | One deployment unit; API routes are serverless functions.                  |
| **Styling**       | Tailwind CSS 3.4 + custom oklch palette, `next/font/google` for Bricolage Grotesque + Inter Tight    | No inline CSS.                                                             |
| **ORM**           | Drizzle 0.36 + `drizzle-kit` migrations                                                              | `pg.Pool` singleton, lazy.                                                 |
| **Database**      | PostgreSQL (Supabase free tier in production)                                                        | `users` + `bots` tables; `bots.loading_messages` is JSONB.                 |
| **Auth**          | NextAuth.js 4, Credentials + Google + GitHub + magic-link, JWT session, `bcryptjs` cost 10           | Email verification gate on credentials login; password reset.              |
| **LLM clients**   | Anthropic + OpenAI + Azure OpenAI + Google Gemini adapters; per-provider circuit breaker             | Common `LLMProvider.complete({…})` interface; per-request clients.         |
| **BYO-key store** | IndexedDB + Web Crypto AES-256-GCM (non-extractable key) - OR - envelope-encrypted in DB if opted in | Sent via `x-llm-api-key` header; managed-key path decrypts in-memory only. |
| **Markdown**      | `react-markdown` 9 + `remark-gfm` 4 + `SafeLink` for `rel/target`                                    | No `rehype-raw` (XSS-safe by default).                                     |
| **Testing**       | Vitest 2.1 + `@vitejs/plugin-react` + Testing Library; `node` env for `.ts`, jsdom for `.tsx`        | 803 specs across 87 files, all green.                                      |
| **Hosting**       | **Vercel** (primary)                                                                                 | Render / Fly.io / Railway / AWS Lightsail for self-hosters.                |
| **File storage**  | AWS S3 (Always Free tier) - Stage 2                                                                  | PDF + photo uploads via presigned URLs.                                    |
| **CDN**           | AWS CloudFront (Always Free tier) - Stage 5                                                          | Fronts S3 for the embeddable `widget.js`.                                  |

### BYO-key flow (two paths)

```
Self-hosted / creator-local path:
  Bot Factory (Step 4) ── apiKey ──► IndexedDB (AES-256-GCM with non-extractable CryptoKey)
                                              │
                                              ▼
                  ChatWindow.send() awaits getApiKey() (decrypts in browser)
                                              │
                                              ▼
       fetch("/api/chat/[botId]", { headers: { "x-llm-api-key": apiKey } })
                                              │
                                              ▼
                       /api/chat/[botId] reads the header, calls the provider
                                              │
                                              ▼
                   provider.complete({ apiKey, … })  ──HTTPS──►  Anthropic / OpenAI / Azure / Gemini

Managed (pro-bot.dev opt-in) path:
  AIModelKeyTab → POST /api/bots/[botId]/llm-key { apiKey }
                                              │
                                              ▼
              envelope-encrypt: random DEK → AES-GCM ciphertext;
              DEK wrapped under KEK from PROBOT_KEY_ENCRYPTION_KEY env
                                              │
                                              ▼
                       encrypted_llm_keys (per-bot row, KEK never in DB)
                                              │
                                              ▼
   recruiter chat with no header → /api/chat/[botId] looks up the row,
   unwraps DEK, decrypts plaintext key in-memory, calls provider,
   discards plaintext, writes decrypt_audit_log row.
```

The key never enters a JSON body, never gets logged, never appears in any error message. A canary-key test enforces this at every layer. The CI script `npm run check:key-leaks` greps every source file for `console.*` / `Sentry.*` calls that reference key-shaped property names and fails the build if any are found outside the allowlisted modules.

## Features

- **Stage 1 - shipped:** scaffolding, Drizzle schema, NextAuth email/password, multi-provider LLM clients (Anthropic + OpenAI + Azure + Gemini), bot factory, chat API with input/output sanitization + 2-tier rate limit.
- **Stage 2 - shipped:** PDF ingestion via `pdf-parse` + `tiktoken` chunking.
- **Stage 3 - shipped:** RAG via pgvector + OpenAI embeddings (optional, bot-by-bot).
- **Stage 4 - shipped:** public `/u/[username]/chat` (no-auth) + onboarding + avatars.
- **Stage 5 - shipped:** embeddable `<script>` widget + theme color.
- **Stage 6 - shipped:** dashboard, analytics, lead capture, in-app notifications.
- **Stage 7 - shipped:** OAuth lock-down + email verification + password reset (Phase 1); custom instructions + draft/publish bot flow + per-bot rate limits (Phase 2); envelope encryption + managed key path + live dashboard (Phase 3); Google Gemini live + DeepSeek removed + circuit breaker + AI fallback (Phase 4); GDPR export + 7-day delete grace + undo link + nightly purge cron (Phase 5); malware-scan hardening + IndexedDB/Web-Crypto key store (Phase 6); marketing copy + KEK rotation runbook + CI key-leak grep (Phase 7).

See [`claude/plan.md`](claude/plan.md) for the full stage-by-stage breakdown and [`claude/context.md`](claude/context.md) for the per-phase journal.

## Key storage & KEK rotation

Managed mode encrypts every stored LLM key with a fresh per-bot DEK (AES-256-GCM), then wraps the DEK with a KEK loaded from `PROBOT_KEY_ENCRYPTION_KEY` (32 bytes, base64-encoded). The KEK never touches the database; a DB dump alone cannot decrypt anything. To rotate the KEK quarterly:

1. Generate a fresh key: `openssl rand -base64 32`.
2. Deploy with both env vars set: `PROBOT_KEY_ENCRYPTION_KEY` (old) and `PROBOT_KEY_ENCRYPTION_KEY_NEXT` (new).
3. Run `npm run kek:rotate -- --dry-run` to preview, then `npm run kek:rotate` to commit. The script re-wraps every stored DEK with the new KEK; the encrypted LLM keys themselves are untouched.
4. Promote the new KEK to current (`PROBOT_KEY_ENCRYPTION_KEY = <new>`), drop `PROBOT_KEY_ENCRYPTION_KEY_NEXT`, and redeploy.

Self-host operators who don't enable managed mode leave the KEK env var unset; the dashboard's "store key on server" path 503s and users authenticate every chat from the browser's encrypted store instead.

## Documentation

- [`claude/plan.md`](claude/plan.md) - 7-stage incremental build plan
- [`claude/srs.md`](claude/srs.md) - Software Requirements Specification
- [`claude/context.md`](claude/context.md) - Append-only session history (what's been built, files touched, decisions)
- [`claude/learnings.md`](claude/learnings.md) - Topic-keyed learning journal (Drizzle, JWT, BYO-key, React list keys, prompt-injection defenses, rate-limit windows, …)
- [`CLAUDE.md`](CLAUDE.md) - Behavioral guidelines for AI-pair-programming sessions

## Roadmap (Stage 8+)

Stage 7 is complete. Open follow-ups for a future Stage 8:

- Performance NFRs (LCP < 2s, P95 chat latency < 3s, etc.) - measure + tune.
- Upstash Redis-backed rate limit + circuit breaker (replace per-process state for multi-instance correctness).
- Resend deletion email button (today, users have to log back in to undo a scheduled deletion if they lose the link).
- Real malware scan via a ClamAV sidecar (current path is a magic-byte heuristic + executable signature blocklist).
- Account deletion revokes OTHER browser sessions at init time.
- Dashboard breaker-state indicator ("your provider is currently throttled").
- One-command Docker self-host.

## Contributing

PRs welcome. Start with [CONTRIBUTING.md](./CONTRIBUTING.md), then look for [`good first issue`](https://github.com/vishalpatil18/probot/labels/good%20first%20issue).

By contributing, you agree to the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Security

Don't open public issues for vulnerabilities. See [SECURITY.md](./SECURITY.md).

## License

[MIT](./LICENSE)
