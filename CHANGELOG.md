# Changelog

All notable changes to **ProBot** are documented in this file.

---

## 2026-07-06 - `probot-self-hosted` npm package (self-hosting rewrite)

- **Self-hosted bots are now an npm package**, not a runtime to clone. The new [`probot-self-hosted`](packages/probot-self-hosted) package ships a React `<ProbotBot />` component, a headless `useProbotChat` hook, a vanilla-JS IIFE build for plain HTML pages, an `openai` server-side chat adapter, and a `dashboard` analytics adapter. Developers install it in their existing web app; persona, knowledge, provider, and theme are all configured in code; the LLM key never touches pro-bot.dev.
- **Bot Factory is now managed-only.** Removed the "Managed / Self-hosted" runtime picker from Step 4 and every `deploymentMode === 'self_hosted'` branch. Self-hosted bots are created through a new **Register self-hosted bot** flow (`/dashboard/bots/new-self-hosted` + `POST /api/bots/self-hosted`) - a minimal name + optional headline form that creates the analytics entry and mints an initial token in one step.
- **Deployment mode is decided at creation, not switchable.** Deleted the `PATCH /api/bots/[botId]/deployment` endpoint and the mode toggle in Settings → Deployment. The tab now branches on the persisted mode: managed bots see a read-only "Served by pro-bot.dev" card; self-hosted bots see the npm install snippet + tokens (mint / list / revoke).
- **Self-hosted bots have a trimmed dashboard.** The settings page now hides Bot Configuration, Knowledge, and AI Model & Key for `self_hosted` bots - Deployment, Account, and Security & Privacy are the only interactive tabs, keeping the dashboard consistent with the "config lives in your app" contract.
- **Sidebar bot switcher** now lists all bots (managed + self-hosted, with a self-hosted pill badge) above workspace, plus a new active "+ Register self-hosted bot" link alongside the existing (Coming Soon) "Create New Bot".
- **Deleted `/api/v1/bot/config` + `/api/v1/bot/knowledge`** cleanly - the npm package holds config and knowledge in code, so those endpoints have no consumer. `/api/v1/bot/conversations` and `/api/v1/bot/leads` remain, unchanged, for analytics.
- **Deleted the `probot-bot/` runtime scaffold** and its `tsconfig` exclusion. Existing `pbt_…` tokens keep working - the platform still trusts them for the two analytics endpoints - but the "clone this repo" instructions in the docs are gone.
- **Docs overhaul for self-hosting.** Rewrote `docs/self-hosted-bot/index.mdx` around the npm install path; added `nextjs.mdx`, `react.mdx`, `vanilla.mdx`, `dashboard-integration.mdx`, `troubleshooting.mdx`; trimmed the api-reference to only the two analytics endpoints; updated `docs.json` nav. Swept every remaining "clone `probot-bot`" mention across `features`, `quickstart`, `faq`, `hosting/managed`, `guides/{deployment,bot-management,models-and-keys,embed-styling}`, `concepts/{managed-vs-self-hosted,byo-key}`, `blogs/welcome`, `release-notes/v1`, and the marketing `/self-hosting` + `about` pages + `README.md` + `BYO-KEY.md`.
- **Breaking change note.** Any deployment still running the old cloned `probot-bot` runtime will lose `/api/v1/bot/config` + `/api/v1/bot/knowledge`. Migration path in `docs/self-hosted-bot/troubleshooting.mdx`.

## 2026-06-24 - Self-host scope, privacy copy & 404 page

- **Self-hosting scoped to the chatbot only.** Removed the "self-host the whole platform/website" story across docs and marketing; self-hosting now consistently means running the tiny `probot-bot` runtime on your own domain while the managed platform keeps the dashboard, knowledge, and leads. Deleted the full-platform deploy guide (`docs/guides/self-host.mdx`) and its nav entry; rewrote `docs/hosting/self-hosting.mdx`, `docs/concepts/managed-vs-self-hosted.mdx`, and the marketing `/self-hosting` page; reframed copy on the About, Why-ProBot, landing, and several docs pages.
- **Removed recruiter-IP mentions** from user-facing docs, the dashboard decrypt-audit copy, and the video tutorial script - kept the positive "conversations are logged anonymously" framing. (IP-hashing behavior is unchanged; only the wording was removed.)
- **Animated 404 page** (`src/app/not-found.tsx`) - a floating chatbot illustration with blinking eyes, pulsing halo rings, and typing dots (reusing the shared `il-*` animation classes, `prefers-reduced-motion`-safe), the not-found message, and a "Return to homepage" button. Added a `home` glyph to the inline `Icon` set.

