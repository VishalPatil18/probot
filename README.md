<p align="center">
  <img src="./src/app/icon.svg" alt="ProBot logo" width="80" height="80">
</p>

<h1 align="center">ProBot</h1>

<p align="center">
  <strong>Your career, answering questions while you sleep.</strong><br>
  Job seekers build an AI chatbot from their own resume and bio; recruiters chat with it at a public URL or an embedded widget. Open-source, MIT-licensed, BYO-key - your LLM API key never leaves your browser.
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
  <img src="https://img.shields.io/badge/Tests-260%2F260-brightgreen" alt="260 tests passing">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License">
</p>

---

ProBot is a multi-tenant, BYO-key chatbot platform for job seekers. You paste your resume and bio, pick an LLM provider (Anthropic, OpenAI, Azure OpenAI, Google), and paste **your own** API key. ProBot stores the key only in your browser's `localStorage` and forwards it on each chat request - never persisted server-side. Recruiters chat with your bot at a public URL or via an embeddable `<script>` tag. The hosted version is free; you can also self-host on any platform.

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

| Layer             | Choice                                                                                                   | Notes                                                              |
| ----------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **Framework**     | Next.js 14 (App Router) + TypeScript 5.6 strict                                                          | One deployment unit; API routes are serverless functions.          |
| **Styling**       | Tailwind CSS 3.4 + custom oklch palette, `next/font/google` for Bricolage Grotesque + Inter Tight        | No inline CSS.                                                     |
| **ORM**           | Drizzle 0.36 + `drizzle-kit` migrations                                                                  | `pg.Pool` singleton, lazy.                                         |
| **Database**      | PostgreSQL (Supabase free tier in production)                                                            | `users` + `bots` tables; `bots.loading_messages` is JSONB.         |
| **Auth**          | NextAuth.js 4, Credentials provider, JWT session strategy, `bcryptjs` cost 10                            | OAuth deferred to Stage 7.                                         |
| **LLM clients**   | Anthropic + OpenAI + Azure OpenAI adapters; Google as registered stub                                    | Common `LLMProvider.complete({…})` interface; per-request clients. |
| **BYO-key store** | `localStorage` (`probot.llm.key.v1`, `probot.llm.azure.v1`); sent via `x-llm-api-key` header per request | Never in JSON body; never persisted server-side.                   |
| **Markdown**      | `react-markdown` 9 + `remark-gfm` 4 + `SafeLink` for `rel/target`                                        | No `rehype-raw` (XSS-safe by default).                             |
| **Testing**       | Vitest 2.1 + `@vitejs/plugin-react` + Testing Library; `node` env for `.ts`, jsdom for `.tsx`            | 260 specs across 24 files, all green.                              |
| **Hosting**       | **Vercel** (primary)                                                                                     | Render / Fly.io / Railway / AWS Lightsail for self-hosters.        |
| **File storage**  | AWS S3 (Always Free tier) - Stage 2                                                                      | PDF + photo uploads via presigned URLs.                            |
| **CDN**           | AWS CloudFront (Always Free tier) - Stage 5                                                              | Fronts S3 for the embeddable `widget.js`.                          |

### BYO-key flow

```
Bot Factory (Step 4) ── apiKey ──► browser localStorage (probot.llm.key.v1)
                                            │
                            ┌───────────────┘
                            ▼
        ChatWindow.send() reads getApiKey()
                            │
                            ▼
   fetch("/api/chat/[botId]", { headers: { "x-llm-api-key": apiKey } })
                            │
                            ▼
        /api/chat/[botId] reads readApiKey(req.headers)
                            │
                            ▼
   provider.complete({ apiKey, … })  ──HTTPS──►  Anthropic / OpenAI / Azure
```

The key never enters a JSON body, never gets logged, never lands in any database row, never appears in any error message. A canary-key test enforces this at the route AND at the provider layer.

## Features

- **Stage 1 - shipped:** scaffolding · Drizzle schema + migrations · NextAuth email/password · login/register UI · multi-provider LLM clients (Anthropic + OpenAI + Azure) with `ProviderError` taxonomy · BYO key transport · browser key store · bot factory · `POST /api/bots` upsert · chat UI with markdown · `POST /api/chat/[botId]` with input/output sanitization + 2-tier rate limit
- **Stage 2 - planned:** PDF/URL ingestion via AWS S3 + `pdf-parse` + `cheerio` + `tiktoken` chunking
- **Stage 3 - planned:** RAG / vector search via Pinecone or pgvector
- **Stage 4 - planned:** public `/u/[username]/chat` (no-auth) + conversation logging
- **Stage 5 - planned:** embeddable `<script>` widget on CloudFront
- **Stage 6 - planned:** dashboard + analytics + lead capture + **in-app notifications**
- **Stage 7 - planned:** OAuth + email verification + landing page + GDPR + Docker self-host + Sentry

See [`claude/plan.md`](claude/plan.md) for the full stage-by-stage breakdown.

## Documentation

- [`claude/plan.md`](claude/plan.md) - 7-stage incremental build plan
- [`claude/srs.md`](claude/srs.md) - Software Requirements Specification
- [`claude/context.md`](claude/context.md) - Append-only session history (what's been built, files touched, decisions)
- [`claude/learnings.md`](claude/learnings.md) - Topic-keyed learning journal (Drizzle, JWT, BYO-key, React list keys, prompt-injection defenses, rate-limit windows, …)
- [`CLAUDE.md`](CLAUDE.md) - Behavioral guidelines for AI-pair-programming sessions

## Roadmap

Snapshot of upcoming work:

- PDF + URL knowledge ingestion (S3 + chunking)
- RAG with vector search
- Public chat URLs + conversation logging
- Embeddable widget on CloudFront
- Lead-capture dashboard + in-app notifications
- OAuth (Google / GitHub / LinkedIn), email verification, password reset
- Redis-backed rate limiting (Upstash)
- GDPR data-export + account-deletion
- One-command Docker self-host

## Contributing

PRs welcome. Start with [CONTRIBUTING.md](./CONTRIBUTING.md), then look for [`good first issue`](https://github.com/vishalpatil18/probot/labels/good%20first%20issue).

By contributing, you agree to the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Security

Don't open public issues for vulnerabilities. See [SECURITY.md](./SECURITY.md).

## License

[MIT](./LICENSE)
