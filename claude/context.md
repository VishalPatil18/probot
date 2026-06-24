# Project Context

> **Purpose:** Living log of work done on this project. Claude Code reads this at the start of every session to understand prior state before acting. Append a new entry after each meaningful prompt - do not rewrite history.

---

## How to Use This File

**At session start (Claude):**

1. Read this file top-to-bottom.
2. Read the "Current State" section to know where things stand.
3. Read the latest 2-3 entries in "Session History" for recent context.
4. Only then begin the user's task.

**After completing each prompt (Claude):**

1. Append a new entry to **Session History** with: date, prompt summary, what changed, files touched, decisions made, open questions.
2. Update **Current State** if architecture, stack, or status materially changed.
3. Update **Open Questions / TODOs** as items are added or resolved.
4. Never delete past entries - this is an append-only log.

---

## Project Overview

- **Name:** probot
- **Location:** `/Users/vishalpatil/Study/Projects/probot`
- **Status:** **v1.0 POST-STAGE-9 POLISH BATCH SHIPPED** (2026-06-23) - a large cross-cutting batch (~17 items): richer lead-capture form (name/email/company required + optional LinkedIn → new `leads.name/company/linkedin_url` columns; threaded through both lead endpoints, `captureLead`, dashboard list + CSV export); "Save bot settings" as a reusable **preset** (new `bot_presets` table + `src/lib/bot-presets/service.ts` + `POST/GET /api/bot-presets` + a button below the BotConfigTab danger zone); **live** dashboard %-change figures (analytics `getAnalyticsForUser` gains week/month prev-period counts + `formatGrowth`; `MetricTile` colours by sign); bot-status toggle **auto-saves** instantly (own PATCH + `activeBaseline`); account-restore accepts **username OR email** (`undoAccountDeletion` + route `identifier`); dashboard **Docs button** (labelled + book icon, between live-bot and bell); sidebar "Manage Model & Key" → `?tab=model` (threaded `modelHref` through ModelStatusCard/SidebarAccountFooter); **bot switcher** always opens with a coming-soon "Create New Bot"; public chat drops the owner heading (`OwnerCard` removed); Security retention copy fixed to real behavior; **brand icons** (github/linkedin/portfolio) in accent on hire-me + about; **roadmap page removed** from app (route + header link + sitemap + hire-me link) - lives only in docs now; docs link **consistency** `docs.pro-bot.dev` → `pro-bot.dev/docs` across app + docs; **docs overhaul** (full content): ~25 new pages (how-to-use, models-and-keys, bot-management, personality, themes-and-avatar, analytics-and-leads, notifications, deployment, hosting/managed + self-hosting, faq, contact, privacy, terms, contributing, license, why-pro-bot, about, features, release-notes/{beta,v1,roadmap,v2}, blogs/{index,welcome}), removed concepts/architecture + concepts/stages, Release-notes tab (Beta/v1/Roadmap/v2), Blog tab, `docs.json` restructured (50 nav pages, all resolve); plan-v2 gains multibot-management + dynamic-thinking-messages. **Run `npx drizzle-kit push`** for the `leads` columns + `bot_presets`. typecheck + key-leak green (335 files); vitest + build native. See latest Session History entry. **Prior:** **v1.0 STAGE 9 (Self-Hosted Bot Architecture) PARTIAL/SHIPPED** (2026-06-22) - the v1.0 capstone, in-repo portions: a per-bot **API token** model (`bot_tokens` table - hashed `pbt_<hex>`, soft-delete revoke, `last_seen_at`; reuses `generateRawToken`/`hashToken`) in `src/lib/bot-tokens/service.ts` (`mintBotToken`/`authenticateBotToken`/`listBotTokens`/`revokeBotToken`/`requireBotToken` guard); a versioned **`/api/v1/bot/*`** surface (`config` GET, `knowledge` POST via `retrieveRelevant`+full-context fallback+rate limit, `conversations` POST upsert, `leads` POST via a new shared `captureLead` core); dashboard **token + deployment** endpoints (`/api/bots/[botId]/tokens` POST/GET, `tokens/[tokenId]` DELETE, `deployment` PATCH) + a new **Deployment** settings tab (`DeployTab` - mode toggle, mint show-once modal, list/revoke; loads tokens client-side so existing settings tests are untouched); a `bots.deployment_mode` column; the **`probot-bot/` runtime scaffold** (excluded from root tsconfig); ADR `docs/decisions/0004-self-hosted-bot.mdx` + a `docs/self-hosted-bot/` guide. **Run `npx drizzle-kit push`** for `bot_tokens` + `bots.deployment_mode`; extract `probot-bot/` into its own repo to deploy. typecheck + key-leak green (334 files); vitest + push native. See latest Session History entry. **Prior:** **v1.0 STAGE 8 (Performance, Scale & Operational Polish) PARTIAL/SHIPPED** (2026-06-22) - selected code slices: the per-bot rate limiter (`src/lib/ai/rate-limit.ts`) and provider circuit breaker (`src/lib/ai/circuit-breaker.ts`) now back their state on a pluggable store - in-memory by default (unchanged behavior), Upstash Redis when `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` are set - via a single `src/lib/store/redis.ts` (the only file importing `@upstash/redis`, behind a `RedisLike` interface so the logic is unit-testable with a fake). `checkRateLimit` is now async; `getCircuitState`/`__resetCircuit` are async; the breaker gained an `onOpen` hook wired to a new operational-alert seam (`src/lib/server/alert.ts`, `alertCircuitOpen`, redacted `console.warn` sink, Sentry-ready). `buildExportBundle` grouping went O(n²)→O(n). **Run `npm install`** to add `@upstash/redis` (in-sandbox typecheck flags only `store/redis.ts` until then); no schema changes. Deferred to native/production: the SRS §6.1 perf NFRs (P01–P06), k6 load test, live Sentry breadcrumb, and the smaller Beta-Stage-7 hardening items (not in this batch's scope). The N+1→CTE item was reframed - the dashboard/analytics + export queries were already batched aggregates, so the real win was the export grouping fix. **Perf addendum (from Lighthouse):** replaced the render-blocking ~3.86 MB Material Symbols icon font with an inline-SVG `Icon` component (`src/components/ui/Icon.tsx`) across the 5 marketing files, removed the `<link>` from `layout.tsx` (benefits the chatbot + dashboard too), and added a modern `browserslist` to drop ~11 KiB legacy polyfills. typecheck + key-leak green; vitest + Lighthouse run natively. See latest Session History entries. **Prior:** **v1.0 STAGE 7 (SEO, Docs & Discoverability) SHIPPED** (2026-06-22) - site-wide SEO via a shared `src/lib/seo/` module (`site.ts` `buildMetadata` + `siteUrl`, `structured-data.ts`, `og.tsx`): root `layout.tsx` gains `metadataBase` + title template + default OG/Twitter (and the stale "AI Digital Recruiter" title is fixed to "AI Assistant"); every marketing page routes its metadata through `buildMetadata` (canonical + OG/Twitter); landing page emits `Organization` + `SoftwareApplication` JSON-LD; dynamic OG/Twitter cards via `next/og` (`src/app/opengraph-image.tsx` + `twitter-image.tsx`); native `src/app/robots.ts` + the existing `sitemap.ts` (refactored onto shared `siteUrl`). Mintlify docs reorganized (Concepts/Guides/Self-hosting/Decisions/Release notes) with new pages (`managed-vs-self-hosted`, `custom-instructions`, `managed-key-storage`, `account-deletion`, top-level `embed-share`), `stages.mdx` rewritten to current state, architecture diagrams added, and 3 ADRs under `docs/decisions/`. No schema changes. typecheck + key-leak green; `next build` / OG-image render / Lighthouse to be run natively. Chose native Next routes over `next-sitemap` (zero-dep, equal SEO). See latest Session History entry. **Prior:** **v1.0 STAGE 6 (Marketing & Trust Pages) SHIPPED** (2026-06-22) - three new public marketing pages (`/why-pro-bot` honest comparison vs generic chatbot platforms, `/hire-me` creator bio, `/roadmap` stage status from a hand-maintained array + Suggest-a-feature CTA), a landing-page "Watch demo" borderless video modal (env-driven `NEXT_PUBLIC_DEMO_VIDEO_URL`; "coming soon" poster until set), header/footer links to the new pages, docs links repointed to `pro-bot.dev/docs`, and a `src/app/sitemap.ts` covering the public routes. No schema changes. typecheck + key-leak green (run vitest natively for the new `DemoVideoModal.test.tsx`). See latest Session History entry. **Prior:** **v1.0 STAGE 5 (Sidebar, Notifications & Empty-State Polish) SHIPPED** (2026-06-22) - zero-bot sidebar empty-state, clickable profile row, docs link by the bell, embed-share URL, new bot-independent `/dashboard/settings` account route (SettingsTabs subset + optional-botId AIModelKeyTab), lead-capture email opt-in (`notify_leads_email` + `notification-prefs` endpoint + dropdown toggle + best-effort owner email), and a dismissible ToS-change banner (`last_legal_ack_date` + `LEGAL_EFFECTIVE_AT` + `LegalBanner` + `legal-ack` endpoint). **Run `npx drizzle-kit push`** for the 2 new columns. typecheck + key-leak green. See latest Session History entry. **Prior:** **v1.0 STAGE 4 (Bot Factory & Dashboard Polish) SHIPPED** (2026-06-22) - net-new bot profile picture (Postgres bytea `bot_avatars` + `bots.image`, uploaded in Bot Factory Step 1, rendered on the public chat header + embeddable widget, default ProBot icon), PDF dustbin icon, per-file PDF ingestion fix (knowledge route returns `files[]`; wizard shows retriable failures on Step 5 instead of a page-level error), theme picker in wizard Step 3, and dark code-block embed snippets. Shared `image-upload.ts` helper de-dupes avatar validation. **Run `npx drizzle-kit push`** to create `bot_avatars`/`bots.image` (and the pending Stage 3 `user_avatars`). typecheck + key-leak green. See latest Session History entry. **Prior:** **v1.0 STAGE 3 (Account & Settings Hardening) SHIPPED** (2026-06-21) - editable Settings → Account (full name + username w/ debounced uniqueness, password change, profile-photo upload to Postgres bytea via `user_avatars` + `/api/avatar/[userId]` serve route), `auth.ts` jwt/session refresh of name+image, and a redesigned theme picker (`ThemeColorField` circle + popover). Items 4/6/7 verified already-shipped. typecheck + key-leak green; **run `npx drizzle-kit push` to create `user_avatars`** before photo upload works. See latest Session History entry. **Prior:** **v1.0 STAGE 2 (Auth UX & Bug-fix Sprint) SHIPPED** (2026-06-21) - show-password toggles, "remember me" (JWT-encode maxAge override: 30d vs 1d), debounced signup availability check (`GET /api/auth/check-availability`), forgot-password modal, OAuth-row icon alignment, and an inline sidebar sign-out (`SidebarAccountFooter`, replacing `SignOutButton`). Magic-link bug was already resolved (dropped); onboarding parity verified already-shipped. typecheck + key-leak guard green; vitest deferred to native run (sandbox platform mismatch). See latest Session History entry. **Prior:** **v1.0 STAGE 1 (Branding & Copy Cleanup) SHIPPED** (2026-06-21) - on top of the Beta release. "AI Recruiter"→"AI Assistant", `probot.com`→`pro-bot.dev`, post-Beta auth hero copy, and a Beta-vocab comment sweep across ~95 source files. typecheck + key-leak guard green; full test/build to be re-run natively (sandbox platform mismatch). See the latest Session History entry. **Prior Beta status:** **STAGE 6 COMPLETE + Dashboard Redesign DONE** - Stages 1–6 shipped end-to-end. Full dashboard visual redesign (Slices A + B + C) ported from `design/dashboard.html` + `design/settings.html`. Settings tabs: Account (read-only display + Coming Soon), Bot configuration (status toggle via newly-widened `isActive` PATCH field + name/headline/personality cards + theme swatches + suggested questions + Coming Soon custom instructions), Knowledge base (visual re-skin of the slice-2/6.5 endpoints - type-iconed source rows, dashed "Add source" upload zone, "Re-index all" button), Security & privacy (live rate-limit display reading `PER_MINUTE`/`PER_DAY` from the rate limiter module + Coming Soon Export / Retention / Delete account), AI model & key (entirely Coming Soon - Stage 7 editor). Tab state in URL via `?tab=`. WAI-ARIA tabs pattern fully wired. Slice C closes out: bot detail page → redirect to settings, sub-page back-links + duplicate empty-state CTAs trimmed, 41-spec test backfill (BotConfigTab + KnowledgeTab + Topbar + SidebarNavLink + MobileSidebar), `LabeledInput` gets `useId()` for proper label association, Stage 7 task block (§7.11) appended to plan.md tracking 10 deferred items. 689/689 tests, build green. Next: Stage 7 (OAuth, GDPR, hardening, launch). **Earlier status note:** PDF + text ingestion pipeline shipped on top of Stage 1. End-to-end loop: register → log in → build a bot (drop PDFs in the Bot Factory dropzone, paste text, or both; optionally tweak the per-bot context token cap in Advanced) → chat with it via the user's own LLM key. Knowledge sources are extracted with `pdf-parse`, chunked with `tiktoken` (cl100k_base, 750/100), persisted to `knowledge_base`, and reassembled into `bots.context_text` server-side. 299/299 tests, build green.
- **Planning docs:** [plan.md](plan.md), [srs.md](srs.md), [vai.md](vai.md) (all under `claude/`)
- **Goal:** Open-source, BYO-key AI chatbots for job seekers - each user creates a bot from their resume/career data and shares a public URL or embeddable widget that recruiters can chat with.
- **Target users:** Job seekers (bot owners) and recruiters (anonymous chat visitors).
- **Core value:** Free, MIT-licensed, self-hostable, zero-cost-to-operator (users supply their own LLM API key, stored only in their browser).

---

## Current State

### Tech Stack

- **Language:** TypeScript 5.6 (strict, `noUncheckedIndexedAccess`)
- **Framework:** Next.js 14.2 (App Router) - pinned to `^14.2.35` (security patch applied in Task 1.2)
- **Styling:** Tailwind CSS 3.4 (utility-first per CLAUDE.md §8; no inline CSS)
- **ORM:** Drizzle ORM 0.36 + `drizzle-kit` for migrations. Schema lives in `src/lib/db/schema.ts`; client in `src/lib/db/index.ts` (lazy `pg.Pool` + Drizzle instance).
- **Database:** PostgreSQL (Supabase / Neon / local Postgres via `DATABASE_URL`)
- **Auth:** NextAuth.js 4 (email/password in Stage 1; OAuth deferred to Stage 7). JWT session strategy, `bcryptjs@2.4` for password hashing at cost 10. Config in `src/lib/auth/auth.ts`; route handler at `src/app/api/auth/[...nextauth]/route.ts`; registration at `POST /api/auth/register`. `SessionProvider` mounted in root layout. Login + register UI live in `src/app/(auth)/{login,register}/page.tsx` with shared `(auth)/layout.tsx` chrome.
- **Markdown:** `react-markdown@^9` + `remark-gfm@^4` (chosen over v10 because the project pins React 18). All bot replies render through it; every `<a>` is rewritten to `rel="noopener noreferrer" target="_blank"` via a `SafeLink` component.
- **Fonts:** `Bricolage_Grotesque` (display) + `Inter_Tight` (sans) via `next/font/google`, exposed as CSS variables `--font-display` / `--font-sans` and wired to Tailwind's `fontFamily.display` / `fontFamily.sans`.
- **Testing (UI):** Vitest with `@vitejs/plugin-react` for JSX transform, JSDOM env for `*.test.tsx`, `@testing-library/react` + `@testing-library/user-event` + `@testing-library/jest-dom`. `cleanup()` runs in `afterEach` via `src/test/setup.ts`.
- **LLM clients:** Multi-provider BYO-key. `@anthropic-ai/sdk` and `openai` are full adapters (Task 1.5); Google Gemini and DeepSeek ship as registered stubs that throw `ProviderError("…", "unknown", "not implemented in Stage 1")`. Common interface `LLMProvider.complete({ system, userMessage, apiKey, model?, maxTokens?, temperature? })` returns `{ reply: string }`. SDK clients are constructed per-request from the BYO key; never singletons.
- **Ingestion (Stage 2):** `pdf-parse@1.1.1` for PDF text extraction (imported via the `pdf-parse/lib/pdf-parse.js` subpath to dodge the v1.1.1 demo-code-on-import bug), `tiktoken@1` (cl100k_base) for token-bounded chunking. No URL scraping, no file storage at rest, no profile photo upload - PDFs are processed in memory and only the extracted text chunks persist. Per-bot 5-file / 10MB caps enforced both client-side and server-side.
- **Validation:** Zod 3
- **Testing:** Vitest 2.1 + `@vitest/coverage-v8` (set up in Task 1.2; no tests yet - first tests land in Task 1.3).
- **Deployment:** Vercel (also self-hostable on any Node 20+ host) - not yet configured

### Architecture

- **Routing:** Next.js App Router under `src/app/`. Route groups `(auth)` and `(dashboard)` share layouts without affecting URLs. Public chat lives at `/u/[username]/chat` (will be made public-no-auth in Stage 4; currently scaffolded).
- **Data layer:** Drizzle ORM with a singleton `pg.Pool` (lazy - first query opens the TCP connection). Three tables in the ingestion path: `users` (with `username` + `email` unique, `hashed_password`, non-sensitive `llm_provider`/`llm_model` preferences, `email_verified`, timestamps), `bots` (FK to `users.id` with `ON DELETE CASCADE`, `name`, `headline`, `personality` default `'professional'`, `context_text`, `context_token_cap` default 12_000 (Stage 2), `suggested_questions` JSONB typed as `string[]`, `loading_messages` JSONB typed as `string[]` with a 4-string default for the chat UI's typing indicator, `is_active`, timestamps), and `knowledge_base` (Stage 2: one row per chunk; FK to `bots.id` with `ON DELETE CASCADE`; `source_type` ∈ `pdf|text`, `source_name`, `content_text`, `chunk_index`, `token_count`; indexes on `bot_id` and `(bot_id, source_name)`). `updated_at` auto-bumps via Drizzle `$onUpdate` (app-level only). The LLM API key is **intentionally** not a column. NextAuth standard tables (`accounts`, `verification_tokens`) round out the schema.
- **Auth layer:** NextAuth v4 with the Credentials provider and JWT session strategy (no DB adapter; the `authorize()` callback queries Drizzle directly). Password hashing via `bcryptjs` cost 10. Inputs validated by Zod (`src/lib/auth/schemas.ts`) - `USERNAME_REGEX = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/` + reserved-slug set from `plan.md` §4.6 enforced at registration to keep `users.username` valid for Stage 4's `/u/[username]/chat` route. JWT carries `id` + `username`; LLM provider/model are intentionally kept out of the JWT (refetched per chat call to avoid stale prefs). Module augmentation lives in `src/types/next-auth.d.ts`. Registration is `POST /api/auth/register` - pre-check + `UNIQUE`-constraint backstop translates `pg` error code `23505` to a 409 instead of leaking a 500.
- **LLM abstraction:** All chat/embedding calls go through a provider registry in `src/lib/ai/providers/`. Each adapter (`anthropic.ts`, `openai.ts`, `google.ts`, `deepseek.ts`) implements a shared `LLMProvider` interface in `types.ts`. The chat API resolves the user's chosen provider/model from the `users` table and forwards the BYO key only to that provider.
- **BYO-key transport (planned):** The LLM API key is held in browser `localStorage` (`src/lib/client/llm-key-store.ts`, key `probot.llm.key.v1`) and sent to the chat API in an `x-llm-api-key` header - never in the JSON body. The server never logs, persists, or forwards the key except to the chosen provider. Enforced in Task 1.8 (`key-transport.ts`).
- **Sanitization:** `src/lib/ai/sanitize-input.ts` does Unicode normalization (zero-width strip, fullwidth ASCII, Cyrillic homoglyph map, whitespace collapse) → 8000-char cap → ~35 blocked regex patterns covering prompt injection, role overrides, instruction markers, jailbreak handles, credential probes, social engineering, system-prompt extraction, and image/media generation. Returns `{ ok: true; message } | { ok: false; reason }`. Reason never echoes raw input. `src/lib/ai/sanitize-output.ts` does 4 leakage checks (rule-marker strings, JSON-dump regex, credential patterns, "system prompt" string) → 1500-char truncate with `…`. Fallback string never echoes the dirty input.
- **Prompt builder:** `src/lib/ai/prompt-builder.ts` assembles identity → 7 immutable rules → personality prose block (`PERSONALITY_PROMPTS[bot.personality]`) → response style → unknown-answer template → `## CONTEXT` plain prose. Never JSON-serializes the bot row.
- **Rate limiter:** `src/lib/ai/rate-limit.ts` is an in-memory two-tier sliding window per `botId`. Defaults 10/min + 50/day, env-overridable via `PROBOT_RATE_PER_MINUTE` / `PROBOT_RATE_PER_DAY`. Per-day rejection rolls back the per-minute slot it just consumed. Stage 7 swaps the in-memory `Map<botId, number[]>` storage for Upstash Redis without changing the call site shape.
- **Chat route:** `POST /api/chat/[botId]` (`src/app/api/chat/[botId]/route.ts`) - 12-step orchestrator: content-type → BYO key header → body size cap (16 KB, measured from `request.text()` not the spoofable Content-Length header) → JSON parse → Zod validate → bot lookup (active only) → owner lookup → rate limit → sanitize input → build prompt → `getProvider(owner.llmProvider).complete({...})` → sanitize output → 200 `{ reply }`. Returns structured `{ error, ... }` bodies for every failure path. Intentionally NOT auth-gated - the chat _page_ is gated in Stage 1; Stage 4 will make the page public with zero route changes.
- **Ingestion pipeline (Stage 2):** `src/lib/ingestion/` holds five files. `errors.ts` defines the `IngestionError` taxonomy (6 categories: `invalid_file_type | file_too_large | too_many_files | pdf_unreadable | empty_extract | empty_input`) that the route handler maps to HTTP status codes (400/413/415/422). `chunk.ts` exposes `chunkText(text, opts?)` - tiktoken `cl100k_base` encoder cached at module scope (`__resetEncoder` for tests), 750-token target with 100-token overlap, throws `empty_input` on whitespace-only input. `extract-pdf.ts` wraps `pdf-parse` with magic-byte (`%PDF-`) and size guards; the actual `pdf-parse` lib is dynamically imported from the subpath `pdf-parse/lib/pdf-parse.js` to dodge the v1.1.1 demo-code-on-import bug. `constants.ts` was split out so `BotFactoryForm` (a `"use client"` component) can import `MAX_PDF_BYTES`/`MAX_PDF_FILES`/`PDF_MIME_TYPE` without dragging the Node-only `pdf-parse` runtime into the browser bundle. `assemble.ts` has the pure `assembleFromChunks(chunks, tokenCap)` (deterministic order by `(sourceName, chunkIndex)`, `\n\n` separator, stops when next chunk would exceed cap, returns `{ text, totalTokens, truncated }`) plus the DB-facing `assembleAndSaveBotContext(botId)` and `deleteSource(botId, sourceName)`.
- **Knowledge routes (Stage 2):** Four endpoints under `/api/bots/[botId]/knowledge/`, all gated by `requireBotOwner` (a shared helper at `src/lib/bots/require-bot-owner.ts` that returns a discriminated union - `{ ok: true, bot, userId }` or `{ ok: false, response }` - so callers don't have to throw/catch for auth failures). `POST /` is the main multipart entrypoint: validates Content-Type, parses `text` + `files[]`, enforces ≤5 files, runs a **one-time backward-compat migration** (if `knowledge_base` is empty but `bots.context_text` is non-empty, seeds a `manual_text` source from the existing prose so Stage 1 bots preserve their original content when they first add a PDF), per-source replace by filename (`deleteSource(botId, sourceName)` before insert), extracts each PDF with `extractPdfText` → chunks → bulk-inserts, then calls `assembleAndSaveBotContext`. `GET /` returns sources grouped by name with chunk/token totals + the bot's `contextTokenCap`. `DELETE /sources/[sourceName]` removes one source and reassembles. `POST /reprocess` reassembles without re-extraction (useful after the cap changes).
- **Token cap (Stage 2):** Per-bot `bots.context_token_cap` column, default 12_000 (≈ 50K chars), bounded `[CONTEXT_TOKEN_CAP_MIN=1_000, CONTEXT_TOKEN_CAP_MAX=100_000]` by `botInput` Zod schema. Surfaced in the Bot Factory as an Advanced disclosure on Step 2 with a warning that higher caps risk overflowing smaller models' context windows (Haiku, gpt-4o-mini). Settings page deferred to Stage 7; per-bot keeps the surface minimal.
- **Bot Factory Step 2 (Stage 2):** Replaced the Stage 1 placeholder dropzone with a real drag-and-drop file picker (hidden `<input type="file" multiple accept="application/pdf,.pdf">` + drop-target label, file list with per-file Remove, mime + size + dedupe validation client-side). Helper text matches the user's locked spec: _"Resume, LinkedIn profile export, or any PDF with your career info."_ Submit flow: POST `/api/bots` first (creates/updates the row with `contextTokenCap`); if `pdfFiles.length > 0`, POST the multipart upload to `/api/bots/[botId]/knowledge` second; only then advance to Step 5. The manual textarea content is sent as the `text` field of the multipart so it lands as a `manual_text` source row alongside the PDFs.
- **Testing:** Vitest with `@/*` alias mirrored from `tsconfig.json`. Default `node` environment; per-file `// @vitest-environment jsdom` override available for component tests later. `--passWithNoTests` is on so the script is safe with an empty suite.
- **Path alias:** `@/*` → `./src/*` (configured in `tsconfig.json` and `vitest.config.ts`).

### Repository Layout

```
probot/
├── CLAUDE.md                       # Behavioral guidelines (knowledge-base rules in §9)
├── README.md
├── package.json                    # next 14.2 / react 18 / drizzle / next-auth / anthropic + openai SDKs / zod
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── postcss.config.js
├── drizzle.config.ts
├── vitest.config.ts                # node env, @/* alias, v8 coverage
├── .env.example                    # DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL (no LLM keys - BYO)
├── drizzle/                        # generated migrations - 0000 users+bots · 0001 loading_messages default · 0002–0003 auth · 0004_late_vermin.sql knowledge_base + bots.context_token_cap (Stage 2)
├── claude/
│   ├── context.md                  # This file - knowledge base
│   ├── plan.md                     # 7-stage build plan (v1.1, SRS-aligned)
│   ├── srs.md                      # Software requirements spec
│   └── vai.md                      # VAi reference implementation (port source for Stage 1)
├── design/                         # Static HTML/CSS mockups (port to Tailwind per surface)
└── src/
    ├── app/
    │   ├── layout.tsx              # Root layout
    │   ├── page.tsx                # "/" landing (Stage 1 scaffold marker)
    │   ├── globals.css             # Tailwind directives
    │   ├── (auth)/login/page.tsx           # placeholder UI - Task 1.4
    │   ├── (auth)/register/page.tsx        # placeholder UI - Task 1.4
    │   ├── (dashboard)/dashboard/page.tsx           # placeholder
    │   ├── (dashboard)/dashboard/bots/new/page.tsx  # placeholder
    │   ├── u/[username]/chat/page.tsx               # placeholder (Stage 4 makes public)
    │   └── api/
    │       ├── auth/
    │       │   ├── [...nextauth]/route.ts   # NextAuth catch-all - Task 1.3 ✓
    │       │   └── register/route.ts        # POST registration endpoint - Task 1.3 ✓
    │       ├── bots/
    │       │   ├── route.ts                 # POST /api/bots create/update (now takes contextTokenCap) - Stage 1 + 2 ✓
    │       │   └── [botId]/knowledge/
    │       │       ├── route.ts             # Stage 2: POST multipart (PDFs + text), GET sources summary
    │       │       ├── sources/[sourceName]/route.ts  # Stage 2: DELETE one source
    │       │       └── reprocess/route.ts   # Stage 2: POST reassemble without re-extraction
    │       └── chat/[botId]/route.ts        # Stage 1 chat orchestrator ✓
    ├── components/
    │   ├── chat/                   # ChatWindow, MessageBubble, SuggestedQuestions, LoadingAnimation (stubs)
    │   └── bot-factory/            # BotFactoryForm (stub)
    ├── lib/
    │   ├── db/                     # schema.ts (users + bots Drizzle tables), index.ts (Drizzle client) - Task 1.2 ✓
    │   ├── ai/
    │   │   ├── providers/          # types (LLMProvider, ProviderError), index (registry), anthropic + openai (real), google + deepseek (stubs that throw) - Task 1.5 ✓
    │   │   ├── prompt-builder.ts   # buildSystemPrompt + PERSONALITY_PROMPTS - Task 1.8 ✓
    │   │   ├── sanitize-input.ts   # Unicode normalize + ~35 blocked patterns - Task 1.8 ✓
    │   │   ├── sanitize-output.ts  # 4 leakage checks + 1500-char cap - Task 1.8 ✓
    │   │   ├── rate-limit.ts       # per-bot two-tier sliding window - Task 1.8 ✓ (Stage 7 → Redis)
    │   │   └── key-transport.ts    # readApiKey/redactKey/KeyTransportError - Task 1.5 ✓
    │   ├── ingestion/              # Stage 2 ✓
    │   │   ├── constants.ts        # MAX_PDF_BYTES (10MB) / MAX_PDF_FILES (5) / PDF_MIME_TYPE - client-safe (no pdf-parse import)
    │   │   ├── errors.ts           # IngestionError + 6-category taxonomy
    │   │   ├── chunk.ts            # chunkText(...) using tiktoken cl100k_base, 750/100
    │   │   ├── extract-pdf.ts      # pdf-parse wrapper via lib subpath, magic+size guards
    │   │   └── assemble.ts         # assembleFromChunks (pure) + assembleAndSaveBotContext + deleteSource
    │   ├── auth/
    │   │   ├── auth.ts             # NextAuth options (Credentials + JWT) - Task 1.3 ✓
    │   │   ├── passwords.ts        # bcryptjs hash + verify at cost 10 - Task 1.3 ✓
    │   │   └── schemas.ts          # Zod registerInput/loginInput + USERNAME_REGEX + RESERVED_SLUGS - Task 1.3 ✓
    │   ├── bots/
    │   │   ├── schemas.ts          # botInput Zod + Personality + CONTEXT_TOKEN_CAP_{MIN,MAX,DEFAULT}
    │   │   └── require-bot-owner.ts # Stage 2: shared session+ownership helper for /knowledge routes
    │   └── client/llm-key-store.ts # stub - Task 1.6
    └── types/
        ├── index.ts                # stub
        └── next-auth.d.ts          # NextAuth module augmentation: User/Session/JWT add id + username - Task 1.3 ✓
```

`src/lib/db/` now contains real Drizzle code (Task 1.2). All other `src/components/` and `src/lib/` files are still `export {};` placeholders from Task 1.1. Bodies land in Tasks 1.3–1.8.

### Build / Run / Test Commands

- `npm install` - resolve dependencies (one-time)
- `npm run dev` - Next.js dev server on http://localhost:3000
- `npm run build` - production build + type-check + route validation (green as of Task 1.2)
- `npm run typecheck` - `tsc --noEmit` only
- `npm run lint` - `next lint`
- `npm test` - Vitest one-shot (`--passWithNoTests` for now)
- `npm run test:watch` - Vitest watch mode
- `npm run test:coverage` - Vitest with v8 coverage
- `npm run db:generate` - generate Drizzle migrations from `src/lib/db/schema.ts` → `drizzle/`
- `npm run db:migrate` - apply Drizzle migrations against `DATABASE_URL`

---

## Key Decisions

_Architectural and product decisions, in chronological order. Each entry: date, decision, rationale, alternatives rejected._

- _(none yet)_

---

## Open Questions / TODOs

**Resolved 2026-06-03:**

- [x] ~~Define project goal and scope from `claude/srs.md`~~ - captured in `claude/plan.md` (v1.1 7-stage build plan).
- [x] ~~Choose tech stack~~ - see Current State / Tech Stack.
- [x] ~~Set up initial repo structure~~ - Stage 1 Task 1.1.
- [x] ~~Decide whether `CLAUDE.md` should explicitly instruct Claude to read & update `context.md` each session~~ - done; see CLAUDE.md §9.

**Resolved 2026-06-03 (Task 1.2):**

- [x] ~~**Security:** bump `next@14.2.15` → latest patched 14.2.x~~ - bumped to `^14.2.35` in Task 1.2.
- [x] ~~**Test runner:** decide between Vitest and Jest~~ - chose Vitest 2.1; harness wired but no tests yet.

**Resolved 2026-06-04 (Task 1.3):**

- [x] ~~**First test file:** land at least one real spec in Task 1.3~~ - 43 specs across 4 files now in place (passwords, schemas, auth, register).

**Open:**

- [ ] **Tailwind / design port:** `design/*.html` mockups are not yet ported to Tailwind components. Will land per surface (login → Task 1.4, bot factory → Task 1.6, chat → Task 1.7) per CLAUDE.md §8.
      **Resolved 2026-06-04 (Task 1.8 / Stage 1 close-out):**

- [x] ~~**Stage 1 task 1.8:** Chat API route + sanitizers + rate limit~~ - `/api/chat/[botId]` shipped, 226/226 tests green, build green. The end-to-end Stage 1 loop works.

**Open (carried into Stage 2+):**

- [x] ~~**Apply Drizzle migrations**~~ - 0000–0003 applied during Stage 1; 0004 (`knowledge_base` + `bots.context_token_cap`) applied at the start of Stage 2.
- [ ] **`/dashboard` placeholder still returns `null`** - post-login redirect lands on an empty page. Stage 6 dashboard owns the real implementation.
- [ ] **Email verification UX** - `email_verified` column is wired but always `false` at registration. Stage 7 owns the verify-email flow.
- [ ] **Auth-route rate limiting** - Stage 7 (Redis layer wraps everything).
- [ ] **Conversation / message logging** - Stage 4 schema, Stage 6 UI.
- [ ] **CORS** for the embeddable widget - Stage 5.
- [ ] **Per-bot rate-limit overrides** via `bots.rate_limit_per_minute` / `rate_limit_per_day` columns - Stage 7.
- [ ] **Settings page** for editing `bots.loading_messages`, `bots.context_token_cap` (currently in Bot Factory Advanced only), theme color, custom instructions, OAuth - Stage 7.
- [ ] **Real Google + DeepSeek adapters** - out of Stage 1 scope; registered stubs throw on call.
- [ ] **Streaming** `complete()` - out of scope; vai.md is non-streaming.
- [ ] **Credential stuffing on auth routes** - undefended until Stage 7's Redis layer.

**Carried into Stage 3+ (after Stage 2 close-out):**

- [ ] **Dedicated tests for GET / DELETE-source / reprocess routes** - currently only POST `/api/bots/[botId]/knowledge` has explicit specs. The other three are thin wrappers around `requireBotOwner` + a single Drizzle call + `assembleAndSaveBotContext`, so they're covered transitively, but worth adding when the Settings UI in Stage 7 wires them up.
- [ ] **Chunk overlap deduplication on assembly** - Stage 2 concatenates overlapping chunks (~13% redundancy at 750/100). Stage 3's RAG pipeline replaces the whole assembly path, so this is intentionally not fixed at the source.
- [ ] **PDF processing on Vercel hobby tier** - 10MB × 5 PDFs extracts synchronously inside the request. If we hit the 60s timeout under real load, move to a background queue (Stage 5 widget work is a natural moment).
- [ ] **No malware scanning of uploaded PDFs** - magic-byte + mime check only. Acceptable for BYO-key personal data; revisit if the deployment shape ever changes.

---

## Session History

> Append-only. Newest entry at the bottom. Each entry follows the template below.

### Template (copy for each new entry)

```
### YYYY-MM-DD HH:MM - <one-line title summary of whats been done>

**What was asked to do:** <what the user asked to do (not task1.1, but write a title for the work from plan.md file for task1.1)>

**What I did:**
- <action>

**Files changed:**
- `path/to/file` - <create | update | delete> - <why>

**Decisions made:**
- <decision and rationale>

**Open questions / follow-ups:**
- <item>
```

---

### 2026-06-03 15:55 - Stage 1 Task 1.1: Project scaffolding

**What was asked to do:** "Project Scaffolding: set up the initial Next.js 14 app with the specified tech stack and repository structure. Create placeholder files for all major components, routes, and utilities as outlined in the architecture. Ensure the scaffold compiles and routes resolve without errors, even though the bodies are empty. This sets the foundation for incremental development in subsequent tasks."

**What I did:**

- Scaffolded the Next.js 14 App Router skeleton per `claude/plan.md` §1.1.
- Installed the dependency tree via npm (457 packages).
- Verified the scaffold compiles and routes resolve via `npm run build` - all 7 routes generate cleanly (`/`, `/login`, `/register`, `/dashboard`, `/dashboard/bots/new`, `/u/[username]/chat`, `_not-found`).

**Files changed:**

- `package.json` - create - manifest pinning `next@14.2.15`, `react@18.3.1`, `typescript@5.6`, `drizzle-orm@0.36`, `drizzle-kit@0.28`, `pg@8.13`, `next-auth@4.24`, `@anthropic-ai/sdk@0.32`, `openai@4.71`, `zod@3.23`, `tailwindcss@3.4`. Scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `db:generate`, `db:migrate`.
- `tsconfig.json` - create - strict TS, `noUncheckedIndexedAccess`, `@/*` → `./src/*` alias, Next.js plugin.
- `next.config.js` - create - `reactStrictMode: true`.
- `tailwind.config.ts` - create - content glob `./src/**/*.{ts,tsx}`.
- `postcss.config.js` - create - tailwind + autoprefixer.
- `drizzle.config.ts` - create - schema target `./src/lib/db/schema.ts`, dialect `postgresql`.
- `.env.example` - create - `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, optional self-host LLM fallback (commented). No LLM key envs by design (BYO key).
- `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css` - create - root layout, "Stage 1 scaffold" landing, Tailwind directives.
- `src/app/(auth)/login/page.tsx`, `(auth)/register/page.tsx` - create - placeholder pages (`return null`) so routes resolve.
- `src/app/(dashboard)/dashboard/page.tsx`, `(dashboard)/dashboard/bots/new/page.tsx` - create - placeholders.
- `src/app/u/[username]/chat/page.tsx` - create - placeholder (Stage 4 makes public).
- `src/components/chat/{ChatWindow,MessageBubble,SuggestedQuestions,LoadingAnimation}.tsx` - create - `export {};` stubs.
- `src/components/bot-factory/BotFactoryForm.tsx` - create - `export {};` stub.
- `src/lib/db/{schema,index}.ts` - create - `export {};` stubs (Task 1.2 fills in).
- `src/lib/ai/providers/{index,types,anthropic,openai,google,deepseek}.ts` - create - `export {};` stubs.
- `src/lib/ai/{prompt-builder,sanitize-input,sanitize-output,key-transport}.ts` - create - `export {};` stubs.
- `src/lib/auth/auth.ts`, `src/lib/client/llm-key-store.ts`, `src/types/index.ts` - create - `export {};` stubs.

**Decisions made:**

- **Package manager:** npm - no extra install needed, zero-cost, simplest. (User confirmed.)
- **Stubs:** `export {};` placeholders (user's choice from option (a)). Future Task 1.x sessions fill bodies without renaming files.
- **Route groups:** `(auth)` and `(dashboard)` created as empty placeholders now so routes resolve cleanly; real layouts land in later tasks.
- **Tailwind without design port:** Tailwind is wired (config + globals.css directives) but no `design/*.html` styles ported yet. Per-surface ports land in Tasks 1.4 / 1.6 / 1.7.
- **`pg` + Drizzle pinned now:** `drizzle.config.ts` needs a dialect target; deferring would force a second `package.json` touch in Task 1.2.
- **Browser-side BYO key:** key store lives in `src/lib/client/llm-key-store.ts` (browser-only `localStorage`); never sent in request body - `x-llm-api-key` header only (Task 1.8 will enforce).

**Open questions / follow-ups:**

- `next@14.2.15` security advisory flagged during `npm install` - bump to latest patched 14.2.x before Task 1.2.

---

### 2026-06-03 16:45 - Stage 1 Task 1.2: Drizzle schema + DB client + Vitest harness

**What was asked to do:** "Drizzle schema + DB client + Vitest harness: Define the initial Drizzle schema with `users` and `bots` tables as per the plan. Set up a singleton `pg.Pool` and Drizzle client for database interactions. Generate the first migration SQL file. Install Vitest and configure it for future testing, ensuring it runs without tests (green with an empty suite). This lays the groundwork for database operations and testing in upcoming tasks."

**What I did:**

- Bumped `next` `14.2.15` → `^14.2.35` and `eslint-config-next` to match - closes the security advisory queued in Open Questions.
- Added Vitest 2.1 + `@vitest/coverage-v8` and three test scripts (`test`, `test:watch`, `test:coverage`) with `--passWithNoTests` so the empty suite is a green baseline.
- Wrote `src/lib/db/schema.ts` with two Drizzle tables (`users`, `bots`) matching `claude/plan.md` §1.2 exactly: UUID PK with `gen_random_uuid()` default, unique `username`/`email`, `personality` default `'professional'`, `is_active` default true, `email_verified` default false, FK `bots.user_id → users.id` `ON DELETE CASCADE`, JSONB `suggested_questions` typed as `string[]`. Exported `User`, `NewUser`, `Bot`, `NewBot` via `$inferSelect`/`$inferInsert`.
- Wrote `src/lib/db/index.ts` - singleton `pg.Pool({ connectionString: process.env.DATABASE_URL })` + `drizzle(pool, { schema })`, plus `export * from "./schema"`. Pool is lazy - `import { db }` does **not** require `DATABASE_URL` at module-load time; only the first query does.
- Wrote `vitest.config.ts` - node environment, v8 coverage with `include: ["src/**/*.{ts,tsx}"]` and `exclude: ["src/**/*.test.{ts,tsx}", "src/types/**"]`, `@/*` resolve alias mirroring `tsconfig.json`.
- Ran `npm run db:generate` → produced `drizzle/0000_new_misty_knight.sql` (2 tables, 1 FK with `ON DELETE CASCADE`, unique constraints on `users.username` and `users.email`). Committed to repo. Migration **not** applied - no live DB yet (per Q2 option (b)).
- Verified: `npm run typecheck` clean, `npm run build` green (all 7 routes still generate), `npm test` exits 0 with "No test files found".

**Files changed:**

- `package.json` - update - bumped `next` and `eslint-config-next` to `^14.2.35`; added `vitest@^2.1.9`, `@vitest/coverage-v8@^2.1.9` to devDeps; added 3 test scripts.
- `package-lock.json` - update - npm regenerated for the bumps and new deps.
- `src/lib/db/schema.ts` - update - replaced `export {};` stub with real Drizzle schema (61 lines).
- `src/lib/db/index.ts` - update - replaced `export {};` stub with `pg.Pool` + Drizzle client + schema re-export (14 lines).
- `vitest.config.ts` - create - Vitest config with node env, v8 coverage, `@/*` alias.
- `drizzle/0000_new_misty_knight.sql` - create (generated) - initial migration. `drizzle/meta/` is gitignored per existing `.gitignore`.
- `claude/context.md` - update - Tech Stack, Architecture, Repository Layout, Build/Run/Test, Open Questions (2 closed, 2 new), this Session History entry.

**Decisions made:**

- **Bump Next.js while touching `package.json` anyway:** the security advisory was already queued; doing it alongside the Vitest install avoids a second `npm install` round-trip. `14.2.35` is patch-compatible with `14.2.15`, so no API churn.
- **Lazy `pg.Pool` (KISS):** chose `new Pool({ connectionString: process.env.DATABASE_URL })` over a proxy/getter pattern. `pg.Pool` does not connect on construction, so `import { db }` succeeds even with `DATABASE_URL` unset - the build is safe today (no consumer imports it yet) and future builds get the same forgiving behavior. The first query throws at runtime if the env is missing - the right point to fail loudly.
- **Drizzle `mode: "date"`:** timestamps deserialize to `Date` objects (per Q3). Easier date math and serialization (`createdAt.toISOString()`) at the app layer.
- **App-level `$onUpdate` for `updated_at`:** per Q4. All writes go through Drizzle in Stage 1, so the trigger is unnecessary. A DB-level trigger can land later if raw-SQL writers appear.
- **Vitest over Jest (per Q1):** Vitest cold-starts in ~200ms vs Jest's 2–5s, native ESM/TS, simpler config, zero-cost. Jest's "Next.js default" advantage is moot since we're not testing Next.js internals.
- **`--passWithNoTests` on by default:** keeps `npm test` green from day one. Real coverage targets per `~/.claude/rules/ecc/common/testing.md` (80%) kick in when actual specs land in Task 1.3.
- **No tests for the schema itself:** Drizzle schema is declarative data, not behavior. The migration SQL output _is_ the verification. Tests add value at Task 1.3 (NextAuth flows, credential validation) and Task 1.8 (sanitizers, prompt builder).
- **Migration generated, not applied:** per Q2 option (b). The user runs `npm run db:migrate` once they have a real Postgres (Supabase free tier, Neon free tier, or local Docker) - that decision is theirs.

**Open questions / follow-ups:**

- Apply the migration before Task 1.3 needs persistence (`npm run db:migrate` against a real Postgres).
- Land the first real Vitest spec in Task 1.3.

---

### 2026-06-04 09:45 - Stage 1 Task 1.3: NextAuth email/password + registration + first tests

**What was asked to do:** NextAuth email/password + registration + first tests. Implement NextAuth.js email/password auth, registration endpoint, bcrypt hashing, Zod validation, and the first real Vitest specs. Approved Q1–Q4: bcryptjs + cost 10; no email-verified gate at login; mock-DB integration tests (option B); enforce Stage 4 username rules at registration now.

**What I did:**

- Added `bcryptjs@^2.4.3` (deps) and `@types/bcryptjs@^2.4.6` (devDeps); ran `npm install` (no advisories).
- Wrote `src/lib/auth/passwords.ts` - `hashPassword`/`verifyPassword` thin wrappers around `bcryptjs` at cost 10.
- Wrote `src/lib/auth/schemas.ts` - Zod `registerInput`/`loginInput`, `USERNAME_REGEX` and `RESERVED_SLUGS` per `plan.md` §4.6, plus exported `RegisterInput`/`LoginInput` types via `z.infer`.
- Replaced the `src/lib/auth/auth.ts` Task 1.1 stub with a real `NextAuthOptions` export - JWT session strategy, `signIn: "/login"` custom page, Credentials provider whose `authorize()` validates with `loginInput`, looks up by email via Drizzle, verifies with bcryptjs, and returns `{ id, username, email }`. `jwt` and `session` callbacks copy `id`/`username` from user → token → session.
- Wrote `src/types/next-auth.d.ts` - module augmentation: `User`/`Session.user`/`JWT` all carry `id: string` + `username: string`.
- Wrote `src/app/api/auth/[...nextauth]/route.ts` - three-line catch-all (`NextAuth(authOptions)` exported as `GET` + `POST`).
- Wrote `src/app/api/auth/register/route.ts` - `POST` handler: parses JSON (400 on invalid), `registerInput.safeParse` (400 on validation error), pre-check via `db.query.users.findFirst({ where: or(eq(users.email, email), eq(users.username, username)) })` (409 on duplicate, with field disambiguation), bcrypt the password, insert via `db.insert(users).values(...).returning(...)`, and catch Postgres `unique_violation` (code `23505`) as a 409 to cover the pre-check → insert race window.
- Wrote 4 Vitest specs (43 tests total, all green):
  - `src/lib/auth/passwords.test.ts` - bcrypt hash shape, verify roundtrip, wrong-password rejection, salt produces distinct hashes (4 tests).
  - `src/lib/auth/schemas.test.ts` - `it.each` matrix for valid/invalid registerInput, USERNAME_REGEX positive/negative cases, RESERVED_SLUGS membership (27 tests).
  - `src/lib/auth/auth.test.ts` - mocks `@/lib/db` with `vi.mock`, exercises `authorize()` for happy path + missing user + wrong password + invalid credential shape, plus `authOptions.session.strategy === "jwt"` and `pages.signIn === "/login"` invariants (6 tests).
  - `src/app/api/auth/register/route.test.ts` - chained `vi.fn()` for `db.insert(users).values().returning()`, asserts 201 happy path (and confirms the inserted `hashedPassword` is bcrypt-shaped, not plaintext), 409 email-dupe, 409 username-dupe, 400 validation, 400 invalid-JSON, and 409 on simulated `code: "23505"` race (6 tests).
- Debugged one failing test ("returns the user on valid credentials") via per-line `console.log` in both test and source. **Root cause:** NextAuth v4's `CredentialsProvider({...})` factory returns `{ id, name, type, credentials, authorize: () => null, options }` - the user-supplied `authorize` lives on `.options.authorize`, while the top-level `.authorize` is a stub that always returns `null`. My test helper `getAuthorize()` had been reaching for the top-level (stub) and never invoked my real function. Fixed the helper to read `provider.options.authorize`. After the fix: 43/43 tests pass.
- Verified `npm run typecheck` clean, `npm run build` green (`/api/auth/[...nextauth]` and `/api/auth/register` show up as dynamic functions in the route table).

**Files changed:**

- `package.json` - update - added `bcryptjs@^2.4.3` (deps) and `@types/bcryptjs@^2.4.6` (devDeps); no script changes.
- `package-lock.json` - update - npm regenerated.
- `src/lib/auth/passwords.ts` - create - bcryptjs wrapper.
- `src/lib/auth/schemas.ts` - create - Zod schemas + username constants.
- `src/lib/auth/auth.ts` - update - replaced `export {};` stub with `authOptions` (Credentials provider + JWT callbacks).
- `src/types/next-auth.d.ts` - create - NextAuth module augmentation.
- `src/app/api/auth/[...nextauth]/route.ts` - create - catch-all route handler.
- `src/app/api/auth/register/route.ts` - create - registration endpoint with pre-check + unique-violation backstop.
- `src/lib/auth/passwords.test.ts` - create - 4 specs.
- `src/lib/auth/schemas.test.ts` - create - 27 specs.
- `src/lib/auth/auth.test.ts` - create - 6 specs.
- `src/app/api/auth/register/route.test.ts` - create - 6 specs.
- `claude/context.md` - update - Current State (Tech Stack, Architecture, Repository Layout, Build commands implied), Open Questions (1 closed: first test file; 2 new follow-ups: email-verification UX and auth rate-limiting), this Session History entry.

**Decisions made:**

- **`bcryptjs` (not `bcrypt`):** pure JS, no native bindings, deploys cleanly to Vercel/Docker/CI without `node-gyp` headaches. ~30% slower per hash than the native lib but cost 10 is still ~50–100ms - fine for an auth path.
- **Cost factor 10:** OWASP 2025 minimum, NextAuth default. Easy to bump in Stage 7 hardening once we benchmark prod hardware.
- **JWT, not DB sessions:** Credentials provider doesn't ship a DB-sessions story without a custom adapter + `sessions` table (which the schema deliberately doesn't have). JWT keeps the data layer unchanged and avoids a per-request DB lookup on every authenticated route.
- **Login by email only:** simpler. Username is the public slug for `/u/[username]/chat`, not a login identifier.
- **JWT payload kept minimal:** `id` + `username` + NextAuth's default `email`. `llmProvider`/`llmModel` are intentionally _not_ in the JWT - they can change (user switches provider in dashboard) and a stale JWT would make the chat API hit the wrong provider. The chat API will fetch these per request (one indexed lookup; cheap).
- **Enforce username rules at registration today:** prevents `users.username` from accumulating values that would later be invalid for Stage 4's `/u/[username]/chat` route (`Jane.Doe`, reserved slugs like `admin`/`api`/`u`/...). Same constraint, zero migration cost.
- **No login gate on `email_verified`:** Stage 7 owns the actual verify-email flow. Stage 1 leaves the column as `false` at registration; future "please verify" UX hooks into the existing flag without changing the schema.
- **Race-condition backstop with Postgres `code: 23505`:** the pre-check + `UNIQUE`-constraint combo handles concurrent registration without leaking a 500. Justified per CLAUDE.md §2 - this is a real concurrency case, not a hypothetical.
- **Module augmentation in `src/types/`:** keeps the cross-cutting NextAuth type extension out of the auth module itself; it's auto-picked-up by `tsconfig.json`'s `**/*.ts` include.
- **Skip-auth rate-limiting in Stage 1:** Stage 7's Redis-backed rate limiter wraps every endpoint uniformly. Adding an in-memory limiter just for auth now would mean rewriting it in Stage 7. Noted as an open gap.

**Open questions / follow-ups:**

- Email-verification UX (when Stage 7 lands the email-send flow).
- Auth-route rate limiting (Stage 7).
- Apply the Drizzle migration before Task 1.4's UI can talk to a live `/api/auth/register`.

---

### 2026-06-04 10:30 - Stage 1 Task 1.4: Login + register UI ported from design/login.html

**What was asked to do:** Port the login/register surface from `design/login.html` onto the existing `(auth)/login` and `(auth)/register` Next.js placeholders, wire the forms to the Task 1.3 backend (`POST /api/auth/register` + `signIn("credentials")`), and ship the design tokens (oklch palette + Bricolage Grotesque / Inter Tight fonts) into the project's Tailwind config - per `srs.md` FR-001 (email/password parts; OAuth + password-reset deferred to Stage 7).

**What I did:**

- Ported the design tokens from `design/login.html`'s inline `tailwind.config` and `design/assets/probot.css` into `tailwind.config.ts` (`theme.extend.colors` for the 8 oklch tokens, `theme.extend.fontFamily` pointing at CSS variables) and `src/app/globals.css` (`@layer components` with `.btn` family + `.brand-deep-gradient` + `.dot-pattern-light` + `.shadow-floating/soft`).
- Wired `next/font/google` (`Bricolage_Grotesque` + `Inter_Tight`) in `src/app/layout.tsx`, exposed as CSS variables `--font-display` / `--font-sans` that Tailwind reads.
- Mounted `SessionProvider` (new `src/lib/auth/session-provider.tsx`) in the root layout.
- Built shared `(auth)/layout.tsx` (lg:grid-cols-2 chrome) + `BrandPanel.tsx` (left server component with brand copy + sample chat card + trust badges, all inline SVGs).
- Built `OAuthDisabledRow.tsx` - Google + GitHub + LinkedIn buttons rendered `disabled` with absolute-positioned "SOON" badge (Q1=b).
- Built `LoginForm.tsx` ("use client") - `signIn("credentials", { redirect: false })` → push `/dashboard` on success, alert on error. "Forgot?" greyed with Stage-7 tooltip.
- Built `RegisterForm.tsx` ("use client") - POST `/api/auth/register` → auto `signIn` on 201 → push `/dashboard`. Surfaces server message on 409, first field error on 400, "Network error" on fetch reject; falls back to `/login` if auto-signin fails.
- Replaced the `return null` placeholders in `(auth)/login/page.tsx` and `(auth)/register/page.tsx` with metadata exports + form renders.
- Stood up the **component-test harness:** added `@vitejs/plugin-react`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom` to devDeps; updated `vitest.config.ts` (`plugins: [react()]`, `environmentMatchGlobs` → JSDOM for `.tsx`); wrote `src/test/setup.ts` that loads jest-dom matchers and calls `cleanup()` in `afterEach`.
- Wrote 10 component tests (4 for `LoginForm`, 6 for `RegisterForm`) - all green.
- Hit one gotcha: tests passed individually but failed when run together (duplicated "Create account" buttons in DOM). Root cause: `@testing-library/react`'s auto-cleanup wasn't firing. Fixed by adding explicit `afterEach(cleanup)` in `src/test/setup.ts`.
- Verified: `npm test` → **53 / 53 pass** across 6 files. `npm run typecheck` clean. `npm run build` green - `/login` 108 kB, `/register` 109 kB First Load JS, both under the 150 kB landing-page budget.

**Files changed:**

- `package.json` - update - added `@testing-library/jest-dom@^6.6.3`, `@testing-library/react@^16.1.0`, `@testing-library/user-event@^14.5.2`, `@vitejs/plugin-react@^4.3.4`, `jsdom@^25.0.1` to devDeps.
- `tailwind.config.ts` - update - `theme.extend.colors` (8 oklch tokens) + `theme.extend.fontFamily` (display + sans → CSS variables).
- `vitest.config.ts` - update - `plugins: [react()]`, `environmentMatchGlobs` for `.tsx` → jsdom, `setupFiles`, `src/test/**` in coverage exclude.
- `src/test/setup.ts` - create - jest-dom matchers + `afterEach(cleanup)`.
- `src/app/layout.tsx` - update - `next/font/google` (Bricolage Grotesque + Inter Tight) on `<html>`, body classes, `<SessionProvider>` wrap.
- `src/app/globals.css` - update - appended design-system layer.
- `src/lib/auth/session-provider.tsx` - create - `"use client"` `<NextAuthSessionProvider>` wrapper.
- `src/app/(auth)/layout.tsx` - create - lg:grid-cols-2 chrome.
- `src/components/auth/BrandPanel.tsx` - create - left panel + inline SVGs.
- `src/components/auth/OAuthDisabledRow.tsx` - create - disabled OAuth buttons with SOON badges.
- `src/components/auth/LoginForm.tsx` - create - client form, `signIn` flow.
- `src/components/auth/RegisterForm.tsx` - create - client form, POST + auto-signIn.
- `src/components/auth/LoginForm.test.tsx` - create - 4 specs.
- `src/components/auth/RegisterForm.test.tsx` - create - 6 specs.
- `src/app/(auth)/login/page.tsx` - update - metadata + `<LoginForm />`.
- `src/app/(auth)/register/page.tsx` - update - metadata + `<RegisterForm />`.
- `claude/context.md` - update - Tech Stack (Auth row extended, new Fonts and Testing-UI rows), this Session History entry.

**Decisions made:**

- **Two pages + shared `(auth)/layout.tsx`** (Q2=a). Real URLs + single chrome source.
- **OAuth + Forgot disabled with SOON badge** (Q1=b) - surface looks complete without dead UI.
- **`@testing-library/*` now** (Q3=a) - form-submit logic is where silent regressions hide.
- **`next/font/google`** (Q4=yes) - self-hosted at build time; no FOUC, no DNS round-trip.
- **Inline SVGs** (Q5=a) - no icon-lib payload tax.
- **CSS-variable bridge for fonts:** `next/font` writes `--font-display`/`--font-sans`; Tailwind's `fontFamily` reads them. Decouples font loader from design tokens.
- **Server-validation-only:** HTML5 attrs for trivial cases; rely on `/api/auth/register` 400 `details: parsed.error.flatten()` payload otherwise. No `react-hook-form` - KISS.
- **Auto-sign-in after registration:** lands user in `/dashboard` without typing the password twice; falls back to `/login` if `signIn` fails post-201.
- **Explicit `afterEach(cleanup)`** instead of relying on testing-library's "automatic" cleanup - more reliable across versions.
- **No tests on the static `BrandPanel`:** per web/testing.md, visual regression > markup snapshots on highly visual chrome. Manual smoke-test via `npm run dev`.

**Open questions / follow-ups:**

- Apply the Drizzle migration before the live `/api/auth/register` path is end-to-end exercisable - still queued from Task 1.2/1.3.
- `/dashboard` placeholder still returns null (Task 1.1) so the post-login redirect renders nothing. Cosmetic for now; Task 1.6 wires it.
- OAuth + password reset wiring lands in Stage 7 - the disabled buttons + greyed "Forgot?" make the gap visible.
- Visual regression / Playwright for auth surfaces - not in scope this turn; consider alongside chat UI tests in Task 1.7.

---

### 2026-06-04 15:25 - Stage 1 Task 1.5: Multi-provider LLM client abstraction + BYO key transport

**What was asked to do:** Multi-provider LLM clients + BYO key transport. Implement the provider registry (`src/lib/ai/providers/`) with a shared `LLMProvider` interface, real Anthropic and OpenAI adapters using the BYO key supplied per-request, and `src/lib/ai/key-transport.ts` that reads the `x-llm-api-key` header without ever logging or persisting the value. Stub Google + DeepSeek so the registry exposes all four names but the unimplemented two throw with a clear category. Locked answers Q1=a (KISS interface: `{ system, userMessage, … }` not `messages[]`), Q2=b (typed `ProviderError { category: "invalid_key" | "rate_limit" | "unknown" }`), Q3=a (stubs registered, throw on `complete()`), Q4=a (adapter-hardcoded default model).

**What I did:**

- Replaced the Task 1.1 `export {};` stub in `src/lib/ai/providers/types.ts` with the contract: `ProviderName = "anthropic" | "openai" | "google" | "deepseek"`, `CompleteParams { system, userMessage, apiKey, model?, maxTokens?, temperature? }`, `CompleteResult { reply }`, `LLMProvider { defaultModel, complete }`, `ProviderErrorCategory = "invalid_key" | "rate_limit" | "unknown"`, and the `ProviderError` class with a `toJSON()` override (defense-in-depth from code review - see Decisions).
- Wrote `src/lib/ai/key-transport.ts` - `readApiKey(headers: Headers): string` pulls the `x-llm-api-key` header, trims, and distinguishes `KeyTransportError` reasons `"missing" | "empty" | "too_short" | "too_long"` (the last three came from the code review's HIGH finding - splitting whitespace-only from below-MIN_LEN). Error messages reference the header name, never the value. `redactKey(key)` mask is `first4...last4`, returns `"***"` for keys ≤ 8 chars. No `console.*` in the file.
- Wrote the real `anthropic.ts` adapter - constructs `new Anthropic({ apiKey })` per request, sends `messages.create({ model, max_tokens, temperature, system, messages: [{role:"user", content: userMessage}] })`, extracts `response.content[0].text` with a guard for non-text blocks, maps SDK errors via `instanceof APIError` + `.status === 401|429` → `invalid_key|rate_limit`, default `claude-haiku-4-5` / 500 / 0.3.
- Wrote the real `openai.ts` adapter - same shape, but `chat.completions.create` with `messages: [{role:"system"}, {role:"user"}]`, extracts `response.choices[0]?.message?.content`, default `gpt-4o-mini` / 500 / 0.3.
- Wrote the `google.ts` and `deepseek.ts` stubs - registered with `defaultModel` strings (`gemini-1.5-flash`, `deepseek-chat`); `complete()` throws `ProviderError("…", "unknown", "… provider is not implemented in Stage 1")` and never echoes the apiKey.
- Wrote the registry in `src/lib/ai/providers/index.ts` - `PROVIDERS: Record<ProviderName, LLMProvider>`, `PROVIDER_NAMES: readonly ProviderName[]`, `getProvider(name)`, `isProviderName(value): value is ProviderName` (uses `Object.prototype.hasOwnProperty.call` to avoid prototype-chain footguns), and re-exports the entire types surface so Task 1.6/1.8 callers import only from `@/lib/ai/providers`.
- Wrote 48 specs across 6 test files: `key-transport.test.ts` (9), `anthropic.test.ts` (10 - includes the serialization bound), `openai.test.ts` (9), `google.test.ts` (3), `deepseek.test.ts` (3), `providers/index.test.ts` (14, includes `it.each` matrix for all 4 adapters in the registry). Total project tests: 53 → **101**, all green.
- Mocked the SDKs in tests via `vi.mock("@anthropic-ai/sdk", async () => ({ ...await vi.importActual(...), default: MockClass }))`. Every error-path test asserts the key value never appears in the thrown error's `.message`, **and** the serialization test asserts `JSON.stringify(providerError)` reveals only `{ name, provider, category, message }` - no `cause`, no original SDK error, no headers.
- Debug methodology when 3/9 anthropic tests failed on first run: error said `Right-hand side of 'instanceof' is not an object`. Root cause: adapter did `import Anthropic from "@anthropic-ai/sdk"` then `err instanceof Anthropic.APIError` - but the mock replaces only `default`, so `Anthropic.APIError` (static) was `undefined` at runtime. Fix: named import `import Anthropic, { APIError } from "@anthropic-ai/sdk"` then `err instanceof APIError`. Applied the same lesson upfront in `openai.ts`. (See learnings.md entry.)

**Files changed:**

- `src/lib/ai/providers/types.ts` - update - replaced `export {};` stub with `LLMProvider` interface, types, and `ProviderError` class (incl. `toJSON()`).
- `src/lib/ai/providers/anthropic.ts` - update - replaced `export {};` stub with the Anthropic adapter.
- `src/lib/ai/providers/openai.ts` - update - replaced `export {};` stub with the OpenAI adapter.
- `src/lib/ai/providers/google.ts` - update - replaced `export {};` stub with the throw-on-call stub.
- `src/lib/ai/providers/deepseek.ts` - update - same as google.
- `src/lib/ai/providers/index.ts` - update - replaced `export {};` stub with the registry + type re-exports.
- `src/lib/ai/key-transport.ts` - update - replaced `export {};` stub with `readApiKey`, `redactKey`, `KeyTransportError`.
- `src/lib/ai/key-transport.test.ts` - create - 9 specs.
- `src/lib/ai/providers/anthropic.test.ts` - create - 10 specs incl. serialization bound.
- `src/lib/ai/providers/openai.test.ts` - create - 9 specs.
- `src/lib/ai/providers/google.test.ts` - create - 3 specs.
- `src/lib/ai/providers/deepseek.test.ts` - create - 3 specs.
- `src/lib/ai/providers/index.test.ts` - create - 14 specs (registry assertions).
- `claude/context.md` - update - Current State (LLM clients row promoted from "stubs only" to "two real adapters + two stubs"), Repository Layout (providers/ + key-transport.ts marked Task 1.5 ✓), Open Questions (one entry trimmed: 1.4 removed; 1.5 removed; rewording for 1.6→1.8 ownership), this Session History entry.

**Decisions made:**

- **Per-request SDK clients (not singletons):** every `complete()` call does `new Anthropic({ apiKey })` / `new OpenAI({ apiKey })`. Reason: this is a BYO-key product - different requests carry different users' keys. Singletons would either pin to one key (wrong) or require runtime mutation of a shared client (race-prone). Per-request construction is cheap (just an object holding the key + a fetch wrapper) and isolates state.
- **Named-import `APIError`, not `SDK.APIError`:** the SDK's static `APIError` on the default-export class is lost when tests mock the default export. Named imports come straight from module-level exports and survive `vi.mock(..., { ...actual, default: Mock })`. Applies symmetrically to both adapters.
- **`ProviderError.toJSON()` for bounded serialization:** code review CRITICAL finding. Even though the current adapter never attaches `cause`, a future caller could; a structured logger calling `JSON.stringify(err)` would then leak SDK error headers (which may carry the raw `Authorization: Bearer <key>`). The override caps the serialized shape at `{ name, provider, category, message }` regardless of what callers attach.
- **`KeyTransportError` reasons split `"empty"` vs `"too_short"`:** code review HIGH finding. Whitespace-only header = "I forgot to send a key" (UX: "Add your API key in settings"). Non-empty but shorter than MIN_LEN = "I sent the wrong thing" (UX: "Your API key appears incomplete - paste the full value"). Conflating them was a precision bug.
- **Pushed back on three MEDIUM code-review suggestions** (rationale per CLAUDE.md §1: push back when warranted):
  1. `isProviderName` → keep `Object.prototype.hasOwnProperty.call(PROVIDERS, value)`. The reviewer's alternative `PROVIDER_NAMES.includes(value as ProviderName)` needs a type assertion inside the type guard, which defeats the guard.
  2. Don't unify `readApiKey`'s MIN_LEN (validation threshold) with `redactKey`'s `<= 8` (display threshold). They serve different concerns; coincidental equality.
  3. Don't extract `DEFAULT_MAX_TOKENS = 500` / `DEFAULT_TEMPERATURE = 0.3` to a shared module. Per-provider tuning will diverge as we benchmark; premature DRY.
- **Stubs registered, not omitted (Q3=a):** the user picks `users.llm_provider` in Task 1.6's Bot Factory; if Stage 1 only shows `anthropic` + `openai`, the registry doesn't need `google`/`deepseek` yet. But registering them means the file structure is final and the UI can choose to grey-list them rather than hide them. The throw-on-`complete()` shape gives a useful runtime error if anything sneaks past UI gating.
- **`toJSON()` defense-in-depth tested via real serialization round-trip:** the test runs `JSON.stringify(caught)` then `JSON.parse`, asserts exact key set, and scans the raw string for the apiKey marker. This catches future regressions where someone might add a `cause` field on `ProviderError` and forget to update `toJSON()`.
- **Built without `console.*` and verified by grep:** zero `console.*` calls in `src/lib/ai/key-transport.ts` and `src/lib/ai/providers/*.ts` (verified post-build).
- **No SDK error message propagated into `ProviderError.message`:** all map functions construct fresh strings like `"Anthropic rejected the API key"` instead of `err.message`. SDK error messages can include the request payload (which includes the BYO key in `Authorization` header). Defense in depth.

**Open questions / follow-ups:**

- Real Google + DeepSeek adapters - out of Stage 1 scope; lands when those providers' first paying customer/test user appears.
- Streaming `complete()` - VAi was non-streaming; not in scope. Stage 5/6 may revisit if widget UX needs token-by-token rendering.
- `usage`/`tokens` field on `CompleteResult` - Stage 6 analytics will likely add this. Today not needed.
- Retry / circuit-breaker - Stage 7 hardening territory.
- The chat API route (`/api/chat/[botId]/route.ts`) that wires `readApiKey` → `getProvider(user.llm_provider).complete({…, apiKey})` → `sanitizeOutput` is Task 1.8.
- Browser-side key store (`src/lib/client/llm-key-store.ts`) is Task 1.6.

---

### 2026-06-04 18:20 - Stage 1 Tasks 1.6 + 1.7: Bot Factory + Browser Key Store + Chat UI port

**What was asked to do:** Bot Factory form + browser key store (Task 1.6) and Chat UI port from VAi (Task 1.7). Per Q1=a we ran them as one feature-dev session but built them sequentially (1.6 to green → 1.7) so the chat UI's `getApiKey()` consumer landed against a working store. Q2=a (5 steps with Stage-1-trimmed content per step), Q3=a (one bot per user, upsert), Q4=a (`react-markdown` + `remark-gfm`), Q5=b (rotating loading messages, user-customizable in settings - Stage 7 owns the editor; Stage 1 ships the column + UI consumer with sensible defaults).

**What I did:**

- **Schema delta:** added `bots.loading_messages jsonb NOT NULL DEFAULT '[...4 strings...]'::jsonb` and regenerated migration `drizzle/0001_spotty_blizzard.sql`. The existing un-applied `0000_*` migration is now joined by this one; both are applied together with `npm run db:migrate`.
- **`src/lib/client/llm-key-store.ts`** - `getApiKey`, `setApiKey`, `clearApiKey` over `localStorage` under `probot.llm.key.v1`. SSR-safe via `typeof window` + `typeof window.localStorage` guard. Trims whitespace on read+write; empty-after-trim is treated as clear. Test runs with `// @vitest-environment jsdom` pragma.
- **`src/lib/bots/schemas.ts`** - Zod `botInput` (isomorphic) + exported `PERSONALITY_PRESETS = ["professional", "creative", "enthusiastic"] as const` + `Personality` type. `llmProvider` enum is derived from Task 1.5's `PROVIDER_NAMES` so the two never drift. `name` and `contextText` go through a `transform→trim→refine` chain that catches whitespace-only inputs (the same Zod pattern the auth schemas use).
- **`src/app/api/bots/route.ts`** - `POST` handler. Auth-gates via `getServerSession(authOptions)` → 401. Validates with `botInput.safeParse` → 400 with `details: error.flatten()`. Runs everything in `db.transaction(async (tx) => …)`: updates `users.llmProvider`/`llmModel`, finds existing bot for this user, then either `update().returning()` (200) or `insert().values().returning()` (201). One bot per user (Q3=a) is enforced at the app layer, not the schema (no UNIQUE constraint), so the future per-user-N-bots transition needs no migration. The BYO API key is never named in the route - the Zod schema has no `apiKey` field, and there's a dedicated test that submits a body containing a leak-canary `apiKey` field and asserts the persisted row's serialized JSON does not contain it.
- **`src/components/bot-factory/BotFactoryForm.tsx`** - single consolidated client component (~600 lines, within the 800-max guideline). State owner: `step (1-5)`, `form`, `newQuestion`, `submitting`, `error`, `createdBotId`. Renders inline `<StepperHeader />` + current step + nav buttons + `<LivePreview />`. Step files (StepIdentity / StepKnowledge / StepPersonality / StepAIModel / StepDeploy) are colocated functions in the same file rather than separate modules - deviation from the original blueprint's 8-file plan, taken because the per-step JSX is simple presentational and the GateGuard fact-forcing hook makes 8 file creations expensive without clarity gain. On Step 4 Continue: `setApiKey(form.apiKey)` is called **before** the `fetch` so the key is captured locally even if the request hangs. Fetch body intentionally omits `apiKey`; the test asserts the raw `init.body` string does not contain the key value.
- **Wired `/dashboard/bots/new/page.tsx`** as a server component that auth-gates (redirect to `/login?next=…` on no session), preloads the existing bot + user LLM prefs, and renders `<BotFactoryForm />` in edit-or-create mode.
- **`src/components/chat/types.ts`** - `ChatMessage` discriminated union with three variants: `{id, role:"user", text}`, `{id, role:"assistant", text}`, `{id, role:"assistant", rateLimitMessage:true}`. The `id` field was added during code review (HIGH finding - see below).
- **`src/components/chat/MessageBubble.tsx`** - renders user (right-aligned brand bubble), assistant text (markdown via `<ReactMarkdown remarkPlugins={[remarkGfm]} components={{a: SafeLink}}>`), and the rate-limit sentinel as a special rose card with `role="alert"`. `SafeLink` rewrites every `<a>` to include `rel="noopener noreferrer" target="_blank"`. Test asserts no actual `<img>` tag renders even when the bot text contains `<img onerror=…>` (react-markdown escapes HTML by default; no `rehypeRaw`).
- **`src/components/chat/LoadingAnimation.tsx`** - three CSS-bounced dots + a rotating message that cycles every 3s. `useEffect` mounts a `setInterval` and clears it on unmount; the `if (messages.length <= 1)` guard avoids both a divide-by-zero risk (modulo by 0 → NaN) and a degenerate "cycle of 1" interval. Fake-timer test asserts wrap-around and cleanup.
- **`src/components/chat/ChatWindow.tsx`** - top-level state owner. State: `messages`, `input`, `loading`, `missingKey`. On submit: `getApiKey()` → if null, set `missingKey` and bail without calling `fetch`. Otherwise `fetch("/api/chat/${botId}", { headers: { "x-llm-api-key": apiKey }, body: JSON.stringify({ message }) })`. 429 → push rate-limit sentinel; other !ok → generic error bubble; throw → "Network error" bubble. Auto-scrolls on every message change. Inlines `ChatHeader` + `SuggestedQuestions` (folded the unused stub `SuggestedQuestions.tsx` into this file and deleted the stub).
- **Wired `/u/[username]/chat/page.tsx`** - server component that auth-gates (Stage 1; Stage 4 removes the gate per plan.md), resolves `username → user → bot` via Drizzle, and renders `<ChatWindow ... loadingMessages={bot.loadingMessages} />`. `generateMetadata` provides `<title>`.
- **Added dependencies:** `react-markdown@^9.1.0` + `remark-gfm@^4.0.1`. Chose `^9` over `^10` because v10 requires React 19 and the project pins React 18.
- **Code review applied:** 1 HIGH (array-index keys on the mutable messages list - added synthetic `id` to `ChatMessage` so future Task 1.8 retry-replace logic doesn't reconcile the wrong nodes); 1 MEDIUM (`LoadingAnimation` dep changed `[messages.length]` → `[messages]` for ESLint exhaustive-deps cleanliness); 1 MEDIUM (`BotFactoryForm` now guards `initialLlmModel` against values not present in current `MODEL_OPTIONS` - falls back to the first option so the `<select>` is never desynced from form state). Pushed back on one MEDIUM (sharing an 8-char threshold constant between `BotFactoryForm.stepIsValid(4)` and `key-transport.MIN_LEN`) per CLAUDE.md §2 - the two layers serve different concerns (loose UI guard vs strict server contract) and coincidental equality is fine.
- **Debugging note:** the `ChatWindow.test.tsx` first run failed 5/7 specs with "Multiple elements found" for `getByLabelText(/message/i)` - both the textarea (`aria-label="Message"`) and the send button (`aria-label="Send message"`) matched. Fixed by switching to `getByRole("textbox")` which uniquely identifies the textarea. Same root cause as the auth-form cleanup gotcha in Task 1.4 - overly fuzzy regex selectors collide as the markup grows.
- **Verified:** `npm run typecheck` clean. `npm test` → **161 / 161** across 19 files (was 101 after Task 1.5; +60 new). `npm run build` green - `/dashboard/bots/new` 151 kB, `/u/[username]/chat` 142 kB First Load JS (both within 300 kB app-page budget per web/performance.md). Zero `console.*` in any new file.

**Files changed:**

- `package.json` - update - added `react-markdown@^9.1.0` + `remark-gfm@^4.0.1` to deps.
- `src/lib/db/schema.ts` - update - added `loadingMessages` jsonb column with DB default (4 strings) + `sql` import from drizzle-orm.
- `drizzle/0001_spotty_blizzard.sql` - create (generated) - one-statement ALTER TABLE adding `loading_messages`.
- `src/lib/client/llm-key-store.ts` - update - replaced `export {};` stub with `getApiKey`/`setApiKey`/`clearApiKey` over localStorage.
- `src/lib/client/llm-key-store.test.ts` - create - 6 specs (jsdom env).
- `src/lib/bots/schemas.ts` - create - Zod `botInput` + `PERSONALITY_PRESETS`.
- `src/lib/bots/schemas.test.ts` - create - 22 specs (it.each matrices).
- `src/app/api/bots/route.ts` - create - POST handler with auth + transaction + upsert.
- `src/app/api/bots/route.test.ts` - create - 6 specs incl. BYO-key leak-canary.
- `src/components/bot-factory/BotFactoryForm.tsx` - update - replaced `export {};` stub with the consolidated form (~600 lines).
- `src/components/bot-factory/BotFactoryForm.test.tsx` - create - 8 specs.
- `src/app/(dashboard)/dashboard/bots/new/page.tsx` - update - replaced `return null` with auth-gated server component.
- `src/components/chat/types.ts` - create - `ChatMessage` discriminated union (with `id`).
- `src/components/chat/MessageBubble.tsx` - update - replaced `export {};` stub with markdown bubble + `SafeLink`.
- `src/components/chat/MessageBubble.test.tsx` - create - 5 specs (user/bot/links/sentinel/XSS).
- `src/components/chat/LoadingAnimation.tsx` - update - replaced `export {};` stub with cycling dots + message.
- `src/components/chat/LoadingAnimation.test.tsx` - create - 6 specs (fake timers).
- `src/components/chat/ChatWindow.tsx` - update - replaced `export {};` stub with top-level chat component.
- `src/components/chat/ChatWindow.test.tsx` - create - 7 specs incl. BYO-key header-vs-body assertion.
- `src/components/chat/SuggestedQuestions.tsx` - delete - folded into ChatWindow (was an unused stub).
- `src/app/u/[username]/chat/page.tsx` - update - replaced `return null` with auth-gated chat page server component.
- `claude/context.md` - update - Tech Stack (Markdown row; bots-table loading_messages note), Open Questions (closed 1.6 + 1.7; 1.8 promoted), this Session History entry.

**Decisions made:**

- **Consolidated bot-factory into one file (deviation):** the original blueprint specified 8 separate component files for the bot factory (BotFactoryForm + StepperHeader + LivePreview + 5 step files). Consolidated into one `BotFactoryForm.tsx` (~600 lines) because (a) per-step JSX is simple presentational, (b) the GateGuard fact-forcing hook makes 8 file-creation cycles expensive without clarity gain, and (c) the file is well within the 800-line max from `~/.claude/rules/ecc/common/coding-style.md`. The 5 step renderers are colocated functions in the same file. Cleaner reviewable diff.
- **`react-markdown@^9` not `^10`:** v10 requires React 19; we pin React 18. v9 is feature-equivalent for our needs (GFM tables, lists, code, links via custom components).
- **`SafeLink` over a rehype plugin for link safety:** simpler - passing a `components: { a: SafeLink }` map to ReactMarkdown is one line and locally readable. The alternative (`rehype-external-links`) would add another dep for the same outcome.
- **No `rehypeRaw`:** by default react-markdown does NOT render raw HTML in the source string. We rely on this so that bot replies containing `<img onerror="…">` or `<script>` cannot inject DOM. The test asserts no `<img>` element renders even when the input contains one. Adding `rehypeRaw` would un-do this protection.
- **`bots.loading_messages` as a per-bot DB column (Q5b):** the user wants customizable rotating messages. Adding the column now (with sane defaults) means Stage 7's settings page is a UI-only addition - no schema migration required at that point. The Stage 1 bot factory does NOT expose an editor for these (settings UX is Stage 7); the chat UI reads `bot.loadingMessages` directly via props.
- **One bot per user enforced at the app layer (not the schema):** plan.md keeps `bots.user_id` without UNIQUE so a future Stage 6 dashboard can support multiple bots. The Stage 1 `POST /api/bots` does `findFirst` → update-or-insert, treating the user's row count as 0 or 1.
- **Single transaction for bot + user-pref update:** prevents the half-state where `users.llm_provider` updates but the bot insert fails (or vice versa). The `db.transaction(...)` wraps both writes; either both commit or neither does.
- **Sequential implementation (Q1=a):** built 1.6 to green checkpoint (143 tests) before starting 1.7. The chat UI's `getApiKey()` consumer landed against an already-tested store. If a regression appeared in 1.7, it was clearly in chat code, not the key store.
- **`crypto.randomUUID()` for chat message ids with a fallback:** in jsdom (test env) and older browsers, `crypto.randomUUID()` may be unavailable. `newId()` falls back to `Date.now()`+random. Used only for React reconciliation keys; not for security identifiers.
- **Auth-gated chat page in Stage 1 (will become public in Stage 4):** plan.md §4.1 specifies that `/u/[username]/chat` becomes public no-auth in Stage 4. The Stage 1 implementation includes the `getServerSession` check; Stage 4 removes those four lines and the page becomes truly public. No path or component refactor required.
- **No `dangerouslySetInnerHTML` anywhere in the chat stack:** all bot output goes through react-markdown's React tree. Defense in depth on top of the server-side `sanitizeOutput` that Task 1.8 will add.

**Open questions / follow-ups:**

- **Apply the Drizzle migrations** (now `0000_*` + `0001_*`) before any UI flow can hit a live `/api/bots` or chat path end-to-end. Both can be applied in order via `npm run db:migrate` against the Postgres instance - still queued from Task 1.2.
- **Task 1.8** - the chat API route (`POST /api/chat/[botId]`) is the next and final Stage 1 task. The Task 1.7 chat UI already calls this endpoint; it will 404 until 1.8 ships. Task 1.8 wires `readApiKey(req.headers)` → `getProvider(bot.user.llmProvider).complete({ system, userMessage, apiKey })` → `sanitizeOutput`. The `system` prompt builder and the input/output sanitizers (`prompt-builder.ts`, `sanitize-input.ts`, `sanitize-output.ts`) are still stubs from Task 1.1 and will land alongside 1.8.
- **Settings page** (Stage 7) - the editor for `bots.loading_messages`, theme color, custom instructions, and OAuth providers.
- **Visual regression / Playwright for chat surface** - not in scope this turn; pair with Task 1.8 when there's a real backend to drive.
- **`/dashboard` placeholder still returns null** - the post-login redirect still lands on an empty page. Cosmetic. Stage 6 dashboard owns the real implementation.

---

### 2026-06-04 15:40 - Stage 1 Task 1.8: Chat API + sanitizers + rate limit (Stage 1 close-out)

**What was asked to do:** Build the chat API route at `POST /api/chat/[botId]` - the final piece of Stage 1. The route reads the BYO `x-llm-api-key` header (Task 1.5), resolves botId → bot+owner via Drizzle, runs the user's message through input sanitization + system-prompt construction + provider dispatch + output sanitization, and returns `{ reply }` or a structured error. Includes a per-bot two-tier in-memory rate limiter (Stage 7 swaps to Redis). Locked Q1=a (per-bot rate limit, not per-IP), Q2=a (no route-level auth - page-level gate is enough for Stage 1, route ready for Stage 4), Q3=a (400 + structured `{ error }` for missing/bad BYO key, not 401), Q4=a (hardcoded prose personality blocks).

**What I did:**

- Wrote `src/lib/ai/sanitize-input.ts` (replaced `export {};` stub) - Unicode normalization pipeline (zero-width strip, fullwidth → ASCII via `String.fromCharCode(ch - 0xfee0)`, Cyrillic homoglyph map for `аеорсуіѕ → aeopcyis`, whitespace collapse), 8000-char cap (post-normalization, so 9000 chars of zero-width collapses to "empty" not "too_long"), and ~35 blocked regex patterns grouped by category (prompt injection prefixes, role overrides, instruction markers, jailbreak handles, credential probes, social engineering, system-prompt extraction, image/media generation). Returns `{ ok: true; message } | { ok: false; reason: "empty" | "too_long" | "blocked" }`. Reason **never echoes the raw input** - tested with two distinctive canaries (one for blocked, one for too_long).
- Wrote `src/lib/ai/prompt-builder.ts` (replaced stub) - `PERSONALITY_PROMPTS: Record<Personality, string>` with 3 hardcoded prose blocks (professional/creative/enthusiastic, ~30-40 words each), `buildSystemPrompt({ bot, ownerUsername })` assembles identity → 7 immutable rules (verbatim from VAi, adapted for multi-tenant) → personality block → response style guidelines → unknown-answer template (substitutes `{NAME}` with `bot.name`) → `## CONTEXT` plain prose section. Never JSON-serializes the bot object.
- Wrote `src/lib/ai/sanitize-output.ts` (replaced stub) - checks 8 rule-marker strings (`IMMUTABLE RULES`, `cannot be overridden`, `system prompt`, etc.), JSON-dump regex (`\{\s*\n\s*"[a-z_]+\s*":`), 4 credential patterns (`sk-…`, `Bearer …`, `api[_-]?key`, `Authorization:…`). On any hit returns a fixed fallback string - fallback **never echoes the dirty reply** (defense in depth: server logs that record the sanitized output can't reveal what was hidden). Trims + truncates over 1500 chars with `…`.
- Wrote `src/lib/ai/rate-limit.ts` (new file, not a stub) - `checkRateLimit(botId, now?): { ok } | { ok: false, scope, resetAt }`. Two `Map<string, number[]>` (minuteBuckets, dayBuckets) with sliding-window timestamp arrays. Per-day rejection rolls back the per-minute slot it just consumed to avoid double-charging rejected requests. Defaults 10/min + 50/day, env-overridable via `PROBOT_RATE_PER_MINUTE` / `PROBOT_RATE_PER_DAY`. Test helper `__resetRateLimitState()`. Stage 7 swaps to Upstash Redis per plan.md §7.4 without changing the caller-facing shape.
- Wrote `src/app/api/chat/[botId]/route.ts` - `POST` handler. 12-step orchestration: Content-Type === `application/json` → 415; readApiKey (cheap fast-fail before reading body) → 400 `missing_llm_key`; `request.text()` size cap 16 KB → 413 (chose body-text-then-parse over header-only check after code review; Content-Length is client-spoofable); `JSON.parse` → 400 `invalid_json`; Zod `{ message: string (1..8000) }` → 400 `validation_failed`; `db.query.bots.findFirst` with `isActive=true` → 404 `bot_not_found`; owner lookup for `llmProvider`/`llmModel` → 404 if missing; `checkRateLimit(bot.id)` → 429 with `{ scope, resetAt }`; `sanitizeInput` → 400 `blocked` with `reason`; `isProviderName` guard against DB-drift → 502; `buildSystemPrompt(...)`; `getProvider(...).complete({ system, userMessage, apiKey, model })` wrapped in try/catch that maps `ProviderError.category` (invalid_key → 400 `invalid_llm_key`, rate_limit → 429 `provider_rate_limit`, unknown → 502 `provider_unavailable`); `sanitizeOutput` → 200 `{ reply }`. The route is intentionally **not auth-gated** (page-level gate is enough for Stage 1; Stage 4 will remove the page gate with zero route changes).
- Wrote 65 specs across 5 test files: `sanitize-input.test.ts` (29), `prompt-builder.test.ts` (7), `sanitize-output.test.ts` (10), `rate-limit.test.ts` (6), `chat/[botId]/route.test.ts` (13). Total project tests: **226 / 226** across 24 files (was 161 after Task 1.7; +65 new).
- Applied 2 HIGH + 2 MEDIUM findings from code review: (1) replaced `.push()` + `.pop()` mutations in `rate-limit.ts` with `slice()` + spread (CLAUDE.md §2 immutability + concurrent-millisecond rollback hazard); (2) dropped the dead `_bot` second parameter from `sanitizeOutput` - was misleading API; (3) replaced spoofable `Content-Length` header check with `request.text()` then length-check then `JSON.parse` (same I/O cost, actually enforced); (4) changed `<= cutoff` to `< cutoff` in `pruneAndCheck` so boundary timestamps stay live (matches docstring). Pushed back on 2 MEDIUM: `\p{Cf}` over-strips legitimate format characters, and `isPersonality` reads `PERSONALITY_PRESETS` directly (no duplication; the fallback exists as DB-drift defense).
- Verified: `npm run typecheck` clean. `npm test` → **226 / 226** across 24 files. `npm run build` green - `/api/chat/[botId]` shows up as ƒ dynamic in the route table; full route table unchanged otherwise. Zero `console.*` in any new file.

**Files changed:**

- `src/lib/ai/sanitize-input.ts` - update - replaced `export {};` stub with normalization + 35 blocked patterns (~140 lines).
- `src/lib/ai/sanitize-input.test.ts` - create - 29 specs.
- `src/lib/ai/prompt-builder.ts` - update - replaced `export {};` stub with `buildSystemPrompt` + `PERSONALITY_PROMPTS` (~80 lines).
- `src/lib/ai/prompt-builder.test.ts` - create - 7 specs.
- `src/lib/ai/sanitize-output.ts` - update - replaced `export {};` stub with 4 leakage checks + truncate (~50 lines).
- `src/lib/ai/sanitize-output.test.ts` - create - 10 specs.
- `src/lib/ai/rate-limit.ts` - create - sliding-window two-tier in-memory limiter (~85 lines).
- `src/lib/ai/rate-limit.test.ts` - create - 6 specs.
- `src/app/api/chat/[botId]/route.ts` - create - POST handler (~160 lines).
- `src/app/api/chat/[botId]/route.test.ts` - create - 13 specs incl. BYO-key canary scan.
- `claude/context.md` - update - Status (Stage 1 complete), Architecture (sanitization / prompt-builder / rate-limit / chat route blocks), Repository Layout, Open Questions (Stage 1 fully closed; carried items grouped by stage), this Session History entry.

**Decisions made:**

- **Body-text-then-parse over header check (MEDIUM 1 fix):** the Content-Length HTTP header is a client hint and can be spoofed/omitted. Reading via `await request.text()` and measuring the actual byte count enforces the 16 KB cap reliably. Same I/O cost as `request.json()` (both read the entire body); the `.length` check is O(1).
- **`readApiKey` fast-fails BEFORE body read:** the cheapest, most-likely-to-trip guard runs first. A request missing the key wastes zero I/O.
- **Per-bot rate limit (Q1=a, not per-IP):** ProBot is BYO-key - the limit exists to protect the bot owner's LLM credits, not ProBot infrastructure. The bot owner's `botId` is the natural scope. Aligns with plan.md §7.4 which puts per-bot overrides on the bots table.
- **Per-day rollback of the per-minute slot:** if the per-day window blocks, we pop the per-minute timestamp we just appended. Otherwise a single bot's first request of the day at exactly 11:59:59 PM would consume two slots - one per-minute (legitimately) and one per-day (rejected). Tests cover the isolation and the boundary; the pop is immutable (`slice(0, -1)`) per code review HIGH 1.
- **`sanitizeOutput` takes only `raw`, no bot context (HIGH 2 fix):** original blueprint accepted a `bot` param for future per-bot context-leakage detection (e.g., bot.name + "system prompt" co-occurrence). Implementation never used it. Removed to match KISS - Stage 7 hardening can add it back with a real consumer.
- **`<` not `<=` for window cutoff (MEDIUM 2 fix):** the docstring says "entries within the last `windowMs`", which means strictly newer than `now - windowMs`. Boundary entries stay live. Sub-millisecond correctness alignment with the doc.
- **In-memory rate limit, no cleanup timer:** Vercel cold-starts naturally bound memory; self-hosted long-lived processes accumulate one array per bot ever seen (10-50 timestamps each). Stage 7's Redis swap supersedes. Per CLAUDE.md §2 - don't engineer a cleanup pass for a code path that will be replaced.
- **7 immutable rules verbatim from VAi, no personality preset in VAi → 3 added for ProBot:** the rules are battle-tested prompt-injection defenses; ported as-is. The personality preset slot is ProBot-specific (VAi was single-tenant Vishal). Hardcoded prose blocks rather than single-line guidance (Q4=a) so the model has enough surface to actually distinguish tones.
- **All `ProviderError.message` strings are dropped in favor of fixed status-code responses:** the route never echoes a provider's error message into its own response body. Defense in depth on top of Task 1.5's `ProviderError.toJSON()` bound - even if a future caller serialized the error, the bound is still there.
- **No auth check on the route (Q2=a):** the chat _page_ in Stage 1 is auth-gated (`/u/[username]/chat/page.tsx` redirects to `/login`). When Stage 4 makes the page public, the route doesn't change. Defensive route-level auth would have created churn in Stage 4.
- **No conversation/message logging (deferred to Stage 4/6):** plan.md §4.5 introduces the `conversations` + `messages` tables in Stage 4; Stage 6's dashboard owns the analytics surface. Adding either now is YAGNI.

**Open questions / follow-ups:**

- Real Google + DeepSeek adapters - when those providers' first paying customer/test user appears.
- Streaming `complete()` - Stage 5/6 if widget needs token-by-token rendering.
- Redis-backed rate limiter - Stage 7 hardening.
- Conversation logging - Stage 4 schema, Stage 6 UI.
- The Stage 1 loop is complete; next step is Stage 2 (PDF + URL ingestion per plan.md).

---

### 2026-06-18 19:53 - Stage 2: PDF ingestion pipeline (Slices 2.1 + 2.2 + refactor-clean)

**What was asked to do:** Ship Stage 2 of plan.md - the data ingestion pipeline. Users should be able to upload PDFs (resume / LinkedIn export / any career PDF) in the Bot Factory, paste text, or both. The system extracts text from PDFs, chunks it with token boundaries, persists chunks in a new `knowledge_base` table, and reassembles the bot's `context_text` server-side so the Stage 1 chat route keeps working unchanged. Constrained to **zero-cost** infra per CLAUDE.md §7 (no S3, no paid services) - PDFs are processed in memory and only extracted text persists.

**Locked decisions before any code (Q1-Q8):** Q1=b (transient-only file storage), Q2=b (defer profile photo to Stage 6), Q3 (drop URL scraping entirely - PDF-only ingestion), Q4=a (`tiktoken cl100k_base` as the cross-provider token approximation), Q5=b (per-source replace on re-upload), Q6=b (two slices: schema+libs, then routes+UI), Q7=a (default 12_000 token cap with per-bot override + warning), Q8=a (per-bot `bots.context_token_cap` column surfaced as Bot Factory Advanced disclosure, NOT a dedicated Settings page).

**What I did:**

_Slice 2.1 - schema + ingestion libs:_

- Installed `pdf-parse@^1.1.1`, `tiktoken@^1`, `@types/pdf-parse` (3 packages total, all open-source, zero runtime cost).
- Schema: added `knowledge_base` table (uuid pk, bot_id FK with ON DELETE CASCADE, source_type varchar(10), source_name varchar(255), content_text text, chunk_index int, token_count int, created_at; indexes on bot_id and (bot_id, source_name)) and `bots.context_token_cap` column (default 12000). Drizzle generated `0004_late_vermin.sql`. User applied to Supabase before Slice 2.2.
- `src/lib/ingestion/errors.ts` - `IngestionError` class + 6-category union (`invalid_file_type | file_too_large | too_many_files | pdf_unreadable | empty_extract | empty_input`). One taxonomy across the lib so the route handler has a single switch to map to HTTP status codes.
- `src/lib/ingestion/chunk.ts` - `chunkText(text, opts?)` using tiktoken `cl100k_base`. Encoder cached at module scope (`__resetEncoder()` test helper does `enc.free()` to release the WASM instance between vitest runs). Default 750-token target with 100-token overlap. Throws `IngestionError("empty_input")` on whitespace-only input. Decodes each window through `TextDecoder("utf-8")` since `Tiktoken.decode` returns `Uint8Array`.
- `src/lib/ingestion/extract-pdf.ts` - `extractPdfText(buffer): Promise<string>`. Magic-byte check (`%PDF-` head) → size check (`MAX_PDF_BYTES = 10MB`) → dynamic `import("pdf-parse/lib/pdf-parse.js")` (subpath, NOT package root - avoids the v1.1.1 demo-code-on-import bug that crashes Next.js bundling) → `pdf-parse` → empty-extract check. Each failure throws a typed `IngestionError`. `cachedPdfParse` memoizes the dynamic import so subsequent calls in the same Node process skip the import.
- `src/lib/ingestion/assemble.ts` - pure `assembleFromChunks(chunks, tokenCap): { text, totalTokens, truncated }` (sorts by `(sourceName, chunkIndex)`, joins with `\n\n`, stops when adding the next chunk would exceed `tokenCap`) + DB-facing `assembleAndSaveBotContext(botId)` (reads bot's cap, reads all rows, assembles, UPDATEs `bots.context_text`) + `deleteSource(botId, sourceName)` (per-source replace primitive). Comment explicitly notes the Stage 2 redundancy tradeoff: overlapping chunks ARE concatenated as-is (~13% redundancy) because Stage 3 RAG replaces this whole path.
- `src/types/pdf-parse.d.ts` - ambient declaration for the `pdf-parse/lib/pdf-parse.js` subpath since `@types/pdf-parse` only types the package root.
- Tests: chunk (11 specs covering empty-input, whitespace, single-chunk, multi-chunk monotonic indices, overlap verification by word-set intersection, full-coverage union, invalid opts), extract-pdf (5 specs: empty buffer, oversize, non-PDF magic, PDF-magic-but-corrupt accepting either `pdf_unreadable` OR `empty_extract` as legitimate failure modes, public constants), assemble (9 specs: empty input, deterministic ordering, separator, exact-cap fit, over-cap truncation, zero-cap edge cases, no-mutation invariant). All green.
- Verified `npm run typecheck` clean, `npm test` 287/287 across 27 files (was 226 + 25 ingestion + 36 from work done outside this session like OAuth/magic-link/Azure), `npm run build` green.

_Slice 2.2 - knowledge endpoints + Bot Factory dropzone:_

- Loosened `botInput.contextText` Zod schema to accept empty string (PDF-only flows need this) and added `contextTokenCap` (optional, bounded `[CONTEXT_TOKEN_CAP_MIN=1_000, CONTEXT_TOKEN_CAP_MAX=100_000]`, default constant exposed as `CONTEXT_TOKEN_CAP_DEFAULT=12_000`). Two existing schema tests that asserted "empty contextText is rejected" got rewritten to reflect the new contract.
- Updated `POST /api/bots` to write `contextTokenCap` only when the request supplies it (spread-conditional preserves the DB default for clients that don't send it). Updated `/dashboard/bots/new/page.tsx` to pass the existing bot's `contextTokenCap` to the form so the Advanced field shows the current value, not the default, when editing.
- `src/lib/bots/require-bot-owner.ts` - shared helper for the four knowledge routes. Returns `{ ok: true, bot, userId } | { ok: false, response: NextResponse }` so callers do `if (!owner.ok) return owner.response;` - no throw/catch detour for auth failures.
- `POST /api/bots/[botId]/knowledge` (`route.ts`) - multipart entrypoint. Content-Type validation (`multipart/form-data` only) → `requireBotOwner` → form parse → require at least one of `{text, files[]}` → ≤5 files → one-time backward-compat migration (if `knowledge_base` is empty AND `bot.context_text` is non-empty, seed a `manual_text` source from the existing prose first, so Stage 1 bots don't lose their content when they first add a PDF) → per-source replace by filename → extract → chunk → bulk insert → `assembleAndSaveBotContext` → 200 with `{ sources, totalTokens, truncated }`. Errors map: `file_too_large → 413`, `invalid_file_type → 415`, `too_many_files → 400`, `pdf_unreadable | empty_extract | empty_input → 422`.
- `GET /api/bots/[botId]/knowledge` - returns sources grouped by name with chunk + token totals, plus the bot's current `contextTokenCap`. Tiny - `requireBotOwner` + `summarizeSources` (reused from the POST handler).
- `DELETE /api/bots/[botId]/knowledge/sources/[sourceName]` - per-source removal. URL-decodes the source name, returns 404 if zero rows removed, reassembles afterward.
- `POST /api/bots/[botId]/knowledge/reprocess` - reassembles without re-extraction (handy when the user changes their `contextTokenCap` and wants the chat path to pick up the new bound without re-uploading anything).
- 12 specs for the POST route (mocking `requireBotOwner`, `extractPdfText`, `chunkText`, `assembleAndSaveBotContext`, `deleteSource`, and the DB layer). Coverage: auth denial, non-multipart 415, empty payload 400, >5 files 400, text-only happy path, PDF happy path, PDF+text combined, seed-from-contextText migration (both presence and absence), `file_too_large → 413`, `pdf_unreadable → 422`, non-PDF mime → 415.
- BotFactoryForm Step 2 rewrite: replaced the Stage 1 placeholder dropzone with a real drag-and-drop file picker (`<label for="bf-pdf-input">` as the drop target wraps a hidden `<input type="file" multiple accept="application/pdf,.pdf">`; `onDragOver`/`onDragLeave`/`onDrop` toggle a `dragOver` style; mime + size + dedupe + cap validation runs client-side first as a UX nicety, server still re-validates). File list with per-file Remove buttons. Helper text matches user's locked copy: _"Resume, LinkedIn profile export, or any PDF with your career info. Max 5 files, 10MB each."_ Advanced disclosure exposes the per-bot token cap as a `<input type="number">` with clamping `[1_000, 100_000]` and a warning about smaller-model context-window risk.
- Updated `submit()` flow: POST `/api/bots` (now includes `contextTokenCap`) → if `pdfFiles.length > 0`, POST multipart to `/api/bots/[botId]/knowledge` with `text` field + each file → only then advance to Step 5. Error paths from both calls surface in the existing `error` alert.
- 3 new BotFactoryForm tests: PDF-only step advancement, Advanced disclosure default value + 20K override sent in body (used `fireEvent.change` instead of `user.type` because per-keystroke clamping interferes with controlled number inputs), full multipart upload assertion against the second fetch call.
- `src/lib/ingestion/constants.ts` - extracted `MAX_PDF_BYTES`, `MAX_PDF_FILES`, `PDF_MIME_TYPE` here mid-Slice 2.2 because the production build failed with `Module not found: Can't resolve 'fs'`: the client-side BotFactoryForm imported the constants from `extract-pdf.ts`, which transitively pulls `pdf-parse` and its Node-only `fs` dependency into the browser bundle. `extract-pdf.ts` now re-exports the constants so server-side callers keep working.

_Refactor-clean pass (Stage 2 scope only):_

- Ran `knip` + `ts-prune`. Stage 2 candidates: `countTokens` in `chunk.ts` (exported + tested but no non-test caller; original blueprint had the assembler using it, but the assembler ended up using the stored `tokenCount` instead) and `seedSource` in the POST knowledge route (one-line wrapper over `persistChunks` with no added value).
- Removed `countTokens` + its 3 unit tests. Inlined `seedSource` to a direct `persistChunks` call in the seed-migration block. Verified `npm test` 299/299 after each change.
- Fixed a strict-mode `Object is possibly 'undefined'` typecheck error in the new BotFactoryForm multipart test (destructured `fetchMock.mock.calls[1]` once into a typed pair instead of indexing it twice).
- Knip's other flags (`eslint`, `eslint-config-next`, the pre-existing `BotInput` type) are Stage 1 / config-level and explicitly out of refactor-clean scope.

**Files changed:**

_Slice 2.1:_

- `package.json` - update - added `pdf-parse@^1.1.1`, `tiktoken@^1`, `@types/pdf-parse` (dev).
- `src/lib/db/schema.ts` - update - added `knowledge_base` table + `bots.context_token_cap` column + `KnowledgeChunk` / `NewKnowledgeChunk` type exports.
- `drizzle/0004_late_vermin.sql` - create - generated migration. Applied by user to Supabase before Slice 2.2.
- `src/lib/ingestion/errors.ts` - create - `IngestionError` class + `IngestionErrorCategory` union (6 categories).
- `src/lib/ingestion/chunk.ts` - create - `chunkText` + `__resetEncoder` (test helper).
- `src/lib/ingestion/chunk.test.ts` - create - 11 specs (later reduced to 8 in refactor-clean).
- `src/lib/ingestion/extract-pdf.ts` - create - `extractPdfText` + `MAX_PDF_BYTES` / `MAX_PDF_FILES` / `PDF_MIME_TYPE` (later moved to constants.ts and re-exported here for compat).
- `src/lib/ingestion/extract-pdf.test.ts` - create - 5 specs.
- `src/lib/ingestion/assemble.ts` - create - pure `assembleFromChunks` + DB-facing `assembleAndSaveBotContext` + `deleteSource`.
- `src/lib/ingestion/assemble.test.ts` - create - 9 specs covering the pure function (DB-facing wrappers verified transitively via route tests).
- `src/types/pdf-parse.d.ts` - create - ambient decl for `pdf-parse/lib/pdf-parse.js` subpath.

_Slice 2.2:_

- `src/lib/bots/schemas.ts` - update - loosened `contextText` (allow empty string), added `contextTokenCap` (optional, bounded), exported `CONTEXT_TOKEN_CAP_{MIN,MAX,DEFAULT}` constants.
- `src/lib/bots/schemas.test.ts` - update - two specs rewrote to reflect the new contract ("accepts empty contextText" + "trims whitespace and accepts the result").
- `src/app/api/bots/route.ts` - update - writes `contextTokenCap` to the bot row when supplied (preserves DB default otherwise).
- `src/app/(dashboard)/dashboard/bots/new/page.tsx` - update - passes existing `contextTokenCap` to the form so the Advanced disclosure renders the current value, not the default.
- `src/lib/bots/require-bot-owner.ts` - create - shared session+ownership helper for the four knowledge routes.
- `src/app/api/bots/[botId]/knowledge/route.ts` - create - POST (multipart upload) + GET (sources summary).
- `src/app/api/bots/[botId]/knowledge/route.test.ts` - create - 12 specs covering POST.
- `src/app/api/bots/[botId]/knowledge/sources/[sourceName]/route.ts` - create - DELETE one source.
- `src/app/api/bots/[botId]/knowledge/reprocess/route.ts` - create - POST reassemble-only.
- `src/lib/ingestion/constants.ts` - create - extracted constants so client components import them without pulling `pdf-parse` into the bundle.
- `src/lib/ingestion/extract-pdf.ts` - update - moved constants out, imports + re-exports them now.
- `src/components/bot-factory/BotFactoryForm.tsx` - update - imported constants + `CONTEXT_TOKEN_CAP_*`, added `pdfFiles` / `contextTokenCap` to FormState, loosened Step 2 validation (text OR PDFs), replaced placeholder dropzone with real drag-and-drop + file list + Advanced disclosure, extended `submit()` to POST multipart to `/knowledge` after `/api/bots` succeeds.
- `src/components/bot-factory/BotFactoryForm.test.tsx` - update - 3 new specs (PDF-only advancement, Advanced cap default + override, multipart upload assertion).
- `~/.claude/settings.json` - update - set `env.ECC_GATEGUARD=off` globally to stop the fact-forcing gate from firing on every Edit/Write/Bash during the session.

_Refactor-clean:_

- `src/lib/ingestion/chunk.ts` - update - removed `countTokens` (dead export).
- `src/lib/ingestion/chunk.test.ts` - update - removed the 3 `countTokens` tests.
- `src/app/api/bots/[botId]/knowledge/route.ts` - update - inlined `seedSource` into direct `persistChunks` call.
- `src/components/bot-factory/BotFactoryForm.test.tsx` - update - destructured `mock.calls[1]` once to satisfy strict-mode optional-element typing.

**Decisions made:**

- **Drop URL scraping entirely (Q3, deviates from plan.md §2.5):** The plan called for cheerio-based URL scraping (LinkedIn / portfolio fetch). The user opted to remove it because LinkedIn blocks server-side fetches anyway, generic URL scraping pollutes the bot with low-quality content, and the helper text on PDF upload ("LinkedIn profile export") explicitly redirects users to a higher-quality input path.
- **Zero file storage at rest (Q1=b, deviates from plan.md §2.4):** Plan called for AWS S3 free-tier for PDFs and profile photos. CLAUDE.md §7 forbids any service that _can_ incur cost. Decision: PDFs are processed in memory and never persisted as binaries; only extracted text chunks land in Postgres. Profile photos are deferred entirely to Stage 6.
- **Per-source DELETE endpoint instead of per-chunk (deviates from plan.md §2.5):** The plan listed `DELETE /api/bots/:botId/knowledge/:chunkId`. We shipped `DELETE …/sources/[sourceName]` instead because the per-source-replace semantic (Q5=b) is the actual operation users want at the UX level ("remove my LinkedIn PDF"), not "remove chunk 7 of 23." The chunk-level granularity has no current consumer.
- **Per-bot token cap (Q8=a, not per-user):** The user asked for "an option in settings" but the cleanest scope is per-bot - each bot's content size is independent (a resume bot wants different ceilings than a portfolio bot), and putting it in the Bot Factory Advanced disclosure dodges scope creep into a Stage 7 Settings surface. The trade-off (not surfaced in a dedicated Settings page until Stage 7) is captured in the Open Questions list.
- **`tiktoken cl100k_base` as cross-provider token approximation (Q4=a):** `tiktoken` is OpenAI's tokenizer; counts are exact for OpenAI / Azure OpenAI and approximate (within ~10-15%) for Anthropic / Gemini / DeepSeek. The user accepted this tradeoff because (1) the alternative (4-chars-per-token heuristic) is even less accurate, (2) the per-bot cap is itself a heuristic ceiling, not a hard limit the provider enforces, and (3) Stage 3 RAG eliminates this whole assembly path anyway.
- **`pdf-parse/lib/pdf-parse.js` subpath import (workaround for v1.1.1 demo-code bug):** `pdf-parse@1.1.1` has a long-standing issue where the package root entrypoint runs demo code at module load that tries to read a bundled test fixture (`./test/data/05-versions-space.pdf`) and crashes under Next.js bundling. The documented workaround is to import the lib file directly. This is also why `pdf-parse` is loaded via dynamic `import()` inside `extractPdfText` - keeps cold-start cheap, and matches the existing pattern for heavy Node-only modules.
- **`src/lib/ingestion/constants.ts` split (mid-Slice 2.2 discovery):** The production build failed mid-way through Slice 2.2 because `BotFactoryForm` (a client component) imported `MAX_PDF_BYTES` from `extract-pdf.ts`, which transitively pulls `pdf-parse` → `fs` into the client bundle. Webpack can't polyfill `fs` in the browser. Fix: extract the three constants into a dependency-free module. `extract-pdf.ts` re-exports them so server callers don't break. General pattern: any constant that needs to ride into a `"use client"` component must live in a module that imports nothing from Node-only deps.
- **Seed-from-`context_text` migration on first PDF upload:** When a Stage 1 bot (text-only `context_text`, zero `knowledge_base` rows) gets its first PDF upload, the POST `/knowledge` route detects the state (`existingRowCount === 0 && bot.contextText.trim().length > 0`) and seeds a `manual_text` source from the existing prose BEFORE processing the new uploads. Without this, the reassemble step would overwrite `context_text` with chunks-from-the-PDF-only and silently destroy the user's original Stage 1 content. The seed step runs exactly once per bot lifetime.
- **Chunks ARE concatenated as-is on assembly (~13% redundancy):** The plan calls for chunking with 100-token overlap, which means adjacent chunks share content. The naive assembly concatenates them, producing redundancy. We chose NOT to dedupe at the assembly layer because (1) the alternative (suffix-prefix overlap detection per chunk pair) adds complexity, (2) Stage 3 RAG replaces this entire path with vector retrieval that obviates the overlap entirely, (3) the per-bot `contextTokenCap` naturally absorbs the redundancy by truncating earlier. Documented inline in `assemble.ts`.
- **Discriminated-union ownership helper instead of throw-on-failure:** `requireBotOwner` returns `{ ok: true, bot, userId } | { ok: false, response: NextResponse }` rather than throwing on 401/403/404. The four routes that use it do `if (!owner.ok) return owner.response;` as their first line - no try/catch boilerplate, the type system forces the caller to handle both branches, and the response shape is owned by the helper (consistent across all four routes).
- **Knowledge POST is NOT under the `/api/bots/[botId]` shared layout because there isn't one:** Each `[botId]` route folder has its own `route.ts`, and that's fine for four endpoints. The auth check is centralized via `requireBotOwner`, not via a layout middleware. Tested it - works.
- **Removed `countTokens` in refactor-clean:** Exported helper that had unit tests but zero non-test callers. The blueprint planned to use it in the assembler, but the assembler ended up using each chunk's stored `tokenCount` column instead. Removing the export + its tests is preferable to keeping a thing only the tests testify exists.
- **Inlined `seedSource` in refactor-clean:** It was a four-line wrapper that called `persistChunks` with exactly the args its single caller already had. The wrapper added no information, just a layer of indirection. Per refactor-clean Step 5, removed.
- **Disabled the ECC fact-forcing GateGuard globally:** Mid-session, the user authorized turning the gate off via `~/.claude/settings.json` `env.ECC_GATEGUARD=off`. The gate was firing on every Edit/Write/Bash and demanding fact recitations on each tool call, multiplying overhead for routine Stage 2 work where the same context applied to every file. Persistent + global per the user's explicit request.

**Open questions / follow-ups:**

- Dedicated tests for GET / DELETE-source / reprocess endpoints (currently covered transitively).
- Background processing for large PDF batches if we hit Vercel hobby tier's 60s timeout under real load.
- Stage 3 RAG (vector search) replaces the assembly path entirely, so this assembly code has a known shelf life.
- Settings page (Stage 7) to surface `contextTokenCap` alongside the future loading-messages / theme / OAuth controls. Until then, Advanced disclosure in the Bot Factory is the only surface.
- Stage 1 OAuth + magic-link work that happened outside this session's scope (visible in BotFactoryForm tests and the Architecture entries) isn't tracked in detail here - it landed in the four sessions between 2026-06-04 (Stage 1 close-out) and 2026-06-18 (this Stage 2 work). See git log for those commits.

---

### 2026-06-19 01:55 - Stage 3: RAG pipeline with pgvector + OpenAI embeddings

**What was asked to do:** Ship Stage 3 from `plan.md` - the RAG pipeline replacing Stage 2's full-context injection with vector embeddings + top-k semantic search. Constrained to zero-cost infra per CLAUDE.md §7 (no Pinecone, no paid vector DBs).

**Locked decisions before any code (Q1-Q5):** Q1 = pgvector on the existing Supabase Postgres (only viable zero-cost option). Q2 = OpenAI-only embeddings using `text-embedding-3-large` truncated to 1536 dims via the API's `dimensions` parameter (Matryoshka representation) - scores ~63.3 MTEB vs `text-embedding-3-small`'s 62.3 at the same dimension count and half the storage of `large` at 3072d. Q3 = silent fallback to Stage 2 full-context when no OpenAI key is supplied; embeddings are an opt-in upgrade. Q4 = no backfill endpoint for Stage 1/2 bots (they're test-only artifacts; production users land at Stage 7). Q5 = top-5 retrieval with cosine similarity floor of 0.5; HNSW index (m=16, ef_construction=64 defaults).

**What I did:**

_Slice 3.1 - schema + embedding interface + retrieval util:_

- `src/lib/db/schema.ts` - added `embedding vector(1536)` + `embedding_model varchar(60)` columns to `knowledge_base` (both nullable). Imported `vector` from `drizzle-orm/pg-core` (0.36 ships this column type natively).
- `drizzle/0005_dizzy_tomas.sql` - generated then hand-edited to prepend `CREATE EXTENSION IF NOT EXISTS vector` and append the HNSW cosine index. Drizzle's `index()` builder doesn't yet emit pgvector index syntax, so the DDL is raw SQL.
- `src/lib/ai/embeddings/types.ts` - new `EmbeddingProvider` interface kept INTENTIONALLY separate from `LLMProvider` because embedding and completion are independent capabilities (Anthropic has no native embeddings endpoint, Google's text-embedding-004 is 768d). Includes `EmbeddingError` class with a bounded `toJSON()` mirroring `ProviderError`.
- `src/lib/ai/embeddings/openai.ts` - `openaiEmbedder` impl, batched at 96 inputs per API call. Uses `client.embeddings.create({ model, dimensions: 1536, input: batch })`. Maps 401/429/dim-mismatch/empty-input to typed `EmbeddingError` categories.
- `src/lib/ai/embeddings/index.ts` - `getEmbedder(name)` registry + re-exports.
- `src/lib/rag/retrieve.ts` - `retrieveRelevant({ botId, query, apiKey, options })`. Embeds the (trimmed) query, runs a raw-SQL pgvector query (`embedding <=> $1::vector` distance), filters by similarity floor in app code (not WHERE) so the HNSW plan stays clean. Helper `toVectorLiteral(values)` formats JS `number[]` as `'[0.1,0.2,...]'` for the cast. Exports `DEFAULT_TOP_K = 5`, `DEFAULT_SIMILARITY_FLOOR = 0.5`.
- Tests: openaiEmbedder (11 specs - mocks the SDK, covers batching, dim mismatch, 401/429 mapping, no-key-leak in errors), retrieve.ts (8 specs - mocks `@/lib/db.execute`, covers floor filtering, empty result, string→number similarity coercion, topK/floor overrides). All green via `vi.hoisted` for the DB mock (avoids hoisting `ReferenceError`).

_Slice 3.2 - ingestion-time embedding + chat-time retrieval + Bot Factory UI:_

- `src/lib/ai/key-transport.ts` - added `readEmbeddingApiKey(headers): string | null`. Reads `x-embedding-api-key`. Returns null when absent (not an error - absence means "skip embeddings"). Only throws `KeyTransportError` when present but malformed (length out of `[8, 256]`).
- `src/lib/client/embedding-key-store.ts` - mirrors `llm-key-store.ts` but under a separate localStorage slot (`probot.embedding.key.v1`). Independent of the chat key so users can use Anthropic for chat + OpenAI for embeddings.
- `src/lib/ingestion/embed-chunks.ts` - `embedChunks({ botId, sourceName, apiKey, embedder? })`. SELECTs rows where `embedding IS NULL`, embeds each `contentText`, UPDATEs in place with vector + model. Idempotent - re-running on a fully embedded source skips everything. Returns `{ embedded, skipped: 0 }`. Tests (4 specs): no-op when empty, embedding alignment, wrong vector count guard, error propagation. Uses `vi.hoisted` for the chained mock builder.
- `src/lib/ai/prompt-builder.ts` - added optional `relevantChunks?: string[]` param. When present + non-empty, joins chunks with `\n\n---\n\n` and replaces `bot.contextText` as the `## CONTEXT` body. Empty array still falls back to full context. Two new prompt-builder tests cover the RAG branch and empty-array fallback.
- `src/app/api/bots/[botId]/knowledge/route.ts` - reads `x-embedding-api-key` early (after content-type validation). Tracks processed source names in an array; after `persistChunks` for each source, embeds with `embedChunks` per source. Embedding failures are caught and surfaced in the response as `embeddingError: <category>` (NOT raw message - see "Decisions made" below). `assembleAndSaveBotContext` ALWAYS runs so the legacy full-context path stays intact regardless of embedding success. 4 new route tests cover: no-key-skip-embed, per-source embed call shape, error swallow with bounded category, malformed key 400.
- `src/app/api/chat/[botId]/route.ts` - inserted step 9b (RAG retrieval) between input sanitize and provider dispatch. Reads `x-embedding-api-key`; malformed treated as missing (no 400 - chat must keep working). If key present: calls `retrieveRelevant`. On non-empty result, passes chunks to `buildSystemPrompt`. On empty result OR throw, falls back to bot.contextText. Throws are caught with a bounded `console.warn` signal (EmbeddingError.toJSON() or generic category) so a broken HNSW index doesn't silently degrade every user. 6 new chat-route tests cover all branches.
- `src/components/bot-factory/BotFactoryForm.tsx` - added `embeddingApiKey: string` to FormState. New `<input type="password">` inside Step 2's Advanced disclosure with copy "OpenAI key for semantic search (optional)". On submit: stores via `setEmbeddingApiKey()` BEFORE the network call (same pattern as the chat key), and attaches `x-embedding-api-key` header on the `/knowledge` POST when the key is ≥ 8 chars.
- `src/components/chat/ChatWindow.tsx` - reads `getEmbeddingApiKey()` and attaches `x-embedding-api-key` header on each chat request when present.

_Code-review pass (HIGH-severity findings fixed):_

- **HIGH #1: key leak via `err.message` in embeddingError response field.** The knowledge route was assigning `err instanceof Error ? err.message : "embedding generation failed"` to the response body. If an SDK-level network error ever printed the request headers (which carry the BYO key), that key reached the client. Fixed by narrowing to `EmbeddingError.category` (a string union: `invalid_key | rate_limit | dimension_mismatch | empty_input | unknown`) or falling through to a generic `"embedding_failed"` string. Two new tests verify the response body NEVER contains a key fragment.
- **HIGH #2: silent retrieval failure in chat route had no observable signal.** A broken HNSW index or stored-vector dimension mismatch would silently fall back to context_text with no log. Added `console.warn("[rag] retrieval failed, falling back to context_text", signal)` where `signal` is either `EmbeddingError.toJSON()` (bounded, no key) or a generic `{ category: "retrieval_failed" }`. ESLint disabled inline with a justification comment because this is the intended ops signal until a real logger lands (Stage 7).

_Pre-existing test fix (in scope because it was blocking the full suite):_

- `src/components/bot-factory/BotFactoryForm.test.tsx:113` had `screen.queryByRole("button", { name: /OpenAI/i }).toBeNull()` but the test's own name says "anthropic/openai/azure enabled" - clearly a copy-paste regression from the recent "Deepseek removed from UI" commit. The `/OpenAI/i` regex matched two buttons (the OpenAI provider button AND the Azure button whose family label is "OpenAI"). Fixed: anchored to `/^OpenAI/i` and flipped the assertion to `toBeEnabled()`.

**Files changed:**

_Slice 3.1:_

- `src/lib/db/schema.ts` - update - added `embedding` + `embeddingModel` columns to `knowledgeBase`, imported `vector` from `drizzle-orm/pg-core`.
- `drizzle/0005_dizzy_tomas.sql` - create then hand-edit - CREATE EXTENSION vector, ADD COLUMN x2, CREATE INDEX hnsw vector_cosine_ops. User applied to Supabase before Slice 3.2.
- `src/lib/ai/embeddings/types.ts` - create - `EmbeddingProvider`, `EmbedParams`, `EmbeddingError`.
- `src/lib/ai/embeddings/openai.ts` - create - `openaiEmbedder`, `DEFAULT_EMBEDDING_MODEL`, `DEFAULT_EMBEDDING_DIMENSIONS`. Batched at 96.
- `src/lib/ai/embeddings/openai.test.ts` - create - 11 specs.
- `src/lib/ai/embeddings/index.ts` - create - registry + re-exports.
- `src/lib/rag/retrieve.ts` - create - `retrieveRelevant`, `DEFAULT_TOP_K`, `DEFAULT_SIMILARITY_FLOOR`.
- `src/lib/rag/retrieve.test.ts` - create - 8 specs.

_Slice 3.2:_

- `src/lib/ai/key-transport.ts` - update - added `readEmbeddingApiKey` (returns null on absence).
- `src/lib/client/embedding-key-store.ts` - create - localStorage shim keyed `probot.embedding.key.v1`.
- `src/lib/ingestion/embed-chunks.ts` - create - `embedChunks` (idempotent embed-and-update).
- `src/lib/ingestion/embed-chunks.test.ts` - create - 4 specs.
- `src/lib/ai/prompt-builder.ts` - update - optional `relevantChunks?: string[]` arg.
- `src/lib/ai/prompt-builder.test.ts` - update - 2 new specs (RAG branch + empty-array fallback).
- `src/app/api/bots/[botId]/knowledge/route.ts` - update - read embedding key header, embed per source after persist, surface bounded category in response.
- `src/app/api/bots/[botId]/knowledge/route.test.ts` - update - 5 new specs (no-key-skip, per-source call shape, error swallow, malformed 400, EmbeddingError leak guard).
- `src/app/api/chat/[botId]/route.ts` - update - insert RAG retrieval step 9b, bounded `console.warn` on retrieval throw.
- `src/app/api/chat/[botId]/route.test.ts` - update - 6 new specs (no-key path, retrieval shape, RAG-success-uses-chunks, empty-fallback, throw-fallback, malformed-key-no-400).
- `src/components/bot-factory/BotFactoryForm.tsx` - update - `embeddingApiKey` field, Advanced input, submit wiring.
- `src/components/chat/ChatWindow.tsx` - update - attach `x-embedding-api-key` header when stored.

_Pre-existing test fix:_

- `src/components/bot-factory/BotFactoryForm.test.tsx` - update - `/^OpenAI/i` regex + `toBeEnabled()` assertion (was a stale copy-paste regression unrelated to Stage 3).

**Decisions made:**

- **pgvector NOT Pinecone (Q1):** CLAUDE.md §7 forbids paid services. Pinecone's free tier has caps and deprecation risk; Supabase ships pgvector on all plans (free included). The HNSW index serves all bots from one global index - the `WHERE bot_id = $1` constraint is a post-filter, fine for typical bot sizes (<10K chunks). Migration path to Pinecone later is straightforward if scale demands it: replace `retrieveRelevant`'s SQL with the Pinecone SDK and keep the embedding column as the source of truth.
- **OpenAI `text-embedding-3-large` @ 1536d via Matryoshka (Q2):** Per OpenAI's published MTEB benchmark: `large` @ 3072d scores ~64.6, `large` @ 1536d scores ~63.3, `small` @ 1536d scores ~62.3. The Matryoshka representation lets us pick a stronger model while keeping the pgvector column compact (half the storage of 3072d, smaller HNSW index, same retrieval latency profile). User explicitly asked for the most accurate model, and Matryoshka is the practical accuracy/cost balance.
- **Embedding provider is INTENTIONALLY separate from LLMProvider:** Anthropic redirects embeddings to Voyage AI (paid, separate API), and Google's text-embedding-004 is 768d (incompatible with a single 1536d pgvector column). Forcing embeddings into the same interface would either narrow to OpenAI/Azure (defeats the abstraction) or fan out into multiple columns / per-bot embedding choices. Stage 3 ships OpenAI-only with a `getEmbedder("openai")` registry; adding Google later is one new file + one column addition.
- **Embeddings are silently optional (Q3=b):** No key → no embeddings → Stage 2 full-context path runs. The bot still works. Users discover RAG via the Bot Factory Advanced disclosure; no key entry is gated, no flow is blocked. This is the right UX for a BYO-key product where the user's chat provider may not be OpenAI.
- **No backfill for Stage 1/2 bots (Q4=c):** Per the user, Stage 1/2 bots are test-only artifacts; production users land at Stage 7. Skipping the backfill endpoint saves a feature surface that would never see real use. Side benefit: the route handler stays focused on the ingestion path; reprocess endpoint already exists for re-assembly without re-extraction.
- **Top-5 + cosine ≥ 0.5 floor + HNSW (Q5):** Top-5 is the industry default for resume Q&A. The 0.5 floor is conservative - cosine similarity on normalized OpenAI embeddings sits in `[-1, 1]` and 0.5 is well above noise. HNSW beats IVFFlat on recall at our scale (sub-10K rows per bot) at the cost of slower index build, which is irrelevant for our once-per-upload cadence.
- **Vector literal as parameterized string, not pgvector node lib:** The pgvector node package is convenient but adds another dependency. Building `'[0.1,0.2,...]'::vector` as a parameter-bound string achieves the same thing with zero new deps. The cast is server-side; node-postgres binds the string safely.
- **Filter similarity in app code, not SQL WHERE:** `WHERE embedding <=> q < threshold ORDER BY embedding <=> q LIMIT k` can confuse the HNSW query plan because the index returns approximate neighbors and the threshold filter changes the result set non-monotonically. Cleanest pattern: ORDER BY + LIMIT to use the index, then filter the small result set in JavaScript.
- **`assembleAndSaveBotContext` ALWAYS runs in the knowledge route:** Even when embedding succeeds. This keeps `bots.context_text` fresh as a fallback when the chat-time embedding key is absent OR retrieval fails. Two writes per upload (chunks + assembled context) is acceptable; the alternative (skipping assembly for RAG-enabled bots) introduces a coupling: if the user removes their embedding key from localStorage later, their bot would have a stale or empty context_text.
- **Embedding errors are bounded categories, NOT raw messages (HIGH fix):** The knowledge route originally returned `err.message` in the `embeddingError` response field. SDK errors can carry headers (which carry the BYO key) in their `.message`. Fixed by narrowing to `EmbeddingError.category` (a small string union) or collapsing to a generic `"embedding_failed"` for non-typed errors. Same defense-in-depth pattern as `ProviderError.toJSON()`.
- **Chat-route retrieval failures are logged at warn level with bounded shape (HIGH fix):** Originally a bare `catch {}` block. A broken HNSW index, stored-vector dimension mismatch, or rate-limited OpenAI account would all degrade users silently with no log signal. Added `console.warn` with `EmbeddingError.toJSON()` or a generic `{ category }` shape. ESLint disabled inline because a proper logger isn't shipped yet (Stage 7); the call site is one line and the shape is bounded.
- **`vi.hoisted` for DB mocks in new tests:** The hoist-before-init `ReferenceError` (vitest's "make sure there are no top-level variables inside vi.mock factory") was hit twice during Slice 3.1. The fix is `const { x } = vi.hoisted(() => ({ x: vi.fn() }))` which moves the mock declaration into the hoisted block. Applied in `retrieve.test.ts` and `embed-chunks.test.ts`.
- **BotFactoryForm regex fix (out-of-scope but blocking):** The pre-existing failure at `BotFactoryForm.test.tsx:113` was a stale copy-paste from the recent Deepseek removal. The test's own name said "anthropic/openai/azure enabled" while the assertion checked OpenAI was NOT a button. The `/OpenAI/i` regex matched both the OpenAI button and the Azure button (family label "OpenAI"). Fixed: `/^OpenAI/i` anchors to the start of the accessible name, and the assertion flipped to `toBeEnabled()`. Could have been deferred to a separate PR but a red test in main blocks future work; surgical change is the right call.

**Open questions / follow-ups:**

- `toVectorLiteral` is duplicated in `src/lib/rag/retrieve.ts` and `src/lib/ingestion/embed-chunks.ts` with an explanatory comment. Reviewer flagged as MEDIUM (real DRY violation that could silently diverge). Extract to `src/lib/pgvector/format.ts` in a future cleanup pass. Deferred per CLAUDE.md §3 (surgical changes) because the comment already documents the duplication and both call sites are tested.
- Partially-embedded bot state (source A embedded, source B failed) isn't represented in the response shape - the `embedded: boolean` field is binary. Reviewer flagged as MEDIUM. Future improvement: per-source embedding status in the `sources` array (`{ name, sourceType, chunkCount, tokenCount, embedded: boolean }`). Requires a UI change too.
- Proper logger (pino/winston) for the chat-route warn signal. Currently uses `console.warn` with an ESLint disable comment. Stage 7 surface.
- Backfill endpoint deferred per Q4=c. If real users ever do come from a Stage 1/2 bot, they'll need a `POST /api/bots/[botId]/knowledge/embed` endpoint to populate embeddings without re-uploading.
- No prompt-injection test for the RAG path. Stage 3 inherits the Stage 1 input sanitizer (runs BEFORE retrieval), so retrieved chunks are sourced from the bot owner's verified content (not user input) - but a future audit should confirm no untrusted text reaches the embedding API as the query.

---

### 2026-06-19 07:45 - Stage 4: Public multi-tenant chat + onboarding + avatars + dashboard

**What was asked to do:** Ship Stage 4 from `plan.md` - every bot gets a public URL (`/u/[username]/chat`) anyone can visit without logging in. Includes: removing the auth gate on the public chat route, adding owner branding (name + headline + avatar) on the chat page, enriching SEO/OG metadata, creating `conversations` + `messages` tables for Stage 6 analytics, a username onboarding flow that forces OAuth/magic-link users to replace their `user-<8hex>` placeholder slug, a per-user animal-icon avatar system (13 Cloudinary URLs), a public bot config API for the Stage 5 widget, a dashboard home with a per-bot Copy URL button, and `/u/[username]` → `/u/[username]/chat` redirect.

**Locked decisions before any code (Q1-Q6):** Q1 = OAuth `users.image` when present + auto-assigned animal-icon avatar (13 Cloudinary URLs from the user's own Cloudinary account, zero cost) otherwise; user can re-pick during onboarding. Q2 = create `conversations` + `messages` tables in migration only; chat-route logging wiring deferred to Stage 6 (no point shipping write code without an analytics reader). Q3 = skip `recruiter_ip` entirely - raw IPs are PII and Stage 7 handles GDPR / consent. Q4 = ship `GET /api/bots/[botId]/config` now (Stage 5 widget will consume it; small surface). Q5 = dashboard layout server-component redirect to `/onboarding` when `username` matches `^user-[0-9a-f]{8}$`; middleware would be overkill. Q6 = Copy URL surfaces both in Bot Factory Step 5 (post-creation) and Dashboard home (return visits).

**What I did:**

_Slice 4.1 - public chat surface:_

- `src/app/u/[username]/chat/page.tsx` - removed the `getServerSession` gate that redirected to `/login?next=…`. Replaced the inline drizzle queries with a `resolve(username)` helper, wrapped in React `cache()` so `generateMetadata` and `PublicChatPage` share the same DB lookups in a single render pass (4 queries → 2). Enriched `generateMetadata` with description, OpenGraph (image from `users.image`), Twitter card (`summary_large_image` when owner has a photo, else `summary`), and `robots: { index: true, follow: true }`. Wraps `<OwnerCard>` + `<ChatWindow>` in a centered `max-w-3xl` container so the chat page now has a real hero, not just a chat window floating in `<body>`.
- `src/app/u/[username]/page.tsx` - new file; one-liner `redirect(\`/u/\${params.username}/chat\`)`. Bare-username URLs are friendlier share targets.
- `src/components/u/OwnerCard.tsx` - new server component. Renders avatar (plain `<img>` to a 64×64 circle, with `bg-neutral-100` background as graceful fallback if Cloudinary is unreachable) + name + headline as a rounded card. Initials avatar (`brand/10` background) used when `users.image` is null. Justified eslint-disable for `<img>` over `next/image`: a degraded CDN should fall back gracefully via `alt` + bg color, not block the page render.
- `src/app/api/bots/[botId]/config/route.ts` - new public GET endpoint (no auth). Returns `{ bot: { id, name, headline, suggestedQuestions, loadingMessages }, owner: { username, name, image } }`. Two `findFirst`s (bot, then owner). Cache-Control `public, s-maxage=60, stale-while-revalidate=300` so a CDN absorbs enumeration attempts before per-IP rate limiting lands in Stage 7. Explicitly NOT returned: `bot.contextText` (the assembled knowledge), `owner.email`, `owner.llmProvider`, `users.hashedPassword`. The route test asserts a `LEAK_CANARY` value never appears in the response.
- `src/app/api/bots/[botId]/config/route.test.ts` - 5 specs covering happy path, 404 on missing bot, 404 on orphan (owner not found), explicit no-leak assertion against sensitive fields, normalization of null suggestedQuestions to `[]`.

_Slice 4.2 - schema migration (no wiring):_

- `src/lib/db/schema.ts` - added `conversations` (id, botId FK CASCADE, sessionId varchar(255), messageCount int default 0, startedAt, lastMessageAt) and `messages` (id, conversationId FK CASCADE, role varchar(10), content text, tokensUsed nullable int, createdAt) tables. Added `Conversation` / `NewConversation` / `Message` / `NewMessage` type exports. Both tables `.enableRLS()` to match existing pattern. After code review: added a `messages_role_check` CHECK constraint (Postgres-level, so a future writer typo `'assitant'` cannot silently corrupt analytics) and a composite UNIQUE INDEX on `(bot_id, session_id)` so concurrent tabs on the same recruiter session cannot double-insert. Imported `check` and `uniqueIndex` from `drizzle-orm/pg-core`.
- `drizzle/0006_cheerful_lila_cheney.sql` - generated migration. Creates both tables, enables RLS, adds FK cascades, indexes, CHECK constraint, and the composite unique index. **NOT YET APPLIED to Supabase.** User needs to run `psql "$DATABASE_URL" -f drizzle/0006_cheerful_lila_cheney.sql` before Stage 6 (which is when the tables actually get used).

_Slice 4.3 - avatars + onboarding flow:_

- `src/lib/avatars.ts` - `ANIMAL_AVATARS` array of 13 Cloudinary URLs (from the user's own portfolio bucket, zero operator cost). `pickDefaultAvatar(seed)` does a deterministic 31-multiplier polynomial hash → modulo → URL; same seed always returns the same URL. `isAllowedAvatar(url)` is a Set membership check used by the onboarding PATCH allowlist. Includes a `FALLBACK_AVATAR: string` constant pulled out so the function signature is `: string` (not `string | undefined`) under `noUncheckedIndexedAccess` without a non-null assertion (codebase doesn't use `!`).
- `src/lib/users/placeholder.ts` - `isPlaceholderUsername(name): boolean` with regex `^user-[0-9a-f]{8}$`. Single source of truth used by the dashboard layout, the `/onboarding` page, and (transitively, via session check) the onboarding PATCH route.
- `src/lib/auth/auth.ts` - in the custom `createUser` adapter override, assigns `image = data.image ?? pickDefaultAvatar(username)`. OAuth providers with real avatars (Google, GitHub) get to keep them; magic-link users and OAuth providers that didn't return an image get a deterministic animal icon. Imported `pickDefaultAvatar` from `@/lib/avatars`.
- `src/app/api/auth/register/route.ts` - credentials register also assigns `image: pickDefaultAvatar(username)` at INSERT. Every new account now has a non-null `image` from the start, so the public chat page never has to handle a totally faceless owner.
- `src/lib/auth/schemas.ts` - exported the existing `usernameSchema` (it was previously module-local) so the onboarding PATCH can reuse the regex + reserved-slug rules without duplicating them.
- `src/app/api/onboarding/profile/route.ts` - new PATCH endpoint. Requires session (401 if missing). Zod-validates `{ username: usernameSchema, image: url<=2000 }`. Reads the user's current `users.image` from the DB. Image allowlist: must be in `ANIMAL_AVATARS` OR equal the user's current image (the OR clause preserves OAuth-provided photos without opening arbitrary URL injection - `existing.image` is read using the session's userId so it cannot be spoofed). UPDATE wrapped in try/catch with pg `23505` translated to 409 (username taken). Returns `{ user: { id, username, image } }`. 10 specs covering: 401, invalid JSON, validation failure (regex + reserved), allowlist enforcement, current-image passthrough, happy path, 409 collision, 404 missing user, 2000-char URL cap.
- `src/app/onboarding/page.tsx` - new server component. Auth-gated; redirects to `/dashboard` immediately if the session username is NOT a placeholder. Reads `users.image` for the form's "current image" prop. Renders an explanatory header + `<OnboardingForm>`.
- `src/components/onboarding/OnboardingForm.tsx` - new client component. Dual-field form: username text input (with same regex constraints as register; auto-lowercase + space→hyphen on keystroke) + avatar grid (4 cols mobile, 7 cols sm+). When user has an external (non-animal) `currentImage`, that image is rendered as a first "Keep current" card; selecting it preserves the OAuth photo. Otherwise the grid is just the 13 animals with `ANIMAL_AVATARS[0]` pre-selected. Submit POSTs to `/api/onboarding/profile`. On success, hard navigates via `window.location.href = "/dashboard"` so the JWT re-mints (see code-review fix #1 below).
- `src/app/(dashboard)/layout.tsx` - added `getServerSession` check up front (redirects unauthenticated to `/login?next=/dashboard`), then `isPlaceholderUsername` check (redirects to `/onboarding`). All dashboard sub-routes inherit this guard via the route group's shared layout.
- `next.config.js` - added `images.remotePatterns` allowlist for `res.cloudinary.com/dbjdu0hvl/**` so `next/image` can optimize the avatar URLs if any future component uses it. The current `<img>` usage doesn't need this, but it's a small allowlist that future-proofs without opening arbitrary remote URL proxying.
- Tests: 9 specs for `avatars.ts` (curated count, uniqueness, deterministic per-seed, distribution, empty-string handling, allowlist accept/reject), 6 specs for `placeholder.ts` (true/false matrix including uppercase hex rejection and whitespace), 10 specs for the onboarding PATCH route (auth, validation, allowlist, OAuth passthrough, happy path, collision, missing user, URL cap).

_Slice 4.4 - dashboard home + Copy URL:_

- `src/components/dashboard/CopyUrlButton.tsx` - new client component. Wraps `navigator.clipboard.writeText` with three states: idle (label), copied (`"Copied!"` for 1.5s), and error (`"Copy failed"` when clipboard API unavailable or rejects). `aria-label` is dynamic, including both the visible text and the URL, so screen readers + tests can rely on `getByRole({ name: /Copied!/ })` matching the current state.
- `src/components/dashboard/CopyUrlButton.test.tsx` - 5 specs. Tricky one: `navigator.clipboard` doesn't exist in jsdom AND userEvent v14's `setup()` installs its own clipboard simulator that intercepts `writeText`. Resolution: `fireEvent.click` + `await act(...)` instead of `userEvent.click`, plus `Object.defineProperty(globalThis.navigator, "clipboard", { value, configurable: true })` so the patch can be reset per test. The `vi.stubGlobal` + `vi.unstubAllGlobals` approach hit the same userEvent interception, so we bypassed userEvent entirely for clipboard-interactive tests while keeping it for non-clipboard interactions in other suites.
- `src/components/bot-factory/BotFactoryForm.tsx` - one-line update to `StepDeploy`: replaced the static `probot.com/u/${username}` placeholder URL with `${origin}/u/${username}/chat` (where origin = `window.location.origin` with `https://pro-bot.dev` fallback for SSR) and added `<CopyUrlButton url={url} />` next to the URL display. Imported `CopyUrlButton`.
- `src/app/(dashboard)/dashboard/page.tsx` - replaced `return null` with a real server-rendered bot list. Fetches all of the session user's bots ordered by `updatedAt DESC`. Empty state: "No bots yet" + a CTA to `/dashboard/bots/new`. Non-empty: a card per bot with name, headline, public URL (mono font), `<CopyUrlButton>`, and an "Open ↗" external link. The origin is constructed from the request's Host header via Next.js `headers()`. After code review: `x-forwarded-proto` is allowlisted to `"http" | "https"` only - an attacker-supplied `x-forwarded-proto: javascript` would have caused the rendered URL to read `javascript://host/u/...` in the clipboard (low exploitability but bad hygiene).

_Code-review pass (HIGH-severity findings fixed):_

- **HIGH #1: JWT staleness redirect loop.** OAuth/magic-link users would land in a tight loop: dashboard layout reads stale JWT (`token.username` still `user-abc12345`), redirects to `/onboarding`, onboarding page reads same stale JWT, re-renders the form. The PATCH would succeed but the next page load would still see the placeholder. Fixed in `src/lib/auth/auth.ts` jwt callback: previously the DB lookup for `username` only fired when `user` arg was present (first sign-in); now it ALSO fires on every subsequent JWT mint when `token.id` exists, so the post-onboarding hard refresh re-reads `users.username` from the DB and the placeholder check returns false. One extra DB query per authenticated server request - acceptable for this app's traffic shape and a `React.cache()` wrap can mitigate later.
- **HIGH #2: Public config API has no rate limit; could be enumerated to harvest names.** Added `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` so CDN absorbs repeated fetches. Proper per-IP rate limiting lands with the Redis work in Stage 7.

_Code-review MEDIUM fixes:_

- **MEDIUM: dashboard page trusts `x-forwarded-proto` verbatim.** Allowlisted to `"http" | "https"` with sane fallback.
- **MEDIUM: chat page double-fetches via `generateMetadata` + page component.** Wrapped `resolve()` with React `cache()` - dedupes the 2 DB queries from 4 to 2 per page load. Standard Next.js pattern.
- **LOW: messages.role no CHECK constraint.** Added DB-level `CHECK (role IN ('user', 'assistant', 'system', 'tool'))` so future analytics writers can't silently corrupt the table.
- **LOW: conversations.session_id not unique per bot.** Added composite `uniqueIndex("conversations_bot_session_unique").on(botId, sessionId)` so concurrent tabs for the same recruiter session can't double-insert.

**Files changed:**

_Slice 4.1:_

- `src/app/u/[username]/chat/page.tsx` - update - removed auth gate, added `resolve()` (cached), `OwnerCard` integration, enriched generateMetadata with OG/Twitter/robots.
- `src/app/u/[username]/page.tsx` - create - bare-username redirect.
- `src/components/u/OwnerCard.tsx` - create - owner avatar/name/headline hero.
- `src/app/api/bots/[botId]/config/route.ts` - create - public bot config GET, Cache-Control header.
- `src/app/api/bots/[botId]/config/route.test.ts` - create - 5 specs.

_Slice 4.2:_

- `src/lib/db/schema.ts` - update - added `conversations` + `messages` tables with FKs, indexes, CHECK constraint on `role`, composite unique index on `(bot_id, session_id)`. Imported `check` and `uniqueIndex`. Type exports for both tables.
- `drizzle/0006_cheerful_lila_cheney.sql` - create - CREATE TABLE x2 + RLS enable + FK cascades + indexes + CHECK constraint + unique index.
- `drizzle/meta/_journal.json` - update - replaced the abandoned first-pass `0006_small_war_machine` entry with the regenerated `0006_cheerful_lila_cheney`.

_Slice 4.3:_

- `src/lib/avatars.ts` - create - `ANIMAL_AVATARS`, `pickDefaultAvatar`, `isAllowedAvatar`.
- `src/lib/avatars.test.ts` - create - 9 specs.
- `src/lib/users/placeholder.ts` - create - `isPlaceholderUsername`.
- `src/lib/users/placeholder.test.ts` - create - 6 specs.
- `src/lib/auth/auth.ts` - update - default-assign animal avatar in `createUser` adapter override; jwt callback re-reads username on every mint (HIGH fix).
- `src/app/api/auth/register/route.ts` - update - default-assign animal avatar at INSERT.
- `src/lib/auth/schemas.ts` - update - exported `usernameSchema`.
- `src/app/api/onboarding/profile/route.ts` - create - PATCH endpoint with auth + Zod + allowlist + collision handling.
- `src/app/api/onboarding/profile/route.test.ts` - create - 10 specs.
- `src/app/onboarding/page.tsx` - create - server component, redirects if username not placeholder.
- `src/components/onboarding/OnboardingForm.tsx` - create - client form with username + avatar grid.
- `src/app/(dashboard)/layout.tsx` - update - auth check + placeholder username redirect to `/onboarding`.
- `next.config.js` - update - Cloudinary remotePatterns allowlist.

_Slice 4.4:_

- `src/components/dashboard/CopyUrlButton.tsx` - create - clipboard button with idle/copied/error states.
- `src/components/dashboard/CopyUrlButton.test.tsx` - create - 5 specs (used `fireEvent` + `act` to dodge userEvent's clipboard simulator).
- `src/app/(dashboard)/dashboard/page.tsx` - update - replaced `return null` with bot list + Copy URL; allowlisted `x-forwarded-proto` (MEDIUM fix).
- `src/components/bot-factory/BotFactoryForm.tsx` - update - Step 5 success block now uses real `${origin}/u/${username}/chat` URL with `<CopyUrlButton>` integrated.

**Decisions made:**

- **OAuth photo + animal icon hybrid (Q1):** OAuth providers that return a photo (Google, GitHub) keep using it via `users.image` at signup; everyone else gets an auto-assigned animal from a 13-icon Cloudinary set. Deterministic from the username seed so the same user always gets the same default, even if the field is later cleared. Onboarding flow shows a "Keep current" card when the user has an OAuth photo so they're not forced off of it. The animal icons are hosted on the user's own Cloudinary bucket - operator cost is zero, no S3, no proxying.
- **Conversations/messages tables ship now, wiring deferred (Q2):** Building the schema in Stage 4 makes the Stage 6 analytics work a pure UI/wiring story instead of also a migration story. CLAUDE.md §3 (surgical changes) is satisfied because the new tables are completely unreferenced by any code - they're a future commitment, not a present interaction surface. The composite unique index + CHECK constraint were added during code-review to make sure those future writes can't be sloppy.
- **No `recruiter_ip` (Q3):** GDPR / consent lives in Stage 7. Adding a PII column now and reasoning about how to scrub it later is the wrong order. The hashed-IP alternative was rejected because the Stage 6 analytics surface doesn't need per-recruiter de-dupe - `session_id` from the client cookie does the job for unique-session counting.
- **Public config API ships now (Q4=b):** It's a small endpoint with a tight surface, the Stage 5 widget will need it, and shipping it lets us settle the response shape + Cache-Control story in one place. Tests assert no sensitive fields ever leak even if a future writer adds a private column to the bot select.
- **Onboarding redirect lives in dashboard layout, not middleware (Q5):** Middleware-based redirects can't run async DB queries before responding (well, they can, but at the cost of edge runtime constraints and complicated tracing). The layout server-component approach is one DB read piggybacking on the session decode that was happening anyway, and it covers all `/dashboard/*` paths via the shared route group layout. Trade-off: every dashboard navigation hits this check. Cost is one stale-JWT-decode + one regex; the placeholder check itself doesn't touch the DB.
- **Username + avatar bundled in a single onboarding form (Q6 extension):** Two-step flow (pick name → pick avatar) felt long for first-time users. Single screen with both controls + a clear "Continue" button is faster and matches the "one decision per step" pattern of the Bot Factory.
- **Copy URL surfaces in BOTH Step 5 AND dashboard home (Q6):** Step 5 catches the first-share moment when the user is in flow; dashboard home catches every return visit. The component is shared (`CopyUrlButton`) so the UX is identical in both places.
- **JWT re-reads username on every mint:** The HIGH-severity fix changes the jwt callback from "only re-read username on first sign-in" to "re-read on every JWT mint when token.id exists." This costs one query per authenticated server request but eliminates the entire class of "JWT carries stale identity" bugs (onboarding being the immediate trigger; future Stage 7 settings will benefit too). Premature optimization to cache this would have hidden the stale-state class behind a TTL - better to take the small constant cost.
- **React `cache()` for the chat page resolve:** Standard pattern for `generateMetadata` + page component sharing data. Halves DB queries per page load. Zero behavior change. Documented inline.
- **`<img>` over `next/image` for OwnerCard avatar:** `next/image` will throw at build/runtime if the CDN host isn't in `remotePatterns` AND fails closed if the upstream image returns a non-200. For a public chat page, we want graceful degradation (bg color + alt text) over hard failure. The eslint-disable is justified with an inline comment.
- **`x-forwarded-proto` allowlist:** Defense-in-depth. The current dashboard render never passes the proto through to an `href`, but if a future surface does, the allowlist removes the entire vector. Two-line change.
- **CHECK constraint + composite unique on the new tables:** Empty tables are the cheapest time to add constraints. Adding them during Stage 6's analytics work would require a `NOT VALID` migration on a populated table. Now is free.
- **`fireEvent` + `act` instead of `userEvent.click` for clipboard tests:** userEvent v14's `setup()` installs a simulated clipboard that intercepts `navigator.clipboard.writeText` calls before our mock can see them. Even `vi.stubGlobal("navigator", { ...globalThis.navigator, clipboard: ... })` didn't penetrate the interception. The fix is to use `fireEvent.click` (which doesn't engage userEvent's instrumentation) and `await act(...)` to flush the async state updates. The non-clipboard tests in other files continue to use `userEvent.setup()` as normal.

**Open questions / follow-ups:**

- Tracking-pixel risk on `OwnerCard.tsx` avatar URL (review MEDIUM): when Stage 6 / Stage 7 adds a profile editor that lets users change `users.image` to arbitrary URLs, the public chat page becomes a tracking surface for anyone visiting it. Mitigation: proxy avatars through `/api/avatar?url=…` with strict allowlist, OR keep the allowlist enforced in any future profile editor (the onboarding PATCH already does this).
- Per-IP rate limit on `/api/bots/[botId]/config` (review HIGH, partially mitigated): Cache-Control absorbs scraping but a focused enumeration could still walk through cache. Proper rate limiting lands with the Redis migration in Stage 7.
- 0006 migration is generated but NOT yet applied to Supabase. User needs to run `psql "$DATABASE_URL" -f drizzle/0006_cheerful_lila_cheney.sql` before Stage 6 starts using the new tables.
- Pre-existing credentials users who registered before Stage 4 don't have an animal icon (their `users.image` is NULL). They'll see the initials-style fallback in OwnerCard. A small backfill SQL could fix this but is not in Stage 4 scope: `UPDATE users SET image = … WHERE image IS NULL;` (would need to compute `pickDefaultAvatar(username)` per row via a small migration script).
- Server-component tests pattern is still empty - the dashboard home, onboarding page, and public chat page have no direct component tests. Tested transitively via route handlers + manual QA. Stage 7 may add a real server-component test harness.
- `OwnerCard.tsx`, `BotListItem.tsx` (folded into dashboard/page.tsx), and the dashboard home itself have no co-located tests because they're server components - a server-rendering test harness would be premature in scope for Stage 4.

---

### 2026-06-19 17:40 - Stage 5: Embeddable widget + theme color + bot detail page

**What was asked to do:** Ship Stage 5 from `plan.md` - every bot gets an embeddable `<script>` tag visitors can paste on any portfolio site to render a floating chat bubble. Includes: a vanilla-TS widget with Shadow DOM isolation, an esbuild build pipeline outputting `public/widget.js`, CORS headers on the two public endpoints (`/api/chat/[botId]` + `/api/bots/[botId]/config`), a `bots.theme_color` column for per-bot branding, a NEW `PATCH /api/bots/[botId]` for partial updates, a NEW bot detail page at `/dashboard/bots/[botId]` with embed snippet + signature badge + theme color picker, and a `/u/[username]` ergonomics polish via shared `getOrigin()` helper.

**Locked decisions before any code (Q1-Q7):** Q1 = (c) widget UI + scaffolding only, real chat deferred to Stage 7. Solves the recruiter-key transport problem (browser localStorage is per-origin, so `janedoe.com`'s widget cannot read Jane's `pro-bot.dev` localStorage) without committing to either server-side key persistence (violates Stage 1 promise) or asking recruiters for their own keys (terrible UX). When Stage 7 lands encrypted-at-rest keys, the same widget code becomes functional with no widget-source changes. Q2 = (a) `public/widget.js` served by Next.js host (zero cost, no CloudFront / S3). Q3 = (a) new `bots.theme_color varchar(7)` column, default `#7c5cff` (brand). Q4 = (a) `Access-Control-Allow-Origin: *` on chat + config only; everything else stays same-origin. Q5 = (a) new `/dashboard/bots/[botId]` detail page (proper bot management surface, overdue). Q6 = (a) static HTML signature badge (image-based ones break in Outlook). Q7 = (a) vanilla TS + esbuild + Shadow DOM, < 50KB gzipped budget (delivered: 8 KB minified).

**What I did:**

_Slice 5.1 - Schema + CORS + PATCH endpoint:_

- `src/lib/db/schema.ts` - added `themeColor` column to `bots` (`varchar(7) NOT NULL DEFAULT '#7c5cff'`). Single field for simplicity; varchar(7) fits `#RRGGBB` exactly.
- `drizzle/0007_square_korvac.sql` - generated migration. Single `ALTER TABLE … ADD COLUMN … NOT NULL DEFAULT`. Postgres 11+ stores defaults in catalog; no row backfill, no long lock on the `bots` table. Applied to Supabase before Slice 5.2.
- `src/lib/bots/theme-color.ts` - `DEFAULT_THEME_COLOR`, `THEME_COLOR_REGEX` (`#RRGGBB` only - shorthand `#FFF` rejected so the column is always exactly 7 chars), Zod `themeColorSchema`, `isValidThemeColor` predicate. Single source of truth used by `botInput`, the PATCH route, and the widget's `safeThemeColor` (which mirrors the regex but is duplicated for zero-dep widget bundle).
- `src/lib/bots/schemas.ts` - exposed `themeColor` on `botInput` (optional, falls through to DB default when absent). Added `botPatchInput` schema: a Zod object with `themeColor` as the only allowed field plus a `.refine()` that rejects an empty body - prevents mass-assignment by construction, the route never trusts the raw request shape.
- `src/lib/bots/cors-headers.ts` - shared `PUBLIC_CORS_HEADERS` dict (`Access-Control-Allow-Origin: *`, methods `GET, POST, OPTIONS`, headers `Content-Type, x-llm-api-key, x-embedding-api-key, x-llm-azure-endpoint, x-llm-azure-api-version`, max-age 86400) + `corsPreflight()` helper returning 204 No Content with those headers. Used by the OPTIONS handlers on both public routes.
- `src/app/api/bots/[botId]/route.ts` - NEW PATCH endpoint. Auth via `requireBotOwner` (existing helper from Stage 2). Zod-validate against `botPatchInput`. Builds the SET payload from defined fields only (currently just `themeColor`, structured for future fields) so omitted fields retain their existing DB value. 6 tests cover: 401 unauthorized, 400 invalid JSON, 400 invalid hex, 400 empty body, 200 happy path, mass-assignment-safety regression (attacker submits `userId`/`isActive`/`contextText` - route silently drops them).
- `src/app/api/bots/route.ts` - `POST /api/bots` (existing create/update endpoint behind the Bot Factory form) now spread-conditionally writes `themeColor` when provided. Form doesn't expose it (lives in detail page now), but the schema accepts it for API consistency.
- `src/app/api/bots/[botId]/config/route.ts` - extended response with `themeColor` so the widget can paint itself. Added OPTIONS handler for CORS preflight + `PUBLIC_CORS_HEADERS` on the GET response (CDN cache headers preserved). 2 new CORS tests (GET has CORS headers; OPTIONS returns 204).
- `src/app/api/chat/[botId]/route.ts` - added OPTIONS handler. CORS headers on POST responses come from `next.config.js` (no need to duplicate at the route level). 1 new CORS test on OPTIONS.
- `next.config.js` - `async headers()` block declaring CORS allowlist for `/api/chat/:botId` and `/api/bots/:botId/config` only. Named-param patterns (not glob) so neighboring routes like `PATCH /api/bots/:botId` and the knowledge routes stay same-origin.

_Slice 5.2 - Widget source + build pipeline:_

- `src/widget/widget.css` - plain CSS scoped under `.probot-root`. CSS custom property `--probot-theme` is set per-instance (inline style on the shadow-root child) so theme color application is a one-line write. Mobile breakpoint at 480px (dialog goes full-width). All selectors live inside Shadow DOM so host-page styles cannot leak.
- `src/widget/widget.ts` - vanilla TS, no React, no Preact, no markdown lib. Pure functions: `escapeHtml` (5 chars: `&<>"'`, ampersand first to avoid double-encoding the others), `safeThemeColor` (mirrors `THEME_COLOR_REGEX`, falls back to brand purple on invalid), `parseConfig` (narrows the GET response, drops bad suggested-question entries, defaults missing optional fields), `renderBubbleInner` (SVG icon string), `renderDialogInner` (owner card + greeting + "preview" notice + CTA link to full chat + suggested-question list). `readScriptConfig` extracts `data-bot-id` + `data-api-base` from `document.currentScript`, only accepts `http(s)` for the API base (defense vs `javascript:` / `data:` URIs). `mount` is the async orchestrator: read script config → fetch `/api/bots/[botId]/config` → parse → attach a `<div data-probot-widget>` to `document.body` → `attachShadow({ mode: "closed" })` → inject CSS + render bubble/dialog. Bubble click toggles dialog visibility; dialog click-on-close delegates via `data-action="close"`. IIFE auto-invokes `mount(document.currentScript)` at script execution. Build-time defines: `__WIDGET_CSS__` (CSS string) and `__API_BASE_DEFAULT__` (origin to fetch config from; defaults to `https://pro-bot.dev`).
- `scripts/build-widget.mjs` - esbuild build. Reads `widget.css` from disk, JSON-encodes it as the `__WIDGET_CSS__` define value, bundles `widget.ts` as IIFE with `target: "es2017"` (wide browser support without burning bytes), minifies, writes to `public/widget.js`. Warns at the size budget threshold (>50 KB). Final artifact: 8.04 KB minified.
- `package.json` - added `esbuild@^0.28.1` as devDep. Changed `"build"` to `"npm run build:widget && next build"` so deploys always rebuild the widget before the Next build; chained `&&` short-circuits if the widget build fails so CI fails loudly.
- `src/widget/widget.test.ts` - 35 specs (jsdom env): escapeHtml correctness + ordering, safeThemeColor allowlist, parseConfig narrowing + fallbacks, renderBubbleInner + renderDialogInner XSS escaping (owner name, headline, suggested questions, CTA href post-fix), readScriptConfig data-bot-id + data-api-base + http-only allowlist, mount integration (no-script-tag short-circuit, fetch-failed silent abort, parseConfig-rejected silent abort, happy-path shadow root attachment with closed mode, fetch URL shape).

_Slice 5.3 - Bot detail page + embed surfaces:_

- `src/lib/server/origin.ts` - NEW `getOrigin()` helper. Reads `host` + `x-forwarded-proto` from request headers; allowlist proto to `http`/`https` (defense vs proxy-injected `javascript:`), default to `https` in prod / `http` on localhost. Extracted from `dashboard/page.tsx` so both the home and the detail page derive origins consistently. Behavior is identical to the inline version.
- `src/app/(dashboard)/dashboard/page.tsx` - refactored to use `getOrigin()` (removed inline header derivation block). Added a "Manage" link on each bot list item pointing to `/dashboard/bots/[botId]`.
- `src/app/(dashboard)/dashboard/bots/[botId]/page.tsx` - NEW server component. Resolves the bot via `and(eq(bots.id, params.botId), eq(bots.userId, session.user.id))` - non-owners get 404 (not 403) so we don't leak the existence of arbitrary bot IDs. Renders: identity header (name + live/inactive badge + "Edit content" link to `/dashboard/bots/new` + "Open chat ↗" external link), Share + Embed section with `<EmbedSnippet>`, Appearance section with `<ThemeColorPicker>`. Auth + placeholder-username gates are enforced by the parent `(dashboard)` layout from Stage 4, so this component only needs the ownership check.
- `src/components/dashboard/EmbedSnippet.tsx` - NEW client component. Three `SnippetCard`s side-by-side: Public URL, Website embed (`<script src=…>` tag), Email signature (HTML anchor with inline styles + speech-balloon emoji). Each card has a `<CopyUrlButton>` using the existing Stage 4 component. Internal `signatureBadgeHtml()` factory exported for testing. Hand-rolled HTML rather than a React renderer because Gmail/Outlook/Apple Mail each strip different sets of tags - only inline-styled anchors survive all three. 8 tests cover: card rendering, URL snippet shape, embed snippet with botId injection, signature HTML structure, theme color usage, https/http origin handling, protocol-stripped visible text.
- `src/components/dashboard/ThemeColorPicker.tsx` - NEW client component. Native `<input type="color">` (free real picker on every modern browser) + paired hex text input. Save button disabled when unchanged. Submits via `PATCH /api/bots/[botId]` with `{ themeColor }`; calls `router.refresh()` on success so the server-rendered detail page re-renders with the new color in the snippet samples. Shows transient "Saved!" for 1.5s. 6 tests cover: initial value, disabled-unchanged state, dirty-state Save enable, PATCH body shape + router.refresh on success, invalid-hex blocks the PATCH + shows alert, 4xx server response shows alert + skips router.refresh.

_Code-review pass (HIGH-severity finding fixed):_

- **HIGH: widget CTA href interpolation was unescaped.** `renderDialogInner` built `chatUrl = ${apiBase}/u/${encodeURIComponent(owner.username)}/chat` and inserted it raw into the `href` attribute. `encodeURIComponent` handles path-segment escaping but NOT HTML-attribute escaping. A malformed `data-api-base` like `https://x" onclick="alert(1)` (set by an embedding site) would have broken out of the `href` attribute. The footer href was already wrapped in `escapeHtml`; this catch-up fix wraps the CTA href too. Added a regression test that asserts the rendered HTML contains `&quot;` (escaped quote) instead of `href="https://x" onerror="`. The risk was bounded (`readScriptConfig` already rejects `javascript:` and `data:` URIs via the `/^https?:\/\//` allowlist) but the bug was real for any apiBase containing structural chars. Widget rebuilt after the fix; artifact still 8.04 KB.

**Files changed:**

_Slice 5.1:_

- `src/lib/db/schema.ts` - update - added `themeColor` column to `bots`.
- `drizzle/0007_square_korvac.sql` - create - single ADD COLUMN with default.
- `src/lib/bots/theme-color.ts` - create - regex + Zod helper.
- `src/lib/bots/theme-color.test.ts` - create - 10 specs.
- `src/lib/bots/cors-headers.ts` - create - `PUBLIC_CORS_HEADERS` + `corsPreflight()`.
- `src/lib/bots/schemas.ts` - update - added `themeColor` to `botInput`, new `botPatchInput`.
- `src/app/api/bots/route.ts` - update - accept `themeColor` on create/update.
- `src/app/api/bots/[botId]/route.ts` - create - NEW PATCH endpoint.
- `src/app/api/bots/[botId]/route.test.ts` - create - 6 specs including mass-assignment regression.
- `src/app/api/bots/[botId]/config/route.ts` - update - `themeColor` in response, CORS headers on GET, OPTIONS handler.
- `src/app/api/bots/[botId]/config/route.test.ts` - update - fixture extended, 2 new CORS specs.
- `src/app/api/chat/[botId]/route.ts` - update - OPTIONS handler.
- `src/app/api/chat/[botId]/route.test.ts` - update - 1 new OPTIONS spec.
- `next.config.js` - update - `async headers()` CORS allowlist.

_Slice 5.2:_

- `src/widget/widget.css` - create - Shadow-DOM-scoped CSS.
- `src/widget/widget.ts` - create - IIFE entry, pure renderers, mount.
- `src/widget/widget.test.ts` - create - 35 specs (jsdom env).
- `scripts/build-widget.mjs` - create - esbuild build script.
- `package.json` - update - `esbuild` devDep, `build:widget` script chained into `build`.
- `public/widget.js` - create (build artifact) - 8.04 KB minified.

_Slice 5.3:_

- `src/lib/server/origin.ts` - create - shared `getOrigin()` helper.
- `src/app/(dashboard)/dashboard/page.tsx` - update - use `getOrigin()`, add "Manage" link.
- `src/app/(dashboard)/dashboard/bots/[botId]/page.tsx` - create - bot detail page.
- `src/components/dashboard/EmbedSnippet.tsx` - create - 3-card snippet surface + `signatureBadgeHtml`.
- `src/components/dashboard/EmbedSnippet.test.tsx` - create - 8 specs.
- `src/components/dashboard/ThemeColorPicker.tsx` - create - color picker + PATCH submit.
- `src/components/dashboard/ThemeColorPicker.test.tsx` - create - 6 specs.

_Review fix:_

- `src/widget/widget.ts` - update - `escapeHtml(chatUrl)` in CTA href.
- `src/widget/widget.test.ts` - update - 1 new regression spec.
- `public/widget.js` - rebuild - fix included in deployed artifact.

**Decisions made:**

- **Defer real chat to Stage 7 (Q1=c):** Stage 4 has the same problem (recruiter visiting `/u/jane/chat` has no key in localStorage on `pro-bot.dev`), inherited and never addressed. The clean architectural fix is encryption-at-rest for owner-supplied keys, gated behind a master key + KMS-shaped infra - that's a Stage 7 task, not a Stage 5 task. Shipping a widget that explicitly says "preview - open full chat for now" is more honest than (a) asking recruiters to bring their own keys (terrible UX) or (b) storing keys in plaintext (security regression). When Stage 7 lands, widget code unchanged, dialog becomes functional.
- **`public/widget.js` over CloudFront (Q2=a):** CLAUDE.md §7 forbids paid services. AWS Always-Free has 12-month trial caveats. Vercel serves `public/*` at edge for free as part of the deploy; bandwidth is bundled with the app's hosting. Future migration to a CDN is one config change.
- **Build chain: `build:widget && next build`:** Widget is rebuilt on every deploy. If the build fails (e.g. CSS syntax error), the `&&` short-circuits and `next build` never runs - CI fails loudly. Alternative (chain after `next build`) was rejected because a broken `public/widget.js` would still get deployed in the bundle.
- **Vanilla TS over Preact (Q7=a):** Saves ~10-12 KB versus the smallest Preact bundle. The widget has no reactive state worth modeling; bubble open/close is two `hidden=` toggles. esbuild IIFE output runs anywhere, no polyfill story.
- **Shadow DOM `mode: "closed"` over `mode: "open"`:** The host page should not be able to query into the widget root via `host.shadowRoot`. Closed mode + the host element being a `<div data-probot-widget>` means the host page can detect the widget's presence but cannot probe its DOM. CSS isolation is identical either way; the difference is JS reachability.
- **`varchar(7)` not `text` for `themeColor`:** Forces the column to be exactly `#RRGGBB` shape at the DB level. Combined with the Zod regex, it's a defense-in-depth lock - even a buggy direct-SQL write cannot insert `#FFF` or `red` or any other CSS color syntax. The widget's `safeThemeColor` is a third layer (and works without the DB, e.g. if config endpoint returns garbage).
- **`botPatchInput` is its own schema, not `botInput.partial()`:** The full `botInput` includes mutable fields (name, headline, contextText) that the detail page does NOT edit - surfacing them via PATCH would silently widen the attack surface. Whitelist by hand for now; add `headline` etc. when there's a UI that needs them.
- **Native `<input type="color">` over a custom picker:** Free, accessible, works on mobile, gives the OS-native picker on macOS/Windows. The tradeoff (color is browser-themed, not brand-styled) is invisible inside a dashboard the only owner sees.
- **`getOrigin()` extracted to `src/lib/server/origin.ts`:** Two surfaces (dashboard home + bot detail) need the origin. Duplicating the `headers()` + proto-allowlist would risk drift; one helper guarantees both surfaces resolve URLs the same way.
- **Hand-rolled signature HTML over React `renderToString`:** Email clients (Gmail, Outlook, Apple Mail) each strip different tags. Only inline-styled anchors survive all three. The signature template is 4 lines of HTML; React would add no value and might emit attributes (`data-react`, etc.) that get flagged by spam filters.
- **CORS allowlist scoped to public endpoints only (Q4=a, code review confirmed):** `Access-Control-Allow-Origin: *` is only set on `/api/chat/:botId` + `/api/bots/:botId/config`. The PATCH route, the knowledge upload, onboarding, register - all stay same-origin. Confirmed by the code reviewer that named-param patterns in `next.config.js` don't accidentally match neighboring routes.
- **Widget escapes EVERY interpolation point:** Post-review fix wraps `chatUrl` in `escapeHtml`. `encodeURIComponent` handles path-segment escaping for the username; HTML-attribute escaping is a different concern. The lesson: never trust ONE escape function for two different contexts.

**Open questions / follow-ups:**

- Widget chat functionality is the headline Stage 7 task. The widget code is structured so the dialog body can be swapped from "preview notice + CTA" to a real chat surface (input + message history + suggested questions actually clickable) without changing the bubble, the Shadow DOM setup, the CORS plumbing, or the build pipeline.
- The widget bundle has no source map. esbuild can emit one trivially; deferred because debugging happens at the TS source level in dev, not at the minified-bundle level in prod.
- `signatureBadgeHtml` doesn't escape `origin` / `username` / `themeColor` before interpolation. Reviewer flagged LOW; in practice these are all validated sources (regex-allowlisted username, `#RRGGBB` regex-allowlisted themeColor, proto-allowlisted origin) and the snippet is shown only to the authenticated owner in a `<pre><code>` block on the dashboard. Adding `escapeHtml` here would be free belt-and-suspenders defense. Deferred.
- No source-map-supported test that loads `public/widget.js` into a real HTML page (the IIFE auto-mount path is covered by `mount()` tests, but the bundled output is exercised only by manual QA). A `tests/integration/widget.spec.html` Playwright run could cover this; deferred until Stage 7 when there's a real chat path to verify.
- Cross-platform manual testing (WordPress, Wix, Squarespace) - listed in the plan but out of scope for the engineering pass. Will need an actual deployment with a real widget.js URL before this is meaningful.
- Bot detail page has no "Delete bot" action. Stage 6 will add it as part of the analytics surface.

---

### 2026-06-19 21:19 - Stage 6 Slice 6.1: schema additions + chat persistence wiring

**What was asked to do:** Ship Slice 6.1 of Stage 6 from `plan.md` §6 - the foundation work: add the `leads` and `notifications` tables, extend `conversations` with `recruiter_email` and the dashboard-friendly composite indexes, and wire the chat orchestrator to actually write `conversations` + `messages` rows so the analytics surface in slices 6.2–6.5 has data to render.

**Locked decisions before any code (Q1-Q9):** Q1 chat persistence is in scope for Stage 6 (the hidden prerequisite - Stage 4 created the tables but no code writes to them, so analytics would render zeros otherwise). Q2 anonymous-recruiter sessionId is a per-tab UUID in `sessionStorage` (no cookie → no consent surface, defers to Stage 7). Q3 lead-capture card shows after the 3rd assistant reply, exactly once per conversation, dismissable (slice 6.4). Q4 notification bell is global on every dashboard page (slice 6.3). Q5 lead `context_summary` is the concatenated first 2–3 recruiter messages truncated to ~300 chars - deterministic + free; LLM-summarization is rejected per CLAUDE.md §7 zero-cost (slice 6.4). Q6 CSV columns: `captured_at, email, bot_name, context_summary, conversation_id` (slice 6.3). Q7 bot detail surface becomes sub-routed: `/dashboard/bots/[botId]/{conversations,leads,settings}` (slices 6.3 + 6.5). Q8 settings page knowledge management reuses the Bot Factory dropzone component (slice 6.5). Q9 slice plan: 6.1 schema + chat persistence (this slice), 6.2 API endpoints, 6.3 dashboard pages, 6.4 lead capture + bell + polling, 6.5 settings + knowledge UI.

**What I did:**

_Schema additions (`src/lib/db/schema.ts`):_

- `conversations` extended with `recruiterEmail: varchar("recruiter_email", { length: 255 })` (nullable). Comment block updated to explain the slice-6.4 lead-capture role and reiterate that the `leads` table is the canonical record.
- `conversations` gets a new composite index `conversations_bot_started_idx` on `(bot_id, started_at DESC)` - covers the dashboard list-by-recency query in one scan. The existing single-column `botIdIdx` stays (negligible cost; equality lookups can still pick the smaller index).
- `messages` gets a new composite index `messages_conv_created_idx` on `(conversation_id, created_at)` - covers the transcript-viewer scan in one index, replacing what would otherwise be sort-on-heap after a single-column scan.
- NEW `leads` table: `id`, `bot_id` (FK cascade), `conversation_id` (FK **SET NULL** - intentionally not cascade so a GDPR-driven conversation purge in Stage 7 still preserves the lead row; the email is business-valuable even if the chat log is gone), `email`, `context_summary` (nullable; filled by slice 6.4), `captured_at`. Composite index `leads_bot_captured_idx` on `(bot_id, captured_at DESC)`.
- NEW `notifications` table: `id`, `user_id` (FK cascade), `bot_id` (FK cascade, nullable - supports system-level notifications that aren't bot-specific later), `kind` (varchar(40)), `payload` (jsonb), `read_at` (nullable; null = unread), `created_at`. CHECK constraint locks `kind` to the allowed set (`'lead_captured'` only for Stage 6, extensible). Partial index `notifications_user_unread_idx` on `(user_id, created_at DESC) WHERE read_at IS NULL` so the bell-badge unread count is O(unread), not O(total notifications).
- Type exports added: `Lead`, `NewLead`, `Notification`, `NewNotification`.

_Migration (`drizzle/0008_young_wolfpack.sql`):_

- Generated via `npm run db:generate`. Verified contents: 2 CREATE TABLE statements, 1 ALTER TABLE ADD COLUMN (recruiter_email), 4 FK constraints in DO blocks (idempotent), 4 indexes (the 2 composites on existing tables + the partial-on-NULL on notifications + the bot+captured on leads), 1 CHECK constraint on `notifications.kind`. Fully additive - no schema migrations on existing data.

_Chat persistence wiring (`src/app/api/chat/[botId]/route.ts`):_

- Added `sql` to the `drizzle-orm` import (for the `messageCount + 2` increment expression) and `conversations`, `messages` to the `@/lib/db` import.
- Zod input schema gained `sessionId: z.string().uuid()` - required. The reasoning is wired into the inline comment: the per-tab UUID lets the orchestrator UPSERT a single conversation row per recruiter visit so the dashboard analytics can coalesce turns.
- After step 11 (sanitize output) and before the response, a new step 12 wraps the persistence work in a `db.transaction`. Inside: UPSERT into `conversations` keyed by the unique `(bot_id, session_id)` index - on conflict, bump `message_count` by 2 and refresh `last_message_at` to NOW. Returning `{ id: conversations.id }` so we can chain the messages insert. Then insert two `messages` rows (user + assistant) in the same transaction so partial writes are impossible at the Postgres level.
- The whole persistence block is wrapped in `try/catch`. On error, `console.warn("[chat] conversation persistence failed", err)` - analytics persistence MUST NOT break the user-facing chat reply (the primary value), but a silent swallow would obstruct production incident debugging. The log channel matches the existing `[rag]` warn pattern used a few steps earlier for the analogous "fallback path on retrieval failure" case.

_Browser sessionId helper (`src/lib/client/session-id-store.ts`):_

- NEW module mirroring the `llm-key-store.ts` pattern. `isBrowser()` guard, try/catch around storage access, key `probot.chat.sessionId`. `getOrCreateSessionId()` is the single export - reads from `sessionStorage`, generates + persists a new UUID on miss, regenerates on empty string, falls back to a fresh UUID if `sessionStorage` throws (private mode / quota).
- UUID generator: prefers `crypto.randomUUID()` when available (every modern browser + Node 14.17+). Fallback uses `crypto.getRandomValues` with explicit version+variant bit-setting per RFC 4122 - universally available wherever any `crypto` namespace exists. This replaces the original `Math.random` draft after a code-review flag: a guessable sessionId would let an adversary forge another recruiter's conversation key and pollute metrics.

_Chat window wiring (`src/components/chat/ChatWindow.tsx`):_

- Imports `getOrCreateSessionId`. Inside `sendMessage`, calls it once per turn (idempotent on the same tab so this is fine) and includes the result in the JSON body alongside `message`.

_Tests:_

- `src/app/api/chat/[botId]/route.test.ts` - extended the `@/lib/db` mock to expose `db.transaction(cb)` (invokes the callback with a stub `tx` that routes `tx.insert(table)` by call order: 1st → conversation chain, 2nd → messages chain), plus opaque `conversations` and `messages` identity objects. Added `resetPersistenceMocks()` called in `beforeEach`. `makeRequest()` and the Azure-flow `makeAzureRequest()` now inject the default `SESSION_ID` into the body so all pre-existing specs keep passing without churn. Two raw-Request specs got `sessionId` added to their body manually. 6 new specs in a `"conversation persistence (Stage 6)"` describe block: happy-path persists (asserts the convo UPSERT values + the messages array shape), missing-sessionId → 400, non-UUID sessionId → 400, persistence-transaction-throws still returns 200 with reply, rate-limit rejection means the transaction is never reached, sanitize-input rejection means the transaction is never reached. 24 → 30 specs in this file.
- `src/components/chat/ChatWindow.test.tsx` - added `vi.mock("@/lib/client/session-id-store", ...)` with a stable `STABLE_SESSION_ID` constant. Updated the existing "no key in body" spec's equality assertion to include `sessionId`. Added a new spec asserting the sessionId is sent on every turn (two consecutive sends). 9 → 10 specs.
- `src/lib/client/session-id-store.test.ts` - NEW. 5 specs covering happy path (UUID-v4 shape + sessionStorage persistence), idempotence across calls, reload-reuse (pre-seeded value is returned), empty-string regeneration, and the sessionStorage-throw fallback (monkey-patches `Storage.prototype.getItem`).

_Code-review pass (1 HIGH + 1 MEDIUM fix applied):_

- **HIGH: silent catch with no observability.** The original draft swallowed persistence errors with `catch {}` and no log. Even pre-Stage-7-logger, a `console.warn` is cheap and dramatically cuts incident-debugging time. Applied - log channel matches the project's existing `[rag]` swallow-and-warn pattern in the same file.
- **MEDIUM: Math.random UUID fallback was guessable.** Replaced with `crypto.getRandomValues` + manual RFC 4122 version/variant bits. The fallback path is unreachable in any modern runtime, but a guessable session ID would let an adversary forge another recruiter's conversation key.
- The reviewer also flagged "RLS-no-policies on the new tables" as MEDIUM. **Not applied** - this is the project's documented pattern (see schema comment on `users` lines 22-24): RLS is enabled with no policies so Supabase PostgREST `anon`/`authenticated` roles are denied by default; the app's `pg.Pool` connects as the table-owner role which is unaffected because we do NOT use `FORCE ROW LEVEL SECURITY`. All 7 existing tables follow this pattern; the 2 new ones match.
- LOW findings (mock dispatches by call order, nullable-FK-with-cascade on notifications.botId) were acknowledged design choices in the review brief; not applied.

**Files changed:**

- `src/lib/db/schema.ts` - update - `recruiter_email`, 2 composite indexes, `leads` table, `notifications` table, 4 new type exports.
- `drizzle/0008_young_wolfpack.sql` - create - generated migration (2 tables, 1 ALTER, 4 FKs, 4 indexes, 1 CHECK).
- `src/app/api/chat/[botId]/route.ts` - update - `sessionId` Zod field, persistence transaction (step 12), `console.warn` on swallow, `sql` + `conversations`/`messages` imports.
- `src/app/api/chat/[botId]/route.test.ts` - update - mock extension, `resetPersistenceMocks`, default `sessionId` injection, 6 new specs.
- `src/lib/client/session-id-store.ts` - create - `getOrCreateSessionId` + crypto-grade UUID fallback.
- `src/lib/client/session-id-store.test.ts` - create - 5 specs.
- `src/components/chat/ChatWindow.tsx` - update - call `getOrCreateSessionId`, include in body.
- `src/components/chat/ChatWindow.test.tsx` - update - mock the store, assert sessionId in body, 1 new spec.

Total: 450/450 tests pass, build green.

**Decisions made:**

- **`leads.conversation_id ON DELETE SET NULL`, not CASCADE.** A GDPR-driven conversation purge in Stage 7 should not destroy the lead - the email is the business-valuable artifact, distinct from the chat log. Set-null preserves the lead while severing the reference.
- **Per-tab `sessionStorage` over `localStorage` for sessionId.** Per-tab (vs. cross-tab) matches the analytics intent - different tabs from the same recruiter on the same bot are different conversations from the bot owner's perspective. Sessionstorage also has no cookie semantics, so the consent surface stays parked in Stage 7.
- **Swallow + warn (not swallow-silent, not throw) on persistence failure.** Throwing would break the chat for an analytics-only failure. Silent would obstruct production debugging. `console.warn` is the cheap middle path until Stage 7 wires a structured logger.
- **Composite indexes added; single-column kept.** The new `(bot_id, started_at DESC)` and `(conversation_id, created_at)` indexes cover the dashboard scans. Keeping the existing single-column indexes is ~7 KB per index and lets the Postgres planner pick whichever is best for equality lookups; not worth the migration noise to drop them.
- **`notifications.kind` CHECK constraint at the DB level.** Mirrors the `messages.role` pattern. A typo (e.g., `'leads_captured'` instead of `'lead_captured'`) in some future writer would silently break the unread badge query; the CHECK turns that bug into a loud INSERT failure.
- **Partial index `WHERE read_at IS NULL` on notifications.** The bell badge's hot query is "unread notifications for user X". Indexing only the unread rows keeps the structure tiny and the scan O(unread) - typically O(<10) - instead of O(all notifications ever).
- **`Math.random` is unacceptable for security-adjacent identifiers, even in fallback paths.** A reviewer-flagged MEDIUM that I would have shipped otherwise: even though `crypto.randomUUID` is universally available, the fallback path is what gets exercised on dusty WebViews - and a guessable sessionId is a non-trivial pollution vector.

**Open questions / follow-ups:**

- The `messageCount += 2` increment assumes every chat turn produces exactly one user + one assistant message. True for the current non-streaming `complete()` path. When streaming lands (out of Stage 1 scope, deferred to Stage 7+), the message-count math will need to change to count assistant-side-events differently.
- `tokens_used` on `messages` is left NULL. Provider response shapes diverge (`usage` field availability varies), and the dashboard doesn't render this yet. Wire it in slice 6.2 if cheaply available from `provider.complete()`.
- No integration test that exercises the migration against a real Postgres. Drizzle's generator is deterministic but a `db:push` against a Supabase-style instance is a reasonable manual QA gate before merging.
- The schema-wide deprecation hints on `pgTable(name, columns, extraConfig)` apply to every table in the file (pre-existing). Migration to the new `pgTable(name, columns, (table) => [...])` signature is a clean refactor opportunity but explicitly out of scope for this surgical slice.
- Slice 6.2 (next) wires the `/analytics`, `/conversations`, `/leads`, `/notifications` API endpoints on top of this foundation.

---

### 2026-06-19 22:00 - Stage 6 Slice 6.2: dashboard + lead-capture + notification API endpoints

**What was asked to do:** Build the ten Stage 6 read/write endpoints on top of the slice-6.1 schema. Three groups: (1) owner-gated bot endpoints powering the dashboard overview cards, conversation list/detail, and lead list/CSV-export; (2) one anonymous CORS-public endpoint for chat-UI lead capture; (3) four session-scoped notification endpoints behind the dashboard bell badge + 30s polling target. No UI in this slice (lands in 6.3 and 6.4).

**Locked decisions before any code (Q1-Q9):** Q1 pagination shape is `{ items, total, page, limit }` everywhere (page-based, friendly for "page X of Y" UI, matches plan §6.4 query params). Q2 no rate limit on POST `/leads` - explicit deferral to Stage 7's Redis layer; the chat route's upstream per-bot limit is the natural gate and the lead-capture endpoint itself has a 4 KB body cap + idempotent dedupe + 24h email-only fallback window to bound noise. Q3 POST `/leads` is idempotent on `(botId, conversationId, lowercased-email)` - second submit returns `{ deduped: true }` with the existing row instead of polluting the notification feed. Q4 CSV: UTF-8 BOM, RFC 4180 quoting (`,`, `"`, `\r`, `\n`, U+2028, U+2029 → quote), CRLF line endings, ISO-8601 timestamps. Q5 conversation list supports `?q=<text>` ILIKE search on both `recruiter_email` and the first-user-message preview, in addition to pagination. Q6 leads POST is CORS-public. Q7 notification `payload` for `lead_captured` pre-denormalizes `botName` so the bell-list dropdown doesn't need a join per row. Q8 notification ownership on POST `/[id]/read` is checked in the WHERE clause (`AND user_id = session.userId`) - single statement, 0-row update → 404, never a separate SELECT. Q9 single-pass slice (not split 6.2a/b).

**What I did:**

_Helpers (4 new):_

- `src/lib/auth/require-session.ts` - discriminated-union session check parallel to `requireBotOwner`. Returns `{ ok: true, userId, username }` or `{ ok: false, response }` so notification routes can `return result.response` on failure without exception detour.
- `src/lib/pagination.ts` - `parsePagination(searchParams, opts?)` → `{ page, limit, offset }` or 400 response. `DEFAULT_PAGE=1`, `DEFAULT_LIMIT=20`, `MAX_LIMIT=100`. `Number.isInteger` guards prevent silent NaN propagation from `?page=1.5` or `?page=abc`.
- `src/lib/csv.ts` - RFC 4180 escaper. `CSV_NEEDS_QUOTE` regex covers `,`, `"`, `\r`, `\n`, U+2028, U+2029 (built via `new RegExp(string)` because U+2028/U+2029 are JS source-level line terminators and would close a regex literal mid-pattern). UTF-8 BOM prefix for Excel mojibake protection, CRLF line endings, generic `toCsv<T>(rows, columns)` with per-column `cell` extractors.
- `src/lib/leads/schemas.ts` - Zod `leadCaptureInput`: `email` is `.trim().toLowerCase()` for idempotent dedupe + `.email().max(255)`; `conversationId` optional UUID; `contextSummary` optional, capped at 1024 chars to bound row size + prevent abuse.

_Owner-gated bot endpoints (5 new):_

- `GET /api/bots/[botId]/analytics` - Three parallel COUNT queries (conversations totals + this-month, messages-via-join total, leads totals + this-month) instead of the plan's 4-way LEFT JOIN. The JOIN multiplies rows (one bot × many convos × many messages × many leads → cartesian explosion before SUMs); three small COUNTs hit the slice-6.1 indexes and each return one row. Returns the five integers `{ totalConversations, totalMessages, totalLeads, conversationsThisMonth, leadsThisMonth }`. "This month" is rolling 30-day window (not calendar month) per plan §6.5.
- `GET /api/bots/[botId]/conversations?page&limit&q` - Paginated list. Each row carries `firstUserMessage` as a 200-char LEFT() of the first user-role message via a LATERAL subquery - no N+1 round-trips. `?q=<text>` does case-insensitive `ILIKE %q%` on both `recruiter_email` and the first-message preview. Both columns are scoped to `bot_id` so the filter scans a small per-bot subset covered by the slice-6.1 `conversations_bot_started_idx`.
- `GET /api/bots/[botId]/conversations/[convId]` - Transcript viewer. `findFirst` with `AND(eq(conversations.id, convId), eq(conversations.botId, bot.id))` so a forged convId targeting another owner's conversation returns 404, not a leak. Messages embedded in chronological order (covered by slice-6.1 `messages_conv_created_idx`).
- `GET /api/bots/[botId]/leads?page&limit` - Paginated lead list, ordered by `captured_at DESC` (covered by slice-6.1 `leads_bot_captured_idx`).
- `GET /api/bots/[botId]/leads/export` - CSV download. 50K row hard cap (DoS protection). Columns: `captured_at, email, bot_name, context_summary, conversation_id` (per slice-6.2 Q4 lock). Filename = `leads-<sanitized-bot-name>-<YYYY-MM-DD>.csv` with both ASCII `filename="…"` and RFC 5987 `filename*=UTF-8''…` parameters so non-ASCII bot names render correctly on every browser. `Content-Disposition: attachment; Cache-Control: no-store`.

_Public CORS endpoint (1 new):_

- `POST /api/bots/[botId]/leads` - Anonymous + cross-origin. 12-step flow: content-type → 4 KB body cap (measured from `request.text()`, not the spoofable Content-Length) → JSON parse → Zod validate (lowercases email) → resolve bot with `isActive=true` filter → idempotent dedupe (existing row on `(botId, conversationId, email)` → return `{ deduped: true }`, or the 24h `(botId, email)` fallback when no convId) → `db.transaction` writing three rows atomically: insert lead, update `conversations.recruiter_email` if convId, insert `notifications` row with `kind='lead_captured'` and pre-denormalized `botName` in the payload. CORS handled in-handler via `jsonWithCors()` helper on every response path (no `next.config.js` change needed - the leads route is self-contained, unlike chat which relies on `next.config.js`). `OPTIONS` handler uses the shared `corsPreflight()` from slice 5. On transaction throw: `console.warn` (matches the `[chat]` / `[rag]` warn pattern) + 500 `{ error: "capture_failed" }`. Same `try/catch` rule as slice 6.1: failure logs but doesn't break the chat UI's optimistic-success animation.

_Session-scoped notification endpoints (4 new):_

- `GET /api/notifications?unread&page&limit` - Paginated feed. Returns `{ items, total, page, limit, unreadCount }` so the dropdown can render the badge in sync without a follow-up `/unread-count` round-trip. Optional `?unread=true` narrows to unread rows, hitting the slice-6.1 partial index `notifications_user_unread_idx`.
- `GET /api/notifications/unread-count` - Returns `{ count }`. Hits the same partial index. Cheap polling target (dashboard bell will hit this every 30s in slice 6.4).
- `POST /api/notifications/[id]/read` - UUID-shape check first (early 400). UPDATE with `WHERE id = ? AND user_id = session.userId` - single statement, no SELECT. 0 rows affected → 404 (handles both "doesn't exist" and "belongs to another user"; never leaks existence cross-tenant). Returns `{ id, readAt }` where `readAt` is captured once and used for both the persisted column and the response body (post-review fix - two `new Date()` calls produced microsecond skew).
- `POST /api/notifications/read-all` - Bulk UPDATE on `user_id = session.userId AND read_at IS NULL`. Returns `{ markedRead: <row count> }` so the dashboard can pre-flip its local unread state.

_Code-review pass (1 HIGH + 2 MEDIUM fixes applied):_

- **HIGH: `readAt` clock skew on POST `/notifications/[id]/read`.** Original code did `new Date()` twice - once in the SET payload, once in the response JSON. The two timestamps differed by microseconds (harmless but semantically wrong: the response promised a timestamp that was never persisted). Fixed by capturing `const now = new Date()` once and using it in both places.
- **MEDIUM: RFC 5987 `filename*` parameter on CSV export.** ASCII-only `safeFilenameSegment` correctly strips unsafe chars, but for non-ASCII bot names ("Jané Doe 日本") the resulting filename degenerated to dashes. Added the parallel `filename*=UTF-8''<percent-encoded>` parameter so every modern browser renders the original name; ASCII `filename="..."` stays as the legacy-client fallback. Test asserts both parameters are present and the percent-encoded UTF-8 (e.g. `Jan%C3%A9`) appears.
- **MEDIUM: U+2028/U+2029 in CSV cells.** Regex extended from `[",\r\n]` to `[",\r\n  ]` because Google Sheets and older Excel parse those as row terminators in unquoted cells, which would silently split a `context_summary` across CSV rows. The regex is built via `new RegExp(string-literal)` because those code points are JS source-level line terminators that would close a `/.../` regex literal mid-pattern. Test asserts both code points trigger wrapping.
- **HIGH not applied: rate limit on POST `/leads`.** Reviewer flagged the missing rate limit; this was the user-confirmed Q2 deferral to Stage 7 Redis. Added a doc comment to the route explaining the layered defenses that bound noise in the meantime (4 KB body cap + Zod + idempotent dedupe + 24h fallback window) and that the deferral is explicit.
- **LOW not applied: `console.warn`.** Reviewer flagged it per a strict reading of CLAUDE.md no-`console.log`, but the project's accepted pattern (post slice-6.1 review) is exactly this - `console.warn("[<surface>] <event>", err)` for warn-and-continue paths, replaced wholesale in Stage 7 by a structured logger. Same pattern in `[chat]` and `[rag]` channels.
- **LOW not applied: `Access-Control-Expose-Headers`.** Reviewer noted "no fix needed at this stage" - flagged only as a heads-up for future slices that might add a custom response header the widget needs to read.

**Files changed:**

_Helpers:_

- `src/lib/auth/require-session.ts` - create - session check with discriminated union.
- `src/lib/pagination.ts` - create - `parsePagination` + constants.
- `src/lib/pagination.test.ts` - create - 8 specs.
- `src/lib/csv.ts` - create - RFC 4180 escaper + `toCsv<T>`.
- `src/lib/csv.test.ts` - create - 10 specs (incl. U+2028/U+2029 quoting + null cells).
- `src/lib/leads/schemas.ts` - create - Zod for lead-capture POST body.
- `src/lib/leads/schemas.test.ts` - create - 7 specs.

_Endpoints:_

- `src/app/api/bots/[botId]/analytics/route.ts` - create - five-metric overview.
- `src/app/api/bots/[botId]/analytics/route.test.ts` - create - 3 specs.
- `src/app/api/bots/[botId]/conversations/route.ts` - create - list + `?q` search.
- `src/app/api/bots/[botId]/conversations/route.test.ts` - create - 5 specs.
- `src/app/api/bots/[botId]/conversations/[convId]/route.ts` - create - transcript.
- `src/app/api/bots/[botId]/conversations/[convId]/route.test.ts` - create - 4 specs.
- `src/app/api/bots/[botId]/leads/route.ts` - create - GET (owner) + POST (CORS) + OPTIONS.
- `src/app/api/bots/[botId]/leads/route.test.ts` - create - 14 specs.
- `src/app/api/bots/[botId]/leads/export/route.ts` - create - CSV export with RFC 5987 filename.
- `src/app/api/bots/[botId]/leads/export/route.test.ts` - create - 4 specs.
- `src/app/api/notifications/route.ts` - create - list + unread filter + unread count co-rendered.
- `src/app/api/notifications/route.test.ts` - create - 4 specs.
- `src/app/api/notifications/unread-count/route.ts` - create - `{ count }`.
- `src/app/api/notifications/unread-count/route.test.ts` - create - 3 specs.
- `src/app/api/notifications/[id]/read/route.ts` - create - single-row UPDATE with ownership.
- `src/app/api/notifications/[id]/read/route.test.ts` - create - 4 specs.
- `src/app/api/notifications/read-all/route.ts` - create - bulk UPDATE.
- `src/app/api/notifications/read-all/route.test.ts` - create - 3 specs.

Total: 13 new source files + 11 new test files. 521/521 tests pass (450 → 521, net +71), build green.

**Decisions made:**

- **Three small COUNTs over one 4-way LEFT JOIN in analytics.** The plan's SQL `SELECT COUNT(DISTINCT c.id), SUM(c.message_count), COUNT(DISTINCT l.id), ... FROM bots b LEFT JOIN conversations c LEFT JOIN messages m LEFT JOIN leads l WHERE b.id = :botId` is correct but explodes cartesian rows before the SUMs/DISTINCTs aggregate them. Three separate `COUNT(*)::int` queries scoped by `bot_id` each scan a small per-bot index slice and return one row. Postgres planner has no surprises here - equivalent to writing the queries yourself in `psql`.
- **`FIRST_USER_MESSAGE_SQL` as a shared `sql<>` constant.** Drizzle's `sql` template is a descriptor object, so spreading the same reference into both the SELECT projection (to display) and the WHERE clause (for `ILIKE %q%` filtering) is structurally fine - the ORM re-renders it per query. Tradeoff: the count query also runs the subquery, paying the cost even when the preview text is irrelevant. Acceptable at slice-6.2 scale; tech debt logged for if any single bot ever has 10K+ conversations.
- **Idempotent dedupe over server-side rate limiting.** `(botId, conversationId, lowercased email)` is the natural dedupe key for the chat-driven path. The 24h email-only fallback bounds noise when no convId is supplied (lead capture from a misbehaving widget without sessionId). Both layers together absorb double-submits + drag-out spam without inventing a token bucket; the real rate limit lands with Stage 7's Redis layer.
- **`bots.findFirst(isActive=true)` on lead capture.** An owner who flips a bot inactive should not still be receiving leads on it (potential GDPR / off-boarding concern). The Stage 1 chat route already has the same gate; leads inherits.
- **CSV `new RegExp(string)` over regex literal.** U+2028 and U+2029 cannot appear in a regex literal (they close it as line terminators), but can be written via the ` ` / ` ` escape syntax inside a backtick-or-double-quoted string. Building the regex from a string sidesteps the source-level termination problem.
- **RFC 5987 `filename*` over silent ASCII-only.** A bot named "Jané Doe" exporting leads previously got `leads-Jan-Doe-2026-06-19.csv` with the accent silently dropped. The dual-parameter form (`filename="ascii"; filename*=UTF-8''percent-encoded`) is the WHATWG-recommended shape - browsers prefer `filename*` when present, fall back to `filename` when not.
- **Capture `readAt` once in notification-read.** The reviewer-flagged HIGH was small in absolute impact (microsecond skew) but worth fixing for semantic correctness - the API contract says "we set readAt to X and returned X"; two `new Date()` calls produce two different X's.
- **No `next.config.js` CORS change for leads POST.** Unlike the chat route which keeps `POST` body bare and lets `next.config.js` inject CORS headers, the leads route returns through a `jsonWithCors` helper that attaches the headers on every code path. Two CORS strategies coexist in the codebase; this one is self-contained at the route file, which is preferable for endpoints that mix public + owner-gated handlers under the same path.

**Open questions / follow-ups:**

- The `FIRST_USER_MESSAGE_SQL` LATERAL subquery runs in both the rows query AND the count query for conversations list. The count query doesn't need the preview text. Splitting that off into two separate `sql` descriptors (one with preview for the rows query, one without for the count) would let the count avoid the join entirely. Acceptable now; revisit when any bot reaches 10K+ conversations and the dashboard list page starts feeling slow.
- The 4 KB body cap on POST `/leads` is conservative - the largest legitimate payload is `email` (255) + `conversationId` (36) + `contextSummary` (1024) plus JSON overhead, well under 2 KB. Raise the cap if Stage 6.4 ever needs to send a richer payload.
- Notification `payload` is `jsonb` with a permissive `Record<string, unknown>` TS type. A future slice could narrow this with a discriminated union keyed on `kind` for stronger type guarantees on the dashboard side. Not blocking; today there's only one `kind`.
- Slice 6.3 (next) wires the dashboard UI pages on top of these endpoints: overview cards, conversation list/detail, lead list, CSV download. Slice 6.4 adds the in-chat lead-capture card + the bell + 30s polling. Slice 6.5 adds the settings page (editable name/headline/personality/suggested questions + knowledge management UI).

---

### 2026-06-19 22:32 - Stage 6 Slice 6.3: dashboard UI pages + shared query extraction

**What was asked to do:** Build the dashboard UI pages on top of the slice-6.1 schema + slice-6.2 endpoints. Three new sub-routes for each bot (`/conversations`, `/conversations/[convId]`, `/leads`), an aggregated stat row on the dashboard home, and per-bot stat row + sub-nav on the existing bot detail page. Also extract the data-fetching SQL into shared query modules so the API routes (slice 6.2) and the new RSC pages (slice 6.3) call into one place instead of duplicating the same Drizzle queries.

**Locked decisions before any code (Q1-Q10):** Q1 yes, extract shared queries - correctness over churn. Q2 (a) server-render via direct Drizzle queries - matches existing dashboard pattern, no double-network. Q3 (a) linear sub-routes, not tabs in the detail page - bookmarkable, matches plan §6.3. Q4 (a) `useTransition` + `router.replace` for debounced search - Next 14 idiomatic. Q5 (b) react-markdown + remark-gfm for the transcript bubbles - recruiter saw markdown in the chat, the dashboard transcript should match. Q6 lead → conversation link confirmed. Q7 fixed rolling 30-day window; range picker deferred to Stage 7. Q8 empty-state copy drafted, user can revise later. Q9 (a) one global stat row at the top of the dashboard home, then the bot list cards. Q10 single-pass slice (not split 6.3a/b).

**What I did:**

_Shared query modules (3 new - SQL lives in one place):_

- `src/lib/analytics/queries.ts` - `getAnalyticsForBot(botId)` returns the five-metric snapshot the slice-6.2 endpoint already shipped; `getAnalyticsForUser(userId)` adds an aggregated version that joins across all bots the user owns (bots → conversations → messages, bots → leads). Both use parallel small COUNTs over per-tenant index slices rather than a cartesian-explosion 4-way LEFT JOIN.
- `src/lib/conversations/queries.ts` - `listConversations({ botId, q, limit, offset })` with the LATERAL `firstUserMessage` subquery + optional `?q=` ILIKE on email/preview; `getConversationWithMessages({ botId, conversationId })` for the transcript viewer, with the cross-tenant filter (`AND bot_id = ?`) embedded so a forged convId targeting another owner's conversation returns null.
- `src/lib/leads/queries.ts` - `listLeads({ botId, limit, offset })` for the paginated list + `listAllLeadsForExport({ botId })` for the CSV with a 50K row cap. Module-level doc comment makes the **tenancy contract** explicit: callers MUST have verified bot ownership upstream; the functions do not check it themselves.

_Slice-6.2 route refactor (no behavior change - all 31 existing route tests still pass):_

- 4 routes refactored to delegate to the shared queries: `analytics/route.ts`, `conversations/route.ts`, `conversations/[convId]/route.ts`, `leads/route.ts` (GET only - POST/OPTIONS handlers unchanged), `leads/export/route.ts`. The routes are now thin: parse pagination, call the shared function, wrap the result in `NextResponse.json`.

_Dashboard components (5 new):_

- `src/components/dashboard/StatCard.tsx` - label + big tabular-num value + optional hint. Reused 9× across pages.
- `src/components/dashboard/EmptyState.tsx` - title + body + optional action node. Reused for empty conversation list, empty lead list, search-no-results.
- `src/components/dashboard/Pagination.tsx` - URL-driven prev/next + "Page X of Y" indicator. Renders nothing when total fits in one page so callers don't need to gate. `extraParams` prop preserves other query params (e.g. `?q=`) across pagination clicks. Page 1 omits the `?page=` param entirely (canonical URL).
- `src/components/dashboard/SearchBar.tsx` - client component, 300ms debounced `?q=` updater. `router.replace` (not `push`) so back button doesn't fill with keystrokes. Wraps the update in `useTransition` so the input stays responsive while the server-rendered list re-fetches. Drops `?page=` on every search change so a search after navigating to page 5 doesn't land on an empty filtered page. Syncs state from URL on `searchParams` change (defense against stale value when external nav happens). `aria-label` mirrors `placeholder`.
- `src/components/dashboard/TranscriptMessage.tsx` - read-only message bubble. User-role right-aligned in brand-color with `whitespace-pre-wrap`; assistant-role left-aligned in white with `prose prose-sm` markdown styling. Every rendered `<a>` flows through a `SafeLink` component that adds `rel="noopener noreferrer" target="_blank"` - same defense the live chat MessageBubble uses against `window.opener` reach-back from stored transcript text.

_Dashboard pages (3 new, 2 extended):_

- `/dashboard` (extend) - aggregated 5-card stat row at the top (bots, conversations, messages, leads, leads-this-month). Renders only when `totalBots > 0` so first-time visitors still see the existing empty-state CTA instead of a row of zeros. Existing bot-list cards below unchanged.
- `/dashboard/bots/[botId]` (extend) - adds a 4-card per-bot stat row (conversations, messages, leads, live/off status) above the Share/Embed/Theme sections, plus a "Conversations →" + "Leads →" sub-nav strip. Reuses `getAnalyticsForBot` from the shared module.
- `/dashboard/bots/[botId]/conversations` (NEW) - paginated list, server-rendered. Each card: recruiter email or "Anonymous" + 2-line clamped first-user-message preview + relative-time `relTime` formatter + message count. Client `<SearchBar>` updates `?q=` in the URL; server reads `searchParams.q` on the next render. Empty-state copy varies: with `?q=`, "No conversations match \"<q>\"" + clear-search hint; without, "No one has chatted with <bot> yet" + a CTA to the bot detail page.
- `/dashboard/bots/[botId]/conversations/[convId]` (NEW) - transcript viewer. Header card shows recruiter email (or "Anonymous conversation") + start time + message count + safe `mailto:` button (defense-in-depth Zod-like email regex guard before generating the href). Messages rendered chronologically via `TranscriptMessage`.
- `/dashboard/bots/[botId]/leads` (NEW) - paginated list. Each card: clickable safe-mailto email + context summary + capture timestamp + optional "View conversation →" link. "Export CSV" anchor at top-right (only when `total > 0`) points at `/api/bots/[botId]/leads/export` with `download` attribute; same-origin so the session cookie carries auth, no JS gymnastics.

_Code-review pass (2 HIGH + 2 MEDIUM + 1 LOW fixes applied):_

- **HIGH: SearchBar stale value sync.** Original code seeded `value` from `searchParams` at mount but never re-synced. If the URL's `?q=` changed externally (browser nav, server-driven redirect), the input would render the old value while the list reflected the new one. Fixed with a `useEffect([searchParams, paramName])` that calls `setValue` when the URL diverges from local state. Added a regression test asserting aria-label exposure for screen readers.
- **HIGH: `ilike` on a LATERAL subquery expression.** Reviewer flagged that passing a raw `sql<>` template (the LATERAL subquery) as the left operand of Drizzle's `ilike()` helper is dialect-dependent - the safer pattern is explicit `sql\`(${FIRST_USER_MESSAGE_SQL}) ILIKE ${pattern}\`` so the operator wraps a parenthesized scalar-subquery operand. Postgres parses scalar subqueries as ILIKE operands fine, but the explicit form removes ambiguity about what Drizzle's helper emits and is grep-friendly when reading the source.
- **MEDIUM: `mailto:` href XSS defense-in-depth.** Email is Zod-validated at lead-capture time (`.email()`), but a future schema drift or direct-DB write must not let a malformed value flow into an href that a screen reader announces or a click follows. Added `SAFE_EMAIL` regex + `safeMailtoHref()` helper to both the conversation detail page and the leads list page. When validation fails the email renders as plain text instead of a clickable link.
- **MEDIUM: shared-query tenancy contract docs.** Reviewer flagged that `listLeads`, `listConversations`, etc. take a `botId` and trust the caller has verified ownership. Added a clear module-level doc comment to both `src/lib/leads/queries.ts` and `src/lib/conversations/queries.ts` so a future contributor introducing a new call site can't accidentally skip the upstream guard.
- **LOW: SearchBar missing aria-label.** Added `aria-label={placeholder}` and a regression test. Screen readers now have a stable label even if the placeholder text is empty.

**Files changed:**

_Shared queries:_

- `src/lib/analytics/queries.ts` - create - `getAnalyticsForBot` + `getAnalyticsForUser`.
- `src/lib/conversations/queries.ts` - create - `listConversations` + `getConversationWithMessages` + tenancy doc + safe LATERAL ILIKE.
- `src/lib/leads/queries.ts` - create - `listLeads` + `listAllLeadsForExport` + tenancy doc.

_Slice-6.2 route refactor (no test changes needed - behavior identical):_

- `src/app/api/bots/[botId]/analytics/route.ts` - update - delegates to `getAnalyticsForBot`.
- `src/app/api/bots/[botId]/conversations/route.ts` - update - delegates to `listConversations`.
- `src/app/api/bots/[botId]/conversations/[convId]/route.ts` - update - delegates to `getConversationWithMessages`.
- `src/app/api/bots/[botId]/leads/route.ts` - update - GET delegates to `listLeads`; POST + OPTIONS unchanged.
- `src/app/api/bots/[botId]/leads/export/route.ts` - update - delegates to `listAllLeadsForExport`.

_Components:_

- `src/components/dashboard/StatCard.tsx` - create - 4 specs.
- `src/components/dashboard/StatCard.test.tsx` - create.
- `src/components/dashboard/EmptyState.tsx` - create - 3 specs.
- `src/components/dashboard/EmptyState.test.tsx` - create.
- `src/components/dashboard/Pagination.tsx` - create - 6 specs.
- `src/components/dashboard/Pagination.test.tsx` - create.
- `src/components/dashboard/SearchBar.tsx` - create - 5 specs (incl. aria-label regression).
- `src/components/dashboard/SearchBar.test.tsx` - create.
- `src/components/dashboard/TranscriptMessage.tsx` - create - 4 specs.
- `src/components/dashboard/TranscriptMessage.test.tsx` - create.

_Pages:_

- `src/app/(dashboard)/dashboard/page.tsx` - update - aggregated stat row.
- `src/app/(dashboard)/dashboard/bots/[botId]/page.tsx` - update - per-bot stat row + sub-nav.
- `src/app/(dashboard)/dashboard/bots/[botId]/conversations/page.tsx` - create - paginated list + search.
- `src/app/(dashboard)/dashboard/bots/[botId]/conversations/page.test.tsx` - create - 6 specs.
- `src/app/(dashboard)/dashboard/bots/[botId]/conversations/[convId]/page.tsx` - create - transcript viewer + safe mailto.
- `src/app/(dashboard)/dashboard/bots/[botId]/conversations/[convId]/page.test.tsx` - create - 5 specs.
- `src/app/(dashboard)/dashboard/bots/[botId]/leads/page.tsx` - create - list + CSV anchor + safe mailto.
- `src/app/(dashboard)/dashboard/bots/[botId]/leads/page.test.tsx` - create - 5 specs.

Total: 8 new components/pages + 3 new shared modules + 8 new test files + 5 route refactors + 2 page extensions. 559/559 tests pass (521 → 559, net +38), build green, all 5 new dashboard sub-routes register in the production build.

**Decisions made:**

- **Shared queries take `botId`, not `(botId, userId)`.** The functions trust the caller has done the ownership check. Rationale: forcing every caller to thread `userId` would couple the query layer to the auth-session shape, and the existing dashboard pattern (`requireBotOwner` returns the validated bot, then call queries with `bot.id`) is already grep-friendly. The tradeoff is captured in the module-level doc comment so future contributors don't introduce a bypass.
- **Server-render with direct Drizzle queries (no client fetch).** RSC reads `searchParams.q` + `searchParams.page` and calls `listConversations` directly. Pagination + search are URL-driven; the only client component on the list page is `<SearchBar>` for the debounced `?q=` update. Result: bookmarkable URLs, server-side caching benefits, no loading skeletons, browser back/forward works for free.
- **`router.replace` over `router.push` in SearchBar.** Pushing every debounce-flush would clog the history stack (typing "python" → 6 history entries). Replace keeps the most recent search visible to browser back without filling the stack.
- **Drop `?page=` from the URL on search change.** Searches after navigating to page 5 of the unfiltered list would otherwise land on page 5 of the filtered list, which is almost always empty. Reset to page 1 (implicit by omitting the param) on every search change.
- **`Page 1` omits `?page=` from the URL.** The canonical URL has no `page` param at all - keeps the address bar clean for the most common state.
- **Empty-state copy varies on `?q=` presence.** "No conversations match \"python\"" + clear-search hint when filtered; "No one has chatted with <bot> yet" + CTA when unfiltered. Two distinct user states deserve distinct messages.
- **Transcript bubbles use the same Markdown rendering as the live chat.** The recruiter saw `**bold**` and links rendered in the chat at the time. The dashboard transcript should match what they saw, not a downgraded plain-text version. Cost: re-rendering markdown server-side; benefit: visual fidelity.
- **`SafeLink` mirrors the live chat MessageBubble.** Stored transcript text could contain `https://evil.com` that the bot replied with months ago. Without `rel="noopener noreferrer"`, clicking such a link gives the destination's JS access to `window.opener` of the dashboard page. The defense is cheap (one component wrapper); skipping it would be a `tabnabbing` exposure.
- **Explicit `sql\`\``over Drizzle's`ilike()` for the LATERAL subquery.** The helper's behavior when its first argument is a raw `sql<>` template depends on dialect-internal wrapping. The explicit form removes ambiguity, is grep-friendly, and produces SQL a Postgres engineer can read on sight: `(SELECT LEFT(...) FROM messages WHERE ...) ILIKE '%q%'`.
- **`mailto:` href validated before render.** Even though emails are Zod-validated at lead capture, the cost of a defense-in-depth regex check before generating an href is ~5 lines and zero runtime. A schema drift, an admin SQL backfill, or any future write path that bypasses the lead-capture endpoint could otherwise land malformed text in the field; the validation ensures it cannot flow into an attribute click target.

**Open questions / follow-ups:**

- The shared query modules don't have direct unit tests. They're transitively covered by the (still-passing) slice-6.2 route tests and the slice-6.3 page tests (which mock the shared modules). Direct unit tests would catch SQL-level regressions before mocks; defer until Stage 7 integration tests run against a real Postgres.
- The conversations list's LATERAL subquery still runs once for the projection AND once for the count query (acknowledged tech debt from slice-6.2 review). Refactoring to a CTE that runs the subquery once would let Postgres reuse the result. Defer until a bot reaches 10K+ conversations and the list page feels slow.
- The transcript viewer renders Markdown for every message. For very long conversations (50+ turns), this could be visible CPU cost on the initial render. If profiling shows it, switch to incremental rendering (React.lazy per bubble) or a server-rendered HTML cache. Not blocking today.
- The dashboard home stat row is only shown when `totalBots > 0`. A user who deleted all their bots would still see this row at 0/0/0 because `totalBots > 0` is false - but they'd also see the empty-bot CTA, so the UX is coherent. If we later add an "archived bots" state, the trigger condition might need rethinking.
- Slice 6.4 (next) wires the in-chat lead-capture card + the dashboard notification bell + 30s polling on `/api/notifications/unread-count`.
- Slice 6.5 (final Stage 6 slice) adds the settings page + knowledge management UI: editable name/headline/personality/suggested questions + reuse of the Bot Factory dropzone for knowledge sources.

---

### 2026-06-20 05:57 - Stage 6 Slice 6.4: in-chat lead capture + notification bell + 30s polling

**What was asked to do:** Ship the two coordinated UX surfaces that make Stage 6 a complete loop - the recruiter-side in-chat lead-capture card that appears after the 3rd assistant reply, and the owner-side dashboard notification bell with 30s polling on `/api/notifications/unread-count`. Both halves consume the slice-6.2 endpoints (POST `/leads`, GET `/notifications`, GET `/notifications/unread-count`, POST `/notifications/[id]/read`, POST `/notifications/read-all`). The lead-capture path also requires extending the chat route to return `conversationId` so the card can include it in its POST body for idempotent `(botId, conversationId, email)` dedupe + `conversations.recruiter_email` update.

**Locked decisions before any code (Q1-Q9):** Q1 (a) the lead-capture card is modeled as a new ChatMessage variant `{ role: "system"; kind: "lead_capture" }` rendered inline in the message map - visually coherent, reuses scroll-to-bottom, single state container. Q2 (a) inline "Thanks! {bot} will be in touch" replaces the card on Submit (no toast infra to build). Q3 (a) Skip is permanent for the conversation; no re-show after 5 more replies (respect the dismissal). Q4 (a) clicking a notification row marks read + navigates in one action. Q5 30s polling + Page Visibility API pause when tab hidden. Q6 dropdown closes on outside click, ESC, or notification click. Q7 empty state "You're all caught up." with the "Mark all read" button hidden when nothing is unread. Q8 bell badge caps at "9+" for >= 10. Q9 (a) single-pass slice - both halves ship coherently as Stage 6's "complete loop" moment.

**What I did:**

_Lead capture (recruiter-facing, in chat):_

- `src/lib/client/lead-capture-state.ts` + test (5 specs) - sessionStorage-backed state machine: `pending → shown → captured | dismissed`. Keyed by `(botId, sessionId)` so each conversation gets its own lifecycle independent of other tabs. Garbage stored values, sessionStorage read failures, and key isolation all return `pending` (the benign baseline - worst case is a re-prompt, never a lost dismissal).
- `src/components/chat/types.ts` - extended `ChatMessage` discriminated union with `{ id; role: "system"; kind: "lead_capture" }`. New variant carries no content - the card component owns its own UI/state.
- `src/components/chat/MessageBubble.tsx` - narrowed prop type to `Exclude<ChatMessage, { role: "system" }>` so TypeScript catches accidental routing of system messages to the bubble renderer at compile time.
- `src/components/chat/LeadCaptureCard.tsx` + test (7 specs) - client component with `<input type="email">` + Submit/Skip. State machine: `prompt → submitting → captured`. On valid submit POSTs to `/api/bots/[botId]/leads` with `{ email, conversationId?, contextSummary }`. Captured state replaces the card with an inline green "Thanks! {botName} will be in touch." that stays in the message stream (loop closure for the recruiter). Network failure / 4xx response: returns to `prompt` with inline error.
- `src/components/chat/ChatWindow.tsx` - three changes: (1) `sessionId` lazy-initialized via `useState(() => …)` so it's mount-stable and the lead-capture state lookup matches the value sent to the chat API. (2) `conversationId` state captured from the chat API response, threaded through to the card. (3) Render loop dispatches `m.role === "system" && m.kind === "lead_capture"` to `<LeadCaptureCard>` with an explicit exhaustiveness `never` check after - a new system variant lands as a compile-time error rather than silently routing to the wrong renderer. (4) On every successful reply the orchestrator counts assistant replies in the next-messages array and pushes a sentinel system message when the count first crosses 3 AND `readLeadCaptureState === "pending"` AND no system message exists yet. The state write `writeLeadCaptureState(..., "shown")` happens in the same render so a reload sees `"shown"` and the eligibility check declines to re-add.
- `src/app/api/chat/[botId]/route.ts` - now returns `{ reply, conversationId? }`. `conversationId` is captured from the persistence transaction's `RETURNING { id }` and set in the outer scope. When the transaction throws (analytics-failed path), `conversationId` stays undefined; `NextResponse.json` strips undefined fields so the response shape is `{ reply }` and the card falls back to the server's 24h `(botId, email)` dedupe window.

_Notification bell (owner-facing, in dashboard):_

- `src/components/dashboard/NotificationBell.tsx` + test (6 specs) - bell icon button with badge. `useEffect` orchestrates polling: `setInterval(refresh, 30_000)` paused via Page Visibility API (`document.visibilityState !== "visible"` → clear interval; back to visible → fire immediate refresh + restart interval). Outside-click via `mousedown` listener that bails when `rootRef.current.contains(target)` - the bell itself is inside `rootRef` so clicks on it don't immediately close the freshly-opened dropdown. ESC handler also closes. Badge caps at "9+" for >= 10. Aria-label reflects the unread count for screen readers ("Notifications, 3 unread" vs just "Notifications").
- `src/components/dashboard/NotificationDropdown.tsx` + test (7 specs) - mounted inside `<NotificationBell>` when open. Initial fetch of `/api/notifications?limit=10` populates the list. Per-row click is one action: fire mark-read (idempotent at the server - 404 if already-read is treated as a no-op), call `onItemRead(id)` to decrement the parent badge, `router.push` to `/dashboard/bots/[botId]/leads`, and `onClose()`. "Mark all read" footer button (hidden when nothing is unread) hits `/api/notifications/read-all`; only flips local state on `res.ok` - server-failure leaves the badge as-is so the next poll reconciles without a flicker. Empty state "You're all caught up.", loading skeleton "Loading…", error toast "Couldn't load notifications."
- `src/app/(dashboard)/layout.tsx` - mounted `<NotificationBell />` in the existing header strip, next to the Docs link. Bell is visible on every dashboard page (Q4 from slice-6.2 prep - recruiter could land on any bot, so the bell follows the user across the dashboard).

_Code-review pass (2 HIGH + 1 MEDIUM + 1 LOW fixes applied):_

- **HIGH: `useRef` lazy-init runs in render body - fragile under Strict Mode.** Original `ChatWindow` used `const sessionIdRef = useRef(null); if (sessionIdRef.current === null && typeof window !== "undefined") { sessionIdRef.current = getOrCreateSessionId(); }`. Strict Mode's double-render runs the side-effecting init twice with no cleanup. Fixed by switching to a lazy `useState` initializer: `const [sessionId] = useState(() => typeof window !== "undefined" ? getOrCreateSessionId() : null)`. React contract-guarantees the initializer runs exactly once even under Strict Mode.
- **HIGH: dispatch on `m.role === "system"` was not future-proof.** The previous one-condition discriminator silently routed any future system variant to `<LeadCaptureCard>`. Fixed by adding an inner `m.kind === "lead_capture"` check + a trailing `const _: never = m.kind` exhaustiveness assertion. A new variant lands as a compile-time error here instead of silent runtime misbehavior.
- **MEDIUM: `handleMarkAllRead` fire-and-forget.** Now checks `res.ok`, surfaces an inline "Couldn't clear notifications." error on failure, and skips `onAllRead()` so the local badge state doesn't desync from the server.
- **LOW: `role="menu"` without `menuitem` children.** Changed to `role="region"` with `aria-label="Notifications"` - semantically correct for a notification panel that's not a command menu. Updated 3 test assertions accordingly.
- **MEDIUM not applied: `SAFE_EMAIL` regex vs Zod `.email()`.** Reviewer claimed Zod rejects `a@b.c` (1-char TLD); in practice Zod's `.email()` accepts the HTML5-spec shape which includes 1-char TLDs. Tightening would over-reject. Skipped.
- **LOW not applied: `conversationId` undefined in JSON response.** `NextResponse.json` strips undefined fields via `JSON.stringify`, so the response shape is `{ reply }` (no extra key) when persistence fails. Client-side check `if (body.conversationId)` correctly handles both shapes. No-op fix declined.

**Files changed:**

_Lead capture:_

- `src/lib/client/lead-capture-state.ts` - create - sessionStorage state machine.
- `src/lib/client/lead-capture-state.test.ts` - create - 5 specs.
- `src/components/chat/types.ts` - update - added system+lead_capture variant.
- `src/components/chat/MessageBubble.tsx` - update - narrowed prop type to exclude system variant.
- `src/components/chat/LeadCaptureCard.tsx` - create - client component.
- `src/components/chat/LeadCaptureCard.test.tsx` - create - 7 specs.
- `src/components/chat/ChatWindow.tsx` - update - sessionId via useState, conversationId state, render dispatch with exhaustiveness, lead-capture insertion in success path.
- `src/components/chat/ChatWindow.test.tsx` - update - stateful lead-capture-state mock + 3 new specs (no card before threshold, card at threshold, dismiss is permanent).
- `src/app/api/chat/[botId]/route.ts` - update - return `{ reply, conversationId? }`.
- `src/app/api/chat/[botId]/route.test.ts` - update - 1 new spec (omits conversationId when persistence throws), updated happy-path assertion.

_Notification bell:_

- `src/components/dashboard/NotificationBell.tsx` - create - bell + polling + visibility pause + outside-click/ESC close.
- `src/components/dashboard/NotificationBell.test.tsx` - create - 6 specs (badge, 9+ cap, polling cadence with `shouldAdvanceTime: true`, open/close).
- `src/components/dashboard/NotificationDropdown.tsx` - create - fetch + render + mark-read + mark-all + empty/loading/error states.
- `src/components/dashboard/NotificationDropdown.test.tsx` - create - 7 specs (loading, empty, render, click-marks-read-and-navigates, mark-all-fires-endpoint, mark-all-hidden-when-all-read, fetch error).
- `src/app/(dashboard)/layout.tsx` - update - mounted `<NotificationBell />` in header.

Total: 10 new source files + 6 test files + 5 updated source files. 588/588 tests pass (559 → 588, net +29), build green.

**Decisions made:**

- **System message variant over a sibling overlay.** Putting the lead-capture card in the message stream (as `{ role: "system"; kind: "lead_capture" }`) means it inherits the scroll-to-bottom behavior, sits naturally between bubbles, and the messages array is the single source of truth for "what is the conversation's current state". A sibling overlay would have required a separate `cardVisible` boolean + manual scroll coordination + duplicate persistence logic. The cost is a new union variant + a narrowed prop type on MessageBubble; the benefit is fewer moving parts.
- **`useState` lazy initializer, not `useRef` write-on-render.** This is the React-canonical pattern for "compute once at mount and never again." Strict Mode double-render is safe, no cleanup gymnastics, the value is stable across all renders. The render-body ref write would have worked today but set a risky precedent for future contributors.
- **Exhaustiveness check via `const _: never = m.kind`.** Today the new variant routes correctly; tomorrow's contributor adds `{ kind: "cookie_banner" }` and the compiler flags this line instead of the renderer shipping a lead-capture card with no usable props. One line of code; defends against an entire class of future bugs.
- **Stateful mock for lead-capture-state in ChatWindow tests.** A static `() => "pending"` mock can't model the dismiss-then-no-rerender behavior. The stateful Map-backed mock lets the test exercise the real state-machine semantics without touching real sessionStorage.
- **Page Visibility API for polling pause.** A user with the dashboard open in a background tab shouldn't burn 30s polling forever - both for battery on laptops and for server cost (cheap query, but free isn't zero). Pausing on hidden + immediate refresh on visible is the standard pattern; it adds ~10 lines and removes the entire class of "I left the dashboard open overnight and woke up to dead battery" reports.
- **Single click on a notification = mark-read + navigate.** The reviewer of slice-6.2 prep agreed (Q4) - when a user clicks a notification, they're clearly engaging with it; making them also click a separate "✓" button is friction with no upside. Fire the mark-read in parallel with the navigation since the mark-read endpoint is idempotent and we don't need to await it.
- **Bell badge caps at "9+", not at 99 or 999.** Real-world unread counts beyond 10 are noise - a user with 47 unread leads has already missed the signal. "9+" tells them "you have a backlog to deal with"; the exact number doesn't change the action. Also keeps the badge visually tiny.
- **In-chat lead-capture card POSTs from the recruiter's anonymous browser session.** The endpoint is CORS-public and idempotent. The card's email field is HTML5-validated (browser-side) AND regex-validated client-side AND Zod-validated server-side. Three independent layers; the cost is ~20 lines.
- **Inline error message on submit failure, no toast.** The card is right there; the recruiter is looking at it. A toast would compete for the same attention with worse semantics. The inline error stays under the input where the recruiter is focused.

**Open questions / follow-ups:**

- Real-time notifications: 30s polling is the simple-enough-for-Stage-6 path. Stage 7 can swap to Server-Sent Events or WebSockets if "the bell badge updated 28 seconds late" turns out to matter. The dropdown fetch is also a one-shot per open; making it live-update would be the same protocol upgrade.
- The lead-capture card's email regex (`SAFE_EMAIL`) and the server's Zod `.email()` aren't enforced to match each other. A future Zod upgrade could change behavior on edge cases (e.g. RFC 6531 internationalized addresses); the client would silently accept what the server rejects. Worth a shared schema module in Stage 7.
- No retry on transient network failures in the lead-capture POST. A recruiter on flaky wifi sees "Network error. Please try again." and has to retype the email. Acceptable for slice 6.4; an exponential-backoff retry in the fetch wrapper would be Stage 7 work.
- Notification dropdown clicks navigate to `/dashboard/bots/[botId]/leads`, not directly to the specific lead. A "?highlight=leadId" query param + scroll-and-flash on the leads page would be a small UX upgrade.
- Bell polling cadence is hardcoded at 30s. Per-user preference (or per-deployment env var) could land in Stage 7 once we have a preferences surface.
- Slice 6.5 (final Stage 6 slice) wires the settings page: editable name/headline/personality/suggested questions + reuse of the Bot Factory dropzone for knowledge sources. After 6.5, Stage 6 is a complete product loop and we move to Stage 7's launch-prep work.

---

### 2026-06-20 06:38 - Stage 6 Slice 6.5: settings page + knowledge management UI (Stage 6 COMPLETE)

**What was asked to do:** Ship the final Stage 6 slice - the bot settings page that lets owners edit identity (name, headline, personality, suggested questions) via PATCH, plus the dashboard-side knowledge management UI (list sources, drag-drop upload, per-source delete with a design-system confirmation modal, "Reprocess all"). After this slice, Stage 6 is a complete product loop: BYO-key chat → ingestion → RAG → multi-tenant public chat → embeddable widget → analytics + lead capture + notifications + editable settings. Plan §6 is done.

**Locked decisions before any code (Q1-Q9):** Q1 dedicated `KnowledgeManager` component for the dashboard (no Bot-Factory wizard extraction - the wizard's "create new bot" copy doesn't fit "manage existing knowledge"). Q2 whole-form Save button at the bottom of the identity form - explicit, no surprises. Q3 chip-based suggested-questions editor matching the Bot Factory affordance but as its own component. Q4 `window.confirm`-style confirmation flow, BUT styled per the design system - built a `ConfirmDialog` component (native window.confirm cannot be themed). Q5 inline "Reprocessed N tokens" status next to the button. Q6 Bot Factory radio cards for personality (richer than a select for the dashboard surface). Q7 whole-form Save (single PATCH per click). Q8 drag-and-drop upload zone (parity with Bot Factory's dropzone UX). Q9 single-pass slice.

**What I did:**

_Schema + route widening:_

- `src/lib/bots/schemas.ts` - widened `botPatchInput` from `{themeColor?}` (slice 5) to `{name?, headline?, personality?, suggestedQuestions?, themeColor?}`. Each field independently optional; the `.refine()` "must include at least one field" check stays. `name` is `.trim().min(1).max(100)`; `headline` is `.transform(trim).max(120)` so whitespace-only PATCHes can't leave blank-looking strings in the DB; `personality` is the `PERSONALITY_PRESETS` enum; `suggestedQuestions` is the bounded array (max 6, each ≤ 200 chars).
- `src/app/api/bots/[botId]/route.ts` - PATCH handler unpacks the five whitelisted fields from `parsed.data` and builds the SET payload via explicit conditional assignment. The Zod schema IS the mass-assignment whitelist: fields like `userId`, `isActive`, `contextText`, `emailVerified` are not in `botPatchInput` so they can never reach the SET object even if a hostile client sends them. Returning shape extended to include all four newly-editable fields.
- `src/app/api/bots/[botId]/route.test.ts` - extended from 6 to 13 specs: each new field validates (happy path, name>100, empty name, bad personality enum, >6 suggested questions, name+headline PATCH, personality+suggestedQuestions PATCH, settings mass-assignment regression).

_Reusable components (4 new):_

- `src/components/dashboard/ConfirmDialog.tsx` - design-system styled modal. `role="dialog"`, `aria-modal="true"`, ESC to cancel, backdrop **click** (not mousedown - review fix; mousedown would close on accidental drag-out from inner panel). `destructive` prop swaps the confirm button to rose-600 for delete actions. Confirm button auto-focuses for keyboard flow. 7 specs.
- `src/components/dashboard/SuggestedQuestionsEditor.tsx` - chip-based add/remove. Add via button or Enter. Cap at 6 with input + button disabled state at the cap. **Dedupe with explicit "Already in the list" hint** (review fix - silent dedupe was a HIGH-flagged UX defect; users typed something, hit Add, and nothing visible happened). Chip key is the question value itself (not `idx-q` composite - review fix; values are deduped so the value alone is a stable key). 8 specs.
- `src/components/dashboard/BotSettingsForm.tsx` - whole-form Save with diff-based PATCH (only sends changed fields, saves DB write churn + cleaner audit trail). Uses Bot Factory radio cards for personality (sr-only radio + visual `<label>` styling, accessible via keyboard arrows). State seeded from props once at mount - **intentionally** does NOT sync state from changed initial\* props mid-edit (would clobber the user's in-flight typing if the parent server-component re-renders mid-session). `router.refresh()` on success so the page's RSC tree picks up the new values. Saved! transient clears after 1.5s. 7 specs.
- `src/components/dashboard/KnowledgeManager.tsx` - fetches `GET /api/bots/[botId]/knowledge` on mount, renders source list with name + type + chunk count + token count (formatted as "9.3K tokens" for readability). Drag-and-drop OR click-to-choose PDF upload - drops non-PDF files with an inline error. Per-source delete via `<ConfirmDialog destructive>`. "Reprocess all" button hits `/knowledge/reprocess` and shows transient "Reprocessed (14,551 tokens)." status. Empty state when no sources. 7 specs.

_Page + nav (2 new/updated):_

- `src/app/(dashboard)/dashboard/bots/[botId]/settings/page.tsx` - server component, standard `findFirst({where: and(eq(bots.id), eq(bots.userId))})` → `notFound()` tenancy pattern (same as the other slice-6.3 sub-routes). Renders two sections: Identity → `<BotSettingsForm>`; Knowledge sources → `<KnowledgeManager>`. Defense-in-depth fallback to "professional" when the DB stores an unknown personality string (with a comment explaining this should be unreachable since `PERSONALITY_PRESETS` is Zod-enforced at create + PATCH). 4 specs.
- `src/app/(dashboard)/dashboard/bots/[botId]/page.tsx` - added "Settings →" link to the sub-nav strip next to Conversations / Leads.

_Code-review pass (1 HIGH + 1 MEDIUM + 2 LOW fixes applied; 1 HIGH skipped as incorrect analysis):_

- **HIGH applied: silent dedupe in SuggestedQuestionsEditor.** Users typed a duplicate question, hit Add, the input cleared, and nothing visible happened. Added a "Already in the list" hint that surfaces beside the "X of 6 questions" counter so the user knows why their Add appeared to do nothing.
- **HIGH skipped: stale initial-props state after router.refresh().** Reviewer claimed `dirty = name !== initialName` would be evaluated against frozen initials. Wrong - that expression is in the render body, evaluated each render with the latest prop value. After `router.refresh()` the server re-renders with new `initialName` and the client's `dirty` check correctly compares to the latest prop. Syncing state from props on prop change (the reviewer's suggested fix) would actually be worse - it would clobber the user's in-flight typed values whenever the parent re-renders mid-edit. Added a comment to document the intentional pattern.
- **MEDIUM applied: ConfirmDialog backdrop drag-close.** Switched from `onMouseDown` to `onClick` on the backdrop. With mousedown, a user who drag-released from inside the panel onto the backdrop would dismiss the dialog. The `click` event by spec requires both press and release on the same target, so this edge case is impossible.
- **MEDIUM applied: headline whitespace-only PATCH.** Added `.transform((v) => v.trim())` to `botPatchInput.headline` so `{ headline: "   " }` stores the empty string (the canonical "no headline" value) instead of three spaces that render as a blank-looking headline in the widget.
- **MEDIUM acknowledged: file input value reset ordering safe.** Reviewer confirmed `e.target.value = ""` after `handleUpload(e.target.files)` is safe because `Array.from(files)` captures the FileList synchronously before the reset. Added a "do not swap these lines" comment to prevent a future maintainer from reordering.
- **LOW applied: chip key composite → just `q`.** Dedupe enforcement at add-time means `q` alone is unique; the index component partially defeated React's reconciliation on remove-from-middle. Now `key={q}`.
- **LOW applied: personality fallback comment.** Documented that the `isPersonality(bot.personality) ? … : "professional"` fallback is defense-in-depth - unreachable in practice since the value is Zod-enforced at every write path.

**Files changed:**

_Schema + route:_

- `src/lib/bots/schemas.ts` - update - widened `botPatchInput` to 5 fields.
- `src/app/api/bots/[botId]/route.ts` - update - SET-payload + returning extended.
- `src/app/api/bots/[botId]/route.test.ts` - update - +7 specs (13 total).

_Components:_

- `src/components/dashboard/ConfirmDialog.tsx` - create - design-system modal.
- `src/components/dashboard/ConfirmDialog.test.tsx` - create - 7 specs.
- `src/components/dashboard/SuggestedQuestionsEditor.tsx` - create - chip editor.
- `src/components/dashboard/SuggestedQuestionsEditor.test.tsx` - create - 8 specs.
- `src/components/dashboard/BotSettingsForm.tsx` - create - diff-based whole-form save.
- `src/components/dashboard/BotSettingsForm.test.tsx` - create - 7 specs.
- `src/components/dashboard/KnowledgeManager.tsx` - create - list + drag-drop + delete + reprocess.
- `src/components/dashboard/KnowledgeManager.test.tsx` - create - 7 specs.

_Page + nav:_

- `src/app/(dashboard)/dashboard/bots/[botId]/settings/page.tsx` - create - server component.
- `src/app/(dashboard)/dashboard/bots/[botId]/settings/page.test.tsx` - create - 4 specs.
- `src/app/(dashboard)/dashboard/bots/[botId]/page.tsx` - update - added Settings → link.

Total: 10 new source files + 6 test files + 3 updates. 628/628 tests pass (588 → 628, net +40), build green, new `/dashboard/bots/[botId]/settings` route registered (4.36 kB).

**Decisions made:**

- **Zod schema IS the mass-assignment whitelist.** Slice 5 established the pattern for PATCH (themeColor only); slice 6.5 widens to 5 fields with the same shape. Fields not in `botPatchInput` literally cannot reach the SET object - there's no per-field `delete body.x` denylist that could be forgotten.
- **Trim `headline` server-side, not client-side.** Client-side trim is bypassable; server-side trim ensures the DB never holds whitespace-only padding. Same pattern Zod applies to email/username at registration.
- **Diff-based PATCH client side.** Only fields that changed go in the body. Cleaner audit trail, smaller request bodies, and the `.refine()` "at least one field" check is naturally satisfied (if nothing changed, Save is disabled).
- **Whole-form Save over per-section saves.** Two save buttons (Identity, Suggested questions) create "did the second save actually happen?" anxiety. One button keeps mental model simple.
- **Design-system `ConfirmDialog` over `window.confirm`.** Native `window.confirm` cannot be themed - looks out of place against the dashboard. Building the modal is ~80 lines and reusable for any future destructive action.
- **`onClick` on backdrop, not `onMouseDown`.** Click requires press + release on the same target by HTML spec, so accidental drag-out from inner panel doesn't dismiss. Snappier-feeling `mousedown` is the wrong tradeoff for destructive flows.
- **State seeded from props once, not synced on prop change.** Edit forms hold user input; parent re-renders with new initial values are expected (e.g. after `router.refresh()`), but the user's typed-but-unsaved input must NOT be clobbered. The `dirty` check compares to the latest prop value in the render body, so subsequent edits remain correctly diffed against the fresh initials.
- **Personality fallback to "professional", not throw.** A direct-DB write that leaves an unknown personality value would otherwise crash the page render. The fallback degrades gracefully - UI shows "Professional", first save writes the validated value back, the row heals silently.
- **Dedupe with visible hint.** Users who type a duplicate suggested question and hit Add deserve an answer for why the input cleared but the chip list didn't grow. A `role="status"` hint is one line and removes the entire "did Add work?" confusion.
- **Drag-and-drop AND click-to-choose.** Filtering dropped files to `application/pdf` only prevents a 415 round-trip when someone drags a `.txt` or image; the inline error guides them to the right file type.

**Stage 6 closeout - what works after this slice:**

- BYO-key chat with multi-provider abstraction (Stage 1).
- PDF + text ingestion with chunking + per-bot context cap (Stage 2).
- RAG with optional embedding key (Stage 3).
- Public multi-tenant chat at `/u/<username>/chat` + onboarding + avatars (Stage 4).
- Embeddable widget with Shadow DOM + theme color + signature badge (Stage 5).
- Stage 6 complete loop:
  - 6.1: schema + chat persistence (conversations + messages now actually written).
  - 6.2: 10 API endpoints (analytics, conversations, leads, notifications).
  - 6.3: dashboard UI (overview, sub-routes, transcript viewer, CSV export).
  - 6.4: in-chat lead capture + notification bell with 30s polling.
  - 6.5: settings page + knowledge management UI.

**Stage 6 limitations (resolved in Stage 7):**

- No persistent rate limits (in-memory only). Stage 7 Redis layer fixes this.
- No OAuth, no email verification / password reset. Stage 7.
- No landing page, no GDPR flows, no self-host packaging. Stage 7.
- No structured logger (still `console.warn` for swallow-and-log paths). Stage 7.

**Open questions / follow-ups:**

- The settings page edits 4 identity fields. `contextText` (the manually-typed text block from the Bot Factory) is intentionally NOT editable here - that field is derived from the `knowledge_base` chunks via `assembleAndSaveBotContext`. If a user wants to edit the manual text block specifically, they go back to the Bot Factory wizard. Acceptable; the KnowledgeManager surface covers the "manage knowledge" need.
- No bulk-delete in KnowledgeManager - each source is deleted one at a time. Acceptable for typical bot counts (1-5 PDFs); add multi-select if users start complaining.
- The reprocess button's "X tokens" status is transient (stays until next action). A persistent "last reprocessed at" timestamp would be nice but isn't blocking.
- `BotSettingsForm` doesn't expose `themeColor` (lives on the bot detail page via `<ThemeColorPicker>`). Could consolidate but the detail page already shows it in context with the embed snippet preview.
- Next step is Stage 7. The build plan describes hardening, OAuth, landing page, GDPR, self-host packaging, monitoring, structured logger. That's a different beast - multiple parallel workstreams; will need a fresh planning pass.

---

### 2026-06-20 07:53 - Dashboard redesign Slice A: layout shell + dashboard home rebuild

**What was asked to do:** Port `design/dashboard.html` (left sidebar + sticky topbar + 4 metric tiles + 7-day chart + top topics + recent leads table + recent conversations + share-your-bot card) into the existing React codebase. Apply the shell to all `(dashboard)` pages. Wire pieces that have data; mark unwired pieces with a faded "Coming soon" pill. The redesign was split into 3 slices; Slice A covers the shell + dashboard home.

**Locked decisions before any code (Q1-Q10):** Q1 the new sidebar+topbar shell applies to all dashboard pages (sub-pages get re-themed in Slice C). Q2 selected bot persists in a per-browser cookie (read by `cookies()` in any RSC; no server-side storage / Redis needed for a single-value preference). Q3 docs links go to `https://docs.pro-bot.dev/guides/embed-widget` (external - a stub page lands in Slice C). Q4 faded content + Coming Soon pill (not blank placeholder cards). Q5 curvy smooth line chart over the conversation counts (Catmull-Rom → cubic Bézier, SVG-native, no chart lib). Q6 multi-bot users: the user's first/most-recently-updated bot is the fallback; selection is per-browser via cookie + dropdown switcher above the workspace nav. Q7 mobile gets a hamburger button + slide-in panel with the full sidebar. Q8 NotificationBell migrates from the old single-row header into the new topbar. Q9 first-time users (no bots) see a focused empty-state CTA. Q10 single-pass slice (Slice A); Slices B (settings 5-tab redesign) and C (polish + sub-page re-theme) ship separately.

**What I did:**

_Server / data layer (4 new modules):_

- `src/lib/server/selected-bot.ts` + test - cookie-backed bot selection. `resolveSelectedBotId(validIds, fallbackId)` reads the cookie and validates the value is in the user's owned bot set; stale or hostile cookie values fall through to the fallback. `writeSelectedBotCookie(botId)` is the writer (httpOnly per the review fix - XSS can't enumerate the user's bot IDs).
- `src/lib/analytics/queries.ts` - added `getDailyConversationCounts({userId, days})` using Postgres `generate_series` to emit one row per day even on zero-count days. `days` is clamped `[1, 365]` defensively. SQL is Drizzle's parameterized `sql\`\`` template - no string interpolation.
- `src/lib/conversations/queries.ts` - added `listRecentConversationsForUser({userId, limit})` joining `conversations` × `bots` so the dashboard can show cross-bot recent activity.
- `src/lib/leads/queries.ts` - added `listRecentLeadsForUser({userId, limit})` joining `leads` × `bots` for the recent leads table.
- `src/lib/ai/provider-labels.ts` - moved the inline PROVIDER_LABELS map from BotFactoryForm into a shared module; `describeProvider(provider, model)` is the consumer-facing helper.
- `src/app/(dashboard)/actions.ts` - `selectBotAction(formData)` server action. Validates session + bot ownership in a single `findFirst({where: and(eq(bots.id), eq(bots.userId))})` before writing the cookie; a forged form payload pointing at another user's bot is silently rejected.

_Shell components (under `src/components/dashboard/`):_

- `ComingSoonPill.tsx` - gray "Coming soon" pill primitive, two sizes.
- `ModelStatusCard.tsx` - bottom-of-sidebar widget showing `describeProvider(user.llmProvider, user.llmModel)` with a brand-deep gradient background. Active indicator + "Manage model & key" CTA.
- `BotSwitcher.tsx` + test - dropdown above the workspace nav. Single-bot users see a static card (button disabled, no caret). Multi-bot users get a click-to-open menu; each item is a `<form action={selectBotAction}>` with hidden `botId` input. Outside-mousedown + ESC close the dropdown.
- `Sidebar.tsx` - desktop sidebar shell (`hidden lg:flex` wrapper in the layout). Renders logo + BotSwitcher + nav sections (Workspace / Build / Account) + ModelStatusCard + user card with sign-out icon link. All SVG glyphs (no external icon-font dependency).
- `SidebarNavLink.tsx` - client component. Active highlight computed via `usePathname()` so the server layout doesn't have to thread the current path. Exact-match for `/dashboard`, prefix-match for everything else. Supports external links (`target="_blank" rel="noopener noreferrer"`), inline count badges (muted gray for "Conversations", brand-color for "Leads" when > 0).
- `MobileSidebar.tsx` - three exports: `MobileSidebarProvider` (context owning open/close state, mounted at the layout root, auto-closes on `usePathname()` change), `MobileSidebarToggle` (hamburger button, `lg:hidden`, lives inside the Topbar), `MobileSidebarPanel` (slide-in fixed panel with backdrop + body-scroll-lock + ESC close, mounted at the layout root and re-rendering the desktop Sidebar's content).
- `Topbar.tsx` - client component (so it can read `usePathname()` for the page title). Renders hamburger + page title + URL pill with `<CopyUrlButton>` + `<NotificationBell>` + "View live bot" CTA. Title derived from a tiny path-to-title map; conversation transcript paths show "Conversation" (singular), list paths show "Conversations" (plural).

_Dashboard sections:_

- `MetricTile.tsx` + test - icon (forum / chat / contact_mail / bolt) + big number + label + optional faded growth pill ("+18%" at opacity-30) + optional Coming Soon pill (also fades the value to opacity-40).
- `ConversationsLineChart.tsx` + test - SVG smooth Bézier curve. `toCoords` converts day counts to (x, y) pixels relative to a `viewBox`. `smoothPath` does Catmull-Rom → cubic Bézier conversion with neighbor-wrap-around at the edges. `fillPath` closes the curve along the baseline for a gradient fill. Falls back to a dashed baseline line on all-zero data so the panel doesn't visually collapse. "Today" label on the last point; weekday short name everywhere else.
- `TopTopicsPlaceholder.tsx` - faded skeleton bars (5 fixed labels at fixed percentages) + Coming Soon pill in the header.
- `RecentLeadsTable.tsx` + test - table with Email · Asked about · Company signal · When · View chat columns. `companyFromEmail` uses a registrable-domain heuristic (second-to-last segment for 3+ segment domains so `mail.stripe.com` → "Stripe" not "Mail"). Public providers (gmail, outlook, etc.) get no pill. "View all" link goes to the first lead's bot's leads page; row click opens the transcript.
- `RecentConversationsList.tsx` - 3 rows with avatar + recruiter email (or "Anonymous visitor") + truncated first-user-message preview + relative-time badge. "View all N conversations" footer link.

_Layout + page:_

- `src/app/(dashboard)/layout.tsx` - full rewrite. Fetches `[ownedBots, analytics, userRow]` in parallel via Promise.all. Resolves the selected bot via cookie. Computes user initials, public URL. Renders `<MobileSidebarProvider>` wrapping: desktop sidebar `<aside className="fixed hidden h-screen w-64 ... lg:flex lg:flex-col">` containing `<Sidebar>`, a main column with `<Topbar>` + `{children}`, and `<MobileSidebarPanel>` mirroring the sidebar content at the layout root.
- `src/app/(dashboard)/dashboard/page.tsx` - full rewrite. Empty state (no bots) renders a focused CTA; populated state renders Welcome greeting + 4 MetricTiles + ConversationsLineChart + TopTopicsPlaceholder + RecentLeadsTable + RecentConversationsList + Share-your-bot card (reuses slice-5 `<EmbedSnippet>` with the 3 cards: Public URL / Website embed / Email signature) + "Full embed guide →" link.

_Code-review pass (0 CRITICAL/HIGH; 3 MEDIUM + 1 LOW applied):_

- **MEDIUM applied: `httpOnly: true` on the bot selection cookie.** The value is bot ID (not a secret), but XSS can't enumerate the user's bot IDs from `document.cookie` with httpOnly. The cookie is only ever read server-side via `cookies()`; client JS has no need to see it.
- **MEDIUM applied: `getDailyConversationCounts` clamps `days` to [1, 365].** Defensive cap so a future caller passing `days = 1_000_000` doesn't generate a million-row `generate_series` in Postgres.
- **MEDIUM applied: `companyFromEmail` uses second-to-last domain segment for 3+ part domains.** `mail.stripe.com` → "Stripe" instead of "Mail". `.co.uk`-style public-suffix edge cases aren't handled (heuristic, not authoritative), but the decoration is correct for the common shapes. Added a regression test.
- **LOW applied: dropped the redundant ownership re-query in the dashboard page.** `ownedBots` is already pre-filtered by `eq(bots.userId, userId)`, so `selectedBot = ownedBots.find(...)` is ownership-verified by construction - no need for an extra DB round-trip.

**Files changed:**

_Server / queries:_

- `src/lib/server/selected-bot.ts` - create - cookie resolver + writer.
- `src/lib/server/selected-bot.test.ts` - create - 6 specs (tenancy boundary).
- `src/lib/analytics/queries.ts` - update - `getDailyConversationCounts` with clamped days.
- `src/lib/conversations/queries.ts` - update - `listRecentConversationsForUser`.
- `src/lib/leads/queries.ts` - update - `listRecentLeadsForUser`.
- `src/lib/ai/provider-labels.ts` - create - shared provider labels.
- `src/app/(dashboard)/actions.ts` - create - `selectBotAction` server action.

_Components:_

- `src/components/dashboard/ComingSoonPill.tsx` - create.
- `src/components/dashboard/ModelStatusCard.tsx` - create.
- `src/components/dashboard/BotSwitcher.tsx` - create.
- `src/components/dashboard/BotSwitcher.test.tsx` - create - 5 specs.
- `src/components/dashboard/Sidebar.tsx` - create.
- `src/components/dashboard/SidebarNavLink.tsx` - create.
- `src/components/dashboard/MobileSidebar.tsx` - create - Provider + Toggle + Panel.
- `src/components/dashboard/Topbar.tsx` - create.
- `src/components/dashboard/MetricTile.tsx` - create.
- `src/components/dashboard/MetricTile.test.tsx` - create - 4 specs.
- `src/components/dashboard/ConversationsLineChart.tsx` - create.
- `src/components/dashboard/ConversationsLineChart.test.tsx` - create - 4 specs.
- `src/components/dashboard/TopTopicsPlaceholder.tsx` - create.
- `src/components/dashboard/RecentLeadsTable.tsx` - create.
- `src/components/dashboard/RecentLeadsTable.test.tsx` - create - 7 specs.
- `src/components/dashboard/RecentConversationsList.tsx` - create.

_Layout + page:_

- `src/app/(dashboard)/layout.tsx` - full rewrite - new shell.
- `src/app/(dashboard)/dashboard/page.tsx` - full rewrite - new dashboard home.

Total: 17 new source files + 5 test files + 5 updated source files. 654/654 tests pass (628 → 654, net +26), build green, new `/dashboard` route at 4.4 kB first-load JS.

**Decisions made:**

- **Cookie over Redis for selected bot.** A single-value per-user preference doesn't need a server-side store. The cookie is read by `cookies()` in any RSC for free; no roundtrip to Redis, no infrastructure dependency.
- **Server action for bot switching, not a client fetch.** The form-action pattern (hidden `botId` input, `<form action={selectBotAction}>`) keeps the dropdown functional without JS in degraded modes AND lets the action `revalidatePath('/')` so every cached dashboard page re-renders against the new selection.
- **Active sidebar state computed via `usePathname()`, not threaded as a prop.** The server layout doesn't have to know which page is rendering; client-side `SidebarNavLink` reads the path itself. The layout stays declarative.
- **Topbar is a client component (not server).** It needs `usePathname()` to derive the page title. NotificationBell and CopyUrlButton are already client islands inside it, so making the wrapper client doesn't move the SSR boundary materially.
- **MobileSidebar uses a context provider, not prop drilling.** The hamburger trigger (inside Topbar) and the panel (mounted at layout root) need to share open/close state without threading through every server component in between.
- **Catmull-Rom → cubic Bézier for the curve (no chart library).** ~50 lines of math, zero dependencies, fully styleable via SVG. Falls back to a dashed baseline on all-zero data so the panel doesn't visually collapse to nothing.
- **Faded content + Coming Soon pill, not blank placeholder cards.** Preserves the design rhythm (4-card metric row, 2-col grid) so the dashboard feels complete; the "soon" signal is unambiguous via the gray pill + opacity-40 content fade.
- **Cookie httpOnly true.** The cookie holds a bot ID, not a secret - but XSS can't enumerate the user's bot IDs even with `document.cookie` access. Free hardening.
- **Registrable-domain heuristic for company-signal pills.** Second-to-last segment for 3+ segment domains catches the common `mail.stripe.com` → "Stripe" shape; public-suffix edge cases (`.co.uk`) are out of scope for a decorative pill.

**Open questions / follow-ups:**

- Slice B: settings page redesign as 5 tabs (Account / Bot configuration / Knowledge base / Security & privacy / AI model & key). The current single-page `BotSettingsForm` + `KnowledgeManager` get folded into the Bot configuration + Knowledge base tabs. AI model & key tab is entirely Coming Soon. Account / Security have placeholder content with Coming Soon pills on the not-yet-wired actions.
- Slice C: polish - sub-page re-theme (conversations / leads / settings sub-pages need their wrapper layouts updated to fit the new shell without duplicate "back to bot" links), the stub `/docs/guides/embed-widget` page (or accept the external 404 for now), Stage-7 task block in plan.md for: AI model & key page, growth pills wiring (week-over-week comparison), response time tracking, top topics NLP categorization.
- The dashboard's metric tiles 1-3 show real numbers + faded fake "+18%/+24%/+3 new" growth pills. The numbers are real; the percentages are decorative until Stage 7 builds week-over-week comparison.
- The "View live bot" topbar button is hidden on small screens (`sm:inline-flex`). Mobile users access the live bot via the sidebar slide-in panel's bot card.
- BotSwitcher dropdown items submit a form per click. There's no loading indicator between click and revalidation - typically completes < 100ms locally, but slow networks would see a flash. A pending-form indicator could land in Slice C.
- `MobileSidebarPanel` body-scroll lock uses `document.body.style.overflow = "hidden"` and restores the previous value on cleanup. Works correctly under React Strict Mode's double-render (each mount snapshots the current overflow and the final cleanup restores it).
- The slice intentionally left out tests for the layout, Sidebar wrapper, SidebarNavLink, ModelStatusCard, Topbar, MobileSidebar, TopTopicsPlaceholder, RecentConversationsList - focused coverage on security-critical / behavior-rich pieces (cookie resolver, MetricTile, RecentLeadsTable, BotSwitcher, ConversationsLineChart). Slice C can backfill if needed.

---

### 2026-06-20 08:17 - Dashboard redesign Slice B: 5-tab settings page

**What was asked to do:** Port `design/settings.html` into the existing settings route. Five tabs (Account, Bot configuration, Knowledge base, Security & privacy, AI model & API key) with URL-driven state. Reuse existing functionality where it's wired; mark unwired surfaces with Coming Soon pills. Per the locked decisions: AI model & key tab is entirely Coming Soon; Account/Security have Coming Soon pills on unwired actions; Bot configuration + Knowledge base fold in existing slice 6.5 functionality.

**What I did:**

_Schema + route widening:_

- `src/lib/bots/schemas.ts` - added `isActive: z.boolean().optional()` to `botPatchInput` so the Bot configuration tab's live/off toggle can write the bit. The slice-1 chat route and the slice-6.2 lead-capture endpoint both already gate on `bots.is_active`, so the toggle has real effect immediately.
- `src/app/api/bots/[botId]/route.ts` - destructures `isActive` and includes it in both the SET payload and the `returning()` projection. Comment block updated to reflect the new whitelist (the old comment listed `isActive` as a blocked field, which was wrong after the widening - review fix).
- `src/app/api/bots/[botId]/route.test.ts` - +2 specs (isActive happy-path; rejects non-boolean). Existing mass-assignment regression rewritten: previously asserted `isActive` was dropped, now asserts `userId`/`contextText`/`createdAt` are dropped while `isActive` is legitimately accepted.

_Tab framework + 5 tabs (new directory `src/components/dashboard/settings/`):_

- `SettingsTabs.tsx` - `<SettingsTabs>` + `<SettingsTabPanel>` pair. Tab state in URL via `?tab=`, written with `router.replace` (no history clog). Default tab is "account" - when active, the param is dropped (canonical URL). Unknown `?tab=` values fall through to the default. WAI-ARIA tabs pattern wired with `role="tablist"`/`role="tab"`/`role="tabpanel"` + `aria-controls`/`aria-labelledby` pairing (review fix - initial draft had the role attrs but no id linkage).
- `AccountTab.tsx` - read-only profile (avatar with initials, name, email, username with `probot.com/u/` prefix) + read-only password placeholder. All inputs disabled; Save button disabled. Section headers carry Coming Soon pills.
- `BotConfigTab.tsx` - status toggle (writes `isActive`), name, headline, personality cards (radio cards with inline SVG icons), Coming Soon Custom instructions textarea, theme color preset swatches + native `<input type="color">`, suggested questions section (reuses slice-6.5 `<SuggestedQuestionsEditor>`). Whole-form Save → PATCH with diffed body (only changed fields), `router.refresh()` on success. State-from-props-once pattern same as slice-6.5 BotSettingsForm (intentional - preserves in-flight user edits across parent re-renders).
- `KnowledgeTab.tsx` - from-scratch rewrite of slice-6.5 KnowledgeManager with the design's layout. Same underlying `/knowledge` endpoints (GET list, POST multipart, DELETE source, POST reprocess). Type-iconed source rows (PDF / text glyphs) with small icon-only delete button, dashed "Add source" upload zone, "Re-index all" button in the section header. Drag-drop still works; ConfirmDialog still used for delete confirmation.
- `SecurityTab.tsx` - rate-limit display cards reading `PER_MINUTE` and `PER_DAY` from `src/lib/ai/rate-limit.ts` directly (review fix - initial draft hardcoded 10/200 which silently disagreed with the actual `PER_DAY` default of 50). `MESSAGE_INPUT_MAX = 8000` mirrors the Zod cap on `/api/chat/[botId]` (sharing a constants module is a Slice C follow-up). Data & privacy rows (Export, Retention) + Danger zone (Delete account) are all Coming Soon - endpoints land in Stage 7 with the GDPR workstream.
- `AIModelKeyTab.tsx` - entire tab is Coming Soon. Renders a faded preview of the future provider/key editor (4-card provider grid, model dropdown, API key input with show/hide) so users see what's coming. Active "key stored locally only" badge mirrors the BYO-key promise.

_Page rewrite:_

- `src/app/(dashboard)/dashboard/bots/[botId]/settings/page.tsx` - full rewrite. Fetches `[bot, userRow]` in parallel (bot needs the new `isActive`/`themeColor` columns; userRow needs `llmProvider`/`llmModel` for AIModelKeyTab). Mounts `<SettingsTabs>` with the 5 `<SettingsTabPanel>` children. Ownership gate via standard `findFirst({where: and(eq(id), eq(userId))})` → `notFound()`. Defense-in-depth personality fallback retained (slice 6.5 review note still applies).

_Removed:_

- `src/components/dashboard/BotSettingsForm.tsx` + test (replaced by `BotConfigTab` - adds status toggle + theme swatches inline + Coming Soon custom instructions).
- `src/components/dashboard/KnowledgeManager.tsx` + test (replaced by `KnowledgeTab` - same endpoints, design-matched layout).

_Code-review pass (2 HIGH + 2 MEDIUM + 2 LOW fixes applied):_

- **HIGH: stale comments in PATCH route.** Two block comments still claimed `isActive` was a blocked field; with the Slice B widening that became wrong and would confuse a future security audit. Updated both blocks to list real blocked fields (`userId`, `contextText`, `createdAt`, `updatedAt`) and call out that `isActive` is legitimately accepted now via the schema widening.
- **HIGH: SecurityTab rate-limit display was wrong.** Initial draft hardcoded `perDay: 200`; the actual default in `src/lib/ai/rate-limit.ts` is `50`. Users on stock defaults would have seen "200/day" in the UI while the enforced limit was 50 - a live correctness bug. Fixed by importing `PER_MINUTE` and `PER_DAY` from the rate limiter module so the display tracks the live values (including env overrides).
- **MEDIUM: `createContext` imported mid-file.** Moved to the top with the other React imports (matches the project's convention; the original placement worked at runtime but was visually misleading).
- **MEDIUM: `useTransition` wrap around `router.replace` was unused.** The pending signal was destructured away with `, ` and `router.replace` is a navigation, not a state update that benefits from concurrent rendering. Removed the wrap; `router.replace` called directly.
- **LOW: WAI-ARIA tab/panel pairing.** Added `id` to each `<button role="tab">` and each `<div role="tabpanel">`, with `aria-controls` (button → panel) and `aria-labelledby` (panel → button) so screen readers announce the relationship correctly.
- **LOW: `JSX.Element` → `React.ReactNode`.** The `PERSONALITY_CARDS.icon` type was `JSX.Element` which excludes fragments. The `creative` variant uses `<>...</>` and worked only because TS narrows JSX fragments to `JSX.Element`. Switched to `ReactNode` for consistency with project convention.

**Files changed:**

_Schema + route:_

- `src/lib/bots/schemas.ts` - update - `isActive` added to `botPatchInput`.
- `src/app/api/bots/[botId]/route.ts` - update - SET payload + returning + comment cleanup.
- `src/app/api/bots/[botId]/route.test.ts` - update - 2 new specs, regression updated.

_Components:_

- `src/components/dashboard/settings/SettingsTabs.tsx` - create - tab strip + URL state.
- `src/components/dashboard/settings/AccountTab.tsx` - create.
- `src/components/dashboard/settings/BotConfigTab.tsx` - create.
- `src/components/dashboard/settings/KnowledgeTab.tsx` - create.
- `src/components/dashboard/settings/SecurityTab.tsx` - create.
- `src/components/dashboard/settings/AIModelKeyTab.tsx` - create.

_Page + cleanup:_

- `src/app/(dashboard)/dashboard/bots/[botId]/settings/page.tsx` - full rewrite.
- `src/app/(dashboard)/dashboard/bots/[botId]/settings/page.test.tsx` - full rewrite - 9 specs covering notFound paths, all 5 tabs renderable via `?tab=`, default tab, unknown-tab fallback, unknown-personality fallback.
- `src/components/dashboard/BotSettingsForm.tsx` + `.test.tsx` - delete (replaced).
- `src/components/dashboard/KnowledgeManager.tsx` + `.test.tsx` - delete (replaced).

Total: 6 new components + 5 file updates + 4 file deletions. 648/648 tests pass (654 → 648; deleted 14 obsolete BotSettingsForm/KnowledgeManager specs, added 5 settings-page specs + 2 PATCH specs + 1 reused). Build green.

**Decisions made:**

- **Tab state in the URL via `?tab=`, not internal state.** Deep links into a specific tab work (e.g. `?tab=kb` opens the Knowledge base tab), browser back navigates between tabs, share-this-link works without losing context. Matches the slice-6.3 conversations-list `?q=` precedent.
- **Default tab is "account" and the URL drops `?tab=account` to keep it canonical.** Two URLs that point at the same logical view produce the same browser bar. Same pattern as `?page=1` being implicit in the slice-6.3 Pagination component.
- **`router.replace` (not `push`).** Tab-switching is a fluid navigation, not a "commit" the user wants to step back through. Push would clog the history with intermediate states.
- **Read-only Account tab over half-functional editing.** No PUT /api/users endpoint exists, so faking editable inputs that don't save would mislead the user. Read-only display of the current values + Coming Soon pills makes the boundary explicit.
- **Hard-import `PER_MINUTE` / `PER_DAY` from `rate-limit.ts` in SecurityTab.** The original hardcoded numbers silently disagreed with reality on day one - a live correctness bug, not theoretical drift. The shared-module import makes the display track whatever the deployment is actually running.
- **`KnowledgeTab` is a from-scratch rewrite, not a wrapper around `KnowledgeManager`.** The visual delta from the old component to the design's reference is substantial (icon-by-type rows vs. plain rows; dashed "Add source" zone vs. drag-drop card; header "Re-index all" vs. inline button). A wrapper would have piled style hacks on top of the old markup; rewriting was cleaner.
- **`isActive` widening is the only schema change in this slice.** Custom instructions (mentioned in the design's bot config tab) would need a new column + migration; deferred to Stage 7 since the schema add isn't blocking the tab UI from rendering as Coming Soon.
- **ARIA tabs pattern wired completely.** `role="tablist"`/`role="tab"` + `aria-selected` were in the initial draft; `aria-controls`/`aria-labelledby` + matching `id`s were added per the review. WAI-ARIA requires the full pairing for screen readers to announce panel-tab relationships.
- **Removed obsolete components instead of deprecating them.** `BotSettingsForm` and `KnowledgeManager` had no consumers after the rewrite (the only importer was the settings page). Keeping them around would have created drift risk. Deletion is the right cleanup.

**Open questions / follow-ups:**

- The Account tab's Save button has no endpoint to wire up. Stage 7's auth/account workstream adds PUT /api/users with `{ name?, email?, username?, password? }` validation + bcrypt for password.
- Custom instructions field on Bot configuration tab needs a schema column (`bots.custom_instructions text`) + Zod widening + a textarea wire-up. Deferred to Stage 7.
- AI model & key tab needs the real provider switcher + key input UI. The browser key-store (`llm-key-store.ts`) already exists from Stage 1; the Stage 7 tab just needs to surface it.
- Shared `src/lib/constants/limits.ts` module would consolidate `PER_MINUTE`/`PER_DAY` from rate-limit and the chat route's 8000-char input cap. Slice C follow-up.
- Slice C wraps up the redesign with sub-page re-theming + docs stub + Stage 7 task block in plan.md.
- The slice intentionally has no dedicated unit tests for individual tab components - the settings page test covers integration (tab routing, panel rendering, fallback). Slice C can backfill if it surfaces specific behavioral gaps.

---

### 2026-06-20 12:53 - Dashboard redesign Slice C: sub-page polish + test backfill + Stage 7 task block

**What was asked to do:** Close out the dashboard redesign. Sub-pages (conversations, transcript, leads, bot detail) need to fit the new shell without duplicate back-links + heavy chrome. Backfill unit tests for Slice A/B components that were intentionally left untested in the earlier slices. Append a Stage 7 task block to plan.md capturing every deferred item from Slices A/B/C so nothing falls through the cracks.

**What I did:**

_Sub-page cleanup:_

- `src/app/(dashboard)/dashboard/bots/[botId]/page.tsx` - full rewrite as a redirect. The bot detail page was a multi-section surface (Share/Embed/Theme + stat row + Conversations/Leads/Settings sub-nav) that's fully redundant after Slices A and B: dashboard home owns the share-your-bot card + aggregated stats, settings owns the Bot configuration tab + theme + knowledge management, sidebar owns the per-bot nav. The new page does the standard owner-gate then `redirect()`s to `/dashboard/bots/<id>/settings?tab=bot`, so existing bookmarks land somewhere useful.
- `src/app/(dashboard)/dashboard/bots/[botId]/conversations/page.tsx` - trimmed the "← Back to {bot.name}" link (sidebar is the canonical nav now), updated wrapper from `mx-auto max-w-4xl px-4 py-10` to `max-w-4xl px-6 py-8 lg:px-8` to match dashboard home / settings page chrome. Empty-state CTA "Get your URL" removed (sidebar workspace card + dashboard home Share-your-bot panel both surface the public URL - duplicate would point at the now-redirected bot detail route).
- `src/app/(dashboard)/dashboard/bots/[botId]/conversations/[convId]/page.tsx` - trimmed "← Back to conversations" link, updated wrapper, dropped now-unused `Link` import.
- `src/app/(dashboard)/dashboard/bots/[botId]/leads/page.tsx` - trimmed "← Back to {bot.name}" link, updated wrapper, removed "Get your URL" empty-state CTA (same reasoning as the conversations page).

_plan.md update:_

- Appended `#### 7.11 Dashboard Redesign - Stage 7 Follow-ups` with 10 task items (A through J): AI model & key live editor, custom instructions field + schema column, Account tab editing endpoints (PUT /api/users), live growth pills (week-over-week analytics), response time metric (latency_ms column + capture in chat route), top topics NLP categorization, BotSwitcher pending-state indicator, GDPR endpoints (Export / Retention / Delete account), shared limits constants module (`src/lib/constants/limits.ts`), docs site stub for the external `https://docs.pro-bot.dev/guides/embed-widget` URL.

_Test backfill (+41 specs):_

- `src/components/dashboard/settings/BotConfigTab.test.tsx` - 10 specs covering initial value render, disabled-Save when unchanged, diff-based PATCH body, isActive status toggle wiring, Saved! transient + router.refresh, whitespace-name client-side block, 4xx server-error inline message, personality radio card switching, Coming Soon custom-instructions textarea is disabled, theme preset swatch click enables Save + posts new color. Replaces the 7 deleted slice-6.5 BotSettingsForm specs with broader coverage.
- `src/components/dashboard/settings/KnowledgeTab.test.tsx` - 7 specs covering initial fetch + render with header summary, empty state, ConfirmDialog confirm fires DELETE, Cancel closes dialog without DELETE, drag-drop upload POSTs multipart, "Re-index all" POSTs to reprocess + shows token-count status, initial fetch error renders alert. Replaces the 7 deleted slice-6.5 KnowledgeManager specs at parity.
- `src/components/dashboard/Topbar.test.tsx` - 11 specs covering path-to-title derivation (Dashboard / Conversations / Conversation singular / Leads / Settings / Bot Factory / unknown→fallback) + URL pill conditional + View live bot link conditional + `target=_blank rel=noopener noreferrer` on the live bot link.
- `src/components/dashboard/SidebarNavLink.test.tsx` - 7 specs covering exact-match active state for `/dashboard`, prefix-match for nested routes (transcript path activates Conversations nav), brand vs. muted badge tones, external link `target=_blank rel=noopener noreferrer`, external links never marked active.
- `src/components/dashboard/MobileSidebar.test.tsx` - 6 specs covering provider + toggle + panel: starts closed, opens on trigger click, closes via X button / ESC / backdrop click, body-scroll-lock applies while open + restores on close.

_Test-driven component improvement:_

- `BotConfigTab.tsx` `LabeledInput` helper now uses `useId()` to pair `<label htmlFor>` with `<input id>`. Without this, testing-library's `getByLabelText` couldn't associate sibling label+input, and screen readers wouldn't announce the relationship either. Real accessibility fix that surfaced because the test required it.

_Code-review pass (1 MEDIUM + 2 LOW applied; 1 LOW skipped as not-a-bug):_

- **MEDIUM applied: stale "Get your URL" empty-state CTAs.** Both the conversations and leads pages had `<Link href={\`/dashboard/bots/${bot.id}\`}>Get your URL</Link>` buttons that now point at the redirected bot detail route. The sidebar workspace card + dashboard home Share-your-bot panel already surface the public URL, so the CTAs were duplicate chrome. Removed both with explanatory JSX comments at the empty-state sites.
- **LOW applied: CopyUrlButton test stub interface.** The Topbar test's inline stub accepted only `{ url }` while the real component takes `{ url, label?, className? }`. Extended the stub to match so future test additions on this file don't silently lose label/className assertions.
- **LOW applied: Toggle wrapped in `<label>` was a redundant-click hazard.** The Bot status toggle's outer container was a `<label>` (which can synthetically re-fire clicks on the inner button on some assistive-tech configurations). Switched to `<div>`; the Toggle button is self-labelled via `aria-label="Bot status"` so no semantic loss.
- **LOW skipped: plan.md date stamp.** Reviewer flagged `(2026-06-20)` as one-day-ahead, but the current date per the session is indeed 2026-06-20 - the reviewer was working off stale context.

**Files changed:**

_Sub-page cleanup:_

- `src/app/(dashboard)/dashboard/bots/[botId]/page.tsx` - full rewrite - redirect to settings.
- `src/app/(dashboard)/dashboard/bots/[botId]/conversations/page.tsx` - update - trim back-link + CTA, update wrapper.
- `src/app/(dashboard)/dashboard/bots/[botId]/conversations/[convId]/page.tsx` - update - trim back-link, drop Link import, update wrapper.
- `src/app/(dashboard)/dashboard/bots/[botId]/leads/page.tsx` - update - trim back-link + CTA, update wrapper.

_plan.md:_

- `claude/plan.md` - append - section 7.11 with 10 follow-up items.

_Tests:_

- `src/components/dashboard/settings/BotConfigTab.test.tsx` - create - 10 specs.
- `src/components/dashboard/settings/KnowledgeTab.test.tsx` - create - 7 specs.
- `src/components/dashboard/Topbar.test.tsx` - create - 11 specs.
- `src/components/dashboard/SidebarNavLink.test.tsx` - create - 7 specs.
- `src/components/dashboard/MobileSidebar.test.tsx` - create - 6 specs.

_Component fixes (review pass):_

- `src/components/dashboard/settings/BotConfigTab.tsx` - update - `useId()` for LabeledInput, `<label>` → `<div>` around the status toggle.

Total: 4 sub-pages cleaned + 1 plan.md append + 5 new test files + 1 component improvement. 689/689 tests pass (648 → 689, net +41 - the backfill plus the bot detail page test was deleted with the page rewrite). Build green.

**Decisions made:**

- **Bot detail page → redirect, not deleted.** Bookmarks + old `/dashboard/bots/<id>` links still resolve via the redirect to settings. Pure delete would 404 those.
- **All sub-page back-links removed, including transcript → conversation list.** Initial draft kept the transcript back-link as a "useful contextual breadcrumb," but the sidebar's "Conversations" link goes to the same destination and removing it keeps the chrome consistent across all sub-pages. One canonical nav.
- **Empty-state CTAs removed, not redirected.** A "Get your URL" button that now points at a redirect would be visible UX cruft - better to remove and let the user discover the URL via the sidebar workspace card or dashboard home Share-your-bot panel.
- **`useId()` over manual id strings in LabeledInput.** Stable, unique-per-instance ids that survive React Strict Mode's double-render. Without proper label/input pairing, `getByLabelText` queries fail and screen readers can't announce the field's purpose.
- **Test backfill prioritized behavior-rich components.** AccountTab, SecurityTab, AIModelKeyTab are essentially static display components (Coming Soon for most controls) - smoke tests would have been low-value rote. BotConfigTab + KnowledgeTab + Topbar + SidebarNavLink + MobileSidebar have real interactive behavior worth verifying.
- **Stage 7 task block as a structured punch-list, not prose.** Each deferred item gets a sub-section (A through J) with the concrete what + how shape. Easier to pick up later - a Stage 7 contributor reads "B: add `bots.custom_instructions text` column" not "we should probably wire custom instructions someday."
- **Stub the right interface in test mocks.** The Topbar test's CopyUrlButton mock initially accepted only `{ url }`. A future test that asserts on the rendered label text would silently get the stub's `Copy ${url}` instead of the real component's `label || "Copy link"`. Matching the full interface up-front prevents the silent drift.

**Open questions / follow-ups (post-Slice-C):**

- Dashboard redesign is COMPLETE. Three slices shipped end-to-end: A (shell + home), B (5-tab settings), C (polish + tests + task block). The visual port from `design/dashboard.html` + `design/settings.html` is done.
- Stage 7 follow-ups are tracked in `plan.md` §7.11 (A through J). The most user-visible deferred items are the AI model & key live editor, custom instructions field, and Account tab editing endpoints - pick them up when the broader Stage 7 OAuth / GDPR / hardening workstream starts.
- Test coverage gap: the 5 settings tabs include 2 (AccountTab, SecurityTab, AIModelKeyTab) without dedicated unit tests. They're essentially static display components - a smoke test asserting "renders without crashing" is low value. Will revisit if specific behavioral bugs surface.
- Selected-bot cookie has no UI for "clear selection" - once set, it persists until the user picks a different bot or the cookie expires (1 year). Acceptable today; if Stage 7 adds explicit workspace switching the action might want a "reset to most recent" option.
- The `/docs/guides/embed-widget` external URL still 404s today since pro-bot.dev isn't live yet. Sidebar + dashboard "Full embed guide" links open in a new tab; users see the 404 page from the external host. Acceptable until the launch push; tracked as 7.11.J.

---

### 2026-06-20 13:12 - Dashboard redesign polish pass: shell alignment + signout modal + Bot Factory cleanup

**What was asked to do:** Four UX/visual fixes after using the redesigned dashboard:

1. Remove the duplicate "ProBot" branding from the Bot Factory page (already shown in sidebar).
2. Make the Bot Factory wizard step indicator static (sticky under the topbar) instead of scrolling with the page.
3. Sign-out from the sidebar should open a confirmation modal in-place (matching ConfirmDialog size), not redirect to next-auth's separate confirmation page.
4. Match the sidebar's logo header height to the topbar height so the two columns align horizontally.
5. The topbar's URL pill "Copy" word should be a copy icon (matching the design's reference).

**What I did:**

_Fix 1 - Topbar Copy icon:_

- `src/components/dashboard/CopyUrlButton.tsx` - added an optional `iconOnly?: boolean` prop. When true, renders a clipboard SVG glyph instead of the text label; flips to a check-mark SVG for the 1.5s "Copied!" transient. The button's `aria-label` + `title` still carry the human-readable state for screen readers and tooltips. Existing call sites (Bot Factory step 5, dashboard home bot card) continue to render text-label variants - the prop is opt-in.
- `src/components/dashboard/Topbar.tsx` - URL pill now uses `<CopyUrlButton iconOnly />` so the brand-colored clipboard glyph matches the design's `content_copy` material icon reference.

_Fix 2 - Sidebar header height aligns with topbar:_

- `src/components/dashboard/Sidebar.tsx` - the brand row was `p-4` (padding-based height around the logo + text). Switched to `flex h-16 shrink-0 items-center px-4` so the row is exactly 64px tall - same as the topbar's `h-16`. The sidebar's "ProBot" logo now sits at the same horizontal baseline as the topbar's page title.

_Fix 3 - Sign-out confirmation modal:_

- `src/components/dashboard/SignOutButton.tsx` (NEW) - client component. Renders the same logout-icon button the sidebar used to ship, but on click opens a `<ConfirmDialog>` (the design-system modal from slice 6.5) with title "Sign out of ProBot?" and a "You'll need to log back in" body. Confirm fires `signOut({ callbackUrl: "/login" })` from `next-auth/react`; the post-logout landing is `/login`. Cancel just dismisses the modal. While `pending`, the cancel handler short-circuits so a mid-signout click doesn't reopen the form.
- `src/components/dashboard/Sidebar.tsx` - replaced the `<Link href="/api/auth/signout">…</Link>` block with `<SignOutButton />`. Removes the visual jump to next-auth's stock confirmation page and the trip back via `?callbackUrl=`.

_Fix 4 - Bot Factory page cleanup:_

- `src/components/bot-factory/BotFactoryForm.tsx` - three changes inside the same file:
  - Outer wrapper: dropped `min-h-screen` from the form's outer `<div>`. The dashboard layout's main column already takes its own height; adding `100vh` inside it pushed the page taller than the viewport and forced a redundant outer scroll.
  - Inner content column: dropped `overflow-y-auto`. The natural document scroll now handles overflow; no nested scroll context competes with the page.
  - `StepperHeader`: removed the redundant "ProBot" text (the sidebar already shows it). Changed sticky positioning from `sticky top-0 z-30` to `sticky top-16 z-20` - the step strip now sits flush under the topbar (which lives at `top-0 z-30`) instead of competing with it. Height tightened from `h-16` to `h-14` since the step pills don't need a topbar-equivalent.

_Tests + build:_

- 689/689 tests pass after all four fixes. Production build green. No new test files - the fixes are visual/behavioral tweaks on existing components and the CopyUrlButton's `iconOnly` variant doesn't change the existing render contract (default-false). SignOutButton has no dedicated test yet; behavior is light enough (open dialog → confirm → call signOut) that integration coverage via the Sidebar render would catch regressions. Backfill if a real bug surfaces.

**Files changed:**

- `src/components/dashboard/CopyUrlButton.tsx` - update - add `iconOnly` prop + SVG icons.
- `src/components/dashboard/Topbar.tsx` - update - use `iconOnly` variant for the URL pill copy button.
- `src/components/dashboard/Sidebar.tsx` - update - `h-16` brand row + replace signout Link with `<SignOutButton />`.
- `src/components/dashboard/SignOutButton.tsx` - create - confirm-modal client component.
- `src/components/bot-factory/BotFactoryForm.tsx` - update - drop `min-h-screen` + `overflow-y-auto` from wrappers, strip "ProBot" + reposition sticky on `StepperHeader`.

**Decisions made:**

- **`iconOnly` as an opt-in prop, not a separate component.** A `<CopyIcon />` companion component would duplicate the clipboard-state machine (copied/error/idle). Keeping it as a render-time flag on the existing component preserves the state behavior - same accessible name, same transient feedback timing, same tooltip - while changing only the visible glyph.
- **`SignOutButton` is its own client component, not inline in Sidebar.** The Sidebar is a server component used in two trees (desktop sidebar + mobile slide-in panel). Embedding the modal state inline would force the Sidebar to become a client component, growing the client bundle for every dashboard page. Hoisting the small interactive piece keeps the sidebar's parent server-rendered.
- **`callbackUrl: "/login"` over `callbackUrl: "/"`.** A logged-out user landing on `/` would either see a marketing page (which doesn't exist yet) or get redirected back to `/login` anyway. Going straight to `/login` is one fewer redirect and gives the user a clear "next action" (log back in or close the tab).
- **`StepperHeader` at `sticky top-16` not `sticky top-0`.** The dashboard layout's topbar owns the `top-0` slot. Stacking two sticky elements at `top-0` makes whichever lost the z-index battle invisible. `top-16` (the topbar's height) puts the step strip immediately under the topbar where users expect it.
- **`z-20` for the step strip vs. `z-30` for the topbar.** Even with `top-16` placement, edge-case viewport sizes or transient animations could overlap the two. The lower z-index makes the topbar always paint on top - the correct precedence.
- **Bot Factory's nested scroll removal trusts the document.** Native document scroll is faster, has correct momentum on touch devices, and respects browser zoom + accessibility settings. Replacing it with an inner `overflow-y-auto` div was a holdover from the pre-redesign full-screen wizard layout.
- **Sidebar brand row height matched to topbar exactly.** Visual alignment across the two columns matters for the "page chrome feels like one continuous bar" effect. Approximate matching (with `p-4` getting ~60px) creates a 4px misalignment that's small enough to be uncomfortable rather than obviously wrong.

**Open questions / follow-ups:**

- `SignOutButton` has no dedicated unit test. Cover if it surfaces a bug (sign-out is a destructive action - worth a defensive test eventually).
- LivePreview pane in Bot Factory is not sticky - when the user scrolls the form content, the preview scrolls away with it. A future polish slice could make it `sticky top-32` (below topbar + step strip) so it stays visible during long form scrolls.
- The Bot Factory's right-column preview width is hardcoded `[1fr_440px]`. With the sidebar taking 256px on desktop, the form area can get cramped on mid-width screens (1024-1280px). A future responsive pass might collapse the preview to a smaller breakpoint or stack it below the form on `lg` screens.

---

### 2026-06-20 14:00 - Dashboard layout: main = viewport − topbar; Bot Factory fixed-height with internal column scroll

**What was asked to do:** Make `<main>` fill the screen below the topbar on desktop (`100vh − 4rem`). The Bot Factory page specifically should fill that space without scrolling the page itself - overflow should happen inside the form column, not on the document.

**What I did:**

_Layout - main is the scroll container on desktop:_

- `src/app/(dashboard)/layout.tsx` - the right column went from a natural-height block (`<div className="flex-1 lg:ml-64">`) to a fixed-height vertical flex stack (`lg:flex lg:h-screen lg:flex-col`). The topbar takes its existing `h-16`; `<main>` absorbs the remaining `calc(100vh − 4rem)` via `lg:flex-1` and becomes the scroll container with `lg:overflow-y-auto`. `lg:min-h-0` lets the flex item shrink below its content (the default `min-height: auto` would have prevented `overflow-y-auto` from kicking in).
- Mobile (no `lg`): the right column has no flex/h-screen, so it lays out naturally and the document scrolls. The topbar's `sticky top-0` keeps it pinned. Other dashboard pages (home / conversations / leads / settings) keep their existing scroll behavior - but on desktop the scroll happens inside `main`, not on the document. Topbar + sidebar stay visually pinned regardless of how far you scroll.

_Bot Factory - fixed-height with internal column scrolls:_

- `src/components/bot-factory/BotFactoryForm.tsx` outer wrapper: changed from `flex flex-col` (natural height) to `flex flex-col lg:h-full lg:overflow-hidden`. The wrapper now takes exactly `main`'s height (= `calc(100vh − 4rem)`) and hides any overflow - so `main` never has anything to scroll on this page.
- Grid container: added `lg:flex-1 lg:min-h-0` so the grid absorbs the remaining height after the step strip and the flex children can actually shrink below their content (the `min-h-0` is critical - same reason as in the layout).
- Left form column: re-added `lg:overflow-y-auto`. The previous polish slice removed this in favor of document scroll, but the new model puts the scroll context here.
- Right LivePreview column: added `lg:overflow-y-auto` for safety - the card is short today, but if it grows the scroll happens inside the column instead of breaking the layout.
- `StepperHeader`: `sticky top-16 z-20` is kept for mobile (where the document scrolls under it), but on desktop it becomes `lg:static lg:z-auto` because the parent wrapper is `overflow-hidden` and nothing is scrolling above the strip - it just sits as the first flex child. `shrink-0` prevents the strip from being squeezed when the grid demands height.

_Tests + build:_

- 689/689 tests pass. Production build green. No new test files - all changes are CSS-only structural; existing tests don't assert on layout dimensions.

**Files changed:**

- `src/app/(dashboard)/layout.tsx` - update - right column becomes `lg:flex lg:h-screen lg:flex-col`; main becomes `lg:flex-1 lg:overflow-y-auto lg:min-h-0`.
- `src/components/bot-factory/BotFactoryForm.tsx` - update - outer wrapper `lg:h-full lg:overflow-hidden`, grid `lg:flex-1 lg:min-h-0`, form column `lg:overflow-y-auto`, LivePreview `lg:overflow-y-auto`, StepperHeader `lg:static`.

**Decisions made:**

- **Main is the scroll container on desktop, document is the scroll container on mobile.** This dual model is the standard desktop-app-meets-mobile-web pattern. Desktop users get a fixed chrome (sidebar + topbar always visible) with content scrolling inside; mobile users get the native document scroll (sticky chrome via `sticky top-0`) so browser-level affordances like pull-to-refresh + URL-bar-hiding still work. Switching to internal scroll on mobile would lose those.
- **`lg:min-h-0` everywhere a flex child needs to shrink.** This is the magic CSS rule that makes flex+overflow play nicely. Without it, `flex: 1 1 auto` has an implicit `min-height: auto` which means "at least as tall as my content," which means `overflow-y-auto` never has anything to do. Setting `min-h-0` unblocks the scroll behavior. Came up twice: once on `main`, once on the Bot Factory grid.
- **`lg:overflow-hidden` on the Bot Factory wrapper, NOT on `main`.** If `main` had `overflow-hidden`, all dashboard pages would be capped at viewport height with no scroll - which would break long pages like the dashboard home. Putting `overflow-hidden` on the per-page wrapper (Bot Factory only) is the opt-in: pages that want the fixed-height-no-page-scroll behavior add it themselves; pages that want natural scrolling inherit `main`'s `overflow-y-auto` and just scroll inside main.
- **StepperHeader switches `sticky top-16 z-20` → `lg:static lg:z-auto`.** On mobile the strip needs to stick to the viewport (under the sticky topbar) as the document scrolls. On desktop the strip lives inside a non-scrolling parent - sticky has nothing to do, and dropping `z-auto` lets it stack naturally with the rest of the column.
- **Scroll container moved from document to main on desktop = subtle UX wins.** The topbar + sidebar never visually drift - they stay anchored, which matches users' mental model of "the app chrome doesn't move." The desktop app feels more like a real desktop app, less like a long-form web page. Mobile keeps the lighter web-document feel.

**Open questions / follow-ups:**

- The Settings page's tab strip is NOT currently sticky inside main. When users scroll a long settings tab (e.g. Bot configuration with lots of personality + suggested questions content), the tab strip scrolls out of view. Future polish: add `sticky top-0 bg-bg-app z-10` to the SettingsTabs strip so it stays visible while the tab panel scrolls.
- The `lg:h-screen` on the right column is technically `100vh`, which on iOS Safari includes the URL bar area in landscape mode - could cause a small visual shift. Using `lg:h-dvh` (dynamic viewport height) instead is the modern fix but has slightly less browser support. Acceptable for now; revisit if iOS users report layout shifts.
- Scroll restoration: the browser's default scroll-restoration-on-back targets the document. With main as scroll container on desktop, the back button might not restore main's scroll position. Next 14's App Router handles this for client navigations (router push/back) but for hard navigations the position may reset. Acceptable behavior; if it becomes an issue, the fix is `scroll-snap` or manual restoration via `sessionStorage`.
- `lg:h-screen` + `lg:overflow-y-auto` change means existing tests that render the layout don't catch any scroll-related regressions (they assert on rendered DOM, not visual flow). Manual QA is the canonical check for this kind of layout change.

### 2026-06-20 17:40 - Public marketing pages: /about, /privacy, /terms + shared header/footer extraction

**What was asked to do:** Design Terms of Service, Privacy Policy, and About pages that satisfy Google OAuth verification requirements (Google blocks brand verification without a public privacy policy on the registered domain that specifically discloses how Google user data is handled). Operator chose to ship the policies as a personal, non-commercial individual operator (F-1 student in the US, MIT-licensed free project - zero monetization, so personal-operator framing is honest and lowest-risk).

**What I did:**

_Shared marketing chrome - extracted from landing page so all four public pages share one header + footer:_

- `src/components/marketing/SiteHeader.tsx` - new - `"use client"` for the mobile-menu `useState`. Lifted verbatim from the inline header in `src/app/page.tsx` (logo + 5-item nav + Log in / Create your bot CTAs + hamburger). Anchor links that previously pointed to `#how` / `#features` / `#free-to-use` were rewritten to `/#how` / `/#features` / `/#features` so they work from any route, not just `/`. Added a new "About" nav item between Features and Docs that links to `/about`.
- `src/components/marketing/SiteFooter.tsx` - new - server component (no `"use client"`), no state. Five-column grid (brand, Product, Developers, Account, Company). Company column points to real routes `/about`, `/privacy`, `/terms` - replacing the three `#` placeholders that were in the landing page footer. Bottom bar reproduces the © + GitHub/Portfolio/LinkedIn icon links.
- `src/lib/marketing/legal.ts` - new - single source of truth for `OPERATOR_NAME`, `OPERATOR_DESCRIPTION`, `CONTACT_EMAIL`, `JURISDICTION`, `MINIMUM_AGE`, `DELETION_GRACE_DAYS`, `LEGAL_EFFECTIVE_DATE`, `GOOGLE_USER_DATA_POLICY_URL`. Updating any of these in one place flows through both /privacy and /terms.

_New `(marketing)` route group + three pages:_

- `src/app/(marketing)/layout.tsx` - new - 16-line server layout that renders `<SiteHeader />` → `<main>{children}</main>` → `<SiteFooter />`. The route group keeps the URLs at `/about` `/privacy` `/terms` (parentheses are routing-only sugar).
- `src/app/(marketing)/about/page.tsx` - new - server component, ~270 lines. Five sections: Hero, Why-this-exists / What-we-built (two-column), Principles (4-card grid: keys, data, MIT, $0), Who-builds-it (operator bio with `OPERATOR_NAME` + `OPERATOR_DESCRIPTION` from constants, plus Portfolio/GitHub/LinkedIn buttons), and a brand-blue-gradient CTA strip matching the landing page's "Read the docs" band.
- `src/app/(marketing)/privacy/page.tsx` - new - server component, ~490 lines. Sticky left-rail TOC on desktop (12 anchors). Sections in this order: Plain-language summary, Who operates ProBot, Data we collect (account/bot content/conversations/auth tokens + what-we-don't-collect), **Google Sign-In data (highlighted blue-50 card)**, How we use, Third-party services (Supabase/Vercel/Google/GitHub/Resend/user's LLM provider - named individually), Storage & retention, Your rights & deletion, Security, Children (16+), Changes, Contact. The Google section is the verification keystone: names the exact scopes (`openid` + `email` + `profile`), declares "we do not request Gmail/Drive/Calendar/Contacts", lists exactly what's stored (email, display name, image URL, provider account ID), explicitly states "not used for advertising / not used to train AI / not transferred", and includes the Google API Services User Data Policy compliance attestation with a link to the canonical URL. Deletion is "email us, 30 days" with a `mailto:` link surfaced repeatedly.
- `src/app/(marketing)/terms/page.tsx` - new - server component, ~360 lines. Same sticky-TOC layout. 15 sections: Acceptance & eligibility (16+), The service, Your account, Acceptable use (impersonation, copyright, illegal/harassing content, security attacks against other bots, scraping, spam, rate-limit circumvention), Your content (you keep ownership; limited licence for hosting only), Third-party services (disclaim availability), **AI output disclaimer (highlighted blue-50 card)**, Fees (free, no portion of LLM cost goes to ProBot), Termination, Disclaimer of warranties (uppercase per US convention), Limitation of liability (capped at USD $1.00 - appropriate for a free hobbyist project), Indemnification, Governing law (Maryland), Changes, Contact.

_Landing page refactor - replace duplicated chrome with the new shared components:_

- `src/app/page.tsx` - update - removed `"use client"` directive (the landing page is now a pure server component; only the header that needs `mobileOpen` state remains a client island via `SiteHeader`). Removed `useState` import, the entire inline `<header>…</header>` block (~140 lines including mobile menu), the entire inline `<footer>…</footer>` block (~170 lines), and the now-unused `GITHUB_URL` / `LINKEDIN_URL` / `PORTFOLIO_URL` constants (they live in `SiteFooter` now). `DOCS_URL` and the `MaterialIcon` helper stay - both still used in the body sections (Docs CTA band, hero icon, feature cards, etc.). Page dropped from 1236 lines → 952 lines.

_Tests + types:_

- `npx tsc --noEmit --pretty false` clean - no diagnostics.
- `npm test` 689/689 pass - no regressions. EmbedSnippet tests still green (they assert URL-building, not chrome layout).
- No new test files added: the marketing pages are pure JSX renders with no state or branching logic; their value is the legal copy, which test assertions can't validate (only a lawyer can).

**Files changed:**

- `src/lib/marketing/legal.ts` - create - single source of truth for operator identity, contact, jurisdiction, age, deletion grace, effective date, Google policy URL.
- `src/components/marketing/SiteHeader.tsx` - create - client component, mobile menu state, nav with About added between Features and Docs.
- `src/components/marketing/SiteFooter.tsx` - create - server component, 5-column footer with real `/about` `/privacy` `/terms` links replacing the previous `#` placeholders.
- `src/app/(marketing)/layout.tsx` - create - wraps About/Privacy/Terms in shared chrome.
- `src/app/(marketing)/about/page.tsx` - create - narrative + principles + operator bio + CTA.
- `src/app/(marketing)/privacy/page.tsx` - create - Google-OAuth-compliant policy with TOC and dedicated Google Sign-In section.
- `src/app/(marketing)/terms/page.tsx` - create - standard SaaS-shape ToS adapted for free/personal-operator/AI-output reality.
- `src/app/page.tsx` - update - drop "use client" + useState + inline header + inline footer + 3 unused URL constants; import and render `SiteHeader` + `SiteFooter` instead.

**Decisions made:**

- **Personal-operator framing, not LLC.** User is on F-1 visa and explicitly does not monetize. Listing himself as "an individual, non-commercial maintainer of an open-source project" matches reality and avoids the legal/visa surface area that comes with forming a business entity. The ToS liability cap of USD $1.00 is the appropriate floor for a free product - the legal-services norm is "amount user paid in last 12 months," which is $0 here, so a nominal $1 makes the cap enforceable without invoking any actual money flow.
- **Single `(marketing)` route group + extracted shared chrome instead of duplicated headers.** Three legal pages each inlining a 140-line header would be 420 lines of churn at each future logo/nav change. The route group + extracted components mean every future nav update touches one file.
- **Landing page becomes a server component as a side effect of the extraction.** All client-side state (just the mobile-menu `useState`) now lives inside `SiteHeader`, so `src/app/page.tsx` no longer needs `"use client"`. This drops a small amount of JS from the homepage bundle (Next will tree-shake the unused `useState` import path) and shifts the landing-page HTML to streaming-friendly server rendering. Side effect, not the goal - but worth keeping.
- **Privacy: the Google Sign-In section is visually distinct (blue-50 card with border).** Google's verification reviewers literally scan privacy policies for the required disclosures. Calling the section out visually makes it impossible to miss, even on a skim. The required clauses are present verbatim: scopes named, fields stored named, use limited to authentication, advertising/training/transfer explicitly negated, Limited Use compliance with link to `developers.google.com/terms/api-services-user-data-policy`, and a revocation mechanism (`myaccount.google.com/permissions`).
- **Privacy: third-party processors named individually (Supabase, Vercel, Google, GitHub, Resend, user's chosen LLM provider).** GDPR Article 28 effectively requires data-controllers to disclose their processors. Naming them out (vs. "various third parties") is the safe move and matches Google's verification reviewer expectations.
- **Constants file (`legal.ts`) instead of inlining the effective date.** Re-verifying next year means changing the constants file in one place rather than greping the three pages and the footer. Same pattern used for `CONTACT_EMAIL` so a future operator-email change doesn't drift.
- **Header nav: added "About" between Features and Docs.** Google's verification reviewer looks for a discoverable About page during homepage review. Burying it only in the footer is acceptable but slows the review.
- **Anchor links rewritten to `/#how` etc.** The shared SiteHeader is rendered from `/about` and `/privacy` too. Bare `#how` would scroll within the legal page (no such anchor exists). Absolute `/#how` instead routes back to the landing page and scrolls.

**Open questions / follow-ups:**

- **Google Cloud OAuth consent screen must be updated** to list the new policy URLs: `https://yourdomain.com/privacy` (Privacy Policy) and `https://yourdomain.com/terms` (Terms of Service), plus `https://yourdomain.com` as the App Home Page. This is the part Google's verification flow actually checks - the policies have to exist AND be linked from the OAuth consent screen config. This step is on the user (Vercel dashboard env vars + Google Cloud Console - not something Claude can do).
- **Resend domain verification still pending** - magic-link sender remains `onboarding@resend.dev` until the user adds SPF/DKIM/DMARC records at name.com and flips `EMAIL_FROM` in Vercel. Privacy policy already references "Resend" as a processor so no copy change needed when it ships.
- **Dashboard-banner notification mechanism for ToS changes is referenced but not built.** The "Changes to these terms" section says "we will notify signed-in users via the dashboard before the change takes effect" - there's no banner component today. If the policies ever materially change, the user needs to either build that banner or remove the promise from the ToS. Acceptable for v1 launch (no changes pending).
- **Account self-delete button is referenced but not built.** Current deletion path is "email us" - works for v1 launch but a future Settings → Danger Zone → Delete account button would be the better UX. The privacy/terms copy is already future-compatible - it says "delete your account (or email us to do so)".
- **Effective date is hard-coded to 2026-06-20.** When the policies are next materially revised, bump `LEGAL_EFFECTIVE_DATE` in `src/lib/marketing/legal.ts`. Both pages update automatically.

### 2026-06-20 19:40 - Stage 7 Phase 1: OAuth lock-down + email verification gate + password reset

**What was asked to do:** Close out the deferred auth tasks from Stage 1 (FR-001.2/5/6) - turn off dangerous OAuth account-linking, force credentials-registered users to verify email before sign-in, and ship a full password-reset flow (forgot/reset pages, token table, transactional emails).

**What I did:**

- Added two narrow-purpose token tables: `password_reset_tokens` (1h TTL, single-use, used_at marks consumption) and `email_verification_tokens` (24h TTL, presence implies pending). Both store only SHA-256 hashes of the raw token; the raw token only exists in the URL we email.
- Generated drizzle migration `0009_workable_paibok.sql` via `npm run db:generate` from schema-first edits.
- Refactored `src/lib/auth/email.ts` into a thin Resend transport that delegates body construction to a new `email-templates.ts` (magic-link, email-verification, password-reset). One template shell with safe HTML escape; future copy tweaks touch one file.
- New `src/lib/auth/tokens.ts` shared helpers: `generateRawToken` (32 random bytes hex), `hashToken` (SHA-256), `buildTokenUrl` (NEXTAUTH_URL → APP_URL → localhost fallback chain, strips trailing slash, encodes token).
- New `src/lib/auth/password-reset.ts` and `email-verification.ts` modules - `createResetToken` / `validateAndConsumeToken` and `createVerificationToken` / `verifyAndConsumeToken`. The consume step writes `used_at` for reset tokens (single-use) and deletes the row for verification tokens (presence-implies-pending model).
- `src/lib/auth/auth.ts`: removed `allowDangerousEmailAccountLinking: true` from both GitHub and Google providers (NextAuth now rejects cross-provider claims on a shared email and surfaces `OAuthAccountNotLinked` which the existing `/auth/error` page already handles). Added `emailVerified` guard in the credentials `authorize()` that throws `"email_not_verified"` so NextAuth surfaces it as `?error=email_not_verified` on `/login`.
- `POST /api/auth/register`: stops auto-signing-in the user. Creates the user with `emailVerified=null`, mints a verification token, sends the email via Resend. Returns 201 with `{user, verificationEmailSent}` so the form can show the "check your email" panel even when Resend is degraded.
- New `GET /api/auth/verify-email?token=...` redirects to `/login?verify=ok|expired|invalid` so the verification link works without client JS.
- New `POST /api/auth/forgot-password` always returns 200 regardless of email existence (prevents enumeration), only sends the reset email when a credentials-registered user is found. OAuth-only accounts silently no-op.
- New `POST /api/auth/reset-password` consumes the token, bcrypt-hashes the new password, updates `users.hashedPassword`.
- New pages: `/(auth)/forgot-password`, `/(auth)/reset-password` with `ForgotPasswordForm` and `ResetPasswordForm` components matching the existing brand-panel layout. Reset form validates password length + confirmation match client-side before POSTing; redirects to `/login?reset=ok`.
- `RegisterForm.tsx`: switched from auto-sign-in to a `VerificationPendingPanel` success state showing the email address and a "Back to sign in" CTA. Removed unused `useRouter`/`signIn` from the success path.
- `LoginForm.tsx`: enabled the previously disabled "Forgot?" link → `/forgot-password`. Added banner support for `?verify=ok|expired|invalid` and `?reset=ok` query params. Maps `email_not_verified` to a clear "please verify your email" alert. Reads search params via `useSearchParams()` which forced the login page into `<Suspense>` per Next.js 14's SSG rule.
- Test updates: `LoginForm.test.tsx` adds `useSearchParams: () => new URLSearchParams()` to its `next/navigation` mock. `RegisterForm.test.tsx` rewritten to assert the new "Check your email" panel instead of the old auto-sign-in path; verifies signIn is NOT called. `auth.test.ts` split the happy-path test into a verified-email pass and an unverified-email throw. `register/route.test.ts` mocks `createVerificationToken` and `sendEmailVerificationEmail` and asserts both are invoked + the response carries `verificationEmailSent: true`; added a case where the send fails and the response still 201s with `verificationEmailSent: false`.
- New `src/lib/auth/tokens.test.ts` covers raw-token entropy, hash determinism + non-identity, and `buildTokenUrl` env-fallback chain + URL encoding (11 tests).

**Files changed:**

- `src/lib/db/schema.ts` - update - declared `passwordResetTokens` and `emailVerificationTokens` tables with unique index on `token_hash` and a non-unique index on `user_id`; exported inferred Select/Insert types.
- `drizzle/0009_workable_paibok.sql` - create - migration emitted by drizzle-kit from the schema edits.
- `drizzle/meta/_journal.json` + `drizzle/meta/0009_snapshot.json` - update/create - drizzle-kit bookkeeping for migration 0009.
- `src/lib/auth/auth.ts` - update - dropped `allowDangerousEmailAccountLinking`; added the email_not_verified guard.
- `src/lib/auth/email.ts` - update - now a thin Resend transport calling shared template builders; exports `sendEmailVerificationEmail` and `sendPasswordResetEmail` alongside the original `sendMagicLinkEmail`.
- `src/lib/auth/email-templates.ts` - create - HTML/text bodies for magic-link, email-verification, and password-reset, sharing a single safe-escape shell.
- `src/lib/auth/tokens.ts` - create - `generateRawToken`/`hashToken`/`buildTokenUrl` shared by both token modules.
- `src/lib/auth/password-reset.ts` - create - `createResetToken` (1h TTL), `validateAndConsumeToken` with `used_at` enforcement, `pruneExpiredResetTokens`.
- `src/lib/auth/email-verification.ts` - create - `createVerificationToken` (24h TTL), `verifyAndConsumeToken` (sets users.emailVerified + deletes the row), `pruneExpiredVerificationTokens`.
- `src/lib/auth/schemas.ts` - update - added `forgotPasswordInput`, `resetPasswordInput`, `verifyEmailInput` Zod schemas + inferred types.
- `src/app/api/auth/register/route.ts` - update - skip auto-sign-in, mint verification token, send email, return verificationEmailSent flag.
- `src/app/api/auth/verify-email/route.ts` - create - GET handler that consumes the token and redirects to /login with a status flag.
- `src/app/api/auth/forgot-password/route.ts` - create - always-200 enumeration-safe endpoint that mints a reset token + sends an email only for credentials-registered users.
- `src/app/api/auth/reset-password/route.ts` - create - token-validate + bcrypt rehash + UPDATE users.hashedPassword.
- `src/app/(auth)/forgot-password/page.tsx` - create - server page wrapping ForgotPasswordForm.
- `src/app/(auth)/reset-password/page.tsx` - create - reads ?token= from searchParams and hands to ResetPasswordForm.
- `src/app/(auth)/login/page.tsx` - update - wraps LoginForm in <Suspense> (Next.js 14 SSG requirement once the form reads useSearchParams).
- `src/components/auth/ForgotPasswordForm.tsx` - create - email-only form + success panel.
- `src/components/auth/ResetPasswordForm.tsx` - create - password + confirm fields + missing-token fallback panel.
- `src/components/auth/LoginForm.tsx` - update - enabled Forgot? link, surfaced verify/reset query params + email_not_verified error mapping.
- `src/components/auth/RegisterForm.tsx` - update - replaced auto-sign-in with VerificationPendingPanel success state.
- `src/components/auth/LoginForm.test.tsx` - update - added `useSearchParams` to the next/navigation mock.
- `src/components/auth/RegisterForm.test.tsx` - update - asserts the new success panel, asserts signIn is NOT called, drops the obsolete "falls back to /login" case.
- `src/app/api/auth/register/route.test.ts` - update - mocks `createVerificationToken` + `sendEmailVerificationEmail`; new case for failed-send 201 path.
- `src/lib/auth/auth.test.ts` - update - happy path now requires emailVerified Date; new case asserts unverified user throws.
- `src/lib/auth/tokens.test.ts` - create - 11 unit tests for the shared token helpers.

**Decisions made:**

- **Two token tables, not one with a `kind` column.** TTLs differ (1h vs 24h), consume semantics differ (mark `used_at` vs delete), and the indexes/queries are unrelated. Sharing a table would push the divergence into application code where it would be invisible to future readers - separate tables make the intent obvious from the schema alone.
- **Store SHA-256 hashes, not raw tokens.** A leaked DB dump cannot be replayed against the API because hashing is one-way. The raw token only exists transiently in the email link. Same pattern as session cookies in modern auth libraries.
- **forgot-password always returns 200.** Returning 404 for unknown emails leaks which addresses are registered (account enumeration). The cost is a slightly worse UX for typos - acceptable tradeoff.
- **OAuth-only accounts get a silent no-op on forgot-password.** Returning a different response for "no password to reset" would re-introduce enumeration via response shape. The user is left to figure out they need to sign in with their original provider - a small UX gap accepted for the security win.
- **GET handler for verify-email, not POST.** The verification link in the email must work even with JavaScript disabled (some corporate email clients sanitize JS-required URLs). A server-side GET that redirects is the only reliable pattern.
- **Verification token deletes-on-consume (no `used_at` column).** A verification token is single-purpose: you verified, the token has no further role. Reset tokens keep `used_at` for one specific reason - auditing replay attempts in the rare case where a leaked token is consumed by an attacker after the user already used it (we can detect "this token was used twice" forensically). Verification tokens have no equivalent forensic value.
- **emailVerified gate throws inside authorize() instead of returning null.** Returning null surfaces as the generic `CredentialsSignin` error which the user has already seen mean "wrong password." Throwing `"email_not_verified"` produces a distinct error code that the login form can map to a specific banner - better UX, no security tradeoff (an attacker probing for verified accounts could already discriminate via timing).
- **Removed `allowDangerousEmailAccountLinking: true`.** That setting let anyone who controlled a Google account at email X claim an existing GitHub account at email X (or vice versa) without proving control of the original sign-in method. The fix is one line; NextAuth now surfaces `OAuthAccountNotLinked` which the existing `/auth/error` page already maps to a clear "this email is already linked to another sign-in method" message.
- **Skipped a "resend verification" route in Phase 1.** It's a spam vector (anyone can keep triggering verification emails to an inbox they don't own). Proper implementation needs IP + email rate limiting which lands more naturally with the Phase 5 rate-limit work. Acceptable gap for v1 - users with stuck verification can re-register with a fresh email; CLAUDE.md text was kept honest about this (no false "try registering again" promise).

**Open questions / follow-ups:**

- **Resend verification flow** is the only Phase 1 gap. Will land with Phase 5 rate-limit work since the rate-limit infrastructure is the same shape we'd need.
- **`/auth/error` page** already handles `OAuthAccountNotLinked` (Stage 6 work) so no edit was needed in Phase 1 - verified at the start of the phase, not assumed.
- **NEXTAUTH_URL must be set in production** for the verification + reset email links to work. The `buildTokenUrl` fallback chain ends at `http://localhost:3000` which obviously can't be clicked from a recruiter's inbox. Confirm this is wired in Vercel env before the next prod deploy.
- **Production smoke test** - manually verify OAuth sign-in still works (Google + GitHub) since prior session had a sign-in incident in prod. Specifically watch for any user whose Google email matches an existing GitHub-linked email now hitting `OAuthAccountNotLinked` for the first time; they will need to sign in via their original provider.

### 2026-06-20 22:36 - Stage 7 Phase 2: custom instructions + draft/publish flow + per-bot rate limits

**What was asked to do:** Land the Stage 7 bot-config additions (FR-002.7 custom instructions, FR-002.10 preview-before-publish, FR-010.9 configurable per-bot rate limits) - schema columns, wizard wiring, dashboard editor, chat-route enforcement, signed preview URLs, and a Publish endpoint.

**What I did:**

- Added five columns to `bots` in migration `0010_gray_madrox.sql`: `custom_instructions text`, `preview_token text`, `rate_limit_per_minute int`, `rate_limit_per_day int`, `rate_limit_max_chars int`. Also flipped the column default of `is_active` from `true` to `false` so net-new INSERTs land as drafts. Existing rows keep their current value (the ALTER DEFAULT statement only affects future INSERTs without an explicit value).
- New `src/lib/bots/preview-token.ts` - `mintPreviewToken(botId, userId)` and `verifyPreviewToken(token)`. Roll-your-own HMAC-signed token (format `base64url(JSON payload).base64url(HMAC-SHA256)`) using NEXTAUTH_SECRET as the signing key. Skipped `jose`/`jsonwebtoken` to avoid a dependency for what's essentially `crypto.createHmac` + JSON. 7-day TTL. Constant-time signature comparison.
- New `src/lib/bots/preview-token.test.ts` - round-trip, wrong-secret rejection, tampered-payload rejection, TTL boundary at exactly 7 days, malformed-input rejection, missing-secret throw (7 tests).
- `src/lib/ai/rate-limit.ts` - accepts per-bot overrides via `checkRateLimit(botId, { perMinute?, perDay? }, now?)` while keeping the legacy `(botId, now)` 2-arg shape working. Added `resolveMaxChars(maxChars)` for the per-bot message-length cap. New ceilings (`PER_MINUTE_MAX=100`, `PER_DAY_MAX=5000`, `MAX_CHARS_MAX=32000`) clamp absurd creator inputs at the limiter layer (defence in depth alongside the Zod cap).
- `src/lib/ai/prompt-builder.ts` - accepts optional `customInstructions` on the `bot` arg. Injected as a `## CUSTOM INSTRUCTIONS` block between personality and `## RESPONSE STYLE`. Whitespace-only input collapses to no block at all (byte-identical prompt vs pre-Stage-7 for non-customising bots).
- `src/lib/bots/schemas.ts` - added `customInstructions` (max 2000 chars) to both `botInput` and `botPatchInput`. Added three optional/nullable rate-limit overrides to `botPatchInput`. Exported `CUSTOM_INSTRUCTIONS_MAX`, `RATE_LIMIT_PER_MINUTE_MAX`, `RATE_LIMIT_PER_DAY_MAX`, `RATE_LIMIT_MAX_CHARS_MAX` constants for the UI to bind against.
- `POST /api/bots` - new bots are now created with `isActive=false` then a follow-up UPDATE writes the minted preview token (we need the bot id before we can sign it). The response shape grew an `isActive` + `previewToken` for the wizard's Step 5 to render the preview URL and Publish button.
- New `POST /api/bots/[botId]/publish` - flips `isActive=true` and clears `previewToken` in a single UPDATE. Idempotent on already-published bots (no 409).
- `PATCH /api/bots/[botId]` - extended the mass-assignment whitelist to include `customInstructions` + the three rate-limit overrides. Empty-string `customInstructions` is normalized to NULL at the route layer so the column doesn't accumulate empty strings indistinguishable from "no addendum."
- `POST /api/chat/[botId]` - three behavior changes:
  1. Bot lookup no longer hard-filters on `isActive=true`. We pull the row regardless, then if it's inactive we require either `x-preview-token` header or `?preview=` query param to match the bot's `previewToken` AND verify the HMAC signature for `botId`. Bad/missing token → 404 (same shape recruiters see for a wrong-bot URL).
  2. Rate-limit call passes per-bot overrides from the bot row.
  3. Per-bot maxChars override clamps the message length after the outer Zod cap; the new error is `message_too_long` with `maxChars` in the body.
  4. Custom-instructions field flows into `buildSystemPrompt`.
- `src/app/u/[username]/chat/page.tsx` - draft bots are now reachable with a valid `?preview=` token. The SSR layer mirrors the chat-route's preview check (token must match `previewToken` AND validate the HMAC). When in preview mode the page renders a yellow banner and passes the token into `<ChatWindow previewToken=…>`. Drafts get `robots: { index: false }` so a leaked preview URL can't get crawled.
- `src/components/chat/ChatWindow.tsx` - accepts optional `previewToken` prop and forwards it as `x-preview-token` on each chat POST. Public visitors never see this prop.
- `src/components/dashboard/settings/BotConfigTab.tsx` - replaced the disabled "Coming Soon" custom-instructions textarea with a live editor (max 2000 chars, character counter). Added a "Rate limits" section with three numeric fields (per-minute / per-day / max-chars) where blank = use server default. Added a top "Draft – not yet live" banner with the private preview link + a Publish button when `initialIsActive=false`. The save handler diff-patches the new fields alongside the existing ones; the publish handler hits `POST /publish` directly without bundling into the save.
- `src/app/(dashboard)/dashboard/bots/[botId]/settings/page.tsx` - fetches the new bot columns and threads them through to `<BotConfigTab>`.
- `src/components/bot-factory/BotFactoryForm.tsx` - Step 3 (Personality) now has an optional custom-instructions textarea below the tone picker; the placeholder "Stage 7" panel that used to live there is gone. Step 4 Save button relabeled "Save as draft." Step 5 was rewritten to render the draft/publish UX: copy-able private preview URL + "Publish bot" button + an empty state when published that shows the public URL. The `submit()` handler now reads `previewToken` + `isActive` from the POST /bots response and seeds local state from them.
- Tests updated: rate-limit suite adds four new cases for per-bot overrides + clamp + null/undefined-as-default; the new looser-perDay/clamp tests had to pass perMinute too so the test isolates the property under test (the original write tripped per-minute first because the default is much smaller). prompt-builder suite adds 5 new cases for the custom-instructions block (omitted/whitespace/inject/order/trim). BotConfigTab test rewrites the props baseline + replaces the "textarea disabled" assertion with two new tests: textarea sends customInstructions on PATCH, and the Publish flow POSTs `/api/bots/[botId]/publish`. Added a "draft state with previewToken" test that asserts the banner + preview link href. BotFactoryForm test renamed all `save & deploy` to `save as draft`, renamed the Step 5 next-button from `preview bot` to `open chat`, renamed the Step 5 heading match from `ready to deploy` to `preview before you publish`. api/bots/route.test.ts: set NEXTAUTH_SECRET in beforeEach, defaulted `txUpdateBotsReturningMock` so the new POST→UPDATE chain's destructure doesn't blow up, asserted the new inserts ship `isActive=false` AND the UPDATE writes a `previewToken` string.
- Total: 720 tests pass (was 701; +19). Typecheck + Next build both green.

**Files changed:**

- `drizzle/0010_gray_madrox.sql` + `drizzle/meta/0010_snapshot.json` + `drizzle/meta/_journal.json` - create/update - generated by `npm run db:generate` from the schema edit.
- `src/lib/db/schema.ts` - update - five new bot columns + flipped is_active default.
- `src/lib/bots/preview-token.ts` - create - HMAC-signed token mint + verify.
- `src/lib/bots/preview-token.test.ts` - create - 7 unit tests.
- `src/lib/bots/schemas.ts` - update - custom-instructions + rate-limit fields on input/patch, new constants exported.
- `src/lib/ai/rate-limit.ts` - update - per-bot overrides, ceilings, backward-compat 2-arg shape, `resolveMaxChars`.
- `src/lib/ai/rate-limit.test.ts` - update - 4 new cases for the override path.
- `src/lib/ai/prompt-builder.ts` - update - inject `## CUSTOM INSTRUCTIONS` block between personality and response style.
- `src/lib/ai/prompt-builder.test.ts` - update - 5 new cases covering the block's presence/absence/placement/trim.
- `src/app/api/bots/route.ts` - update - INSERT bot as draft + mint preview token + return both.
- `src/app/api/bots/route.test.ts` - update - NEXTAUTH_SECRET fixture, updated reflect the create flow's two updates.
- `src/app/api/bots/[botId]/route.ts` - update - whitelist the new fields in PATCH.
- `src/app/api/bots/[botId]/publish/route.ts` - create - flip isActive + clear previewToken.
- `src/app/api/chat/[botId]/route.ts` - update - preview-token gating, per-bot rate limits + maxChars enforcement, customInstructions passthrough.
- `src/app/u/[username]/chat/page.tsx` - update - drop the hard isActive filter, gate drafts on preview-token, render preview banner, set `robots: { index: false }` for drafts.
- `src/components/chat/ChatWindow.tsx` - update - accept previewToken prop, forward as `x-preview-token` header.
- `src/components/dashboard/settings/BotConfigTab.tsx` - update - enable custom-instructions editor, new rate-limit section, draft banner + publish button.
- `src/components/dashboard/settings/BotConfigTab.test.tsx` - update - new props baseline, two new tests for custom-instructions PATCH + rate-limit override field, one new test for the publish banner.
- `src/app/(dashboard)/dashboard/bots/[botId]/settings/page.tsx` - update - fetch the new columns + thread them through.
- `src/components/bot-factory/BotFactoryForm.tsx` - update - Step 3 custom-instructions input, Step 5 draft/publish UX, new state for previewToken + published + publishing + the publish() handler.
- `src/components/bot-factory/BotFactoryForm.test.tsx` - update - rename button labels + heading match.

**Decisions made:**

- **Roll-your-own HMAC token over `jose`/`jsonwebtoken`.** Adding a 50KB dependency for a 30-line `crypto.createHmac` + `JSON.stringify` is the wrong cost/benefit. We don't need the JWT header (no algorithm negotiation), we don't need key rotation envelopes (NEXTAUTH_SECRET already rotates as a unit), we don't need claims like aud/iss/jti. The token is a server-controlled bearer credential with a 7-day TTL; HMAC + payload + timing-safe compare is exactly the right primitive.
- **Two-update create flow (INSERT bot then UPDATE previewToken) rather than mint-before-insert.** Minting the token before the INSERT would require pre-generating a UUID client-side or in app code, which adds a moving part. The two-statement approach lives inside the same DB transaction so partial state is impossible; the round-trip cost is tiny vs. the simplicity of letting `gen_random_uuid()` mint the bot id.
- **Preview token is stored in the bot row, not derived purely from signature.** A signature-only design (token verifies → grant access) would mean we can never _revoke_ a leaked token before its TTL - there's no server-side state to flip. Storing the token in the row gives us the equivalent of a session: publish nukes it (revoke), bot delete cascades it (revoke). Belt-and-braces: the route checks both `bot.previewToken === supplied AND HMAC verifies` so a leaked token without a matching row also fails.
- **Drafts get `robots: { index: false }` in `generateMetadata`.** A leaked preview URL pasted into a public document (issue tracker, Slack with link unfurl, etc.) shouldn't end up in search results. Crawlers that respect the meta tag honour this; those that don't would also bypass auth tokens so this is the most we can do at the page layer.
- **Per-bot rate-limit clamp at TWO layers (Zod schema + limiter `clampPositive`).** Either layer alone is sufficient on the happy path, but the doubled defence means a future caller that bypasses Zod (e.g. an internal admin script) can't accidentally store a runaway value, AND a future route that forgets to clamp at write time can't trip a runaway value at read time. Cheap defence in depth.
- **`is_active` column default flipped to `false`, existing rows untouched.** Backfilling existing rows to `false` would re-draft already-published bots and break their public URLs - a user-visible regression for zero gain. The migration only changes the DEFAULT clause; pre-Stage-7 rows keep their `true` value via the column-still-NOT-NULL contract.
- **Per-tab `?preview=` query-param AND `x-preview-token` header both accepted by the chat route.** Header is cleanest for the SPA path (ChatWindow attaches it on every fetch) but query-param means a hand-pasted preview URL works in an incognito tab without dashboard context. Both go through the same validation; UX-only cost is a slight extra branch in the route.
- **Custom-instructions block lives BETWEEN personality and response-style.** Personality sets voice; the user's custom block refines bot intent; the structural rules (max 6 sentences, no filler, bullets only for 3+) come AFTER so a malformed custom block can't override "no filler phrases." The IMMUTABLE RULES block above it all (identity / context-only / prompt protection) still governs regardless of what the custom block tries.

**Open questions / follow-ups:**

- **No "regenerate preview token" UI exists.** A creator whose preview link leaks today can publish-then-unpublish to clear the token, but there's no surgical "rotate this token" button. Could be added in Phase 6 polish if needed; not load-bearing.
- **Per-bot rate-limit columns are still in-memory enforced.** Phase 8 (per architecture blueprint) replaces the in-process limiter with Upstash Redis; until then the limits reset on each Vercel cold start. Acceptable for v1; document if needed.
- **No `/api/bots/[botId]/preview-token/regenerate` endpoint.** If a creator confirms a leaked preview link they have to either publish or delete + recreate. Cheap to add in Phase 6 if it comes up.
- **The chat route now does an extra DB query for inactive bots** to read `previewToken`. We're already fetching the whole bot row so this is free - just calling it out so a future query-tightening pass doesn't accidentally drop the column from the SELECT.

### 2026-06-20 22:58 - Stage 7 Phase 3: envelope encryption + managed key path + live dashboard editor

**What was asked to do:** Land the managed-key half of the hybrid storage architecture (Option 3 from the design conversation) - envelope encryption of user LLM keys with a KEK kept out of the DB, audit log of every server-side decrypt, a dashboard editor that lets creators switch provider/model and opt in/out of managed storage, and a chat-route fallback path so recruiters can chat with a bot when the creator's browser is offline.

**What I did:**

- New `src/lib/crypto/constants.ts` + `src/lib/crypto/envelope.ts` implementing AES-256-GCM envelope encryption (per-bot 256-bit DEK encrypts the LLM key; DEK is itself wrapped with the 256-bit KEK loaded from `PROBOT_KEY_ENCRYPTION_KEY` env). Public surface: `encryptKey(plaintext)`, `decryptKey(payload)`, `rotateKEK(payloads, oldB64, newB64)`. KEK is loaded fresh per call (no module-level cache so tests can manipulate env without reset; the cost is microseconds). `KekUnavailableError` distinct class so the API layer can downgrade "managed flow disabled" to a 503 vs a 500. Hard-fail at module import if `PROBOT_KEY_ENCRYPTION_KEY` is set but malformed (skipped under vitest so per-test env manipulation works).
- 13 tests cover the crypto module: round-trip, ciphertext-differs-from-plaintext, fresh-IV per call, GCM tamper detection, KEK rotation rejection of stale KEK, missing-KEK error class, wrong-length KEK error, empty-plaintext rejection, 10KB plaintext, unicode plaintext, `rotateKEK` re-wraps + preserves ciphertext byte-for-byte + empty input.
- New `src/lib/crypto/ip-hash.ts` - `hashIp(ip)` returns SHA-256(`NEXTAUTH_SECRET:ip`) hex (re-uses NEXTAUTH_SECRET as salt to avoid another env var). `extractRequesterIp(headers)` pulls `x-forwarded-for` first IP, falls back to `x-real-ip`. The dashboard audit log surfaces only the last 8 hex chars of the hash so creators get a per-row identifier without GDPR PII surface.
- Migration `0011_graceful_ironclad.sql` adds two tables: `encrypted_llm_keys` (11 cols: ciphertext + iv + auth_tag + wrapped_dek + dek_iv + dek_auth_tag + provider + timestamps; unique index on bot_id so one managed key per bot; ON DELETE CASCADE from `bots`) and `decrypt_audit_log` (id, bot_id, decrypted_at, requester_ip_hash; index on bot_id+decrypted_at DESC for the dashboard query; ON DELETE CASCADE).
- `POST /api/bots/[botId]/llm-key` - UPSERT on bot_id, envelope-encrypts the supplied plaintext, stamps the owner's current provider on the row. Returns 503 with `managed_storage_unavailable` if KEK env var unset; 400 if owner provider isn't set.
- `DELETE /api/bots/[botId]/llm-key` - deletes the encrypted row, revoking server-side access.
- `GET /api/bots/[botId]/llm-key/audit` - returns `{ stored, provider, lastDecryptedAt, entries: [{decryptedAt, ipHashSuffix}] }`. 30-day retention window enforced in the query; pruning happens in the Phase 5 cron.
- `PATCH /api/users/me/llm-prefs` - backing route for the dashboard's provider/model switcher. Zod-whitelisted to only `llmProvider` + `llmModel`; mass-assignment safe.
- Chat route (`/api/chat/[botId]`) gained the managed-key fallback:
  - Header `x-llm-api-key` is now OPTIONAL. Missing header (KeyTransportError reason `missing`) is fine; malformed header (empty/too short/too long) still 400s loudly.
  - After bot/owner lookup, key resolution: header wins if present; else look up `encrypted_llm_keys.findFirst({botId})`, refuse with `managed_key_provider_mismatch` if stored provider drifted from the owner's current provider, otherwise `decryptKey(...)` and use. Azure is explicitly excluded from managed mode in Phase 3 (its multi-secret endpoint+apiVersion doesn't fit in the encrypted payload yet); header path only.
  - When the managed path served the request, write a row to `decrypt_audit_log` (timestamp + hashed IP) AFTER provider.complete() succeeds. Wrapped in try/catch so a logging failure can't block chat.
- New `src/lib/server/redact.ts` (`redactSensitive`) - recursive value redactor that strips known-sensitive header names (`x-llm-api-key`, `x-llm-azure-*`, `x-embedding-api-key`, `x-preview-token`, `authorization`, `cookie`) and property names (`apiKey`, `password`, `secret`, `token`, `kek`, `dek`, etc.) before payloads reach a logger. Handles plain objects, arrays, `Headers`, and circular references. 6 tests cover the redaction matrix.
- `src/components/dashboard/settings/AIModelKeyTab.tsx` - full rewrite from the Coming-Soon stub. New client component with three sections:
  1. Provider+model switcher (writes via PATCH /llm-prefs)
  2. Managed key storage form (textbox + Show/Hide + Encrypt&Store / Replace / Revoke buttons; Azure shows a "not supported in Phase 3" notice)
  3. Decrypt audit log (last 30 events with timestamp + IP hash suffix)
     The "stored" pill is data-driven from the `/audit` GET. Storing a key also mirrors it into localStorage so the creator's own dashboard test chat keeps working without re-entry.
- Settings page now passes `botId` to AIModelKeyTab.
- `.env.example` adds documented `PROBOT_KEY_ENCRYPTION_KEY` + `PROBOT_KEY_ENCRYPTION_KEY_NEXT` (rotation slot) with generation instructions.
- Chat route test (`route.test.ts`):
  - Added mocks for `encryptedLlmKeys.findFirst`, `decryptAuditLog`, and a generic `db.insert(...).values(...)` chain for the audit-log write.
  - Replaced the "missing-header → 400" test with one that asserts the new "no header AND no managed key → 400" path, plus a new test for malformed-header 400.
  - New "Stage 7 Phase 3 managed-key path" describe block: 4 tests covering decrypt-on-fallback (provider sees plaintext, audit row written), no-audit-write on header path, provider drift mismatch returns `managed_key_provider_mismatch`, Azure rejection.
- Settings-page test updated: the model tab assertion now checks for the live Managed key storage + Decrypt audit log headings instead of looking for a Coming Soon pill.
- Total tests: 744 pass (was 720; +24 net new from the crypto module, redact module, and chat-route managed-key block). Typecheck + Next build both green.

**Files changed:**

- `src/lib/crypto/constants.ts` - create - AES-256-GCM parameter constants + KEK env-var name.
- `src/lib/crypto/envelope.ts` - create - `encryptKey`/`decryptKey`/`rotateKEK` + `KekUnavailableError`.
- `src/lib/crypto/envelope.test.ts` - create - 13 unit tests.
- `src/lib/crypto/ip-hash.ts` - create - `hashIp` + `extractRequesterIp`.
- `drizzle/0011_graceful_ironclad.sql` + `drizzle/meta/0011_snapshot.json` + `drizzle/meta/_journal.json` - create/update - generated by db:generate from the schema edit.
- `src/lib/db/schema.ts` - update - declared `encryptedLlmKeys` + `decryptAuditLog` tables and exported inferred types.
- `src/app/api/bots/[botId]/llm-key/route.ts` - create - POST (store-encrypted) + DELETE (revoke).
- `src/app/api/bots/[botId]/llm-key/audit/route.ts` - create - GET (last 30 days of decrypt events + stored status).
- `src/app/api/users/me/llm-prefs/route.ts` - create - PATCH for the dashboard switcher.
- `src/app/api/chat/[botId]/route.ts` - update - header is optional, managed-key fallback, audit-log write.
- `src/app/api/chat/[botId]/route.test.ts` - update - new mocks + 4 new managed-key tests + reworked missing-header tests.
- `src/lib/server/redact.ts` + `redact.test.ts` - create - log-redaction helper + 6 tests.
- `src/components/dashboard/settings/AIModelKeyTab.tsx` - update - full rewrite from Coming-Soon stub into live editor.
- `src/app/(dashboard)/dashboard/bots/[botId]/settings/page.tsx` - update - pass botId to AIModelKeyTab.
- `src/app/(dashboard)/dashboard/bots/[botId]/settings/page.test.tsx` - update - assert live editor headings instead of Coming Soon pill.
- `.env.example` - update - documented `PROBOT_KEY_ENCRYPTION_KEY` + rotation slot.

**Decisions made:**

- **KEK loaded fresh per call, not module-cached.** A module-level cache would make test isolation harder (every test that flips the env var would have to reach into module internals to reset). The cost of `Buffer.from(env, "base64")` is microseconds; not the bottleneck.
- **Hard-fail at module-load only if KEK is SET but malformed.** Operators who don't use the managed flow shouldn't be forced to set the var. If they do set it, a malformed value would silently corrupt every managed write - better to refuse to boot. The check is skipped under `NODE_ENV=test` / `VITEST=true` so per-test env manipulation works.
- **Hash IPs with NEXTAUTH_SECRET as salt, not a separate env var.** One fewer env var to manage. Rotation as a side effect of NEXTAUTH_SECRET rotation is fine: old audit-log rows remain readable as timestamps, they just don't hash-equal to new rows.
- **Audit-log rows truncate the IP hash to 8 hex chars in the API response.** The full 64-hex hash is unnecessary for a creator's dashboard ("did the same IP decrypt 3 times?") and the truncation removes any incidental over-sharing of session-correlatable data back to the creator's own UI.
- **Provider drift on the stored key returns 400, not a silent re-encrypt.** A creator who switches from Anthropic to OpenAI in the settings page has a key in the DB minted under the old provider. Re-encrypting silently would mean we're sending an Anthropic key to OpenAI's endpoint - guaranteed 401 + creator confusion. Refusing the chat with `managed_key_provider_mismatch` surfaces the misconfiguration immediately; the dashboard's next iteration can prompt "re-store your key for OpenAI."
- **Azure explicitly excluded from managed mode in Phase 3.** Azure's credential is (key + endpoint + apiVersion); stuffing all three into the envelope payload would either require a JSON sub-schema in `encrypted_llm_keys` or three separate ciphertext columns. Punted to a later phase; the dashboard surfaces a clear "not supported, use self-hosted" note when Azure is the active provider.
- **Audit-log write happens AFTER provider.complete() succeeds, not before.** Logging a "decrypt happened" event for a failed provider call (network blip, bad key, rate limit) would inflate the creator's view of "managed key usage." Writing post-success means the audit log is a usefulness metric, not a noise metric.
- **No CSRF on the new key-management routes.** Same posture as the existing PATCH /api/bots/[botId] - the dashboard is a same-origin client and the session cookie is `SameSite=Lax` (NextAuth default). For Phase 7 hardening we can add a double-submit token if needed.
- **localStorage mirror on key submit** so the creator's own test chat keeps working after they opt into managed storage. Without this, the moment they hit "Encrypt & store" their next dashboard test chat would 400 with "no key" because the localStorage path lost its source. Mirror keeps both surfaces working.
- **`useEffect` fetches the audit on tab mount** rather than passing it through SSR. The audit list is bot-specific and updates as recruiters chat; making it part of the SSR fetch means stale data + worse cache behavior. Client-side fetch is the right primitive here.

**Open questions / follow-ups:**

- **No KEK rotation runbook in the docs yet.** Phase 7 task. The `rotateKEK` utility exists and is unit-tested; what's missing is the operator-facing "deploy with both env vars set, run `npm run kek:rotate`, swap" guide.
- **No CI grep guard for accidental `x-llm-api-key` substrings in `console.*` calls.** Phase 7 task. The `redactSensitive` helper exists but isn't yet enforced at write time; today's discipline is purely convention.
- **Audit log isn't pruned.** Rows accumulate forever in Phase 3; the Phase 5 cron job (next phase but one) will delete `decrypted_at < NOW() - 30 days`. Read queries already enforce the window so dashboard payload size is bounded; only DB growth is unbounded until Phase 5 lands.
- **No "regenerate KEK from a passphrase" tooling.** If an operator loses their KEK, every stored encrypted key is unrecoverable. This is by design (the same thing the hybrid model's marketing copy will promise). Operators must back up their KEK out-of-band (1Password / Vault / etc).
- **Provider mismatch UX is currently just a 400 error from the chat route.** The dashboard could detect the mismatch on load and prompt "your stored key was minted for OpenAI but you're now on Anthropic - re-store?" - defer to Phase 6 polish.
- **Azure managed-mode support** can land in a future Phase by stuffing `{key, endpoint, apiVersion}` JSON into the ciphertext rather than the bare key string. ~30 lines of work; not load-bearing for Stage 7.

### 2026-06-20 23:36 - Stage 7 Phase 4: Google Gemini live + DeepSeek removed + circuit breaker + AI fallback

**What was asked to do:** Land the real Google Gemini adapter (replacing the Stage 1 throw-on-call stub), remove every DeepSeek reference from the forward-looking docs and code, add an in-process circuit breaker around provider calls per NFR-S03, and surface a graceful "AI temporarily unavailable" reply per NFR-S04 instead of a hard 502 when the breaker is open.

**What I did:**

- `src/lib/ai/providers/google.ts` rewritten from the Stage 1 stub. Uses `@google/generative-ai` SDK (installed as a fresh dep). Mirrors the Anthropic/OpenAI adapter shape: `complete({ system, userMessage, apiKey, model?, maxTokens?, temperature? })`. System prompt rides as `systemInstruction` (Gemini's correct slot, not the messages array). Default model is `gemini-2.5-flash` (free-tier).
- Error mapping done by message-string matching since the Gemini SDK doesn't expose typed errors with status codes: "API key not valid" / "API_KEY_INVALID" / "PERMISSION_DENIED" / "401" / "403" → `invalid_key`; "429" / "RESOURCE_EXHAUSTED" / "quota" → `rate_limit`; everything else → `unknown`. Brittle by SDK convention, not by our choice. The redact discipline still applies - error messages never include the apiKey.
- `google.test.ts` replaced (was 3 stub-asserting tests). 8 new tests cover: successful text reply, system+config plumbing through `getGenerativeModel`, invalid-key mapping, rate-limit mapping, unknown mapping, empty-text response → unknown error, error message never contains the apiKey.
- `@google/generative-ai` added as a dependency.
- `src/lib/ai/circuit-breaker.ts`: closed/open/half-open state machine, per-provider-name (Map<string, BreakerEntry>). Defaults: 5 consecutive failures → open; 30s reset timeout; 1 probe call allowed during half-open. `callWithBreaker(name, fn, options?)` is the only public entry; throws `ProviderError(name, "unknown", "circuit_open")` when blocked. Per-process state - no Redis dependency, no cold-start coordination, matches the rate-limiter's posture. Forced-reset `__resetCircuit(name?)` for tests + an emergency operator path.
- `circuit-breaker.test.ts`: 10 tests covering happy path, failure pass-through, threshold-opens, fail-fast while open, cooldown → half-open transition, half-open success closes, half-open failure re-opens, per-provider isolation, success resets the failure count mid-streak, halfOpenMaxCalls=1 rejects concurrent probes.
- Chat route wraps `provider.complete(...)` in `callWithBreaker(ownerRow.llmProvider, () => provider.complete(...))`. Breaker key is the provider NAME, not the bot id, so an Anthropic outage trips one breaker that protects every bot on Anthropic - not 100 per-bot breakers that each have to learn the outage independently.
- New error branch in the chat route: when `err.category === "unknown" && err.message === "circuit_open"`, return a 200 with `{ reply: "I'm temporarily unavailable...", fallback: "circuit_open" }` (NFR-S04). Critically a 200, not a 502: the conversation-persistence block below still runs, the dashboard sees the request, the recruiter sees a non-broken UI. The `fallback` discriminator lets future analytics distinguish "real AI response" vs "fallback string" without scraping the body.
- Bot factory wizard: `STAGE1_ENABLED` set widened to include `google`. The SOON badge on the Google provider card is gone; the test that asserted "Google is the only disabled provider" was rewritten to assert all four are enabled.
- DeepSeek references purged from forward-looking docs:
  - `claude/srs.md`: 13 references → 0 (all rewritten to the Anthropic/Google/OpenAI/Azure list, including FR-010.4, FR-002.11, the user-table column comment, the architecture diagram, the SI-001 row, and the env-example block).
  - `claude/plan.md`: 10 references → 0 (header summary, FR-003.4, Stage 1 task checklist, the directory listing, the embeddings provider list).
  - Note: `claude/context.md`, `claude/learnings.md`, and `CHANGELOG.md` are append-only history per CLAUDE.md §9/§10 and were intentionally NOT edited. The `isProviderName("deepseek")` negative test remains because it correctly asserts that "deepseek" is NOT a valid provider name today.
- Total tests: 759 pass (was 744; +15 - 7 new Gemini tests, 10 new circuit-breaker tests, minus 2 reworked existing tests). Typecheck + Next build both green.

**Files changed:**

- `src/lib/ai/providers/google.ts` - update - full rewrite from stub to real Gemini adapter.
- `src/lib/ai/providers/google.test.ts` - update - 8 new tests replacing the 3 stub-only ones.
- `src/lib/ai/circuit-breaker.ts` - create - state machine + `callWithBreaker` + `__resetCircuit` + `getCircuitState`.
- `src/lib/ai/circuit-breaker.test.ts` - create - 10 unit tests.
- `src/app/api/chat/[botId]/route.ts` - update - wraps provider.complete with callWithBreaker, adds circuit_open → 200 fallback branch.
- `src/app/api/chat/[botId]/route.test.ts` - update - typecheck fix on auditInsertMock varargs.
- `src/components/bot-factory/BotFactoryForm.tsx` - update - enable google in STAGE1_ENABLED set.
- `src/components/bot-factory/BotFactoryForm.test.tsx` - update - flip "Google disabled" assertion to "all four enabled."
- `package.json` + `package-lock.json` - update - `@google/generative-ai` ^0.24.1 dep added via `npm install`.
- `claude/srs.md` - update - replaced all DeepSeek references with Anthropic/Google/OpenAI/Azure.
- `claude/plan.md` - update - same scope, including the directory listing where `deepseek.ts` became `azure.ts`.

**Decisions made:**

- **Breaker key is provider NAME, not bot id.** An outage affects a provider, not a specific bot - keying on bot id would mean each bot has to learn the outage independently (5 failures per bot before opening), wasting hundreds of provider calls when the answer is "Anthropic is down for everyone." Keying on provider name means the first 5 failures trip a breaker that protects every other bot on the same provider for the cooldown window.
- **Circuit breaker emits `ProviderError("...", "unknown", "circuit_open")` rather than a custom `CircuitOpenError`.** The chat route already has a `try/catch (err instanceof ProviderError)` branch; reusing the existing error type means the breaker integrates with the existing handler without a second exception class. The discriminator is `err.message === "circuit_open"` - slightly stringly-typed but matches the surrounding code's conventions.
- **NFR-S04 fallback returns 200, not 502.** A 502 would cause the chat client to render a "something broke" toast and discard the recruiter's message. A 200 with a "temporarily unavailable" reply keeps the conversation flow intact - recruiter sees a polite message, can retry, persistence happens, dashboard analytics see the request. This is the difference between a broken UX and a degraded UX; degraded is the goal here.
- **`fallback` field in the response body to discriminate canned vs real replies.** Future analytics (or a Phase 6 dashboard "fallback events" panel) can count fallbacks without scraping the reply text. Adding the field now costs nothing; bolting it on later means hunting through every fallback path the route grows.
- **Half-open allows ONE probe, not many.** With many concurrent probes after cooldown, you'd hammer the recovering provider just as it comes back up - exactly the wrong moment. One probe at a time means recovery is gentle: probe succeeds → close → flood resumes; probe fails → re-open for another cooldown.
- **No Redis-backed breaker state for Phase 4.** Same posture as the in-process rate limiter: per-process, cold-start resets. Acceptable because provider outages typically last minutes, cold starts are minutes apart, and the breaker is a courtesy to upstream - not a strict guarantee. Stage 8 might unify both onto Upstash if the per-instance variance turns out to matter.
- **Gemini error mapping is regex-on-message.** The SDK doesn't expose status codes, error classes, or a `code` field on its errors. We match prose markers: "API key not valid", "API_KEY_INVALID", "PERMISSION_DENIED", "401", "403", "429", "RESOURCE_EXHAUSTED", "quota". Will break if Google changes the wording in a future SDK; documented as a known fragility and easy to update.
- **`gemini-2.5-flash` as the default model.** Free-tier eligible at time of writing, fast, sufficient for short-form chat. The dropdown also exposes `gemini-2.5-pro` for users who want a deeper model and have the credits.
- **DeepSeek removal scope.** SRS + plan only - the append-only logs (context.md, learnings.md, CHANGELOG.md) preserve the history of the original decision to add then remove it. The `isProviderName("deepseek") === false` test stays because asserting the negative is the _correct_ contract today.
- **Bot-factory `STAGE1_ENABLED` set kept (rather than dropped) even though all 4 providers are now enabled.** Removing the set would require rewiring the JSX; keeping it as a one-line `Set` gives us a stable hook for a future "experimental" / "beta" badge.

**Open questions / follow-ups:**

- **Gemini SDK error parsing is brittle.** A wording change in the SDK breaks our category mapping. Worth wrapping in an integration test against a real (free-tier) Gemini endpoint as part of Stage 8 - until then, monitor on first prod incident.
- **Managed key storage doesn't yet support Google.** It works for Anthropic/OpenAI; Azure is excluded (multi-secret), Google should work given the same single-key flow. Confirm in a smoke test after deploy; if Gemini's auth requires anything beyond an API key it would need its own adapter in the encrypted-key route too.
- **Circuit breaker doesn't surface state to the dashboard.** A "your bot's provider is currently throttled" indicator would be useful when a circuit is open; Phase 6 polish.
- **No alerting when a breaker opens.** The fallback reply is sent and persistence records the request, but the operator doesn't know an upstream is down. Phase 7's CI/observability work can wire a Sentry breadcrumb or log line here.

### 2026-06-21 06:56 - Stage 7 Phase 5: GDPR export + 7-day delete grace + undo-link flow + nightly purge cron

**What was asked to do:** Build the GDPR compliance half of Stage 7 - data export, account deletion with a 7-day undo grace, GitHub-style typed-confirmation modals for account and bot deletion, an undo page (login-like, no session needed) the user reaches via an emailed link, a Vercel-cron purge job that fires after the grace period, and updated legal copy describing the flow.

**What I did:**

- Migration `0012_melodic_raza.sql` adds `deletion_requests` (10 cols). Snapshots `email` + `username` so the post-purge completion email can still reach a CASCADE-deleted user; `undo_token_hash` (SHA-256); `confirmation_username` (forensic); `requested_at` + `scheduled_purge_at` + `purged_at`. Unique index on `user_id` enforces one pending deletion per user; unique on `undo_token_hash` for the undo lookup.
- `src/lib/account/export.ts` - `buildExportBundle(userId)` walks users → bots → knowledge → conversations → messages → leads and returns a single JSON tree. Strips `hashedPassword`, `previewToken`, `knowledge_base.embedding`.
- `GET /api/users/me/export` - session-gated, streams the bundle as a JSON attachment with `Cache-Control: no-store`.
- `src/lib/account/delete.ts` - `initiateAccountDeletion`, `undoAccountDeletion`, `getPendingDeletion`, and `runPurgeJob({ sendCompletionEmail, pruneAuditLogs })`. The purge worker marks `purged_at = NOW()` BEFORE the user DELETE so the same-tick email pass sees the snapshot; the CASCADE then drops every dependent row including `deletion_requests` itself.
- `POST /api/users/me/delete` - session-gated. Validates typed username server-side (defence in depth), maps results to 400/409/404/200, best-effort emails the undo link.
- `POST /api/users/me/undo-deletion` - PUBLIC route (token IS auth). Refuses if `purged_at` is set (data is gone).
- `/(auth)/undo-deletion/page.tsx` + `UndoDeletionForm.tsx` - login-styled public page. `robots: { index: false, follow: false }`.
- `GET /api/cron/purge-deleted-accounts` + `vercel.json` - daily 03:00 UTC. Auth via `Authorization: Bearer $CRON_SECRET`; fail-closed 503 when unset.
- `src/lib/auth/email-templates.ts` + `email.ts` - `deletionInitiatedEmail` (CTA → undo link) + `deletionCompleteEmail` (no CTA, confirmation only).
- `DeleteAccountModal.tsx` + `DeleteBotModal.tsx` - GitHub-style two-input modals: typed identifier + typed phrase. Esc closes; backdrop click does NOT.
- `SecurityActions.tsx` + rewritten `SecurityTab.tsx` - two states: Delete button OR yellow "scheduled for deletion in N days" banner pointing at the email link. Dashboard does NOT expose its own undo button (one canonical surface).
- `BotConfigTab.tsx` - new Danger Zone + DeleteBotModal → `DELETE /api/bots/[botId]`. No grace period; user redirects to `/dashboard/bots/new`.
- `DELETE /api/bots/[botId]` - new method; CASCADEs every dependent row.
- `src/lib/marketing/legal.ts` - `DELETION_GRACE_DAYS = 7` (was 30), new `DELETION_FINAL_DAYS = 30`. Privacy + Terms copy rewritten to describe the in-app delete button + 7-day grace + undo link + 30-day outer bound.
- Tests: 12 new for `delete.ts`, 4 for the cron route's auth gate. Settings-page test mock extended with `deletionRequests.findFirst`. Total: 775 (was 759; +16). Typecheck + build green.

**Files changed:**

- `src/lib/db/schema.ts` - update - `deletionRequests` + inferred types.
- `drizzle/0012_melodic_raza.sql` + `meta/0012_snapshot.json` + `_journal.json` - create/update.
- `src/lib/account/{export,delete,prune-audit-log}.ts` + `delete.test.ts` - create.
- `src/app/api/users/me/{export,delete,undo-deletion}/route.ts` - create.
- `src/app/api/cron/purge-deleted-accounts/route.ts` + `route.test.ts` - create.
- `vercel.json` - create.
- `src/lib/auth/{email-templates,email}.ts` - update.
- `src/components/dashboard/{DeleteAccountModal,DeleteBotModal}.tsx` - create.
- `src/components/dashboard/settings/{SecurityActions,SecurityTab,BotConfigTab}.tsx` - create/update.
- `src/app/api/bots/[botId]/route.ts` - update - new DELETE.
- `src/app/(auth)/undo-deletion/page.tsx` + `src/components/auth/UndoDeletionForm.tsx` - create.
- `src/app/(dashboard)/dashboard/bots/[botId]/settings/page.tsx` + `page.test.tsx` - update.
- `src/lib/marketing/legal.ts` + `src/app/(marketing)/{privacy,terms}/page.tsx` - update.
- `.env.example` - update - `CRON_SECRET` documented.

**Decisions made:**

- **Email snapshot in `deletion_requests`, not a tombstone table.** Cron loop variable holds the snapshot long enough to email after CASCADE drops the DB row.
- **Undo hard-deletes the request row.** A `cancelled_at` flag would build a creepy "almost deleted" log. Honest undo = the request never happened.
- **`purged_at` flipped BEFORE the user DELETE.** CASCADE drops the row with the user; pre-flipping lets the same-tick email pass observe the snapshot.
- **PUBLIC undo route.** Requiring login would be a chicken-and-egg trap. Token IS the auth; typed-username re-check is the safeguard.
- **One canonical undo surface (the public page).** Dashboard banner points at the email link rather than offering a duplicate button.
- **DeleteBotModal is no-grace, immediate.** Per-bot risk is small; user can recreate via /dashboard/bots/new; the typed-name + typed-phrase friction is sufficient.
- **No CSRF on the undo route despite being public + destructive.** Token IS auth; CSRF protection helps only against logged-in tricked third parties, and the user on the undo route isn't logged in.
- **Sign-out after delete-init.** Keeps next request from rendering a stale dashboard against a doomed account.
- **Export skips `previewToken`, `hashedPassword`, embeddings.** Credentials/data with zero user value and non-zero attacker value.
- **Vercel Hobby's one-cron limit forces consolidation.** Single cron handles purge + audit-log pruning.
- **Cron auth uses constant-string compare, not `timingSafeEqual`.** Daily fire rate makes a timing oracle impractical.

**Open questions / follow-ups:**

- **No "resend deletion email" UI** for users who lose the undo link.
- **Dashboard banner has no Cancel button** by design (one canonical surface) - revisit on user research.
- **Account deletion doesn't revoke OTHER browser sessions.** Phase 7 hardening could revoke all session tokens at init.
- **Cron schedule hard-coded to 03:00 UTC.**
- **No structured audit log of deletion lifecycle events.** Request-row timestamps cover the basics; dedicated event log lands with Phase 7.
- **`buildExportBundle` does per-table queries (N+1).** Fine at v1; Stage 8 can swap to a single CTE if it becomes hot.
- **No retention on `deletion_requests` for purged rows.** CASCADE drops them at purge time; the cleanup pass is defence-in-depth.

### 2026-06-21 08:41 - Stage 7 Phase 6: malware-scan hardening + IndexedDB/Web-Crypto key store

**What was asked to do:** Two unrelated security improvements - heuristic upload-safety scan to reject renamed executables / Office macro containers / EICAR / magic-byte mismatches before pdf-parse sees the buffer (NFR-S02), and a hardened replacement for the plaintext localStorage key store using IndexedDB + a non-extractable Web Crypto AES-256-GCM key.

**What I did:**

- `src/lib/uploads/malware-scan.ts` + 27 tests. `scanBuffer(buffer, filename, mimeType)` runs in this order: empty check → extension blocklist (.exe, .dll, .bat, .scr, .msi, .js, .vbs, .ps1, .app, .pkg, .deb, .rpm) → extension allowlist (.pdf only) → MIME allowlist (application/pdf only, strips `;charset=...` params first) → magic-byte detection (PDF, PE/MZ, ELF, 5 Mach-O variants, OLE compound document, ZIP/OOXML, RAR, 7z) → executable-signature reject → office-macro-container reject → magic↔MIME mismatch reject → magic↔extension mismatch reject → EICAR scan of the first 2KB. Returns a discriminated union; `assertSafeBuffer` is the throwing wrapper mapping to `IngestionError("invalid_file_type", ...)` so HTTP status stays unchanged.
- Wired into `POST /api/bots/[botId]/knowledge` at the per-file loop, BEFORE `extractPdfText`. The existing PDF-magic check in extract-pdf.ts stays as a defence-in-depth second pass.
- `src/lib/client/secure-key-store.ts` - new browser-side primitive. Opens IDB (`probot-secure-store`, version 1, object store `keys`). On first use, generates a non-extractable AES-256-GCM CryptoKey via `crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, [...])` and stores it under id `master.aes-gcm-256.v1`. Subsequent secrets are encrypted with that key + a fresh 12-byte random IV, stored under id `secret.<name>`. The CryptoKey itself is `extractable: false` so `crypto.subtle.exportKey` will refuse. Public API: `getSecureKeyStore() → SecureKeyStore | null` (returns null in SSR or old browsers without IDB/crypto.subtle).
- `src/lib/client/llm-key-store.ts` + `embedding-key-store.ts` - rewritten on top of `secure-key-store`. Public API is now async. One-time migration: on first `getApiKey` with no IDB row, reads the legacy localStorage slot, writes to IDB, removes localStorage entry. Subsequent reads hit IDB only.
- Updated three callers to await the new async functions: `ChatWindow.tsx`, `BotFactoryForm.tsx`, `AIModelKeyTab.tsx`.
- `llm-key-store.test.ts` rewritten: imports `fake-indexeddb/auto` at the top so `indexedDB` is on the global before the SUT loads. `beforeEach` calls `__resetSecureKeyStoreForTests()` (which CLOSES the cached DB connection so `deleteDatabase` isn't blocked) and then deletes the fake DB. New tests cover the localStorage migration and a "no plaintext API key in localStorage after a fresh write" canary.
- `fake-indexeddb` added as devDependency (^6.2.5).
- Total tests: 803 pass (was 775; +28).

**Files changed:**

- `src/lib/uploads/malware-scan.ts` + `malware-scan.test.ts` - create.
- `src/app/api/bots/[botId]/knowledge/route.ts` - update - `assertSafeBuffer` before `extractPdfText`.
- `src/lib/client/secure-key-store.ts` - create.
- `src/lib/client/llm-key-store.ts` - update - async API + localStorage migration.
- `src/lib/client/embedding-key-store.ts` - update - same shape.
- `src/lib/client/llm-key-store.test.ts` - update - async + IDB-aware + migration test.
- `src/components/chat/ChatWindow.tsx` - update - await async key reads.
- `src/components/bot-factory/BotFactoryForm.tsx` - update - await async key writes.
- `src/components/dashboard/settings/AIModelKeyTab.tsx` - update - await `setApiKey`.
- `package.json` + `package-lock.json` - update - `fake-indexeddb` ^6.2.5.

**Decisions made:**

- **No real AV scan; documented honestly.** Free serverless ClamAV doesn't exist (needs a persistent daemon). The heuristic checks catch what users actually try (renamed .exe, double-extension tricks, accidentally-uploaded .docx) without pretending to be a malware scanner. Self-host operators can layer an AV sidecar.
- **EICAR scan in first 2KB only.** Real malware doesn't carry the signature; the scan exists for test-wiring verification + flagging security testers. Full-buffer scan would be O(n) for no benefit.
- **PDF is the ONLY allowed extension AND MIME** for the knowledge route. Any future route wanting other types passes its own allowlist.
- **`extractable: false` is the load-bearing property of the IDB store.** With it, key bytes cannot leave the browser via `crypto.subtle.exportKey`. Attacker who exports the IDB row gets back a CryptoKey object still bound to the non-extractable flag.
- **Async API everywhere, not a sync façade over an async cache.** Sync-with-hydration would mean a race window where the first read returns null. Async forces correct awaits at every caller for a 3-file refactor.
- **One-time localStorage migration on first read.** Creators who set keys pre-Phase-6 don't have to re-enter. Subsequent reads hit IDB only. Legacy localStorage entries get cleared on every successful IDB write too as defence-in-depth.
- **`__resetSecureKeyStoreForTests` closes the DB before resetting the cached promise.** Without the close, `indexedDB.deleteDatabase` blocks forever (open connection = blocker; fake-indexeddb fires `onblocked` and never settles). This was the bug that caused the first test run to hang for 135 seconds.
- **No "regenerate master key" UI.** Rotation requires re-encrypting every stored secret; benefit is unclear (the key never leaves the browser). Operators can `indexedDB.deleteDatabase("probot-secure-store")` from console if they really need to.
- **`fake-indexeddb/auto` over manual polyfill** because the `auto` entry point installs on the global at import time, matching what vitest needs.

**Open questions / follow-ups:**

- **The encrypted store doesn't help against XSS on our origin.** Malicious JS on pro-bot.dev can call `crypto.subtle.decrypt` exactly the same way our own code does. Residual risk; mitigation is keeping the origin clean of third-party JS (already enforced - no analytics).
- **No "scan failed = quarantine" path.** Rejected uploads are silently 415'd; operators don't get notified. Phase 7 observability work can wire a Sentry breadcrumb.
- **Brand-new master key generated silently on first visit.** No UI surface confirming this. Could add a "🔒 keys encrypted locally" pill in AIModelKeyTab.
- **Web Crypto requires a secure context (HTTPS or localhost).** Insecure http:// origins fall back to localStorage with no encryption. Documented; operators should run TLS.
- **EICAR detection is substring-only.** A zipped EICAR inside a PDF would not be caught because the outer magic check rejects the non-PDF first. The substring check covers the "raw EICAR file renamed .pdf" case.

### 2026-06-21 12:05 - Stage 7 Phase 7 (FINAL): KEK rotation runbook + CI key-leak guard + hybrid-model copy + Stage 8 deferrals

**What was asked to do:** Final Stage 7 phase - ship the KEK rotation tool an operator runs quarterly, add the CI grep guard that fails the build if anyone accidentally logs a key-shaped value outside the allowlisted modules, update the landing + about + README copy to describe the hybrid managed/self-host model honestly, add a dedicated /self-hosting docs page, and formally defer the performance NFRs (NFR-P01..P07) plus a handful of "needs real traffic to tune" follow-ups to a new Stage 8 section in plan.md.

**What I did:**

- `scripts/rotate-kek.mjs` - operator-facing Node CLI. Reads `PROBOT_KEY_ENCRYPTION_KEY` (old) + `PROBOT_KEY_ENCRYPTION_KEY_NEXT` (new) + `DATABASE_URL`, walks every row in `encrypted_llm_keys`, unwraps the DEK with the old KEK and re-wraps with the new KEK (the actual ciphertext stays byte-identical - only the DEK envelope rotates). Per-row idempotent: a row already rotated fails to unwrap with the OLD KEK, gets logged as "skip" and the script moves on. `--dry-run` mode prints the new wrappedDek prefix without UPDATEing. Wrote the AES-256-GCM primitives inline rather than importing the TS module (Node `.mjs` can't import `.ts` natively without a loader; the duplication is ~30 lines and the script-vs-module shapes can drift safely because each is independently tested).
- `scripts/check-key-leaks.mjs` - CI grep guard. Walks every `.ts` / `.tsx` under `src/`, finds any `console.*` / `Sentry.*` call that references key-shaped names (`x-llm-api-key`, `x-embedding-api-key`, `x-llm-azure-endpoint`, `apiKey`, `api_key`, `embeddingApiKey`). Allow-lists the 13 modules that legitimately handle the key (the auth/transport layer, envelope encryption, browser stores, redact helper, the chat route, the bot factory, AIModelKeyTab, ChatWindow). Test files are auto-allowlisted - they intentionally use canary strings to assert keys are NOT echoed. Exit code 1 with a per-file pointer if anything matches. Currently green: 264 files scanned, 13 allow-listed, 0 violations.
- Added `kek:rotate` and `check:key-leaks` npm scripts.
- Landing-page copy updates in `src/app/page.tsx`: hero sub-headline now reads "Self-host or use managed - your key, your call" with a link to `/about#hybrid`. Trust-strip badge changed from "Your keys stay local" to "Envelope-encrypted keys (or self-host)". The "Bring your own model" feature card now describes the dual path ("envelope-encrypted on our infra OR never sent at all if you self-host"). Tagline under the chat-bubble preview swapped from "stored locally" to "encrypted or self-hosted".
- About-page got a new ID-anchored section `#hybrid` (so the landing page link works) sitting between the principles grid and the operator bio. Two side-by-side cards: "Managed (pro-bot.dev) - Encrypted on our infra" (envelope encryption explainer + 3 benefit bullets) and "Self-hosted - Never leaves your server" (zero-key-on-our-infra + 3 benefit bullets + link to `/self-hosting`). Closing paragraph explicitly calls out the operator-trust caveat ("managed mode protects against DB leaks, NOT against full infra compromise; self-host is the answer to that threat").
- New `/(marketing)/self-hosting/page.tsx` - 7-section guide: what you'll need, step-by-step deploy, key-storage choice (pure self-host vs self-host + opt-in managed), KEK rotation runbook, Vercel Cron secret, honest caveats (no real AV, per-process rate limit / breaker). Returns the operator to /about at the bottom.
- README updates: hero blurb now describes the hybrid model honestly. Architecture table updated (BYO-key-store row, LLM-clients row, auth row, test count). Replaced the old single-path BYO-key flow diagram with a two-panel diagram showing self-hosted vs managed paths. Replaced the "Stage 7 - planned" line with a per-phase summary of what shipped. Added a "Key storage & KEK rotation" section pointing operators at `npm run kek:rotate`. Roadmap section rewritten as "Stage 8+" with the deferred items.
- `claude/plan.md`: added a new "## Stage 8: Performance, Scale & Operational Polish (Post-Launch)" section between Stage 7 and the Summary matrix. Includes the 7 performance NFRs from SRS §6.1 with a tuning approach for each, the Upstash Redis migration for rate-limit + circuit-breaker (replacing per-process state), and 9 smaller hardening items deferred from Stage 7 (resend-deletion email, sign-out-other-sessions on delete-init, dashboard breaker indicator, real AV via ClamAV sidecar, provider-mismatch dashboard prompt, Sentry wiring on circuit_open, Gemini integration test, CSRF if needed, one-command Docker self-host).
- Total tests: 803 still passing (no new tests in Phase 7 - it's all infra + docs + a CLI). Typecheck + key-leak guard + Next build all green.

**Files changed:**

- `scripts/rotate-kek.mjs` - create - operator KEK rotation CLI.
- `scripts/check-key-leaks.mjs` - create - CI grep guard.
- `package.json` - update - `kek:rotate` + `check:key-leaks` scripts.
- `src/app/page.tsx` - update - hero + trust strip + BYO-model card copy.
- `src/app/(marketing)/about/page.tsx` - update - new #hybrid section.
- `src/app/(marketing)/self-hosting/page.tsx` - create - operator deployment guide.
- `README.md` - update - hero, architecture table, BYO-key flow diagram, features list, KEK rotation runbook section, Stage 8 roadmap.
- `claude/plan.md` - update - new "Stage 8: Performance, Scale & Operational Polish" section.

**Decisions made:**

- **Rotation script duplicates the AES-GCM ops inline rather than importing the TS module.** Node `.mjs` can't natively load `.ts`; importing through esbuild would mean adding another script dep just for this. The 30-line duplication is acceptable because both code paths are independently tested (envelope.test.ts on the TS side, the script itself has assertions on output shape). A future schema change to the envelope payload MUST update both - documented in the script header.
- **`--dry-run` mode required by default-on cautious workflow.** Operators should always preview row counts before committing a rotation; the script makes that the documented step 3 of the runbook.
- **Skip-on-failure semantics, not abort-on-failure.** A row that the OLD KEK can't unwrap is almost certainly already rotated (idempotency), so we log + skip rather than aborting the whole batch. A `failed` counter at the end means the operator can see if any rows hit a real UPDATE error.
- **Key-leak guard runs on `npm run check:key-leaks`, not as a pre-commit hook.** Pre-commit hooks add friction for every contributor; running as part of CI catches the same regressions one PR later but with zero local-dev overhead. The operator can wire it into a Husky hook locally if they want.
- **Allow-list is module-specific, not directory-wide.** Whitelisting `src/lib/ai/` would let a future ai-related module silently grow a logger that leaks. Per-file means new files default to the "no key references in logger calls" discipline; explicitly adding to the allow-list requires a deliberate edit.
- **`Sentry.` prefix is in the regex even though we don't use Sentry yet.** Defence-in-depth for the Stage 8 observability work that's likely to wire Sentry next. Costs nothing to include now.
- **New About `#hybrid` section sits BEFORE the operator bio.** Reasoning: the operator-bio section is the "trust me, I'm a person" anchor; before a visitor commits trust to a specific operator, they need to understand the technical trust model. Hybrid explanation first.
- **Self-hosting page is under `(marketing)` route group**, not `(docs)`. Reasoning: there's no other docs page, and the self-host guide is something the marketing site needs to link to from About + the landing page; keeping it inside the marketing chrome (SiteHeader + SiteFooter) means visitors don't lose context.
- **Stage 8 section in plan.md, not a separate file.** plan.md is the canonical phase ledger; splitting Stage 8 into its own file would mean a future maintainer has to discover two files instead of one. Section-level grouping is sufficient.
- **README badge updated to 803 tests** - mildly fragile (will go stale on every test change) but a static badge is more honest about current state than a CI-driven one would be (since CI badges can lag or break).
- **`/self-hosting` deliberately mentions the caveats** (no real AV, per-process rate limit). Sending operators to deploy without understanding these would mean they hit them in production and assume the project is broken. Better to surface upfront in the page that's already labeled "honest caveats."

**Open questions / follow-ups:**

- **The README's per-file allow-list in `check-key-leaks.mjs` will drift** as new modules are added. Reviewers need to spot when a new file legitimately handles the key vs accidentally references it. The CI failure message points at the allow-list source for context.
- **The KEK rotation script doesn't migrate the embedding-key path.** Currently only `encrypted_llm_keys` rows are rotated; if a future feature stores embedding keys server-side (today they're browser-only), the script needs to add a second loop.
- **`/self-hosting` doesn't include the per-provider OAuth setup screenshots.** They'd help non-technical operators but maintenance cost (screenshots go stale on UI changes) is high. Deferred.
- **No `noindex` on `/self-hosting`.** It's intentionally indexable - we want operators searching "self-host ProBot" to find it. Confirmed-not-an-oversight.
- **Stage 8 section is documentation only; no code committed for it yet.** The performance NFRs need measurement first, and the Upstash migration needs Vercel Pro decisions. By design.
- **README test-count badge will drift on every PR.** Acceptable; the alternative (a real CI badge) requires a CI provider hook we haven't wired and would be a more invasive piece of infra than a static markdown badge.

---

### 2026-06-21 21:32 - v1.0 Stage 1: Branding & Copy Cleanup

**What was asked to do:** Ship Stage 1 of `claude/plan-v1.md` - the branding/copy cleanup: rename "AI Recruiter" → "AI Assistant" and the `probot.com` domain → `pro-bot.dev` across the app, refresh the login/signup hero with post-Beta product specs, and strip internal Beta-stage vocabulary (`Stage N` / `Phase N` / `Slice X`) out of source-code comments so new contributors don't have to learn the Beta build-plan shorthand.

**What I did:**

- Replaced `probot.com` → `pro-bot.dev` in all live app code, tests, and `.env.example` (the test assertions were updated in lockstep so they stay green). The domain was already partially migrated - `docs.pro-bot.dev` deep links and the `about` page already used the new domain.
- Replaced `AI Recruiter`/`AI recruiter` → `AI Assistant`/`AI assistant` across the landing page, register page metadata + form copy, the auth `BrandPanel`, `RegisterForm`, and `ChatWindow`.
- Refreshed the shared auth hero (`BrandPanel.tsx`): subhead now reads "Free & open source · four LLM providers · keys encrypted, never tracked." and the three footer chips became "Free & open source", "4 providers, BYO key", "Encrypted · no telemetry" - reflecting the post-Beta hybrid managed/self-host, four-provider, encrypted-key, no-telemetry positioning.
- Swept Beta-stage vocabulary out of ~95 source files (210 comment rewrites). Each rewrite preserved meaning rather than blindly deleting the prefix: forward-looking references like `// Stage 7 wires a structured logger` became `// A future change wires a structured logger` (not `// Wires a structured logger`, which would have falsely claimed the work was done). Spec-section refs (`§FR-...`, `§NFR-...`, `§SEC-...`) were kept where they carry real meaning; only the `Stage N`/`Phase N`/`Slice X` build-plan tokens were removed.
- Also cleaned 3 user-facing strings that leaked Beta vocab into the rendered UI: `BotFactoryForm` ("Slug comes from your username (Stage 1)." and "Embed code - Stage 5") and the `(marketing)/self-hosting` page ("...backed version (Stage 8).").

**Files changed:**

- 8 files for the domain swap: `.env.example`, `src/app/page.tsx`, `src/components/auth/RegisterForm.tsx`, `src/components/bot-factory/BotFactoryForm.tsx` (+ `.test.tsx`), `src/components/dashboard/BotSwitcher.test.tsx`, `src/components/dashboard/Topbar.test.tsx`, `src/components/dashboard/settings/AccountTab.tsx`.
- 5 files for the "AI Recruiter" swap: `src/app/(auth)/register/page.tsx`, `src/app/page.tsx`, `src/components/auth/BrandPanel.tsx`, `src/components/auth/RegisterForm.tsx`, `src/components/chat/ChatWindow.tsx`.
- `src/components/auth/BrandPanel.tsx` - update - hero subhead + footer chips rewritten to the post-Beta product specs.
- ~95 source files (`src/**/*.ts`, `src/**/*.tsx`) - update - Beta-vocab comment sweep. Total diff: 104 files, 244 insertions / 244 deletions (line-for-line, no structural change).
- `claude/context.md` - update - this Session History entry + Status line note.
- `docs/changelog.mdx` - update - Version 1.0 "Stage 1 shipped" subsection.
- `claude/plan-v1.md` - update - Stage 1 ticked in the matrix + status line under the Stage 1 section.

**Decisions made:**

- **Meaning-preserving comment rewrites, driven by a self-verifying script.** A blind regex strip of the leading `Stage N:` prefix would have corrupted future-tense comments (turning "Stage 8 may swap in Redis" into "May swap in Redis", asserting a plan as a present fact). Instead each of the 205 core replacements was an explicit (old → new) pair run through a script that asserts every target appears exactly once before replacing, so any transcription error surfaces loudly instead of silently mangling a file.
- **Test-title strings left as-is.** 13 `describe()`/`it()` titles still contain `Stage N`/`Slice X` (e.g. `describe("Stage 3 RAG", ...)`). These are test-grouping labels, not source comments, and aren't covered by the acceptance greps; cleaning them is deferred to avoid scope creep. The user explicitly scoped the sweep to comments.
- **`design/*.html` mockups left untouched** (user decision). They're the historical porting source, not shipped pages, so the acceptance greps still surface them - an accepted, documented exception.
- **`docs/changelog.mdx` line 140 left intact.** That line literally documents this rename rule (`"AI Recruiter" → "AI Assistant", probot.com → pro-bot.dev`); rewriting it would mangle the changelog describing the change.
- **No `learnings.md` entry.** This stage was mechanical branding work with no RAG/GenAI or architectural teaching moment, so per §10 the append is skipped.

**Open questions / follow-ups:**

- **Full `npm test` + `npm run build` not yet re-run after the sweep.** They couldn't execute in the Linux build sandbox (the repo's `node_modules` was installed on macOS, so vitest's rollup native binary is platform-mismatched and bus-errors). `npm run typecheck` and `npm run check:key-leaks` both pass; the suite should be re-run natively on macOS before the Stage 1 PR merges, per the stage close-out checklist.
- **13 test-title strings + one `"legacy stage 1 text"` test fixture still contain stage vocabulary.** Intentionally out of scope; revisit only if a future convention wants test labels cleaned too.

---

### 2026-06-21 21:55 - v1.0 Stage 2: Auth UX & Bug-fix Sprint

**What was asked to do:** Ship Stage 2 of `claude/plan-v1.md` - the auth UX polish: show-password toggles, a "remember me" option, a debounced signup username/email availability check, the forgot-password flow as a modal, magic-link button alignment, onboarding parity, and an inline sign-out confirmation. The magic-link delivery bug was confirmed already resolved by the user, so that item was dropped.

**What I did:**

- **Show-password toggle** - new reusable `PasswordInput` (eye/eye-slash button swapping the input `type`), wired into login, register, and reset-password forms (every password field on the site).
- **Remember me** - login now has a "Keep me signed in" checkbox (default on) threaded into `signIn("credentials", { remember })`. Because NextAuth v4 applies `session.maxAge` globally, per-login expiry is implemented by overriding `jwt.encode` to pick the maxAge from the token's `remember` flag: remembered = 30 days, un-remembered = 1 day. OAuth/magic-link tokens have no flag and fall through to the long window.
- **Signup availability check** - new `GET /api/auth/check-availability?username=&email=` returns per-field `{available, reason?}`; register form fetches it (debounced 400 ms via the new `useDebouncedValue` hook), shows inline red errors, and disables submit while a field is taken/invalid. Server-side register remains the source of truth.
- **Forgot-password modal** - new `ForgotPasswordModal` opened from the login form's "Forgot?" button (now a button, not a route link); reuses the existing `/api/auth/forgot-password` POST; closes on backdrop/×/Escape. The `/forgot-password` page stays as a deep-link fallback.
- **OAuth row alignment** - wrapped each provider glyph in a fixed 18 px `IconSlot` and bumped the GitHub mark 16→18 px so Google/GitHub/Magic Link sit on one baseline (kept the design's Google-full + GitHub/Magic 2-col layout).
- **Inline sign-out** - new `SidebarAccountFooter` client component owns the model-status card + profile row + sign-out; clicking sign-out swaps the model card for an inline Cancel/Sign-out panel in the same slot (no centered modal). Replaced the footer block in `Sidebar.tsx`; deleted the now-orphaned `SignOutButton.tsx` (its `ConfirmDialog` is still used by `KnowledgeTab`).
- **Onboarding parity** - investigation only: all OAuth/magic-link users already route through `/onboarding` (via the `(dashboard)/layout.tsx` placeholder-username redirect) and `OnboardingForm` already renders username + avatar picker. Parity was already shipped; no code change.

**Files changed:**

- `src/components/auth/PasswordInput.tsx` - create - reusable masked input + show/hide toggle.
- `src/components/auth/PasswordInput.test.tsx` - create - toggle + onChange specs.
- `src/components/auth/LoginForm.tsx` - update - PasswordInput, remember checkbox, forgot-modal trigger, `remember` in signIn.
- `src/components/auth/RegisterForm.tsx` - update - PasswordInput, debounced availability check, inline errors, submit gating.
- `src/components/auth/ResetPasswordForm.tsx` - update - PasswordInput for both password fields.
- `src/components/auth/ForgotPasswordModal.tsx` - create - modal wrapping the reset-request flow.
- `src/components/auth/OAuthRow.tsx` - update - IconSlot alignment + GitHub glyph size.
- `src/lib/auth/auth.ts` - update - `remember` credential + authorize return, `session.maxAge`, custom `jwt.encode/decode`, jwt callback persists `remember`.
- `src/types/next-auth.d.ts` - update - `remember?: boolean` on User + JWT.
- `src/app/api/auth/check-availability/route.ts` - create - per-field availability GET.
- `src/app/api/auth/check-availability/route.test.ts` - create - availability specs.
- `src/lib/client/use-debounced-value.ts` - create - debounce hook.
- `src/components/dashboard/SidebarAccountFooter.tsx` - create - inline sign-out footer.
- `src/components/dashboard/SidebarAccountFooter.test.tsx` - create - inline-confirm specs.
- `src/components/dashboard/Sidebar.tsx` - update - render SidebarAccountFooter; drop ModelStatusCard/SignOutButton imports.
- `src/components/dashboard/SignOutButton.tsx` - delete - superseded by SidebarAccountFooter.
- `src/components/auth/LoginForm.test.tsx`, `src/components/auth/RegisterForm.test.tsx`, `src/lib/auth/auth.test.ts` - update - new behaviour (password label, remember arg, URL-routed fetch for availability vs register, authorize `remember`).

**Decisions made:**

- **Remember-me via `jwt.encode` maxAge override, not a conditional cookie.** NextAuth v4 has no native per-login session length under the JWT strategy. Overriding `encode` to shorten the token's maxAge when `remember === false` makes the session lapse after a day of inactivity while leaving the cookie config untouched - the lowest-risk approach that actually works in v4. The cookie may physically linger, but it holds a short-lived token, so the user is effectively signed out.
- **`schemas.ts` left unchanged.** The approved plan listed extending `loginInput` with `remember`, but reading `credentials?.remember === "true"` directly in `authorize` is simpler and needs no schema/zod change; `loginInput` ignores the extra field.
- **Availability endpoint mirrors the register 409's existing enumeration surface.** It can reveal whether an email/username is registered, but the register endpoint already distinguishes taken email vs username in its 409, so this adds no new exposure - and the UX win (catch collisions before submit) is the whole point of the item.
- **Onboarding item was verification-only.** The redirect + form already covered Google/email/GitHub equally; adding profile-name prefill would have been speculative scope (CLAUDE.md §2), so it was deferred.
- **Deleted `SignOutButton.tsx` rather than repurposing it.** Folding its role into `SidebarAccountFooter` keeps the inline-confirm state in one place; the file became orphaned by the change, so per §3 it was removed (its `ConfirmDialog` dependency stays - still used by KnowledgeTab).

**Open questions / follow-ups:**

- **Vitest suite not run after Stage 2.** Same sandbox limit as Stage 1: `node_modules` is macOS-native, so vitest's rollup (4.62 native vs 4.61 JS, fixed) and vite-bundled esbuild binaries fault on linux-arm64 (bus error / EPIPE). `typecheck` + `check:key-leaks` pass; run `npm test` natively before the Stage 2 PR merges. The new/updated tests (PasswordInput, check-availability, SidebarAccountFooter, LoginForm, RegisterForm, auth) were written to existing patterns and are typecheck-clean but unexecuted here.
- **Restored `@types/node`** (Stage 1's interrupted in-sandbox install had left it incomplete, which would break `tsc` on any machine). Native rollup/esbuild binaries in `node_modules` are still macOS builds; a clean `npm install` on macOS is the canonical reset.
- **Remember-me "session-only cookie" is approximated as a 1-day inactivity window**, not a true browser-session cookie. If product wants the cookie cleared exactly on browser close, that needs a custom cookie handler - deferred unless requested.

---

### 2026-06-21 22:30 - Stage 2 follow-up: Magic-link modal + branded confirmation emails

**What was asked to do:** Make the Magic Link button open a pop-up (like forgot-password) that collects an email and shows a confirmation that a sign-in link was sent, with the email address in blue primary. Apply the same blue-email treatment to the forgot-password modal confirmation. Keep the Gmail icon on the button.

**What I did:**

- New `MagicLinkModal` mirroring `ForgotPasswordModal`: collects an email and calls `signIn("email", { email, callbackUrl: "/dashboard", redirect: false })` so the NextAuth EmailProvider sends the link without navigating to `/auth/verify-request`. On success it shows an in-modal confirmation with the address in `text-brand`.
- `OAuthRow`: the Magic Link button (Gmail icon kept) now opens `MagicLinkModal` seeded with any email already typed in the parent form, replacing the previous inline `signIn` + empty-email hint. Wrapped the return in a fragment to render the modal alongside the provider buttons.
- `ForgotPasswordModal`: confirmation email recolored from `text-base` to `text-brand` (blue primary) to match.

**Files changed:**

- `src/components/auth/MagicLinkModal.tsx` - create - email-collecting magic-link modal with branded confirmation.
- `src/components/auth/MagicLinkModal.test.tsx` - create - send + confirmation + invalid-email specs.
- `src/components/auth/OAuthRow.tsx` - update - Magic Link opens the modal; removed inline send/loading/error state.
- `src/components/auth/ForgotPasswordModal.tsx` - update - confirmation email in `text-brand`.
- `src/components/auth/LoginForm.test.tsx` - update - the two magic-link specs now assert the modal opens and that submitting it calls `signIn("email", …, redirect:false)` and shows the confirmation.

**Decisions made:**

- **`redirect: false` on the magic-link signIn.** Keeps the user in the modal to show the confirmation instead of NextAuth bouncing to the verify-request page - consistent with the forgot-password modal UX. NextAuth still sends the email and does not reveal whether the address exists.
- **Modal lives in `OAuthRow`, so it appears on both login and register** (the row is shared), matching the existing Magic Link placement.

**Open questions / follow-ups:**

- typecheck + check:key-leaks pass (273 files); vitest still unexecuted in-sandbox (same macOS-native `node_modules` limit). Run `npm test` natively to exercise the new MagicLinkModal + updated LoginForm specs.

---

### 2026-06-21 23:30 - v1.0 Stage 3: Account & Settings Hardening

**What was asked to do:** Ship Stage 3 of `claude/plan-v1.md` - make Settings → Account fully editable (full name + username with a debounced uniqueness check, password change, profile-photo upload) and redesign the bot theme-color picker into a single colored circle that opens a swatch grid + native color input. Profile photos stored zero-cost in Postgres (bytea). Items already shipped in Beta (personality/custom-instructions repositioning, Security & Privacy export/delete, AI model & key panel) were verified, not rebuilt.

**What I did:**

- **Profile photo storage (Postgres bytea, zero external storage):** new `user_avatars` table (one row per user: `data` bytea, `content_type`, `updated_at`; `user_id` PK/FK cascade) plus a small `bytea` Drizzle `customType`. Upload route stores bytes; serve route streams them; `users.image` points at the serve URL.
- **New endpoints:** `PATCH /api/users/me/profile` (name + username, uniqueness pre-check + 23505→409), `POST /api/users/me/password` (verifies current via bcrypt, rejects OAuth-only accounts with `no_password_set`), `POST /api/users/me/avatar` (multipart, jpg/png/webp ≤2 MB, magic-byte sniff, upsert into `user_avatars` + set `users.image` to `…/api/avatar/<id>?v=<ts>`), `GET /api/avatar/[userId]` (public serve of the stored bytes). Validation in `src/lib/users/profile-schemas.ts`.
- **Session freshness:** `auth.ts` jwt callback now re-reads `name` + `image` alongside username, and the session callback exposes them, so account edits + photo uploads reflect on the next request (acceptance: "updates the JWT on next request").
- **AccountTab rewrite:** from read-only stub to a real client form - avatar with Change-photo upload, editable full name, editable username (debounced `check-availability` from Stage 2, own-username treated as available, inline error), read-only email, and a password-change section using the Stage 2 `PasswordInput`. Each section saves to its own endpoint and `router.refresh()`es.
- **Theme picker redesign:** new `ThemeColorField` (a colored circle showing the current color; click opens a popover with the preset swatch grid + native `<input type=color>`; closes on outside-click/Escape). Swapped into `BotConfigTab`, removing the always-visible swatch row + the local `THEME_PRESETS` const.
- **Verify-only:** confirmed `BotConfigTab` already hosts personality + custom instructions, `SecurityTab`/`SecurityActions` wire export + delete, and `AIModelKeyTab` is live - no changes.

**Files changed:**

- `src/lib/db/schema.ts` - update - `bytea` customType + `user_avatars` table + row types.
- `src/lib/users/profile-schemas.ts` - create - profile + password-change Zod schemas.
- `src/app/api/users/me/profile/route.ts` - create - PATCH name + username.
- `src/app/api/users/me/password/route.ts` - create - POST password change.
- `src/app/api/users/me/avatar/route.ts` - create - POST photo upload to bytea.
- `src/app/api/avatar/[userId]/route.ts` - create - GET serve avatar bytes.
- `src/lib/auth/auth.ts` - update - jwt/session refresh of name + image.
- `src/components/dashboard/settings/AccountTab.tsx` - update - read-only stub → editable form.
- `src/components/dashboard/settings/ThemeColorField.tsx` - create - circle + popover color control.
- `src/components/dashboard/settings/BotConfigTab.tsx` - update - use ThemeColorField; drop swatch row + THEME_PRESETS.
- `src/app/(dashboard)/dashboard/bots/[botId]/settings/page.tsx` - update - pass `image` + real `name` to AccountTab.
- Tests: `…/users/me/profile/route.test.ts`, `…/users/me/password/route.test.ts`, `…/users/me/avatar/route.test.ts`, `…/avatar/[userId]/route.test.ts`, `ThemeColorField.test.tsx`, `AccountTab.test.tsx` (create); `BotConfigTab.test.tsx` (update - theme swatch now behind the popover).

**Decisions made:**

- **Postgres bytea over Cloudinary/Vercel Blob** (user choice): no new services, keys, or accounts; honors the strict zero-cost policy. The 2 MB cap keeps row sizes bounded. `users.image` carries a `?v=<timestamp>` so a new upload busts any cached copy.
- **Magic-byte sniff on upload** (jpg/png/webp), rejecting a file whose bytes don't match its declared MIME - mirrors the existing PDF upload-safety posture rather than trusting Content-Type.
- **Password change rejects OAuth-only accounts** (`no_password_set`) instead of silently setting a first password; a dedicated "set password" flow would be a separate feature.
- **Theme presets moved into `ThemeColorField`** so the control is self-contained; `ThemeColorPicker.tsx` (the older standalone, now only referenced by its own test) was left as pre-existing dead code per §3 - not deleted.

**Open questions / follow-ups:**

- **`user_avatars` table must be created before photo upload works.** drizzle-kit can't generate the migration in the Linux sandbox (esbuild platform mismatch), so the table isn't in a versioned migration yet. Apply it natively with `npx drizzle-kit push` (push-managed dev DB) or `npm run db:generate` for a migrate-file. Until then, `POST /api/users/me/avatar` and the serve route will 500 (relation does not exist).
- **Vitest unexecuted in-sandbox** (same macOS-native `node_modules` limit); typecheck + check:key-leaks pass (285 files). Run `npm test` + `npm run build` natively.
- **bytea round-trip assumes node-postgres returns `bytea` as a Buffer** (its default); the serve route wraps it in `new Uint8Array(row.data)`. Worth a quick manual smoke test after the table exists.

---

### 2026-06-21 23:55 - Stage 3 follow-up: avatar hover-upload + inline theme picker

**What was asked to do:** Two UI refinements to the Stage 3 settings work: (1) replace the separate "Change photo" button with a hover overlay on the avatar that triggers the upload on click, and move Full name / Username / Email beside the photo; (2) make the theme picker inline (no popover) - presets always visible with the active one highlighted, plus a custom-color button shaped as a color-picker icon filled with the current color.

**What I did:**

- **AccountTab profile section:** the avatar is now itself the upload trigger - a circular `button` (`aria-label="Change photo"`) with a `group-hover` dark overlay + camera icon (and an "Uploading…" state); clicking it opens the same hidden file input → `POST /api/users/me/avatar`. The standalone "Change photo" button was removed. Layout reflowed into a flex row: avatar on the left, a fields column on the right (Full name + Email as a 2-col grid, Username full-width below), stacking on mobile.
- **ThemeColorField:** removed the popover (and its open/outside-click/Escape state). Presets render inline with the active color ringed; a trailing custom button is a swatch filled with `value`, overlaid with a color-picker (eyedropper) icon via `mix-blend-difference` for contrast, wrapping a transparent native `<input type="color">`. When `value` matches no preset, the custom button carries the active ring.

**Files changed:**

- `src/components/dashboard/settings/AccountTab.tsx` - update - avatar hover-upload + side-by-side layout + CameraIcon.
- `src/components/dashboard/settings/ThemeColorField.tsx` - update - inline (no popover) presets + color-picker-icon custom button.
- `src/components/dashboard/settings/ThemeColorField.test.tsx` - update - rewritten for inline behavior (no dialog).
- `src/components/dashboard/settings/BotConfigTab.test.tsx` - update - reverted the "open popover" step; swatch is clicked directly again.

**Decisions made:**

- **Custom button uses `mix-blend-difference`** on the eyedropper icon so it stays legible against any chosen background color, light or dark.
- **Avatar button keeps an `aria-label`** ("Change photo") since the visible label moved into a hover-only overlay - preserves the accessible name the old text button provided.

**Open questions / follow-ups:**

- typecheck + check:key-leaks pass (285 files); vitest unexecuted in-sandbox as always - run `npm test` natively.

---

### 2026-06-22 00:20 - Stage 3 follow-up: sniff-authoritative avatar upload (JPEG) + brand theme presets

**What was asked to do:** Avatar upload should accept JPEG (`.jpg`/`.jpeg`) reliably, and the theme-color presets should be Blue (primary), Red, Green, Black. (Also surfaced: the avatar upload 500 was `relation "user_avatars" does not exist` - the Stage 3 migration not yet applied; fixed by running `npx drizzle-kit push`, not a code change.)

**What I did:**

- **Avatar upload made sniff-authoritative** (`src/app/api/users/me/avatar/route.ts`): removed the declared-MIME allowlist + the `sniffed !== file.type` strict-match check. The magic-byte sniff (JPEG `FF D8 FF`, PNG, WebP) is now the sole gate, and the *sniffed* type is stored as `content_type`. This fixes browsers/files that label JPEGs as the non-standard `image/jpg` (previously rejected with 415) and is stricter against spoofed Content-Types. File-size cap (2 MB) unchanged.
- **Broadened the file input `accept`** (`AccountTab.tsx`) to `image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp` so the OS picker clearly offers `.jpeg` files.
- **Theme presets** (`ThemeColorField.tsx`) changed from the old purples/teal to Blue `#0070dd` (the brand primary, converted from `tailwind.config.ts` `oklch(0.55 0.193 251.78)`), Red `#ef4444`, Green `#16a34a`, Black `#000000`.

**Files changed:**

- `src/app/api/users/me/avatar/route.ts` - update - sniff-authoritative validation.
- `src/app/api/users/me/avatar/route.test.ts` - update - added a "JPEG labeled image/jpg succeeds" case.
- `src/components/dashboard/settings/AccountTab.tsx` - update - broadened `accept`.
- `src/components/dashboard/settings/ThemeColorField.tsx` - update - new preset palette.
- `src/components/dashboard/settings/ThemeColorField.test.tsx` + `BotConfigTab.test.tsx` - update - swap the old `#10a37f` preset reference for the new green `#16a34a`.

**Decisions made:**

- **Sniff is authoritative, declared MIME is ignored.** `.jpg` and `.jpeg` are the same format (both `image/jpeg`); the only real failure mode was a browser declaring `image/jpg`. Trusting magic bytes fixes that and removes a spoofing vector instead of widening the allowlist string-by-string.

**Open questions / follow-ups:**

- **No bot-picture upload exists yet** (Stage 4 - Bot Factory avatar). When built, it should reuse this same magic-byte sniff rather than a declared-MIME allowlist.
- typecheck + check:key-leaks pass (285 files); run `npm test` natively. And the `user_avatars` table must exist (`npx drizzle-kit push`) for upload to work at all.

---

### 2026-06-22 01:30 - v1.0 Stage 4: Bot Factory & Dashboard Polish

**What was asked to do:** Ship Stage 4 of `claude/plan-v1.md`: a net-new bot profile picture (Bot Factory Step 1, defaulting to the ProBot icon, rendered on the public chat header + embeddable widget), a PDF dustbin icon, a per-file "PDF ingestion failed" fix (inline + retriable instead of a wizard-killer), the Stage 3 theme picker brought into wizard Step 3, and dark code blocks for the dashboard "Share your bot" snippets. One batch; bot avatar rendered on chat header + widget (user's choice).

**What I did:**

- **Bot avatar storage (Postgres bytea):** new `bots.image` column + `bot_avatars` table (bytea, mirrors `user_avatars`). `POST /api/bots/[botId]/avatar` (owner-gated) stores bytes + sets `bots.image`; `GET /api/bot-avatar/[botId]` serves them. Default (no upload) = NULL → ProBot icon fallback.
- **Shared image-upload helper:** extracted `src/lib/uploads/image-upload.ts` (`sniffImageType`, `parseImageUpload`, `appBaseUrl`) and refactored the Stage 3 user-avatar route to use it - both avatar routes now share sniff-authoritative validation.
- **Render bot avatar:** config endpoint exposes `bot.image`; chat page threads it to `ChatWindow` (header avatar slot, falls back to the gradient/initials); widget prefers `bot.image` over the owner photo. (The owner's personal photo from Stage 3 stays on `OwnerCard` - bot vs person are distinct identities.)
- **Wizard (BotFactoryForm):** Step 1 bot-picture picker holding a `File` in form state, uploaded after `POST /api/bots` returns the id (like the knowledge upload); Step 2 "Remove" text → red `TrashIcon`; Step 3 `ThemeColorField` (sends `themeColor` in the create payload - new bots now default to blue `#0070dd` instead of the old purple).
- **Per-file ingestion fix:** the knowledge route processes each PDF in its own try/catch and returns `200` with `files: [{ name, ok, error?, category? }]` instead of failing the whole batch on the first bad file. The wizard collects failures, advances to Step 5 anyway (the bot exists + good files are saved), and shows an `IngestFailuresPanel` with a per-file Retry that re-POSTs just that one file.
- **Embed snippets:** `EmbedSnippet` `<pre><code>` restyled to a dark theme (no syntax-highlighter dependency); existing copy buttons kept.

**Files changed:**

- `src/lib/db/schema.ts` - update - `bots.image` + `bot_avatars` table + types.
- `src/lib/uploads/image-upload.ts` - create - shared sniff/parse/base-url helper.
- `src/app/api/users/me/avatar/route.ts` - update - use the shared helper.
- `src/app/api/bots/[botId]/avatar/route.ts` - create - bot avatar upload (+ test).
- `src/app/api/bot-avatar/[botId]/route.ts` - create - bot avatar serve (+ test).
- `src/app/api/bots/[botId]/knowledge/route.ts` - update - per-file results (+ test updates).
- `src/app/api/bots/[botId]/config/route.ts` - update - expose `bot.image`.
- `src/app/u/[username]/chat/page.tsx` - update - pass `botImage`.
- `src/components/chat/ChatWindow.tsx` - update - render bot avatar in header.
- `src/widget/widget.ts` - update - prefer bot.image in the bubble (+ test fixture).
- `src/components/bot-factory/BotFactoryForm.tsx` - update - avatar picker, dustbin, theme field, per-file failure panel + retry (+ test).
- `src/components/dashboard/EmbedSnippet.tsx` - update - dark code blocks.

**Decisions made:**

- **Bot avatar is distinct from the owner photo.** The chat header shows the bot's picture (its own identity, default ProBot icon); the owner's personal photo (Stage 3) stays on `OwnerCard`. The widget prefers `bot.image`, falling back to the owner image then a placeholder.
- **Per-file results, not a 4xx batch.** The route now returns 200 even when some files fail; statuses like 413/422/415 for a single bad file are gone (the knowledge route tests were updated accordingly). Manual-text failures still fail loudly (not a retriable "file").
- **Theme presets in the wizard mean new bots default to blue**, not the schema's legacy purple default - the picker always sends a value on create.
- **Shared image-upload helper** removes the Stage 3 inline-sniff duplication so the bot route can't drift from the user route's validation.

**Open questions / follow-ups:**

- **`npx drizzle-kit push` required** to create `bot_avatars` + `bots.image` (alongside the still-pending Stage 3 `user_avatars`). Until then the bot-avatar upload/serve routes 500 with `relation "bot_avatars" does not exist`.
- typecheck + check:key-leaks pass (290 files); vitest unexecuted in-sandbox - run `npm test` + `npm run build` natively.
- **BotFactoryForm is now ~1340 lines.** If it grows further, the step components are good extraction candidates (e.g. pull `StepIdentity`/`StepKnowledge`/`StepPersonality` into their own files).

---

### 2026-06-22 02:00 - Stage 4 follow-up: bot picture in Bot configuration + shared AvatarUploader

**What was asked to do:** Make the bot profile picture editable from Settings → Bot configuration with the same hover-icon UX as the account profile photo, and confirm the bot picture accepts JPEG like the account photo.

**What I did:**

- **Extracted a shared `AvatarUploader`** (`src/components/dashboard/settings/AvatarUploader.tsx`) from AccountTab's avatar block: a circular avatar that is its own upload control (hover camera overlay, "Uploading…" state, hidden file input, 2 MB cap, `accept` includes jpg/jpeg/png/webp), POSTs to a configurable `uploadUrl` returning `{ image }`, then `router.refresh()`es. Takes `initialImage`, `uploadUrl`, and a `fallback` node (initials vs ProBot icon).
- **AccountTab** now uses `AvatarUploader` (uploadUrl `/api/users/me/avatar`, initials fallback) - removed its inline avatar state/handler/CameraIcon.
- **BotConfigTab** gained a "Bot picture" `AvatarUploader` (uploadUrl `/api/bots/${botId}/avatar`, ProBot-icon fallback) at the top of the identity section, beside name/headline. New `initialImage` prop.
- **Settings page** selects `bot.image` and passes it as `initialImage` to BotConfigTab.
- **JPEG**: no change needed - the bot-avatar route already shares the sniff-authoritative `parseImageUpload` (jpg/jpeg/png/webp by magic bytes); the perceived gap was just the missing uploader in Bot configuration.

**Files changed:**

- `src/components/dashboard/settings/AvatarUploader.tsx` - create - shared hover-upload avatar (+ test).
- `src/components/dashboard/settings/AccountTab.tsx` - update - use AvatarUploader.
- `src/components/dashboard/settings/BotConfigTab.tsx` - update - bot-picture AvatarUploader + `initialImage` prop + ProBotMark.
- `src/components/dashboard/settings/BotConfigTab.test.tsx` - update - `initialImage: null` in baseProps.
- `src/app/(dashboard)/dashboard/bots/[botId]/settings/page.tsx` - update - select + pass `bot.image`.

**Decisions made:**

- **One shared `AvatarUploader`** for both account + bot pictures so the hover UX and validation can't drift; the only per-use difference is `uploadUrl` and the `fallback` node.
- **Bot avatar uploads immediately** (separate endpoint), independent of BotConfigTab's diffed Save button - matches the account-photo behavior.

**Open questions / follow-ups:**

- typecheck + check:key-leaks pass (292 files); run `npm test` natively. `bot_avatars`/`bots.image` still need `npx drizzle-kit push` for any bot-picture upload to work.

---

### 2026-06-22 03:30 - v1.0 Stage 5: Sidebar, Notifications & Empty-State Polish

**What was asked to do:** Ship Stage 5 of `claude/plan-v1.md`: zero-bot sidebar empty-state, account settings reachable without a bot, clickable sidebar profile, a docs link by the bell, the embed-share URL, a lead-capture email opt-in, and a dismissible ToS-change banner. One batch; account settings via a new bot-independent route.

**What I did:**

- **Schema:** `users.notify_leads_email` (boolean, default false) + `users.last_legal_ack_date` (timestamp, nullable). `LEGAL_EFFECTIVE_AT` (parsed Date) added to `legal.ts`.
- **Sidebar empty-state (item 1/3/5):** `Sidebar` hides Workspace (Dashboard/Conversations/Leads) + Embed & share when `bots.length === 0`, relabels Bot Factory → "Create bot", and always shows Settings (→ `/dashboard/bots/[id]/settings` with a bot, else `/dashboard/settings`). The `SidebarAccountFooter` profile row is now a `<Link>` to that settings href. `EMBED_GUIDE_URL` → `https://docs.pro-bot.dev/embed-share`.
- **Topbar docs link (item 4):** a "?" icon link to `https://docs.pro-bot.dev` beside the notification bell.
- **Account settings without a bot (item 2):** new `/dashboard/settings` page reusing AccountTab / SecurityTab / AIModelKeyTab. `SettingsTabs` gained an optional `tabs` subset prop; `AIModelKeyTab` `botId` is now `string | null` - the provider/model switcher (user-level) always renders, the per-bot managed-key + audit sections hide when there's no bot.
- **Lead-capture email opt-in (item 6):** new `GET/PATCH /api/users/me/notification-prefs`; the lead-email pref is folded into the existing `GET /api/notifications` response (single fetch) and toggled from a row in `NotificationDropdown`. New `leadCapturedEmail` template + `sendLeadCapturedEmail`; the public leads route best-effort emails the owner after a lead is saved if they opted in (never fails the response). Per-item mark-read + "mark all read" already existed.
- **ToS banner (item 7):** new `LegalBanner` (dismissible) rendered by the dashboard layout when `LEGAL_EFFECTIVE_AT` is newer than the user's `last_legal_ack_date` (or null); dismiss POSTs `/api/users/me/legal-ack` (sets the date to now).

**Files changed:**

- `src/lib/db/schema.ts`, `src/lib/marketing/legal.ts` - update - columns + effective-date.
- `src/components/dashboard/Sidebar.tsx` (+ new `Sidebar.test.tsx`), `SidebarAccountFooter.tsx` (+ test), `Topbar.tsx` - update - empty-state, profile link, docs link, embed URL.
- `src/app/(dashboard)/dashboard/settings/page.tsx` - create - account settings route.
- `src/components/dashboard/settings/SettingsTabs.tsx`, `AIModelKeyTab.tsx` - update - tab subset + optional botId.
- `src/app/api/users/me/notification-prefs/route.ts` - create (+ test).
- `src/components/dashboard/NotificationDropdown.tsx` - update - email-leads toggle (pref read from notifications response).
- `src/app/api/notifications/route.ts` (+ test) - update - include `notifyLeadsEmail`.
- `src/lib/auth/email-templates.ts`, `src/lib/auth/email.ts` - update - lead-captured template + send.
- `src/app/api/bots/[botId]/leads/route.ts` (+ test) - update - best-effort owner email.
- `src/components/dashboard/LegalBanner.tsx` - create (+ test); `src/app/api/users/me/legal-ack/route.ts` - create (+ test); `src/app/(dashboard)/layout.tsx` - update - render banner.

**Decisions made:**

- **Lead-email pref folded into `GET /api/notifications`** instead of a second mount fetch, so the dropdown makes one request and the existing dropdown tests' call-ordering isn't disturbed.
- **New `/dashboard/settings` route** (user's choice) over making the bot-settings page bot-optional: the bot page keeps its botId-keyed URL/state; the account route reuses the same tab components with `tabs={["account","security","model"]}`.
- **Owner email is best-effort** (try/catch, after the transaction) so a Resend hiccup never fails the public, anonymous lead-capture call. `appBaseUrl()` (from the image-upload helper) builds the absolute dashboard URL.
- **ToS banner decision lives server-side** in the layout (date comparison) so the client component only handles dismissal; the `Date` parse of `LEGAL_EFFECTIVE_DATE` is centralised as `LEGAL_EFFECTIVE_AT`.

**Open questions / follow-ups:**

- **`npx drizzle-kit push` required** for `notify_leads_email` + `last_legal_ack_date` (and the still-pending `user_avatars`/`bot_avatars`/`bots.image`). Until then the prefs/legal-ack/leads-email paths error on the missing columns.
- typecheck + check:key-leaks pass (300 files); vitest unexecuted in-sandbox - run `npm test` + `npm run build` natively.
- `appBaseUrl` living in `src/lib/uploads/image-upload.ts` is now used by the leads route too; if a third caller appears it's worth moving to a neutral `src/lib/server/` module.

---

### 2026-06-22 04:00 - Bot Factory fixes: theme-driven chat, live preview, red PDF delete

**What was asked to do:** Four Bot Factory bugs - (1) suggested questions not visible while creating a bot, (2) PDF delete button should be red, (3) the theme color should actually re-skin the chatbot, (4) the live preview should update as the user changes theme color / suggested questions.

**What I did:**

- **Theme color now drives the real chat (item 3).** The public chat page (`/u/[username]/chat`) didn't pass `themeColor` and `ChatWindow` hardcoded the brand. Now: the page selects `bot.themeColor` and passes it; `ChatWindow` sets a `--bot-accent` CSS variable on its root; the header avatar, send button, the user's message bubbles, and the reply avatar (`MessageBubble`) all read `var(--bot-accent, #0070dd)`. The embeddable widget already themed via `themeColor` (Stage 4), so the two surfaces are now consistent.
- **Live preview reflects theme + questions (items 1, 4).** `LivePreview` in `BotFactoryForm` previously themed nothing and showed only the first suggested question as a bubble. Now the avatar + a send-accent swatch use `form.themeColor`, and all suggested questions render as themed chips - all reactive to `form`, so the preview updates live.
- **Red PDF delete (item 2).** The Step 2 file-list trash button is now `text-red-600` (was muted with a red hover).

**Files changed:**

- `src/components/bot-factory/BotFactoryForm.tsx` - update - LivePreview (themeColor + all suggested questions as chips), red trash button.
- `src/app/u/[username]/chat/page.tsx` - update - select + pass `themeColor` (ResolvedBot gains `themeColor`).
- `src/components/chat/ChatWindow.tsx` - update - `themeColor` prop → `--bot-accent` CSS var; send button + header avatar themed.
- `src/components/chat/MessageBubble.tsx` - update - user bubble + reply avatar use `var(--bot-accent)`.

**Decisions made:**

- **CSS variable (`--bot-accent`) over prop-drilling.** Setting it once on the `ChatWindow` root lets `MessageBubble` (a child) pick up the accent without threading `themeColor` through every bubble; `var(--bot-accent, #0070dd)` keeps a brand fallback if a bubble ever renders outside a themed root.

**Open questions / follow-ups:**

- The suggested-question chips in the *real* chat (`SuggestedQuestions`) still use the brand hover accent, not the bot theme - minor; left untouched to keep the change focused on the primary accent surfaces.
- typecheck + check:key-leaks pass (300 files); run `npm test` natively (no existing tests asserted the old brand classes).

---

### 2026-06-22 04:20 - Chat bot avatar: uploaded image or ProBot icon (not initials/"AI")

**What was asked to do:** The chat header showed placeholder initials and assistant replies showed an "AI" text avatar. Both should show the bot's uploaded picture, or the ProBot icon as the default.

**What I did:**

- New shared `src/components/chat/BotAvatarIcon.tsx`: renders the uploaded image when set, else the ProBot mark (two dots) on a circle tinted with `--bot-accent`. Sized via a `sizeClass` prop.
- `ChatWindow` header uses it (`size-12`) - removed the initials fallback/computation - and passes `botImage` into both `MessageBubble` renders (intro + each message).
- `MessageBubble` accepts an optional `botImage` and its reply avatar uses `BotAvatarIcon` (`size-8`) instead of the old "AI" text `BotAvatar` (removed).

**Files changed:**

- `src/components/chat/BotAvatarIcon.tsx` - create - shared image/ProBot-icon avatar.
- `src/components/chat/ChatWindow.tsx` - update - header + thread `botImage` to MessageBubble.
- `src/components/chat/MessageBubble.tsx` - update - reply avatar via BotAvatarIcon; optional `botImage` prop.

**Decisions made:**

- **Default is the ProBot icon, not initials/"AI".** The bot is an entity with its own identity; the two-dot ProBot mark (themed via `--bot-accent`) matches the wizard's default bot picture and the widget. `MessageBubble`'s `botImage` is optional so the dashboard transcript view keeps working (shows the ProBot default there).

**Open questions / follow-ups:**

- typecheck + check:key-leaks pass (301 files). The uploaded bot image only renders after `npx drizzle-kit push` creates `bot_avatars`/`bots.image` and a picture is uploaded; otherwise the ProBot icon shows.

---

### 2026-06-22 - Stage 6: Marketing & Trust Pages

**What was asked to do:** Ship Stage 6 of `plan-v1.md` in one batch - a "Why ProBot" comparison page, a "Hire me" page, a "Roadmap" page, a landing-page demo-video modal, header/footer link updates, and a sitemap. Decisions: roadmap from a hand-maintained data array (not parsed from `plan-v1.md`), demo video as a placeholder for now (env-driven URL with a "coming soon" poster), docs links repointed to `pro-bot.dev/docs`.

**What I did:**

- **`/why-pro-bot`** - server component with a `ROWS: Row[]` comparison (ProBot vs a generic closed platform). Each row is a property a job-seeker cares about (BYO key, free, MIT, self-hostable, keys-never-logged, GDPR export/delete, no telemetry, embeddable). `<Mark on>` renders an emerald check or a rose X. No named competitors; a footnote keeps it defensible. CTAs to `/dashboard/bots/new` and `/about`.
- **`/hire-me`** - creator bio for Vishal Patil: Spec-Driven Development framing, a skills chip list, an amber "Featured by CNBC" callout for the earlier VAi project, and mailto/portfolio/GitHub/LinkedIn buttons. `CNBC_ARTICLE_URL` is a `"#"` sentinel - while unset the mention renders as plain text ("Ask me for the details.") so we never ship a broken link. Links to `/roadmap`.
- **`/roadmap`** - a hand-maintained `STAGES: Stage[]` array (1-5 shipped, 6 in-progress at author time, 7-9 planned) with `STATUS_META` badge styles and a "Suggest a feature" CTA to GitHub Discussions. Deliberately decoupled from `plan-v1.md`'s markdown so the public page never breaks when the internal planning doc's format changes.
- **Demo video modal** - new client component `DemoVideoModal.tsx`: a "Watch demo" button opens a borderless overlay (`fixed inset-0`, backdrop + Esc + × to close, no navigation so scroll position is preserved). `VIDEO_URL = process.env.NEXT_PUBLIC_DEMO_VIDEO_URL ?? ""`; when set it renders a YouTube-style iframe, otherwise a "Demo coming soon" poster with a "See a live bot" CTA. Rendered in the landing-page hero button row.
- **Header/footer + sitemap** - `SiteHeader` gains "Why ProBot" + "Roadmap" nav links (desktop + mobile); `SiteFooter` gains "Why ProBot"/"Roadmap" (Product) and "Hire me" (Company) links. All three docs constants (`SiteHeader`, `SiteFooter`, `page.tsx`) repointed from `pro-bot-ai.vercel.app/docs` to `pro-bot.dev/docs` (changelog → `pro-bot.dev/docs/changelog`). New `src/app/sitemap.ts` lists the public marketing routes using the existing `NEXTAUTH_URL → APP_URL → localhost` base-URL convention.

**Files changed:**

- `src/app/(marketing)/why-pro-bot/page.tsx` - create - comparison page.
- `src/app/(marketing)/hire-me/page.tsx` - create - creator bio page.
- `src/app/(marketing)/roadmap/page.tsx` - create - roadmap page (maintained stage array).
- `src/components/marketing/DemoVideoModal.tsx` - create - "Watch demo" button + borderless video modal.
- `src/components/marketing/DemoVideoModal.test.tsx` - create - open/close + poster behavior (poster path, env unset).
- `src/app/page.tsx` - update - import + render `<DemoVideoModal />` in the hero; docs URL → `pro-bot.dev/docs`.
- `src/components/marketing/SiteHeader.tsx` - update - Why ProBot + Roadmap nav (desktop + mobile); docs URL → `pro-bot.dev/docs`.
- `src/components/marketing/SiteFooter.tsx` - update - Why ProBot/Roadmap/Hire me links; docs + changelog URLs → `pro-bot.dev/docs`.
- `src/app/sitemap.ts` - create - static sitemap of public marketing routes.
- `.env.example` - update - document optional `NEXT_PUBLIC_DEMO_VIDEO_URL`.
- `claude/plan-v1.md` - update - tick Stage 6 in the matrix.
- `docs/changelog.mdx` - update - add the Stage 6 subsection under Version 1.0.

**Decisions made:**

- **Roadmap from a maintained array, not parsed from `plan-v1.md`.** Coupling a public marketing page to an internal doc's markdown format is brittle; a small typed array is honest enough and updated by hand when a stage ships.
- **Demo video is a placeholder, env-gated.** `NEXT_PUBLIC_DEMO_VIDEO_URL` is build-time/public; until it's set the modal shows a "coming soon" poster instead of a broken embed, so the button ships now without waiting on the video.
- **`CNBC_ARTICLE_URL = "#"` sentinel** renders the CNBC mention as plain text rather than a placeholder link, avoiding a broken/`href="#"` link in production.

**Open questions / follow-ups:**

- No schema changes this stage - no `drizzle-kit push` needed.
- typecheck + check:key-leaks pass. Run vitest natively for `DemoVideoModal.test.tsx` (sandbox can't run vitest). The iframe branch isn't covered by the test (env is read at module load); the poster branch is.
- When the demo video is published, set `NEXT_PUBLIC_DEMO_VIDEO_URL` (e.g. a YouTube embed URL); when the CNBC article URL is available, set `CNBC_ARTICLE_URL` in `hire-me/page.tsx`.

---

### 2026-06-22 - Stage 7: SEO, Docs & Discoverability

**What was asked to do:** Ship Stage 7 of `plan-v1.md` in one batch - best-in-class SEO (metadata, OG/Twitter, JSON-LD, robots, sitemap, OG images), Mintlify docs reorganization for SaaS with new pages, architecture diagrams, and ADRs. Decisions: native Next routes for sitemap/robots over `next-sitemap` (zero-dep, equal SEO), dynamic OG images via `next/og`, everything in one batch.

**What I did:**

- **Shared SEO module (`src/lib/seo/`).** `site.ts` exposes `siteUrl()` (same `NEXTAUTH_URL → APP_URL → localhost` convention as the auth links), the canonical `SITE_NAME/SITE_TITLE/SITE_DESCRIPTION`, and `buildMetadata({title, description, path, index})` which emits a bare title (the root template appends "· ProBot"), a canonical URL, and OG/Twitter blocks - intentionally omitting images so the root image routes apply site-wide. `structured-data.ts` builds `Organization` + `SoftwareApplication` JSON-LD. `og.tsx` renders a shared 1200x630 `next/og` `ImageResponse` (system fonts, zero deps).
- **Root metadata.** `layout.tsx` now sets `metadataBase`, a `title` template (`%s · ProBot`), the corrected default title ("AI Assistant", not the stale "AI Digital Recruiter"), and default `openGraph`/`twitter`/`robots`.
- **Image + crawl routes.** `src/app/opengraph-image.tsx` and `twitter-image.tsx` both call `renderOgImage()`; `src/app/robots.ts` allows public pages, disallows `/dashboard`,`/api`,`/login`,`/register`,`/reset-password`,`/onboarding`, and points at `${siteUrl()}/sitemap.xml`; `sitemap.ts` refactored onto the shared `siteUrl()`.
- **Per-page metadata.** The 7 marketing pages (`why-pro-bot`, `hire-me`, `roadmap`, `about`, `self-hosting`, `privacy`, `terms`) now route their `metadata` through `buildMetadata` (bare titles + canonical + OG/Twitter).
- **Landing JSON-LD.** `page.tsx` renders the two structured-data `<script type="application/ld+json">` blocks.
- **Mintlify docs reorg.** `docs.json` regrouped into Get started / Concepts / Guides / Self-hosting / Decisions / Release notes. New pages: `concepts/managed-vs-self-hosted.mdx`, `guides/custom-instructions.mdx`, `guides/managed-key-storage.mdx`, `guides/account-deletion.mdx`, top-level `embed-share.mdx` (matches the dashboard Sidebar's `/embed-share` link). `concepts/stages.mdx` rewritten from the false "Beta stages planned" narrative into a current "Build status & roadmap" page; `guides/embed-widget.mdx`'s stale "planned" banner corrected to shipped.
- **Architecture diagrams + ADRs.** `concepts/architecture.mdx` gains Mermaid diagrams (managed-vs-self-hosted key flow, envelope encryption, deletion lifecycle). New `docs/decisions/`: `overview.mdx` + `0001-hybrid-key-model`, `0002-deletion-grace-window`, `0003-circuit-breaker-store`, each sourced from the actual code (`crypto/envelope.ts`, `account/delete.ts`, `ai/circuit-breaker.ts`) and `learnings.md`.

**Files changed:**

- `src/lib/seo/site.ts`, `src/lib/seo/structured-data.ts`, `src/lib/seo/og.tsx` - create.
- `src/app/opengraph-image.tsx`, `src/app/twitter-image.tsx`, `src/app/robots.ts` - create.
- `src/app/sitemap.ts` - update - use shared `siteUrl()`.
- `src/app/layout.tsx` - update - metadataBase/title template/OG/twitter/robots; Recruiter→Assistant.
- `src/app/page.tsx` - update - JSON-LD scripts.
- `src/app/(marketing)/{why-pro-bot,hire-me,roadmap,about,self-hosting,privacy,terms}/page.tsx` - update - `buildMetadata`.
- `docs/docs.json` - update - nav reorg + new pages.
- `docs/concepts/managed-vs-self-hosted.mdx`, `docs/guides/custom-instructions.mdx`, `docs/guides/managed-key-storage.mdx`, `docs/guides/account-deletion.mdx`, `docs/embed-share.mdx` - create.
- `docs/concepts/stages.mdx` - update - rewritten to current state.
- `docs/guides/embed-widget.mdx` - update - corrected stale "planned" banner + real widget src.
- `docs/concepts/architecture.mdx` - update - 3 Mermaid diagrams.
- `docs/decisions/overview.mdx`, `0001-hybrid-key-model.mdx`, `0002-deletion-grace-window.mdx`, `0003-circuit-breaker-store.mdx` - create.
- `claude/plan-v1.md`, `docs/changelog.mdx`, `claude/context.md` - update - close-out.

**Decisions made:**

- **Native Next sitemap/robots over `next-sitemap`.** The native metadata routes already regenerate per build and give identical SEO output; adding the package would be a dependency + postbuild step for no benefit, against the zero-cost/no-needless-dep policy.
- **Centralised metadata via `buildMetadata` + root-layout defaults.** Page OG/Twitter inherit the root defaults and the file-based OG image routes apply site-wide; pages only declare their title/description/path. Keeps one source of truth for the SEO surface.
- **Dynamic OG images (`next/og`) over static assets.** Zero binary assets to maintain; one shared render feeds both the OG and Twitter routes.
- **Decoupled docs roadmap from the false Beta narrative** and sourced ADRs from the real implementation files so the docs are truthful about the shipped product (account deletion, envelope encryption, OAuth, custom instructions all verified present in code).

**Open questions / follow-ups:**

- No schema changes - no `drizzle-kit push`.
- typecheck + check:key-leaks pass (313 files); `docs.json` validates and all 23 nav pages resolve. Run `next build` natively to confirm the `next/og` image routes compile, plus vitest + a Lighthouse SEO pass on the landing + marketing pages (acceptance: 95+).
- Two embed docs links remain intentionally distinct: the dashboard Sidebar → `/embed-share` (new page) and the dashboard card → `/guides/embed-widget`; both now resolve. Unify later if desired.

---

### 2026-06-22 - Stage 8 (partial): shared-state scaling, alert seam, export perf

**What was asked to do:** Ship the in-repo, code-only slices of Stage 8 in one batch: shared-state backing for the rate limiter + circuit breaker, a `circuit_open` alerting seam, and the NFR-P07 query-perf item. Decisions: use the official `@upstash/redis` package (added to package.json; install is native), logger-event alerting with a Sentry-ready seam. Out of scope (operational/native or not selected): the perf-measurement NFRs, k6, live Sentry, and the smaller Beta-Stage-7 hardening items.

**What I did:**

- **Pluggable shared-state store.** New `src/lib/store/redis.ts` is the single import site for `@upstash/redis`; it exposes a narrow `RedisLike` interface (`eval`, `del`) and a memoized `getRedisClient()` that returns `null` when `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` are unset. Everything else depends on `RedisLike`, so the logic is unit-testable with a fake and the package is isolated.
- **Rate limiter (`src/lib/ai/rate-limit.ts`).** Extracted a `RateLimitStore` interface; `MemoryRateLimitStore` preserves the exact prior sliding-window behavior; `RedisRateLimitStore` does an atomic sliding window with a sorted set via a Lua `eval` (ZREMRANGEBYSCORE + ZCARD + conditional ZADD + PEXPIRE), with `rollback` (ZREM) for the per-day-rejection case. `checkRateLimit` is now **async** and selects the store by whether Redis is configured. All existing exports (`PER_MINUTE`/`PER_DAY`, `resolveLimits`, `resolveMaxChars`, `__resetRateLimitState`) preserved.
- **Circuit breaker (`src/lib/ai/circuit-breaker.ts`).** Extracted a `BreakerStore` (`load`/`save`/`reset`); `MemoryBreakerStore` (Map, returns the live entry reference so half-open in-flight is visible within a process); `RedisBreakerStore` (entry as a JSON blob with TTL via GET/SET `eval`). `getCircuitState` + `__resetCircuit` are now async. Added an `onOpen` option fired once on the closed/half-open→open transition.
- **Alert seam.** New `src/lib/server/alert.ts`: `emitOperationalAlert` + `alertCircuitOpen(provider)`, default sink is a `console.warn` through `redactSensitive` (no key leakage), swappable via `setAlertSink` for a future Sentry transport. The chat route passes `onOpen: alertCircuitOpen` into `callWithBreaker`.
- **Export perf.** `src/lib/account/export.ts` now buckets child rows by bot once via a shared `groupBy` helper (exported for testing) + a `conversationToBot` map, replacing the O(bots × rows) join that also re-scanned all conversations per message.

**Files changed:**

- `src/lib/store/redis.ts` - create - Upstash client + `RedisLike` + `getRedisClient`.
- `src/lib/ai/rate-limit.ts` - update - store abstraction + Redis sliding window; async `checkRateLimit`.
- `src/lib/ai/circuit-breaker.ts` - update - store abstraction + Redis; async state reads; `onOpen` hook.
- `src/lib/server/alert.ts` - create - operational alert seam.
- `src/app/api/chat/[botId]/route.ts` - update - `await checkRateLimit`; `onOpen: alertCircuitOpen`; import.
- `src/lib/account/export.ts` - update - O(n) grouping + exported `groupBy`.
- `package.json` - update - add `@upstash/redis`.
- `.env.example` - update - document the two optional Upstash vars + free-tier note.
- Tests: `src/lib/ai/rate-limit.test.ts` + `src/lib/ai/circuit-breaker.test.ts` (update - async + fake-`RedisLike` cases + `onOpen`), `src/lib/store/redis.test.ts` + `src/lib/server/alert.test.ts` + `src/lib/account/export.test.ts` (create). `src/app/api/chat/[botId]/route.test.ts` intentionally unchanged (its `mockReturnValue` works under `await`).
- `claude/plan-v1.md`, `docs/changelog.mdx`, `claude/context.md` - update - close-out (Stage 8 marked 🟡 partial).

**Decisions made:**

- **Default behavior is byte-for-byte unchanged.** Redis is strictly opt-in; with the env vars unset the in-memory stores run exactly as before, keeping the default deployment zero-config and zero-cost.
- **Isolate `@upstash/redis` behind `RedisLike`.** One import site, an interface everywhere else - keeps the package out of the hot-path logic's type surface and makes both stores testable with a fake (the sandbox can't install the package or run vitest).
- **`@upstash/redis` over a dependency-free fetch client** (user's choice). Trade-off accepted: in-sandbox typecheck flags only `store/redis.ts` until `npm install`; native verification thereafter.
- **N+1→CTE reframed.** The dashboard analytics (`src/lib/analytics/queries.ts`) and `buildExportBundle` were already batched (aggregate `count(*)` + `inArray`), so there was no real N+1. The honest, measurable win was the export's O(n²) in-memory join → O(n).
- **Breaker over Redis adds ~2 round-trips per chat call** (load + save) when enabled - documented trade-off of cross-instance correctness vs hot-path latency; the in-memory default is unaffected.

**Open questions / follow-ups:**

- No schema changes - no `drizzle-kit push`. **Run `npm install`** natively for `@upstash/redis`, then `npm run typecheck` (fully green) + `npm test` (the new/updated suites).
- Operational/native acceptance remains: SRS §6.1 perf NFRs measured in production, k6 load test across two warm instances, and a live Sentry breadcrumb within 10s of `circuit_open` (drop a Sentry transport into `setAlertSink`).
- Deferred Beta-Stage-7 hardening items (resend-deletion-email, delete revokes other sessions, dashboard breaker indicator, provider-mismatch prompt, ClamAV sidecar) were not in this batch's selected scope.

---

### 2026-06-22 - Stage 8 (perf addendum): kill the Material Symbols icon font

**What was asked to do:** Act on the uploaded mobile + desktop Lighthouse reports to maximize performance across the website, the chatbot, the embed widget, and the package.

**Diagnosis (from the reports):** Landing scored 97 (mobile) / 98 (desktop). The dominant issue on both was the **Material Symbols Outlined icon font**: the root layout loaded it via a render-blocking `fonts.googleapis.com` stylesheet that pulled a **~3.86 MB** variable font from `fonts.gstatic.com` - ~94% of the 4,093 KiB page weight, the 770ms mobile render-block, the long critical chain, and the desktop CLS (0.089 font-swap). It backed only ~20 distinct glyphs used on 5 marketing files; the chat page + dashboard didn't use it yet still paid the render-blocking `<link>`. Secondary: an 11 KiB legacy-JS polyfill chunk (no browserslist). The `.ant-message` "unused CSS" and the 1,755 KiB "unused JS" were all `chrome-extension://` noise (Lighthouse even warned extensions skewed the mobile run), not our code. The embed widget was already lean (8 KB, es2017, no Google Fonts) and the body fonts already self-hosted via `next/font` with swap.

**What I did:**

- **Replaced the icon font with inline SVGs.** New `src/components/ui/Icon.tsx` provides an `Icon` component (+ `IconName` union) with inline SVGs for the 20 glyphs actually used. Icons render at `width/height: 1em` with `stroke="currentColor"`, so the existing font-size utility classes (`!text-lg` etc.) and text color keep controlling them exactly as the font glyphs did.
- **Swapped all usages + de-duplicated.** Replaced every `MaterialIcon`/`material-symbols-outlined` usage across `src/app/page.tsx`, `src/app/(marketing)/about/page.tsx`, `src/components/marketing/SiteHeader.tsx`, `SiteFooter.tsx`, `DemoVideoModal.tsx`, and deleted the **4 duplicated** local `MaterialIcon` definitions. Data-array icon fields were typed to `IconName`.
- **Removed the render-blocking `<link>`** (and the now-empty `<head>`) from `src/app/layout.tsx`. This drops the 3.86 MB font, the `fonts.googleapis.com`/`fonts.gstatic.com` origins, the long critical chain, and the font-swap CLS - on **every** route, so the chatbot and dashboard benefit too (they no longer fetch the icon stylesheet at all).
- **browserslist** added to `package.json` (chrome/edge/firefox ≥109, safari/ios ≥16) so Next stops emitting the `Array.prototype.at/flat`, `Object.fromEntries/hasOwn`, `String.trim*` polyfills (~11 KiB), shrinking the shared JS across every surface. Trade-off: drops transpilation for pre-2023 browsers.

**Files changed:**

- `src/components/ui/Icon.tsx` - create - inline-SVG icon set.
- `src/components/ui/Icon.test.tsx` - create - renders svg, em/currentColor, class passthrough.
- `src/app/page.tsx`, `src/app/(marketing)/about/page.tsx`, `src/components/marketing/SiteHeader.tsx`, `src/components/marketing/SiteFooter.tsx`, `src/components/marketing/DemoVideoModal.tsx` - update - `Icon` swaps + removed local `MaterialIcon` defs.
- `src/app/layout.tsx` - update - removed the Material Symbols `<link>` + empty `<head>`.
- `package.json` - update - add `browserslist`.
- `claude/context.md`, `docs/changelog.mdx` - update - close-out.

**Decisions made:**

- **Inline SVGs over subsetting the font.** Subsetting (`&icon_names=` + `&display=swap` + preconnect) would have shrunk the font, but inlining removes the external stylesheet, both font origins, and the render-block entirely - a strictly better outcome for ~20 icons, and it de-duplicates the 4 `MaterialIcon` copies into one component. Minor aesthetic shift: the icons are now stroke-based rather than the filled Material glyphs.
- **`1em` + `currentColor` sizing** so no call sites needed sizing/color changes - the existing utility classes still apply.
- **Did not chase the `.ant-message` CSS or the 1.7 MB "unused JS"** - both are browser-extension artifacts, not first-party.

**Open questions / follow-ups:**

- typecheck + key-leak green; run Lighthouse natively to confirm - expect LCP, render-blocking time, and total payload to drop sharply and CLS toward 0 on the landing AND the chat page.
- If broad legacy-browser support is later required, relax/remove the `browserslist` entry (costs back the ~11 KiB polyfills).
- The hero's decorative SVG orb animation (`il-wire`/`il-ring`, stroke-dashoffset) is flagged non-composited; left as-is (minor, decorative).

---

### 2026-06-22 - Stage 9: Self-hosted bot architecture (in-repo portions)

**What was asked to do:** Ship the v1.0 capstone - the self-hosted bot runtime architecture - end to end ("everything"): the locked design, the platform-side token auth + versioned API, the dashboard UI, the `probot-bot` runtime scaffold, and the docs. Auth = API token per bot (recommended). Runtime repo = scaffold a `probot-bot/` folder.

**Design (ADR `docs/decisions/0004-self-hosted-bot.mdx`):** a self-hosted runtime authenticates with a per-bot token (`pbt_<hex>`, shown once, stored SHA-256-hashed, soft-delete revoke) over a versioned `/api/v1/bot/*` surface (4 endpoints). The LLM call stays on the runtime's infra (platform is not in the chat critical path); a leaked token = read-only knowledge for one bot + conversation/lead writes for it, no cross-tenant exposure. Rejected OAuth refresh tokens (v1.1) and mTLS (overkill).

**What I did:**

- **Schema** (`src/lib/db/schema.ts`): new `bot_tokens` table (botId FK, unique `token_hash`, name, `last_seen_at`, `revoked_at`, createdAt) + `bots.deployment_mode` (`managed`|`self_hosted`, default managed). `db/index.ts` re-exports via `export *` (no edit needed).
- **Token service** (`src/lib/bot-tokens/service.ts`): `mintBotToken` (returns raw once), `authenticateBotToken` (header regex before DB, hashed lookup, revoked-check, `last_seen` bump), `listBotTokens`, `revokeBotToken`, and a `requireBotToken` route guard mirroring `requireBotOwner`. Reuses `generateRawToken`/`hashToken`.
- **Versioned API** (`src/app/api/v1/bot/{config,knowledge,conversations,leads}/route.ts`): all bot-token-authed. `knowledge` reuses `retrieveRelevant` + the managed full-context fallback + `checkRateLimit`; `conversations` reuses the chat route's `(bot,session)` upsert; `leads` reuses a new shared `src/lib/leads/capture.ts` (`captureLead` - lead + recruiter-email + notification in one tx, idempotent on (bot,conversation,email)).
- **Dashboard API** (`src/app/api/bots/[botId]/{tokens,tokens/[tokenId],deployment}/route.ts`): `requireBotOwner`-gated mint (show-once) / list / revoke / mode toggle.
- **Dashboard UI**: new `DeployTab` (`src/components/dashboard/settings/DeployTab.tsx`) - mode cards, mint show-once modal, list/revoke; loads tokens client-side via `useEffect` so the inactive panel never mounts in the existing settings tests. Added the `deploy` tab to `SettingsTabs` + rendered the panel in the bot settings page (with `deployment_mode` added to its column select).
- **`probot-bot/` scaffold**: minimal Next runtime (README, package.json, .env.example, next.config, tsconfig, `lib/platform.ts` typed client, `app/api/chat/route.ts` orchestrator, `app/page.tsx` + `layout.tsx`). Added `probot-bot` to the root `tsconfig.json` `exclude` so it doesn't break the platform typecheck.
- **Docs**: ADR 0004 (+ row in `decisions/overview.mdx`), `docs/self-hosted-bot/{index,quickstart,api-reference}.mdx`, and `docs.json` nav (Self-hosting + Decisions groups).
- **Tests** (authored, native): `bot-tokens/service.test.ts`, `api/v1/bot/config/route.test.ts`, `api/v1/bot/leads/route.test.ts`, `DeployTab.test.tsx`.

**Decisions made:**

- **Per-bot API token over OAuth** (user's pick + ADR): simplest model that meets the threat bar; revoke = flag the row, checked on every call.
- **`captureLead` extracted** so the v1 leads endpoint and (future) managed route share one lead-capture core instead of duplicating the transaction. The managed route is left calling its inline version for now (bounded blast radius); folding it in is a follow-up.
- **DeployTab fetches tokens client-side**, not via the server page, specifically so the existing settings-page test's `@/lib/db` mock (which has no `botTokens`) keeps passing and inactive panels stay un-mounted.
- **Scaffold excluded from typecheck** (separate project with its own deps/config); it's a template to extract into its own repo.

**Open questions / follow-ups:**

- **Run `npx drizzle-kit push`** natively to create `bot_tokens` + `bots.deployment_mode`, then `npm test` for the new suites.
- Extract `probot-bot/` into its own repository and deploy it to exercise the end-to-end acceptance (mint → deploy → see conversations/leads in the dashboard → revoke).
- The `/api/v1/bot/*` contract is now pinned - breaking changes must ship as `/api/v2` with a deprecation window.
- Optional: refactor the managed `POST /api/bots/[botId]/leads` to call the shared `captureLead`, and add a session-revoke-on-delete (deferred Beta-Stage-7 item) - both out of this batch's scope.

---

### 2026-06-23 - Post-v1.0 polish (large cross-cutting batch, ~17 items)

**What was asked to do:** A single large request bundling lead-form expansion, save-as-preset, live dashboard deltas, status auto-save, restore-by-username-or-email, dashboard/sidebar UX fixes, live-bot header cleanup, brand icons, roadmap removal from the app, docs-URL consistency, a full docs overhaul + blogs, and plan-v2 additions. User chose "one giant batch"; preset storage = DB; lead form = name/email/company required + LinkedIn optional; docs = full content.

**What I did (by area):**

- **Lead capture form + schema** (native push): added `leads.name/company/linkedin_url`; `leadCaptureInput` now requires name+email+company, optional `linkedinUrl`; `captureLead` + both lead endpoints (`/api/bots/[botId]/leads`, `/api/v1/bot/leads`) thread the fields; `LeadCaptureCard` is a 4-field form; `listLeads`/`listAllLeadsForExport` + the leads dashboard page + CSV export show them. (No recruiter IP is or was ever captured.)
- **Save-as-preset** (native push): new `bot_presets` table + `src/lib/bot-presets/service.ts` + `POST/GET /api/bot-presets`; a "Save bot settings" section below the BotConfigTab danger zone snapshots the config (no secrets).
- **Live dashboard %**: `getAnalyticsForUser` adds week-over-week (conversations, messages) + month-over-month (leads) counts + a `formatGrowth` helper; the dashboard tiles render real, sign-coloured deltas; `MetricTile` colours +/- (green/rose), no longer faded.
- **Status auto-save**: the Bot-status toggle PATCHes immediately (own handler + `activeBaseline` so the main Save's dirty diff stays correct); publish updates the baseline too.
- **Restore by username OR email**: `undoAccountDeletion` matches either snapshot; route accepts `identifier`; `UndoDeletionForm` relabelled.
- **Dashboard/sidebar**: Topbar Docs is now a labelled button (book icon) between live-bot and the bell; sidebar "Manage Model & Key" → `?tab=model` (new `modelHref` threaded through `ModelStatusCard`/`SidebarAccountFooter`); `BotSwitcher` always opens and shows a coming-soon "Create New Bot".
- **Live bot header**: removed the owner `OwnerCard` heading from `/u/[username]/chat` - the public chat shows only bot details.
- **Security copy**: conversation-retention text rewritten to match reality (kept until bot/account deletion; no time-based purge).
- **Brand icons**: added `github`/`linkedin`/`portfolio` to `Icon.tsx` (filled marks) and used them in accent on hire-me + about.
- **Roadmap removed from app**: deleted `(marketing)/roadmap`, removed header/sitemap/hire-me links; roadmap now lives only in docs.
- **Docs-URL consistency**: `docs.pro-bot.dev` → `pro-bot.dev/docs` across app + docs (planning docs left as historical).
- **Docs overhaul (full content)**: ~25 new pages (Get started/Guides/Models & keys/Hosting/Trust/Product/Help/Legal + Release-notes Beta/v1/Roadmap/v2 + Blog), removed `concepts/architecture` + `concepts/stages`, restructured `docs.json` into Documentation/Release notes/Blog/API tabs (50 nav pages, all resolve), refreshed `build-your-bot` + fixed stale internal links.
- **plan-v2**: added dynamic "thinking" messages + fleshed out multibot management (bot switcher + create-from-preset).

**Decisions made:**

- **DB preset over export/localStorage** (user pick): `bot_presets` is user-scoped JSON, ready for the future multibot "create from preset" flow.
- **Status auto-save via `activeBaseline`** so the toggle and the bulk Save don't double-PATCH or get stuck "dirty".
- **Brand marks render filled** inside the stroke-based `Icon` wrapper by setting `fill="currentColor" stroke="none"` on the path.
- **Docs legal pages summarise + link** to the canonical `pro-bot.dev/privacy` / `/terms` rather than duplicating long legal text.

**Open questions / follow-ups:**

- **Run `npx drizzle-kit push`** natively for the `leads` columns + `bot_presets`, then `npm test` + `npm run build`.
- Updated test fixtures for the runtime-assertion changes (lead form/schemas/routes, BotConfig status auto-save, `MetricTile` growth colour, sidebar/model props, docs-URL test refs); typecheck + key-leak green (335 files).
- Multibot "Create New Bot" is a coming-soon stub; real multi-bot creation + preset reuse is tracked in plan-v2.

---

### 2026-06-24 - OSS packaging, docs split, branch-protection guide, justify, stage-label cleanup

**What was asked to do:** Seven items: (1) a publishable npm package for the embed widget, (2) justify all paragraph text, (3) call out that ProBot is open source on site + docs, (4) slim the README + split into separate md files (quickstart/architecture/BYO-key/key-storage), remove roadmap, mention Spec-Driven Development, (5) detailed GitHub branch-protection steps for main/dev, (6) remove explicit "Stage N" mentions from website + docs (and, per the user, code comments too), (7) a video-tutorial script md for an AI video generator.

**What I did:**

- **npm package** - `packages/probot-chatbot/` (`package.json` named `probot-chatbot`, unscoped, `unpkg`/`jsdelivr` fields; `build.mjs` that esbuild-bundles the existing `src/widget/widget.ts` + `widget.css` to `dist/probot-chatbot.js` so the package and the hosted `/widget.js` never drift; `README.md`). Added `packages` to the root `tsconfig.json` `exclude`. New root `PUBLISHING.md` with the full publish flow (name-availability check, scoped `@vishalpatil18/probot-chatbot` fallback, `npm publish`, unpkg URL, optional GitHub Action).
- **Justify everywhere** - one `@layer base` rule in `globals.css` (`p { text-align: justify; text-justify: inter-word }`). Tailwind utilities (`text-center`, etc.) sit in `@layer utilities` and override it, so components that set alignment keep it; only default-aligned prose is justified, and last lines / single-line paragraphs are visually unaffected.
- **Open source mention** - landing hero badge ("Free & open source"), `SiteFooter` tagline ("Free & open source (MIT)"), and an `<Info>` callout in `docs/introduction.mdx` with the GitHub link.
- **README + split docs** - rewrote `README.md` minimal (website/docs/GitHub links, Spec-Driven Development section, embed snippet, links to the split files; roadmap + stage-heavy Features + internal `claude/` links removed). New root `QUICKSTART.md`, `ARCHITECTURE.md`, `BYO-KEY.md`, `KEY-STORAGE.md` (extracted, stage refs dropped, `drizzle-kit push` instead of `db:migrate`).
- **Branch protection** - `GITHUB-BRANCH-PROTECTION.md` (Rulesets + classic, main = PR-only-for-all, dev = PR-for-others with the owner on the bypass list, CODEOWNERS-required approvals, verification steps) + `.github/CODEOWNERS` (`* @vishalpatil18`).
- **Stage-label cleanup** - reworded `docs/api-reference/bots-upsert.mdx`, `docs/release-notes/beta.mdx`, `docs/concepts/security.mdx`, and the ~9 "Stage N" source-code comments (config/chat routes, OwnerCard, DeployTab, leads/capture, bot-tokens/service, prompt-builder, schema ×2). `grep` confirms no `stage[ -][0-9]` remains in `src` or `docs`.
- **Video script** - `BOT-TUTORIAL-SCRIPT.md` (12 scenes with screenshot cues + narration + an asset checklist).
- Close-out: `CHANGELOG.md` entry + this Session History entry.

**Decisions made:**

- **Global base rule for justify** instead of editing dozens of `<p>` - honors "everywhere" with one change and is trivially reversible; relies on Tailwind's utility-over-base precedence so explicit alignments are preserved.
- **Unscoped `probot-chatbot`** (industry-standard clean install) with a documented scoped fallback when the name is taken; the package reuses the real widget source rather than duplicating it.
- **Branch protection is repo-admin config**, delivered as a precise guide + CODEOWNERS rather than code (can't be set from the repo).

**Open questions / follow-ups:**

- **Run the publish steps** in `PUBLISHING.md` (`npm login` → name check → `npm publish`) - I can't publish to npm from here.
- **Apply the branch-protection settings** on GitHub using the guide; commit `.github/CODEOWNERS` to `main` first so CODEOWNERS reviews take effect.
- typecheck + key-leak green (335 files; `packages` excluded from typecheck like `probot-bot`). The widget package builds natively via `npm run build` in its folder.

### 2026-06-24 - Self-host scoped to the chatbot, recruiter-IP copy removed, animated 404

**What was asked to do:** Four items: (1+2) self-hosting should mean self-hosting *only the chatbot*, not the whole ProBot website/platform - remove the whole-platform self-host story from docs and instructions; (3) stop mentioning "recruiter IP" in docs/instructions (it reads negatively even though IPs aren't kept); (4) a friendly, animated 404 page with a chatbot illustration, the message "Oops! The page you are looking for does not exist. Please check the URL or return to the homepage.", and a button back to the homepage.

**What I did:**

- **Self-hosting reframed to chatbot-only.** The codebase had conflated two stories - self-hosting the tiny `probot-bot` runtime (kept) and self-hosting the whole Next.js platform (removed). Deleted `docs/guides/self-host.mdx` (the full-platform Vercel/Docker deploy guide) and removed its `"guides/self-host"` entry from `docs/docs.json`. Rewrote `docs/hosting/self-hosting.mdx` (now "Self-hosting your bot", `probot-bot` only) and `docs/concepts/managed-vs-self-hosted.mdx` (the "self-hosted" column now means the bot runtime, not the platform). Edited `docs/hosting/managed.mdx`, `docs/guides/deployment.mdx`, `docs/faq.mdx`, `docs/quickstart.mdx`, `docs/features.mdx`, `docs/about.mdx`, and `docs/api-reference/introduction.mdx` (repointed the orphaned `/guides/self-host` link). Marketing: rewrote `src/app/(marketing)/self-hosting/page.tsx` (mint a bot token → deploy `probot-bot`, no fork-repo/KEK/cron); reframed the self-host card + honest caveat on `src/app/(marketing)/about/page.tsx`, the comparison detail on `why-pro-bot/page.tsx`, and the "free to run" copy on `src/app/page.tsx`.
- **Recruiter-IP wording removed** from `docs/hosting/managed.mdx`, `docs/faq.mdx`, `docs/why-pro-bot.mdx`, `docs/features.mdx`, `docs/guides/analytics-and-leads.mdx`, the dashboard decrypt-audit copy in `src/components/dashboard/settings/AIModelKeyTab.tsx`, and `BOT-TUTORIAL-SCRIPT.md` (scenes 11 + 12) - replaced with "conversations are logged anonymously". Left the internal IP-hashing code comments in `src/lib/db/schema.ts` and `src/lib/crypto/ip-hash.ts` (implementation, not user-facing docs/instructions) and flagged them to the user.
- **Animated 404 page** `src/app/not-found.tsx` (new) - a self-contained, centered page (renders in the root layout, no marketing chrome) with an SVG chatbot illustration: floating head (`il-float`), blinking eyes (`il-eyes`), glowing aura (`il-orb-glow`), expanding halo rings (`il-ring`), and a chat bubble with typing dots (`il-dot`). All motion reuses the existing landing-illustration classes in `globals.css`, which are already inside the `prefers-reduced-motion` guard, so no new CSS. Added a `home` glyph to `src/components/ui/Icon.tsx` for the "Return to homepage" button.

**Decisions made:**

- **Repurposed (not deleted) the `/self-hosting` route and the `hosting/self-hosting` + `managed-vs-self-hosted` docs** so the existing nav/footer/sitemap/about links stay valid - they now tell the chatbot-only story. Only the redundant full-platform `guides/self-host.mdx` was deleted.
- **404 reused the shared `il-*` animation system** rather than authoring new keyframes - keeps the CSS surface small and inherits the reduced-motion guard for free.
- Left the IP-hash internals untouched (the user asked only to stop *mentioning* it; the behavior is unchanged and not surfaced to recruiters).

**Open questions / follow-ups:**

- typecheck + key-leak green (336 source files); no dangling `/guides/self-host` links and no "recruiter IP" left in `docs/`. Run vitest + `next build` natively.
- The Mintlify docs should be rebuilt locally to confirm the removed page + nav entry render cleanly.