## 2026-06-24 - OSS packaging, docs & polish

- **`probot-chatbot` npm package** - the embeddable widget is now a publishable package (`packages/probot-chatbot`) reusing the platform's widget source; install via `npm install probot-chatbot` or a one-line unpkg `<script>`.
- **Open source, front and center** - "free & open source (MIT)" called out on the landing page, footer, and docs.
- **README slimmed down** - minimal README linking the website + docs, with details split into [QUICKSTART.md](QUICKSTART.md), [ARCHITECTURE.md](ARCHITECTURE.md), [BYO-KEY.md](BYO-KEY.md), [KEY-STORAGE.md](KEY-STORAGE.md); roadmap section removed; Spec-Driven Development noted.
- **Justified body text** app-wide via a single base-layer rule.
- **Removed internal "Stage N" labels** from the website, docs, and source comments.
- **Contributor guardrails** - [`.github/CODEOWNERS`](.github/CODEOWNERS) + a step-by-step [branch-protection guide](GITHUB-BRANCH-PROTECTION.md) for `main`/`dev`.

## v0.1.0 - 2026-06-18 - First pre-release

The first pre-release of ProBot. The end-to-end core loop works: register → log in → build a bot
(paste résumé text + pick an LLM provider + paste your own API key) → chat with the bot using
your own LLM key. **260/260 tests green** across 24 files. Build and typecheck both clean.

### Foundation & auth

- **Next.js 14 App Router scaffold** with TypeScript 5.6 strict (`noUncheckedIndexedAccess`),
  Tailwind 3.4, route groups `(auth)` / `(dashboard)`, and `next/font/google` for Bricolage
  Grotesque + Inter Tight.
- **Drizzle ORM schema** for `users` (id / username / email / hashed_password / llm_provider /
  llm_model / email_verified / timestamps) and `bots` (id / user_id FK CASCADE / name / headline
  / personality / context_text / suggested_questions JSONB / loading_messages JSONB / is_active
  / timestamps). Lazy `pg.Pool` + Drizzle client. Two generated migrations under `drizzle/`.
- **NextAuth.js v4** with Credentials provider, JWT session strategy, `bcryptjs` cost 10.
  `authorize()` queries Drizzle directly (no DB adapter, no `sessions` table).
- **Registration endpoint** at `POST /api/auth/register` - Zod-validated, pre-check + Postgres
  `unique_violation` (code 23505) backstop translates to 409 instead of leaking 500.
- **Login + Register UI** ported from `design/login.html` - shared `(auth)/layout.tsx` chrome,
  brand panel with inline SVGs, disabled OAuth buttons with "SOON" badges (OAuth wiring is planned).

### BYO-key LLM client abstraction

- **Multi-provider adapter registry** (`src/lib/ai/providers/`) with a shared `LLMProvider`
  interface - `complete({ system, userMessage, apiKey, model?, maxTokens?, temperature?,
extras? })`. Real adapters: Anthropic (Claude), OpenAI (GPT), Azure OpenAI. Stub: Google
  Gemini.
- **`ProviderError` taxonomy** with categories `"invalid_key" | "rate_limit" | "unknown"` and a
  `toJSON()` override that bounds serialization to `{ name, provider, category, message }` so a
  structured logger can't accidentally pull in an attached SDK error whose headers carry the
  raw API key.
- **Per-request SDK clients** - every `complete()` call instantiates a fresh
  `new Anthropic({ apiKey })` / `new OpenAI({ apiKey })` / `new AzureOpenAI({ apiKey, endpoint,
deployment, apiVersion })`. No singletons; no shared mutation hazard across users.
- **Key transport** (`src/lib/ai/key-transport.ts`) - `readApiKey(headers)` pulls
  `x-llm-api-key`, validates length, throws `KeyTransportError` with reason `"missing" |
"empty" | "too_short" | "too_long"`. Companion `readAzureCreds(headers)` for the two extra
  Azure headers (`x-llm-azure-endpoint`, `x-llm-azure-api-version`) with HTTPS enforcement.

### Bot Factory + browser key store

- **5-step bot factory** (`src/components/bot-factory/BotFactoryForm.tsx`) - Identity →
  Knowledge → Personality → AI Model → Deploy. Live preview panel renders bot card with
  initials, headline, sample chat. Conditional Step 4 - Azure shows endpoint + deployment +
  apiVersion fields, others show a model dropdown. Google tile renders disabled with "SOON".
- **Browser key store** (`src/lib/client/llm-key-store.ts`) - `getApiKey` / `setApiKey` /
  `clearApiKey` on `probot.llm.key.v1`; parallel `getAzureCreds` / `setAzureCreds` /
  `clearAzureCreds` on `probot.llm.azure.v1` as a JSON blob. SSR-safe; never POSTed in body.
