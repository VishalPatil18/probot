# Architecture

ProBot is a single **Next.js 14 App Router** app - frontend pages and `/api/*`
routes co-deployed (e.g. on Vercel). There is no separate backend service.

## Stack at a glance

| Layer | Choice | Notes |
| --- | --- | --- |
| **Framework** | Next.js 14 (App Router) + TypeScript 5.6 strict | One deployment unit; API routes are serverless functions. |
| **Styling** | Tailwind CSS 3.4 + custom oklch palette, `next/font/google` (Bricolage Grotesque + Inter Tight) | No inline CSS. |
| **ORM** | Drizzle 0.36 + `drizzle-kit` migrations | Lazy `pg.Pool` singleton. |
| **Database** | PostgreSQL (Supabase free tier in production) | pgvector for RAG retrieval. |
| **Auth** | NextAuth.js 4 - Credentials + Google + GitHub + magic link, JWT session, `bcryptjs` cost 10 | Email verification on credentials login; password reset. |
| **LLM clients** | Anthropic + OpenAI + Azure OpenAI + Google Gemini adapters; per-provider circuit breaker | Common `LLMProvider.complete({…})` interface; per-request clients. |
| **BYO-key store** | IndexedDB + Web Crypto AES-256-GCM (non-extractable key), OR envelope-encrypted in DB if opted in | Sent via `x-llm-api-key` header; managed-key path decrypts in-memory only. |
| **Markdown** | `react-markdown` 9 + `remark-gfm` 4 + a `SafeLink` for `rel`/`target` | No `rehype-raw` (XSS-safe by default). |
| **Rate limit / breaker** | In-process by default; shared **Upstash Redis** when configured | Per-bot 2-tier rate limit; per-provider circuit breaker. |
| **Testing** | Vitest + `@vitejs/plugin-react` + Testing Library | `node` env for `.ts`, jsdom for `.tsx`. |
| **Hosting** | Vercel (primary); Render / Fly.io / Railway / AWS Lightsail / Docker for self-host | |

## How a chat request flows

1. A visitor sends a message to `POST /api/chat/[botId]`.
2. The route validates input (~35 prompt-injection / role-override / credential-probe patterns, Unicode-normalized), looks up the bot + owner, and applies the per-bot rate limit.
3. RAG: the relevant knowledge chunks are retrieved (pgvector) and injected into the system prompt; on failure it falls back to the bot's full assembled context.
4. The LLM is called with the BYO key (from the request header, or decrypted in-memory from managed storage), guarded by a per-provider circuit breaker.
5. Output is sanitized (leakage checks) and returned; the conversation/messages are persisted for analytics.

## Key handling

The LLM key never enters a JSON body, never gets logged, and never appears in an
error message. A canary-key test enforces this at every layer, and the CI script
`npm run check:key-leaks` fails the build if any source file logs a key-shaped
value outside the allowlist. See [BYO-KEY.md](BYO-KEY.md) and
[KEY-STORAGE.md](KEY-STORAGE.md).