- **`POST /api/bots`** - auth-gated (NextAuth session), Zod-validated, transactional upsert of
  the user's single bot AND the user's LLM provider/model preference. Defense-in-depth canary
  test asserts the BYO key never lands in the persisted row.

### Chat UI port

- **`ChatWindow` + `MessageBubble` + `LoadingAnimation`** ported from VAi reference. Markdown
  via `react-markdown@9` + `remark-gfm@4` with a `SafeLink` component that forces
  `rel="noopener noreferrer" target="_blank"` on every external link. No `rehype-raw` (XSS-safe
  by default - `<img onerror=…>` strings render as text, never as DOM nodes).
- **Synthetic message IDs** (`crypto.randomUUID()` per insertion) on every message - prevents
  React from reconciling the wrong DOM once error-retry introduces mid-list mutations.
- **Rate-limit sentinel rendering** - 429 responses push a special `rateLimitMessage: true`
  bubble that renders a "slow down" card instead of a markdown bubble.
- **Cycling loading-messages indicator** (3-second cycle with 300ms fade) reading
  `bot.loading_messages` from the DB column. Per-bot customizable; a settings editor is planned.

### Chat API

- **`POST /api/chat/[botId]`** - 12-step orchestrator: Content-Type → BYO key header →
  body size cap (16 KB measured from `request.text()`, not the spoofable Content-Length) →
  JSON parse → Zod → bot lookup (active only) → owner lookup → rate limit → sanitize input →
  build prompt → provider dispatch → sanitize output → 200 `{ reply }`.
- **`sanitizeInput`** - Unicode normalization (zero-width strip, fullwidth ASCII → ASCII,
  Cyrillic homoglyph map `аеорсуіѕ → aeopcyis`, whitespace collapse) BEFORE pattern match.
  ~35 blocked regexes for prompt-injection, role overrides, instruction markers, jailbreak
  handles, credential probes, social engineering, system-prompt extraction, and image/media
  generation. Reason never echoes raw input.
- **`buildSystemPrompt`** - identity line + 7 immutable rules (ported from VAi) + personality
  prose block + response style + unknown-answer template + `## CONTEXT` plain prose. Never
  JSON-serializes the bot row.
- **`sanitizeOutput`** - 4 leakage checks (rule markers, JSON-dump regex, credential patterns,
  "system prompt" string) → fixed fallback string + 1500-char truncation with `…`.
- **`rate-limit.ts`** - in-memory two-tier sliding window per `botId`, 10/min + 50/day, sliding
  via timestamp arrays with immutable updates. Per-day rejection rolls back the per-minute slot
  it just consumed. A future change swaps to Upstash Redis without changing the call shape.
- **Defense-in-depth** - `ProviderError` categories map to fixed enum response codes
  (`invalid_llm_key` → 400, `provider_rate_limit` → 429, `provider_unavailable` → 502); raw
  SDK error messages are never propagated to the client.

### Azure migration

- **Replaced DeepSeek with Azure OpenAI** as a registered provider. Bot factory Step 4 collects
  4 Azure fields (key + endpoint + deployment + API version); deployment doubles as the
  `users.llmModel`. Chat UI attaches `x-llm-azure-endpoint` + `x-llm-azure-api-version`
  headers when provider is Azure.
- **Provider registry now: Anthropic + OpenAI + Azure (enabled) + Google (stub).** DeepSeek
  removed entirely. 12 Azure-specific specs added; `isProviderName("deepseek")` now `false`.

### Platform

- **Frontend + Backend:** Single Next.js 14 App Router app on **Vercel**. API routes are
  serverless functions co-deployed with the frontend.
- **Database:** PostgreSQL on **Supabase** free tier.
- **No always-on backend service** - there is no separate Node server.
- **No persistent rate-limit store** - in-memory; a persistent Upstash Redis store is planned.
- **No CDN yet** - CloudFront fronting an S3 bucket for the embeddable
  `widget.js`.

---

## How to update this changelog

For every release after v0.1.0:

1. Add a new `## vX.Y.Z - <YYYY-MM-DD> - <one-line title>` section at the top of this file
   (above v0.1.0).
2. Group entries under: **Added**, **Changed**, **Fixed**, **Removed**, **Security**.
3. Keep `claude/context.md` in sync - each release should correspond to one or more Session
   History entries that already document the work.
4. Tag the release in git: `git tag -a vX.Y.Z -m "<one-line title>"` and push the tag.
