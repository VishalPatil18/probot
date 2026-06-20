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
- **Status:** **STAGE 6 COMPLETE + Dashboard Redesign Slices A & B** — Stages 1–6 shipped end-to-end. Dashboard redesign Slice A (sidebar + topbar shell + dashboard home rewrite) and Slice B (5-tab settings page) are now live. Settings tabs: Account (read-only display + Coming Soon), Bot configuration (status toggle via newly-widened `isActive` PATCH field + name/headline/personality cards + theme swatches + suggested questions + Coming Soon custom instructions), Knowledge base (visual re-skin of the slice-2/6.5 endpoints — type-iconed source rows, dashed "Add source" upload zone, "Re-index all" button), Security & privacy (live rate-limit display reading `PER_MINUTE`/`PER_DAY` from the rate limiter module + Coming Soon Export / Retention / Delete account), AI model & key (entirely Coming Soon — Stage 7 editor). Tab state in URL via `?tab=`. WAI-ARIA tabs pattern fully wired. Obsolete `BotSettingsForm` + `KnowledgeManager` deleted (replaced by `BotConfigTab` + `KnowledgeTab`). 648/648 tests, build green. Slice C (sub-page re-theme + docs stub + Stage 7 task block) still to ship. **Earlier status note:** PDF + text ingestion pipeline shipped on top of Stage 1. End-to-end loop: register → log in → build a bot (drop PDFs in the Bot Factory dropzone, paste text, or both; optionally tweak the per-bot context token cap in Advanced) → chat with it via the user's own LLM key. Knowledge sources are extracted with `pdf-parse`, chunked with `tiktoken` (cl100k_base, 750/100), persisted to `knowledge_base`, and reassembled into `bots.context_text` server-side. 299/299 tests, build green.
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
- No prompt-injection test for the RAG path. Stage 3 inherits the Stage 1 input sanitizer (runs BEFORE retrieval), so retrieved chunks are sourced from the bot owner's verified content (not user input) — but a future audit should confirm no untrusted text reaches the embedding API as the query.

---

### 2026-06-19 07:45 - Stage 4: Public multi-tenant chat + onboarding + avatars + dashboard

**What was asked to do:** Ship Stage 4 from `plan.md` — every bot gets a public URL (`/u/[username]/chat`) anyone can visit without logging in. Includes: removing the auth gate on the public chat route, adding owner branding (name + headline + avatar) on the chat page, enriching SEO/OG metadata, creating `conversations` + `messages` tables for Stage 6 analytics, a username onboarding flow that forces OAuth/magic-link users to replace their `user-<8hex>` placeholder slug, a per-user animal-icon avatar system (13 Cloudinary URLs), a public bot config API for the Stage 5 widget, a dashboard home with a per-bot Copy URL button, and `/u/[username]` → `/u/[username]/chat` redirect.

**Locked decisions before any code (Q1-Q6):** Q1 = OAuth `users.image` when present + auto-assigned animal-icon avatar (13 Cloudinary URLs from the user's own Cloudinary account, zero cost) otherwise; user can re-pick during onboarding. Q2 = create `conversations` + `messages` tables in migration only; chat-route logging wiring deferred to Stage 6 (no point shipping write code without an analytics reader). Q3 = skip `recruiter_ip` entirely — raw IPs are PII and Stage 7 handles GDPR / consent. Q4 = ship `GET /api/bots/[botId]/config` now (Stage 5 widget will consume it; small surface). Q5 = dashboard layout server-component redirect to `/onboarding` when `username` matches `^user-[0-9a-f]{8}$`; middleware would be overkill. Q6 = Copy URL surfaces both in Bot Factory Step 5 (post-creation) and Dashboard home (return visits).

**What I did:**

_Slice 4.1 — public chat surface:_

- `src/app/u/[username]/chat/page.tsx` — removed the `getServerSession` gate that redirected to `/login?next=…`. Replaced the inline drizzle queries with a `resolve(username)` helper, wrapped in React `cache()` so `generateMetadata` and `PublicChatPage` share the same DB lookups in a single render pass (4 queries → 2). Enriched `generateMetadata` with description, OpenGraph (image from `users.image`), Twitter card (`summary_large_image` when owner has a photo, else `summary`), and `robots: { index: true, follow: true }`. Wraps `<OwnerCard>` + `<ChatWindow>` in a centered `max-w-3xl` container so the chat page now has a real hero, not just a chat window floating in `<body>`.
- `src/app/u/[username]/page.tsx` — new file; one-liner `redirect(\`/u/\${params.username}/chat\`)`. Bare-username URLs are friendlier share targets.
- `src/components/u/OwnerCard.tsx` — new server component. Renders avatar (plain `<img>` to a 64×64 circle, with `bg-neutral-100` background as graceful fallback if Cloudinary is unreachable) + name + headline as a rounded card. Initials avatar (`brand/10` background) used when `users.image` is null. Justified eslint-disable for `<img>` over `next/image`: a degraded CDN should fall back gracefully via `alt` + bg color, not block the page render.
- `src/app/api/bots/[botId]/config/route.ts` — new public GET endpoint (no auth). Returns `{ bot: { id, name, headline, suggestedQuestions, loadingMessages }, owner: { username, name, image } }`. Two `findFirst`s (bot, then owner). Cache-Control `public, s-maxage=60, stale-while-revalidate=300` so a CDN absorbs enumeration attempts before per-IP rate limiting lands in Stage 7. Explicitly NOT returned: `bot.contextText` (the assembled knowledge), `owner.email`, `owner.llmProvider`, `users.hashedPassword`. The route test asserts a `LEAK_CANARY` value never appears in the response.
- `src/app/api/bots/[botId]/config/route.test.ts` — 5 specs covering happy path, 404 on missing bot, 404 on orphan (owner not found), explicit no-leak assertion against sensitive fields, normalization of null suggestedQuestions to `[]`.

_Slice 4.2 — schema migration (no wiring):_

- `src/lib/db/schema.ts` — added `conversations` (id, botId FK CASCADE, sessionId varchar(255), messageCount int default 0, startedAt, lastMessageAt) and `messages` (id, conversationId FK CASCADE, role varchar(10), content text, tokensUsed nullable int, createdAt) tables. Added `Conversation` / `NewConversation` / `Message` / `NewMessage` type exports. Both tables `.enableRLS()` to match existing pattern. After code review: added a `messages_role_check` CHECK constraint (Postgres-level, so a future writer typo `'assitant'` cannot silently corrupt analytics) and a composite UNIQUE INDEX on `(bot_id, session_id)` so concurrent tabs on the same recruiter session cannot double-insert. Imported `check` and `uniqueIndex` from `drizzle-orm/pg-core`.
- `drizzle/0006_cheerful_lila_cheney.sql` — generated migration. Creates both tables, enables RLS, adds FK cascades, indexes, CHECK constraint, and the composite unique index. **NOT YET APPLIED to Supabase.** User needs to run `psql "$DATABASE_URL" -f drizzle/0006_cheerful_lila_cheney.sql` before Stage 6 (which is when the tables actually get used).

_Slice 4.3 — avatars + onboarding flow:_

- `src/lib/avatars.ts` — `ANIMAL_AVATARS` array of 13 Cloudinary URLs (from the user's own portfolio bucket, zero operator cost). `pickDefaultAvatar(seed)` does a deterministic 31-multiplier polynomial hash → modulo → URL; same seed always returns the same URL. `isAllowedAvatar(url)` is a Set membership check used by the onboarding PATCH allowlist. Includes a `FALLBACK_AVATAR: string` constant pulled out so the function signature is `: string` (not `string | undefined`) under `noUncheckedIndexedAccess` without a non-null assertion (codebase doesn't use `!`).
- `src/lib/users/placeholder.ts` — `isPlaceholderUsername(name): boolean` with regex `^user-[0-9a-f]{8}$`. Single source of truth used by the dashboard layout, the `/onboarding` page, and (transitively, via session check) the onboarding PATCH route.
- `src/lib/auth/auth.ts` — in the custom `createUser` adapter override, assigns `image = data.image ?? pickDefaultAvatar(username)`. OAuth providers with real avatars (Google, GitHub) get to keep them; magic-link users and OAuth providers that didn't return an image get a deterministic animal icon. Imported `pickDefaultAvatar` from `@/lib/avatars`.
- `src/app/api/auth/register/route.ts` — credentials register also assigns `image: pickDefaultAvatar(username)` at INSERT. Every new account now has a non-null `image` from the start, so the public chat page never has to handle a totally faceless owner.
- `src/lib/auth/schemas.ts` — exported the existing `usernameSchema` (it was previously module-local) so the onboarding PATCH can reuse the regex + reserved-slug rules without duplicating them.
- `src/app/api/onboarding/profile/route.ts` — new PATCH endpoint. Requires session (401 if missing). Zod-validates `{ username: usernameSchema, image: url<=2000 }`. Reads the user's current `users.image` from the DB. Image allowlist: must be in `ANIMAL_AVATARS` OR equal the user's current image (the OR clause preserves OAuth-provided photos without opening arbitrary URL injection — `existing.image` is read using the session's userId so it cannot be spoofed). UPDATE wrapped in try/catch with pg `23505` translated to 409 (username taken). Returns `{ user: { id, username, image } }`. 10 specs covering: 401, invalid JSON, validation failure (regex + reserved), allowlist enforcement, current-image passthrough, happy path, 409 collision, 404 missing user, 2000-char URL cap.
- `src/app/onboarding/page.tsx` — new server component. Auth-gated; redirects to `/dashboard` immediately if the session username is NOT a placeholder. Reads `users.image` for the form's "current image" prop. Renders an explanatory header + `<OnboardingForm>`.
- `src/components/onboarding/OnboardingForm.tsx` — new client component. Dual-field form: username text input (with same regex constraints as register; auto-lowercase + space→hyphen on keystroke) + avatar grid (4 cols mobile, 7 cols sm+). When user has an external (non-animal) `currentImage`, that image is rendered as a first "Keep current" card; selecting it preserves the OAuth photo. Otherwise the grid is just the 13 animals with `ANIMAL_AVATARS[0]` pre-selected. Submit POSTs to `/api/onboarding/profile`. On success, hard navigates via `window.location.href = "/dashboard"` so the JWT re-mints (see code-review fix #1 below).
- `src/app/(dashboard)/layout.tsx` — added `getServerSession` check up front (redirects unauthenticated to `/login?next=/dashboard`), then `isPlaceholderUsername` check (redirects to `/onboarding`). All dashboard sub-routes inherit this guard via the route group's shared layout.
- `next.config.js` — added `images.remotePatterns` allowlist for `res.cloudinary.com/dbjdu0hvl/**` so `next/image` can optimize the avatar URLs if any future component uses it. The current `<img>` usage doesn't need this, but it's a small allowlist that future-proofs without opening arbitrary remote URL proxying.
- Tests: 9 specs for `avatars.ts` (curated count, uniqueness, deterministic per-seed, distribution, empty-string handling, allowlist accept/reject), 6 specs for `placeholder.ts` (true/false matrix including uppercase hex rejection and whitespace), 10 specs for the onboarding PATCH route (auth, validation, allowlist, OAuth passthrough, happy path, collision, missing user, URL cap).

_Slice 4.4 — dashboard home + Copy URL:_

- `src/components/dashboard/CopyUrlButton.tsx` — new client component. Wraps `navigator.clipboard.writeText` with three states: idle (label), copied (`"Copied!"` for 1.5s), and error (`"Copy failed"` when clipboard API unavailable or rejects). `aria-label` is dynamic, including both the visible text and the URL, so screen readers + tests can rely on `getByRole({ name: /Copied!/ })` matching the current state.
- `src/components/dashboard/CopyUrlButton.test.tsx` — 5 specs. Tricky one: `navigator.clipboard` doesn't exist in jsdom AND userEvent v14's `setup()` installs its own clipboard simulator that intercepts `writeText`. Resolution: `fireEvent.click` + `await act(...)` instead of `userEvent.click`, plus `Object.defineProperty(globalThis.navigator, "clipboard", { value, configurable: true })` so the patch can be reset per test. The `vi.stubGlobal` + `vi.unstubAllGlobals` approach hit the same userEvent interception, so we bypassed userEvent entirely for clipboard-interactive tests while keeping it for non-clipboard interactions in other suites.
- `src/components/bot-factory/BotFactoryForm.tsx` — one-line update to `StepDeploy`: replaced the static `probot.com/u/${username}` placeholder URL with `${origin}/u/${username}/chat` (where origin = `window.location.origin` with `https://probot.dev` fallback for SSR) and added `<CopyUrlButton url={url} />` next to the URL display. Imported `CopyUrlButton`.
- `src/app/(dashboard)/dashboard/page.tsx` — replaced `return null` with a real server-rendered bot list. Fetches all of the session user's bots ordered by `updatedAt DESC`. Empty state: "No bots yet" + a CTA to `/dashboard/bots/new`. Non-empty: a card per bot with name, headline, public URL (mono font), `<CopyUrlButton>`, and an "Open ↗" external link. The origin is constructed from the request's Host header via Next.js `headers()`. After code review: `x-forwarded-proto` is allowlisted to `"http" | "https"` only — an attacker-supplied `x-forwarded-proto: javascript` would have caused the rendered URL to read `javascript://host/u/...` in the clipboard (low exploitability but bad hygiene).

_Code-review pass (HIGH-severity findings fixed):_

- **HIGH #1: JWT staleness redirect loop.** OAuth/magic-link users would land in a tight loop: dashboard layout reads stale JWT (`token.username` still `user-abc12345`), redirects to `/onboarding`, onboarding page reads same stale JWT, re-renders the form. The PATCH would succeed but the next page load would still see the placeholder. Fixed in `src/lib/auth/auth.ts` jwt callback: previously the DB lookup for `username` only fired when `user` arg was present (first sign-in); now it ALSO fires on every subsequent JWT mint when `token.id` exists, so the post-onboarding hard refresh re-reads `users.username` from the DB and the placeholder check returns false. One extra DB query per authenticated server request — acceptable for this app's traffic shape and a `React.cache()` wrap can mitigate later.
- **HIGH #2: Public config API has no rate limit; could be enumerated to harvest names.** Added `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` so CDN absorbs repeated fetches. Proper per-IP rate limiting lands with the Redis work in Stage 7.

_Code-review MEDIUM fixes:_

- **MEDIUM: dashboard page trusts `x-forwarded-proto` verbatim.** Allowlisted to `"http" | "https"` with sane fallback.
- **MEDIUM: chat page double-fetches via `generateMetadata` + page component.** Wrapped `resolve()` with React `cache()` — dedupes the 2 DB queries from 4 to 2 per page load. Standard Next.js pattern.
- **LOW: messages.role no CHECK constraint.** Added DB-level `CHECK (role IN ('user', 'assistant', 'system', 'tool'))` so future analytics writers can't silently corrupt the table.
- **LOW: conversations.session_id not unique per bot.** Added composite `uniqueIndex("conversations_bot_session_unique").on(botId, sessionId)` so concurrent tabs for the same recruiter session can't double-insert.

**Files changed:**

_Slice 4.1:_

- `src/app/u/[username]/chat/page.tsx` — update — removed auth gate, added `resolve()` (cached), `OwnerCard` integration, enriched generateMetadata with OG/Twitter/robots.
- `src/app/u/[username]/page.tsx` — create — bare-username redirect.
- `src/components/u/OwnerCard.tsx` — create — owner avatar/name/headline hero.
- `src/app/api/bots/[botId]/config/route.ts` — create — public bot config GET, Cache-Control header.
- `src/app/api/bots/[botId]/config/route.test.ts` — create — 5 specs.

_Slice 4.2:_

- `src/lib/db/schema.ts` — update — added `conversations` + `messages` tables with FKs, indexes, CHECK constraint on `role`, composite unique index on `(bot_id, session_id)`. Imported `check` and `uniqueIndex`. Type exports for both tables.
- `drizzle/0006_cheerful_lila_cheney.sql` — create — CREATE TABLE x2 + RLS enable + FK cascades + indexes + CHECK constraint + unique index.
- `drizzle/meta/_journal.json` — update — replaced the abandoned first-pass `0006_small_war_machine` entry with the regenerated `0006_cheerful_lila_cheney`.

_Slice 4.3:_

- `src/lib/avatars.ts` — create — `ANIMAL_AVATARS`, `pickDefaultAvatar`, `isAllowedAvatar`.
- `src/lib/avatars.test.ts` — create — 9 specs.
- `src/lib/users/placeholder.ts` — create — `isPlaceholderUsername`.
- `src/lib/users/placeholder.test.ts` — create — 6 specs.
- `src/lib/auth/auth.ts` — update — default-assign animal avatar in `createUser` adapter override; jwt callback re-reads username on every mint (HIGH fix).
- `src/app/api/auth/register/route.ts` — update — default-assign animal avatar at INSERT.
- `src/lib/auth/schemas.ts` — update — exported `usernameSchema`.
- `src/app/api/onboarding/profile/route.ts` — create — PATCH endpoint with auth + Zod + allowlist + collision handling.
- `src/app/api/onboarding/profile/route.test.ts` — create — 10 specs.
- `src/app/onboarding/page.tsx` — create — server component, redirects if username not placeholder.
- `src/components/onboarding/OnboardingForm.tsx` — create — client form with username + avatar grid.
- `src/app/(dashboard)/layout.tsx` — update — auth check + placeholder username redirect to `/onboarding`.
- `next.config.js` — update — Cloudinary remotePatterns allowlist.

_Slice 4.4:_

- `src/components/dashboard/CopyUrlButton.tsx` — create — clipboard button with idle/copied/error states.
- `src/components/dashboard/CopyUrlButton.test.tsx` — create — 5 specs (used `fireEvent` + `act` to dodge userEvent's clipboard simulator).
- `src/app/(dashboard)/dashboard/page.tsx` — update — replaced `return null` with bot list + Copy URL; allowlisted `x-forwarded-proto` (MEDIUM fix).
- `src/components/bot-factory/BotFactoryForm.tsx` — update — Step 5 success block now uses real `${origin}/u/${username}/chat` URL with `<CopyUrlButton>` integrated.

**Decisions made:**

- **OAuth photo + animal icon hybrid (Q1):** OAuth providers that return a photo (Google, GitHub) keep using it via `users.image` at signup; everyone else gets an auto-assigned animal from a 13-icon Cloudinary set. Deterministic from the username seed so the same user always gets the same default, even if the field is later cleared. Onboarding flow shows a "Keep current" card when the user has an OAuth photo so they're not forced off of it. The animal icons are hosted on the user's own Cloudinary bucket — operator cost is zero, no S3, no proxying.
- **Conversations/messages tables ship now, wiring deferred (Q2):** Building the schema in Stage 4 makes the Stage 6 analytics work a pure UI/wiring story instead of also a migration story. CLAUDE.md §3 (surgical changes) is satisfied because the new tables are completely unreferenced by any code — they're a future commitment, not a present interaction surface. The composite unique index + CHECK constraint were added during code-review to make sure those future writes can't be sloppy.
- **No `recruiter_ip` (Q3):** GDPR / consent lives in Stage 7. Adding a PII column now and reasoning about how to scrub it later is the wrong order. The hashed-IP alternative was rejected because the Stage 6 analytics surface doesn't need per-recruiter de-dupe — `session_id` from the client cookie does the job for unique-session counting.
- **Public config API ships now (Q4=b):** It's a small endpoint with a tight surface, the Stage 5 widget will need it, and shipping it lets us settle the response shape + Cache-Control story in one place. Tests assert no sensitive fields ever leak even if a future writer adds a private column to the bot select.
- **Onboarding redirect lives in dashboard layout, not middleware (Q5):** Middleware-based redirects can't run async DB queries before responding (well, they can, but at the cost of edge runtime constraints and complicated tracing). The layout server-component approach is one DB read piggybacking on the session decode that was happening anyway, and it covers all `/dashboard/*` paths via the shared route group layout. Trade-off: every dashboard navigation hits this check. Cost is one stale-JWT-decode + one regex; the placeholder check itself doesn't touch the DB.
- **Username + avatar bundled in a single onboarding form (Q6 extension):** Two-step flow (pick name → pick avatar) felt long for first-time users. Single screen with both controls + a clear "Continue" button is faster and matches the "one decision per step" pattern of the Bot Factory.
- **Copy URL surfaces in BOTH Step 5 AND dashboard home (Q6):** Step 5 catches the first-share moment when the user is in flow; dashboard home catches every return visit. The component is shared (`CopyUrlButton`) so the UX is identical in both places.
- **JWT re-reads username on every mint:** The HIGH-severity fix changes the jwt callback from "only re-read username on first sign-in" to "re-read on every JWT mint when token.id exists." This costs one query per authenticated server request but eliminates the entire class of "JWT carries stale identity" bugs (onboarding being the immediate trigger; future Stage 7 settings will benefit too). Premature optimization to cache this would have hidden the stale-state class behind a TTL — better to take the small constant cost.
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
- Server-component tests pattern is still empty — the dashboard home, onboarding page, and public chat page have no direct component tests. Tested transitively via route handlers + manual QA. Stage 7 may add a real server-component test harness.
- `OwnerCard.tsx`, `BotListItem.tsx` (folded into dashboard/page.tsx), and the dashboard home itself have no co-located tests because they're server components — a server-rendering test harness would be premature in scope for Stage 4.

---

### 2026-06-19 17:40 - Stage 5: Embeddable widget + theme color + bot detail page

**What was asked to do:** Ship Stage 5 from `plan.md` — every bot gets an embeddable `<script>` tag visitors can paste on any portfolio site to render a floating chat bubble. Includes: a vanilla-TS widget with Shadow DOM isolation, an esbuild build pipeline outputting `public/widget.js`, CORS headers on the two public endpoints (`/api/chat/[botId]` + `/api/bots/[botId]/config`), a `bots.theme_color` column for per-bot branding, a NEW `PATCH /api/bots/[botId]` for partial updates, a NEW bot detail page at `/dashboard/bots/[botId]` with embed snippet + signature badge + theme color picker, and a `/u/[username]` ergonomics polish via shared `getOrigin()` helper.

**Locked decisions before any code (Q1-Q7):** Q1 = (c) widget UI + scaffolding only, real chat deferred to Stage 7. Solves the recruiter-key transport problem (browser localStorage is per-origin, so `janedoe.com`'s widget cannot read Jane's `probot.dev` localStorage) without committing to either server-side key persistence (violates Stage 1 promise) or asking recruiters for their own keys (terrible UX). When Stage 7 lands encrypted-at-rest keys, the same widget code becomes functional with no widget-source changes. Q2 = (a) `public/widget.js` served by Next.js host (zero cost, no CloudFront / S3). Q3 = (a) new `bots.theme_color varchar(7)` column, default `#7c5cff` (brand). Q4 = (a) `Access-Control-Allow-Origin: *` on chat + config only; everything else stays same-origin. Q5 = (a) new `/dashboard/bots/[botId]` detail page (proper bot management surface, overdue). Q6 = (a) static HTML signature badge (image-based ones break in Outlook). Q7 = (a) vanilla TS + esbuild + Shadow DOM, < 50KB gzipped budget (delivered: 8 KB minified).

**What I did:**

_Slice 5.1 — Schema + CORS + PATCH endpoint:_

- `src/lib/db/schema.ts` — added `themeColor` column to `bots` (`varchar(7) NOT NULL DEFAULT '#7c5cff'`). Single field for simplicity; varchar(7) fits `#RRGGBB` exactly.
- `drizzle/0007_square_korvac.sql` — generated migration. Single `ALTER TABLE … ADD COLUMN … NOT NULL DEFAULT`. Postgres 11+ stores defaults in catalog; no row backfill, no long lock on the `bots` table. Applied to Supabase before Slice 5.2.
- `src/lib/bots/theme-color.ts` — `DEFAULT_THEME_COLOR`, `THEME_COLOR_REGEX` (`#RRGGBB` only — shorthand `#FFF` rejected so the column is always exactly 7 chars), Zod `themeColorSchema`, `isValidThemeColor` predicate. Single source of truth used by `botInput`, the PATCH route, and the widget's `safeThemeColor` (which mirrors the regex but is duplicated for zero-dep widget bundle).
- `src/lib/bots/schemas.ts` — exposed `themeColor` on `botInput` (optional, falls through to DB default when absent). Added `botPatchInput` schema: a Zod object with `themeColor` as the only allowed field plus a `.refine()` that rejects an empty body — prevents mass-assignment by construction, the route never trusts the raw request shape.
- `src/lib/bots/cors-headers.ts` — shared `PUBLIC_CORS_HEADERS` dict (`Access-Control-Allow-Origin: *`, methods `GET, POST, OPTIONS`, headers `Content-Type, x-llm-api-key, x-embedding-api-key, x-llm-azure-endpoint, x-llm-azure-api-version`, max-age 86400) + `corsPreflight()` helper returning 204 No Content with those headers. Used by the OPTIONS handlers on both public routes.
- `src/app/api/bots/[botId]/route.ts` — NEW PATCH endpoint. Auth via `requireBotOwner` (existing helper from Stage 2). Zod-validate against `botPatchInput`. Builds the SET payload from defined fields only (currently just `themeColor`, structured for future fields) so omitted fields retain their existing DB value. 6 tests cover: 401 unauthorized, 400 invalid JSON, 400 invalid hex, 400 empty body, 200 happy path, mass-assignment-safety regression (attacker submits `userId`/`isActive`/`contextText` — route silently drops them).
- `src/app/api/bots/route.ts` — `POST /api/bots` (existing create/update endpoint behind the Bot Factory form) now spread-conditionally writes `themeColor` when provided. Form doesn't expose it (lives in detail page now), but the schema accepts it for API consistency.
- `src/app/api/bots/[botId]/config/route.ts` — extended response with `themeColor` so the widget can paint itself. Added OPTIONS handler for CORS preflight + `PUBLIC_CORS_HEADERS` on the GET response (CDN cache headers preserved). 2 new CORS tests (GET has CORS headers; OPTIONS returns 204).
- `src/app/api/chat/[botId]/route.ts` — added OPTIONS handler. CORS headers on POST responses come from `next.config.js` (no need to duplicate at the route level). 1 new CORS test on OPTIONS.
- `next.config.js` — `async headers()` block declaring CORS allowlist for `/api/chat/:botId` and `/api/bots/:botId/config` only. Named-param patterns (not glob) so neighboring routes like `PATCH /api/bots/:botId` and the knowledge routes stay same-origin.

_Slice 5.2 — Widget source + build pipeline:_

- `src/widget/widget.css` — plain CSS scoped under `.probot-root`. CSS custom property `--probot-theme` is set per-instance (inline style on the shadow-root child) so theme color application is a one-line write. Mobile breakpoint at 480px (dialog goes full-width). All selectors live inside Shadow DOM so host-page styles cannot leak.
- `src/widget/widget.ts` — vanilla TS, no React, no Preact, no markdown lib. Pure functions: `escapeHtml` (5 chars: `&<>"'`, ampersand first to avoid double-encoding the others), `safeThemeColor` (mirrors `THEME_COLOR_REGEX`, falls back to brand purple on invalid), `parseConfig` (narrows the GET response, drops bad suggested-question entries, defaults missing optional fields), `renderBubbleInner` (SVG icon string), `renderDialogInner` (owner card + greeting + "preview" notice + CTA link to full chat + suggested-question list). `readScriptConfig` extracts `data-bot-id` + `data-api-base` from `document.currentScript`, only accepts `http(s)` for the API base (defense vs `javascript:` / `data:` URIs). `mount` is the async orchestrator: read script config → fetch `/api/bots/[botId]/config` → parse → attach a `<div data-probot-widget>` to `document.body` → `attachShadow({ mode: "closed" })` → inject CSS + render bubble/dialog. Bubble click toggles dialog visibility; dialog click-on-close delegates via `data-action="close"`. IIFE auto-invokes `mount(document.currentScript)` at script execution. Build-time defines: `__WIDGET_CSS__` (CSS string) and `__API_BASE_DEFAULT__` (origin to fetch config from; defaults to `https://probot.dev`).
- `scripts/build-widget.mjs` — esbuild build. Reads `widget.css` from disk, JSON-encodes it as the `__WIDGET_CSS__` define value, bundles `widget.ts` as IIFE with `target: "es2017"` (wide browser support without burning bytes), minifies, writes to `public/widget.js`. Warns at the size budget threshold (>50 KB). Final artifact: 8.04 KB minified.
- `package.json` — added `esbuild@^0.28.1` as devDep. Changed `"build"` to `"npm run build:widget && next build"` so deploys always rebuild the widget before the Next build; chained `&&` short-circuits if the widget build fails so CI fails loudly.
- `src/widget/widget.test.ts` — 35 specs (jsdom env): escapeHtml correctness + ordering, safeThemeColor allowlist, parseConfig narrowing + fallbacks, renderBubbleInner + renderDialogInner XSS escaping (owner name, headline, suggested questions, CTA href post-fix), readScriptConfig data-bot-id + data-api-base + http-only allowlist, mount integration (no-script-tag short-circuit, fetch-failed silent abort, parseConfig-rejected silent abort, happy-path shadow root attachment with closed mode, fetch URL shape).

_Slice 5.3 — Bot detail page + embed surfaces:_

- `src/lib/server/origin.ts` — NEW `getOrigin()` helper. Reads `host` + `x-forwarded-proto` from request headers; allowlist proto to `http`/`https` (defense vs proxy-injected `javascript:`), default to `https` in prod / `http` on localhost. Extracted from `dashboard/page.tsx` so both the home and the detail page derive origins consistently. Behavior is identical to the inline version.
- `src/app/(dashboard)/dashboard/page.tsx` — refactored to use `getOrigin()` (removed inline header derivation block). Added a "Manage" link on each bot list item pointing to `/dashboard/bots/[botId]`.
- `src/app/(dashboard)/dashboard/bots/[botId]/page.tsx` — NEW server component. Resolves the bot via `and(eq(bots.id, params.botId), eq(bots.userId, session.user.id))` — non-owners get 404 (not 403) so we don't leak the existence of arbitrary bot IDs. Renders: identity header (name + live/inactive badge + "Edit content" link to `/dashboard/bots/new` + "Open chat ↗" external link), Share + Embed section with `<EmbedSnippet>`, Appearance section with `<ThemeColorPicker>`. Auth + placeholder-username gates are enforced by the parent `(dashboard)` layout from Stage 4, so this component only needs the ownership check.
- `src/components/dashboard/EmbedSnippet.tsx` — NEW client component. Three `SnippetCard`s side-by-side: Public URL, Website embed (`<script src=…>` tag), Email signature (HTML anchor with inline styles + speech-balloon emoji). Each card has a `<CopyUrlButton>` using the existing Stage 4 component. Internal `signatureBadgeHtml()` factory exported for testing. Hand-rolled HTML rather than a React renderer because Gmail/Outlook/Apple Mail each strip different sets of tags — only inline-styled anchors survive all three. 8 tests cover: card rendering, URL snippet shape, embed snippet with botId injection, signature HTML structure, theme color usage, https/http origin handling, protocol-stripped visible text.
- `src/components/dashboard/ThemeColorPicker.tsx` — NEW client component. Native `<input type="color">` (free real picker on every modern browser) + paired hex text input. Save button disabled when unchanged. Submits via `PATCH /api/bots/[botId]` with `{ themeColor }`; calls `router.refresh()` on success so the server-rendered detail page re-renders with the new color in the snippet samples. Shows transient "Saved!" for 1.5s. 6 tests cover: initial value, disabled-unchanged state, dirty-state Save enable, PATCH body shape + router.refresh on success, invalid-hex blocks the PATCH + shows alert, 4xx server response shows alert + skips router.refresh.

_Code-review pass (HIGH-severity finding fixed):_

- **HIGH: widget CTA href interpolation was unescaped.** `renderDialogInner` built `chatUrl = ${apiBase}/u/${encodeURIComponent(owner.username)}/chat` and inserted it raw into the `href` attribute. `encodeURIComponent` handles path-segment escaping but NOT HTML-attribute escaping. A malformed `data-api-base` like `https://x" onclick="alert(1)` (set by an embedding site) would have broken out of the `href` attribute. The footer href was already wrapped in `escapeHtml`; this catch-up fix wraps the CTA href too. Added a regression test that asserts the rendered HTML contains `&quot;` (escaped quote) instead of `href="https://x" onerror="`. The risk was bounded (`readScriptConfig` already rejects `javascript:` and `data:` URIs via the `/^https?:\/\//` allowlist) but the bug was real for any apiBase containing structural chars. Widget rebuilt after the fix; artifact still 8.04 KB.

**Files changed:**

_Slice 5.1:_

- `src/lib/db/schema.ts` — update — added `themeColor` column to `bots`.
- `drizzle/0007_square_korvac.sql` — create — single ADD COLUMN with default.
- `src/lib/bots/theme-color.ts` — create — regex + Zod helper.
- `src/lib/bots/theme-color.test.ts` — create — 10 specs.
- `src/lib/bots/cors-headers.ts` — create — `PUBLIC_CORS_HEADERS` + `corsPreflight()`.
- `src/lib/bots/schemas.ts` — update — added `themeColor` to `botInput`, new `botPatchInput`.
- `src/app/api/bots/route.ts` — update — accept `themeColor` on create/update.
- `src/app/api/bots/[botId]/route.ts` — create — NEW PATCH endpoint.
- `src/app/api/bots/[botId]/route.test.ts` — create — 6 specs including mass-assignment regression.
- `src/app/api/bots/[botId]/config/route.ts` — update — `themeColor` in response, CORS headers on GET, OPTIONS handler.
- `src/app/api/bots/[botId]/config/route.test.ts` — update — fixture extended, 2 new CORS specs.
- `src/app/api/chat/[botId]/route.ts` — update — OPTIONS handler.
- `src/app/api/chat/[botId]/route.test.ts` — update — 1 new OPTIONS spec.
- `next.config.js` — update — `async headers()` CORS allowlist.

_Slice 5.2:_

- `src/widget/widget.css` — create — Shadow-DOM-scoped CSS.
- `src/widget/widget.ts` — create — IIFE entry, pure renderers, mount.
- `src/widget/widget.test.ts` — create — 35 specs (jsdom env).
- `scripts/build-widget.mjs` — create — esbuild build script.
- `package.json` — update — `esbuild` devDep, `build:widget` script chained into `build`.
- `public/widget.js` — create (build artifact) — 8.04 KB minified.

_Slice 5.3:_

- `src/lib/server/origin.ts` — create — shared `getOrigin()` helper.
- `src/app/(dashboard)/dashboard/page.tsx` — update — use `getOrigin()`, add "Manage" link.
- `src/app/(dashboard)/dashboard/bots/[botId]/page.tsx` — create — bot detail page.
- `src/components/dashboard/EmbedSnippet.tsx` — create — 3-card snippet surface + `signatureBadgeHtml`.
- `src/components/dashboard/EmbedSnippet.test.tsx` — create — 8 specs.
- `src/components/dashboard/ThemeColorPicker.tsx` — create — color picker + PATCH submit.
- `src/components/dashboard/ThemeColorPicker.test.tsx` — create — 6 specs.

_Review fix:_

- `src/widget/widget.ts` — update — `escapeHtml(chatUrl)` in CTA href.
- `src/widget/widget.test.ts` — update — 1 new regression spec.
- `public/widget.js` — rebuild — fix included in deployed artifact.

**Decisions made:**

- **Defer real chat to Stage 7 (Q1=c):** Stage 4 has the same problem (recruiter visiting `/u/jane/chat` has no key in localStorage on `probot.dev`), inherited and never addressed. The clean architectural fix is encryption-at-rest for owner-supplied keys, gated behind a master key + KMS-shaped infra — that's a Stage 7 task, not a Stage 5 task. Shipping a widget that explicitly says "preview — open full chat for now" is more honest than (a) asking recruiters to bring their own keys (terrible UX) or (b) storing keys in plaintext (security regression). When Stage 7 lands, widget code unchanged, dialog becomes functional.
- **`public/widget.js` over CloudFront (Q2=a):** CLAUDE.md §7 forbids paid services. AWS Always-Free has 12-month trial caveats. Vercel serves `public/*` at edge for free as part of the deploy; bandwidth is bundled with the app's hosting. Future migration to a CDN is one config change.
- **Build chain: `build:widget && next build`:** Widget is rebuilt on every deploy. If the build fails (e.g. CSS syntax error), the `&&` short-circuits and `next build` never runs — CI fails loudly. Alternative (chain after `next build`) was rejected because a broken `public/widget.js` would still get deployed in the bundle.
- **Vanilla TS over Preact (Q7=a):** Saves ~10-12 KB versus the smallest Preact bundle. The widget has no reactive state worth modeling; bubble open/close is two `hidden=` toggles. esbuild IIFE output runs anywhere, no polyfill story.
- **Shadow DOM `mode: "closed"` over `mode: "open"`:** The host page should not be able to query into the widget root via `host.shadowRoot`. Closed mode + the host element being a `<div data-probot-widget>` means the host page can detect the widget's presence but cannot probe its DOM. CSS isolation is identical either way; the difference is JS reachability.
- **`varchar(7)` not `text` for `themeColor`:** Forces the column to be exactly `#RRGGBB` shape at the DB level. Combined with the Zod regex, it's a defense-in-depth lock — even a buggy direct-SQL write cannot insert `#FFF` or `red` or any other CSS color syntax. The widget's `safeThemeColor` is a third layer (and works without the DB, e.g. if config endpoint returns garbage).
- **`botPatchInput` is its own schema, not `botInput.partial()`:** The full `botInput` includes mutable fields (name, headline, contextText) that the detail page does NOT edit — surfacing them via PATCH would silently widen the attack surface. Whitelist by hand for now; add `headline` etc. when there's a UI that needs them.
- **Native `<input type="color">` over a custom picker:** Free, accessible, works on mobile, gives the OS-native picker on macOS/Windows. The tradeoff (color is browser-themed, not brand-styled) is invisible inside a dashboard the only owner sees.
- **`getOrigin()` extracted to `src/lib/server/origin.ts`:** Two surfaces (dashboard home + bot detail) need the origin. Duplicating the `headers()` + proto-allowlist would risk drift; one helper guarantees both surfaces resolve URLs the same way.
- **Hand-rolled signature HTML over React `renderToString`:** Email clients (Gmail, Outlook, Apple Mail) each strip different tags. Only inline-styled anchors survive all three. The signature template is 4 lines of HTML; React would add no value and might emit attributes (`data-react`, etc.) that get flagged by spam filters.
- **CORS allowlist scoped to public endpoints only (Q4=a, code review confirmed):** `Access-Control-Allow-Origin: *` is only set on `/api/chat/:botId` + `/api/bots/:botId/config`. The PATCH route, the knowledge upload, onboarding, register — all stay same-origin. Confirmed by the code reviewer that named-param patterns in `next.config.js` don't accidentally match neighboring routes.
- **Widget escapes EVERY interpolation point:** Post-review fix wraps `chatUrl` in `escapeHtml`. `encodeURIComponent` handles path-segment escaping for the username; HTML-attribute escaping is a different concern. The lesson: never trust ONE escape function for two different contexts.

**Open questions / follow-ups:**

- Widget chat functionality is the headline Stage 7 task. The widget code is structured so the dialog body can be swapped from "preview notice + CTA" to a real chat surface (input + message history + suggested questions actually clickable) without changing the bubble, the Shadow DOM setup, the CORS plumbing, or the build pipeline.
- The widget bundle has no source map. esbuild can emit one trivially; deferred because debugging happens at the TS source level in dev, not at the minified-bundle level in prod.
- `signatureBadgeHtml` doesn't escape `origin` / `username` / `themeColor` before interpolation. Reviewer flagged LOW; in practice these are all validated sources (regex-allowlisted username, `#RRGGBB` regex-allowlisted themeColor, proto-allowlisted origin) and the snippet is shown only to the authenticated owner in a `<pre><code>` block on the dashboard. Adding `escapeHtml` here would be free belt-and-suspenders defense. Deferred.
- No source-map-supported test that loads `public/widget.js` into a real HTML page (the IIFE auto-mount path is covered by `mount()` tests, but the bundled output is exercised only by manual QA). A `tests/integration/widget.spec.html` Playwright run could cover this; deferred until Stage 7 when there's a real chat path to verify.
- Cross-platform manual testing (WordPress, Wix, Squarespace) — listed in the plan but out of scope for the engineering pass. Will need an actual deployment with a real widget.js URL before this is meaningful.
- Bot detail page has no "Delete bot" action. Stage 6 will add it as part of the analytics surface.

---

### 2026-06-19 21:19 - Stage 6 Slice 6.1: schema additions + chat persistence wiring

**What was asked to do:** Ship Slice 6.1 of Stage 6 from `plan.md` §6 — the foundation work: add the `leads` and `notifications` tables, extend `conversations` with `recruiter_email` and the dashboard-friendly composite indexes, and wire the chat orchestrator to actually write `conversations` + `messages` rows so the analytics surface in slices 6.2–6.5 has data to render.

**Locked decisions before any code (Q1-Q9):** Q1 chat persistence is in scope for Stage 6 (the hidden prerequisite — Stage 4 created the tables but no code writes to them, so analytics would render zeros otherwise). Q2 anonymous-recruiter sessionId is a per-tab UUID in `sessionStorage` (no cookie → no consent surface, defers to Stage 7). Q3 lead-capture card shows after the 3rd assistant reply, exactly once per conversation, dismissable (slice 6.4). Q4 notification bell is global on every dashboard page (slice 6.3). Q5 lead `context_summary` is the concatenated first 2–3 recruiter messages truncated to ~300 chars — deterministic + free; LLM-summarization is rejected per CLAUDE.md §7 zero-cost (slice 6.4). Q6 CSV columns: `captured_at, email, bot_name, context_summary, conversation_id` (slice 6.3). Q7 bot detail surface becomes sub-routed: `/dashboard/bots/[botId]/{conversations,leads,settings}` (slices 6.3 + 6.5). Q8 settings page knowledge management reuses the Bot Factory dropzone component (slice 6.5). Q9 slice plan: 6.1 schema + chat persistence (this slice), 6.2 API endpoints, 6.3 dashboard pages, 6.4 lead capture + bell + polling, 6.5 settings + knowledge UI.

**What I did:**

_Schema additions (`src/lib/db/schema.ts`):_

- `conversations` extended with `recruiterEmail: varchar("recruiter_email", { length: 255 })` (nullable). Comment block updated to explain the slice-6.4 lead-capture role and reiterate that the `leads` table is the canonical record.
- `conversations` gets a new composite index `conversations_bot_started_idx` on `(bot_id, started_at DESC)` — covers the dashboard list-by-recency query in one scan. The existing single-column `botIdIdx` stays (negligible cost; equality lookups can still pick the smaller index).
- `messages` gets a new composite index `messages_conv_created_idx` on `(conversation_id, created_at)` — covers the transcript-viewer scan in one index, replacing what would otherwise be sort-on-heap after a single-column scan.
- NEW `leads` table: `id`, `bot_id` (FK cascade), `conversation_id` (FK **SET NULL** — intentionally not cascade so a GDPR-driven conversation purge in Stage 7 still preserves the lead row; the email is business-valuable even if the chat log is gone), `email`, `context_summary` (nullable; filled by slice 6.4), `captured_at`. Composite index `leads_bot_captured_idx` on `(bot_id, captured_at DESC)`.
- NEW `notifications` table: `id`, `user_id` (FK cascade), `bot_id` (FK cascade, nullable — supports system-level notifications that aren't bot-specific later), `kind` (varchar(40)), `payload` (jsonb), `read_at` (nullable; null = unread), `created_at`. CHECK constraint locks `kind` to the allowed set (`'lead_captured'` only for Stage 6, extensible). Partial index `notifications_user_unread_idx` on `(user_id, created_at DESC) WHERE read_at IS NULL` so the bell-badge unread count is O(unread), not O(total notifications).
- Type exports added: `Lead`, `NewLead`, `Notification`, `NewNotification`.

_Migration (`drizzle/0008_young_wolfpack.sql`):_

- Generated via `npm run db:generate`. Verified contents: 2 CREATE TABLE statements, 1 ALTER TABLE ADD COLUMN (recruiter_email), 4 FK constraints in DO blocks (idempotent), 4 indexes (the 2 composites on existing tables + the partial-on-NULL on notifications + the bot+captured on leads), 1 CHECK constraint on `notifications.kind`. Fully additive — no schema migrations on existing data.

_Chat persistence wiring (`src/app/api/chat/[botId]/route.ts`):_

- Added `sql` to the `drizzle-orm` import (for the `messageCount + 2` increment expression) and `conversations`, `messages` to the `@/lib/db` import.
- Zod input schema gained `sessionId: z.string().uuid()` — required. The reasoning is wired into the inline comment: the per-tab UUID lets the orchestrator UPSERT a single conversation row per recruiter visit so the dashboard analytics can coalesce turns.
- After step 11 (sanitize output) and before the response, a new step 12 wraps the persistence work in a `db.transaction`. Inside: UPSERT into `conversations` keyed by the unique `(bot_id, session_id)` index — on conflict, bump `message_count` by 2 and refresh `last_message_at` to NOW. Returning `{ id: conversations.id }` so we can chain the messages insert. Then insert two `messages` rows (user + assistant) in the same transaction so partial writes are impossible at the Postgres level.
- The whole persistence block is wrapped in `try/catch`. On error, `console.warn("[chat] conversation persistence failed", err)` — analytics persistence MUST NOT break the user-facing chat reply (the primary value), but a silent swallow would obstruct production incident debugging. The log channel matches the existing `[rag]` warn pattern used a few steps earlier for the analogous "fallback path on retrieval failure" case.

_Browser sessionId helper (`src/lib/client/session-id-store.ts`):_

- NEW module mirroring the `llm-key-store.ts` pattern. `isBrowser()` guard, try/catch around storage access, key `probot.chat.sessionId`. `getOrCreateSessionId()` is the single export — reads from `sessionStorage`, generates + persists a new UUID on miss, regenerates on empty string, falls back to a fresh UUID if `sessionStorage` throws (private mode / quota).
- UUID generator: prefers `crypto.randomUUID()` when available (every modern browser + Node 14.17+). Fallback uses `crypto.getRandomValues` with explicit version+variant bit-setting per RFC 4122 — universally available wherever any `crypto` namespace exists. This replaces the original `Math.random` draft after a code-review flag: a guessable sessionId would let an adversary forge another recruiter's conversation key and pollute metrics.

_Chat window wiring (`src/components/chat/ChatWindow.tsx`):_

- Imports `getOrCreateSessionId`. Inside `sendMessage`, calls it once per turn (idempotent on the same tab so this is fine) and includes the result in the JSON body alongside `message`.

_Tests:_

- `src/app/api/chat/[botId]/route.test.ts` — extended the `@/lib/db` mock to expose `db.transaction(cb)` (invokes the callback with a stub `tx` that routes `tx.insert(table)` by call order: 1st → conversation chain, 2nd → messages chain), plus opaque `conversations` and `messages` identity objects. Added `resetPersistenceMocks()` called in `beforeEach`. `makeRequest()` and the Azure-flow `makeAzureRequest()` now inject the default `SESSION_ID` into the body so all pre-existing specs keep passing without churn. Two raw-Request specs got `sessionId` added to their body manually. 6 new specs in a `"conversation persistence (Stage 6)"` describe block: happy-path persists (asserts the convo UPSERT values + the messages array shape), missing-sessionId → 400, non-UUID sessionId → 400, persistence-transaction-throws still returns 200 with reply, rate-limit rejection means the transaction is never reached, sanitize-input rejection means the transaction is never reached. 24 → 30 specs in this file.
- `src/components/chat/ChatWindow.test.tsx` — added `vi.mock("@/lib/client/session-id-store", ...)` with a stable `STABLE_SESSION_ID` constant. Updated the existing "no key in body" spec's equality assertion to include `sessionId`. Added a new spec asserting the sessionId is sent on every turn (two consecutive sends). 9 → 10 specs.
- `src/lib/client/session-id-store.test.ts` — NEW. 5 specs covering happy path (UUID-v4 shape + sessionStorage persistence), idempotence across calls, reload-reuse (pre-seeded value is returned), empty-string regeneration, and the sessionStorage-throw fallback (monkey-patches `Storage.prototype.getItem`).

_Code-review pass (1 HIGH + 1 MEDIUM fix applied):_

- **HIGH: silent catch with no observability.** The original draft swallowed persistence errors with `catch {}` and no log. Even pre-Stage-7-logger, a `console.warn` is cheap and dramatically cuts incident-debugging time. Applied — log channel matches the project's existing `[rag]` swallow-and-warn pattern in the same file.
- **MEDIUM: Math.random UUID fallback was guessable.** Replaced with `crypto.getRandomValues` + manual RFC 4122 version/variant bits. The fallback path is unreachable in any modern runtime, but a guessable session ID would let an adversary forge another recruiter's conversation key.
- The reviewer also flagged "RLS-no-policies on the new tables" as MEDIUM. **Not applied** — this is the project's documented pattern (see schema comment on `users` lines 22-24): RLS is enabled with no policies so Supabase PostgREST `anon`/`authenticated` roles are denied by default; the app's `pg.Pool` connects as the table-owner role which is unaffected because we do NOT use `FORCE ROW LEVEL SECURITY`. All 7 existing tables follow this pattern; the 2 new ones match.
- LOW findings (mock dispatches by call order, nullable-FK-with-cascade on notifications.botId) were acknowledged design choices in the review brief; not applied.

**Files changed:**

- `src/lib/db/schema.ts` — update — `recruiter_email`, 2 composite indexes, `leads` table, `notifications` table, 4 new type exports.
- `drizzle/0008_young_wolfpack.sql` — create — generated migration (2 tables, 1 ALTER, 4 FKs, 4 indexes, 1 CHECK).
- `src/app/api/chat/[botId]/route.ts` — update — `sessionId` Zod field, persistence transaction (step 12), `console.warn` on swallow, `sql` + `conversations`/`messages` imports.
- `src/app/api/chat/[botId]/route.test.ts` — update — mock extension, `resetPersistenceMocks`, default `sessionId` injection, 6 new specs.
- `src/lib/client/session-id-store.ts` — create — `getOrCreateSessionId` + crypto-grade UUID fallback.
- `src/lib/client/session-id-store.test.ts` — create — 5 specs.
- `src/components/chat/ChatWindow.tsx` — update — call `getOrCreateSessionId`, include in body.
- `src/components/chat/ChatWindow.test.tsx` — update — mock the store, assert sessionId in body, 1 new spec.

Total: 450/450 tests pass, build green.

**Decisions made:**

- **`leads.conversation_id ON DELETE SET NULL`, not CASCADE.** A GDPR-driven conversation purge in Stage 7 should not destroy the lead — the email is the business-valuable artifact, distinct from the chat log. Set-null preserves the lead while severing the reference.
- **Per-tab `sessionStorage` over `localStorage` for sessionId.** Per-tab (vs. cross-tab) matches the analytics intent — different tabs from the same recruiter on the same bot are different conversations from the bot owner's perspective. Sessionstorage also has no cookie semantics, so the consent surface stays parked in Stage 7.
- **Swallow + warn (not swallow-silent, not throw) on persistence failure.** Throwing would break the chat for an analytics-only failure. Silent would obstruct production debugging. `console.warn` is the cheap middle path until Stage 7 wires a structured logger.
- **Composite indexes added; single-column kept.** The new `(bot_id, started_at DESC)` and `(conversation_id, created_at)` indexes cover the dashboard scans. Keeping the existing single-column indexes is ~7 KB per index and lets the Postgres planner pick whichever is best for equality lookups; not worth the migration noise to drop them.
- **`notifications.kind` CHECK constraint at the DB level.** Mirrors the `messages.role` pattern. A typo (e.g., `'leads_captured'` instead of `'lead_captured'`) in some future writer would silently break the unread badge query; the CHECK turns that bug into a loud INSERT failure.
- **Partial index `WHERE read_at IS NULL` on notifications.** The bell badge's hot query is "unread notifications for user X". Indexing only the unread rows keeps the structure tiny and the scan O(unread) — typically O(<10) — instead of O(all notifications ever).
- **`Math.random` is unacceptable for security-adjacent identifiers, even in fallback paths.** A reviewer-flagged MEDIUM that I would have shipped otherwise: even though `crypto.randomUUID` is universally available, the fallback path is what gets exercised on dusty WebViews — and a guessable sessionId is a non-trivial pollution vector.

**Open questions / follow-ups:**

- The `messageCount += 2` increment assumes every chat turn produces exactly one user + one assistant message. True for the current non-streaming `complete()` path. When streaming lands (out of Stage 1 scope, deferred to Stage 7+), the message-count math will need to change to count assistant-side-events differently.
- `tokens_used` on `messages` is left NULL. Provider response shapes diverge (`usage` field availability varies), and the dashboard doesn't render this yet. Wire it in slice 6.2 if cheaply available from `provider.complete()`.
- No integration test that exercises the migration against a real Postgres. Drizzle's generator is deterministic but a `db:push` against a Supabase-style instance is a reasonable manual QA gate before merging.
- The schema-wide deprecation hints on `pgTable(name, columns, extraConfig)` apply to every table in the file (pre-existing). Migration to the new `pgTable(name, columns, (table) => [...])` signature is a clean refactor opportunity but explicitly out of scope for this surgical slice.
- Slice 6.2 (next) wires the `/analytics`, `/conversations`, `/leads`, `/notifications` API endpoints on top of this foundation.

---

### 2026-06-19 22:00 - Stage 6 Slice 6.2: dashboard + lead-capture + notification API endpoints

**What was asked to do:** Build the ten Stage 6 read/write endpoints on top of the slice-6.1 schema. Three groups: (1) owner-gated bot endpoints powering the dashboard overview cards, conversation list/detail, and lead list/CSV-export; (2) one anonymous CORS-public endpoint for chat-UI lead capture; (3) four session-scoped notification endpoints behind the dashboard bell badge + 30s polling target. No UI in this slice (lands in 6.3 and 6.4).

**Locked decisions before any code (Q1-Q9):** Q1 pagination shape is `{ items, total, page, limit }` everywhere (page-based, friendly for "page X of Y" UI, matches plan §6.4 query params). Q2 no rate limit on POST `/leads` — explicit deferral to Stage 7's Redis layer; the chat route's upstream per-bot limit is the natural gate and the lead-capture endpoint itself has a 4 KB body cap + idempotent dedupe + 24h email-only fallback window to bound noise. Q3 POST `/leads` is idempotent on `(botId, conversationId, lowercased-email)` — second submit returns `{ deduped: true }` with the existing row instead of polluting the notification feed. Q4 CSV: UTF-8 BOM, RFC 4180 quoting (`,`, `"`, `\r`, `\n`, U+2028, U+2029 → quote), CRLF line endings, ISO-8601 timestamps. Q5 conversation list supports `?q=<text>` ILIKE search on both `recruiter_email` and the first-user-message preview, in addition to pagination. Q6 leads POST is CORS-public. Q7 notification `payload` for `lead_captured` pre-denormalizes `botName` so the bell-list dropdown doesn't need a join per row. Q8 notification ownership on POST `/[id]/read` is checked in the WHERE clause (`AND user_id = session.userId`) — single statement, 0-row update → 404, never a separate SELECT. Q9 single-pass slice (not split 6.2a/b).

**What I did:**

_Helpers (4 new):_

- `src/lib/auth/require-session.ts` — discriminated-union session check parallel to `requireBotOwner`. Returns `{ ok: true, userId, username }` or `{ ok: false, response }` so notification routes can `return result.response` on failure without exception detour.
- `src/lib/pagination.ts` — `parsePagination(searchParams, opts?)` → `{ page, limit, offset }` or 400 response. `DEFAULT_PAGE=1`, `DEFAULT_LIMIT=20`, `MAX_LIMIT=100`. `Number.isInteger` guards prevent silent NaN propagation from `?page=1.5` or `?page=abc`.
- `src/lib/csv.ts` — RFC 4180 escaper. `CSV_NEEDS_QUOTE` regex covers `,`, `"`, `\r`, `\n`, U+2028, U+2029 (built via `new RegExp(string)` because U+2028/U+2029 are JS source-level line terminators and would close a regex literal mid-pattern). UTF-8 BOM prefix for Excel mojibake protection, CRLF line endings, generic `toCsv<T>(rows, columns)` with per-column `cell` extractors.
- `src/lib/leads/schemas.ts` — Zod `leadCaptureInput`: `email` is `.trim().toLowerCase()` for idempotent dedupe + `.email().max(255)`; `conversationId` optional UUID; `contextSummary` optional, capped at 1024 chars to bound row size + prevent abuse.

_Owner-gated bot endpoints (5 new):_

- `GET /api/bots/[botId]/analytics` — Three parallel COUNT queries (conversations totals + this-month, messages-via-join total, leads totals + this-month) instead of the plan's 4-way LEFT JOIN. The JOIN multiplies rows (one bot × many convos × many messages × many leads → cartesian explosion before SUMs); three small COUNTs hit the slice-6.1 indexes and each return one row. Returns the five integers `{ totalConversations, totalMessages, totalLeads, conversationsThisMonth, leadsThisMonth }`. "This month" is rolling 30-day window (not calendar month) per plan §6.5.
- `GET /api/bots/[botId]/conversations?page&limit&q` — Paginated list. Each row carries `firstUserMessage` as a 200-char LEFT() of the first user-role message via a LATERAL subquery — no N+1 round-trips. `?q=<text>` does case-insensitive `ILIKE %q%` on both `recruiter_email` and the first-message preview. Both columns are scoped to `bot_id` so the filter scans a small per-bot subset covered by the slice-6.1 `conversations_bot_started_idx`.
- `GET /api/bots/[botId]/conversations/[convId]` — Transcript viewer. `findFirst` with `AND(eq(conversations.id, convId), eq(conversations.botId, bot.id))` so a forged convId targeting another owner's conversation returns 404, not a leak. Messages embedded in chronological order (covered by slice-6.1 `messages_conv_created_idx`).
- `GET /api/bots/[botId]/leads?page&limit` — Paginated lead list, ordered by `captured_at DESC` (covered by slice-6.1 `leads_bot_captured_idx`).
- `GET /api/bots/[botId]/leads/export` — CSV download. 50K row hard cap (DoS protection). Columns: `captured_at, email, bot_name, context_summary, conversation_id` (per slice-6.2 Q4 lock). Filename = `leads-<sanitized-bot-name>-<YYYY-MM-DD>.csv` with both ASCII `filename="…"` and RFC 5987 `filename*=UTF-8''…` parameters so non-ASCII bot names render correctly on every browser. `Content-Disposition: attachment; Cache-Control: no-store`.

_Public CORS endpoint (1 new):_

- `POST /api/bots/[botId]/leads` — Anonymous + cross-origin. 12-step flow: content-type → 4 KB body cap (measured from `request.text()`, not the spoofable Content-Length) → JSON parse → Zod validate (lowercases email) → resolve bot with `isActive=true` filter → idempotent dedupe (existing row on `(botId, conversationId, email)` → return `{ deduped: true }`, or the 24h `(botId, email)` fallback when no convId) → `db.transaction` writing three rows atomically: insert lead, update `conversations.recruiter_email` if convId, insert `notifications` row with `kind='lead_captured'` and pre-denormalized `botName` in the payload. CORS handled in-handler via `jsonWithCors()` helper on every response path (no `next.config.js` change needed — the leads route is self-contained, unlike chat which relies on `next.config.js`). `OPTIONS` handler uses the shared `corsPreflight()` from slice 5. On transaction throw: `console.warn` (matches the `[chat]` / `[rag]` warn pattern) + 500 `{ error: "capture_failed" }`. Same `try/catch` rule as slice 6.1: failure logs but doesn't break the chat UI's optimistic-success animation.

_Session-scoped notification endpoints (4 new):_

- `GET /api/notifications?unread&page&limit` — Paginated feed. Returns `{ items, total, page, limit, unreadCount }` so the dropdown can render the badge in sync without a follow-up `/unread-count` round-trip. Optional `?unread=true` narrows to unread rows, hitting the slice-6.1 partial index `notifications_user_unread_idx`.
- `GET /api/notifications/unread-count` — Returns `{ count }`. Hits the same partial index. Cheap polling target (dashboard bell will hit this every 30s in slice 6.4).
- `POST /api/notifications/[id]/read` — UUID-shape check first (early 400). UPDATE with `WHERE id = ? AND user_id = session.userId` — single statement, no SELECT. 0 rows affected → 404 (handles both "doesn't exist" and "belongs to another user"; never leaks existence cross-tenant). Returns `{ id, readAt }` where `readAt` is captured once and used for both the persisted column and the response body (post-review fix — two `new Date()` calls produced microsecond skew).
- `POST /api/notifications/read-all` — Bulk UPDATE on `user_id = session.userId AND read_at IS NULL`. Returns `{ markedRead: <row count> }` so the dashboard can pre-flip its local unread state.

_Code-review pass (1 HIGH + 2 MEDIUM fixes applied):_

- **HIGH: `readAt` clock skew on POST `/notifications/[id]/read`.** Original code did `new Date()` twice — once in the SET payload, once in the response JSON. The two timestamps differed by microseconds (harmless but semantically wrong: the response promised a timestamp that was never persisted). Fixed by capturing `const now = new Date()` once and using it in both places.
- **MEDIUM: RFC 5987 `filename*` parameter on CSV export.** ASCII-only `safeFilenameSegment` correctly strips unsafe chars, but for non-ASCII bot names ("Jané Doe 日本") the resulting filename degenerated to dashes. Added the parallel `filename*=UTF-8''<percent-encoded>` parameter so every modern browser renders the original name; ASCII `filename="..."` stays as the legacy-client fallback. Test asserts both parameters are present and the percent-encoded UTF-8 (e.g. `Jan%C3%A9`) appears.
- **MEDIUM: U+2028/U+2029 in CSV cells.** Regex extended from `[",\r\n]` to `[",\r\n  ]` because Google Sheets and older Excel parse those as row terminators in unquoted cells, which would silently split a `context_summary` across CSV rows. The regex is built via `new RegExp(string-literal)` because those code points are JS source-level line terminators that would close a `/.../` regex literal mid-pattern. Test asserts both code points trigger wrapping.
- **HIGH not applied: rate limit on POST `/leads`.** Reviewer flagged the missing rate limit; this was the user-confirmed Q2 deferral to Stage 7 Redis. Added a doc comment to the route explaining the layered defenses that bound noise in the meantime (4 KB body cap + Zod + idempotent dedupe + 24h fallback window) and that the deferral is explicit.
- **LOW not applied: `console.warn`.** Reviewer flagged it per a strict reading of CLAUDE.md no-`console.log`, but the project's accepted pattern (post slice-6.1 review) is exactly this — `console.warn("[<surface>] <event>", err)` for warn-and-continue paths, replaced wholesale in Stage 7 by a structured logger. Same pattern in `[chat]` and `[rag]` channels.
- **LOW not applied: `Access-Control-Expose-Headers`.** Reviewer noted "no fix needed at this stage" — flagged only as a heads-up for future slices that might add a custom response header the widget needs to read.

**Files changed:**

_Helpers:_

- `src/lib/auth/require-session.ts` — create — session check with discriminated union.
- `src/lib/pagination.ts` — create — `parsePagination` + constants.
- `src/lib/pagination.test.ts` — create — 8 specs.
- `src/lib/csv.ts` — create — RFC 4180 escaper + `toCsv<T>`.
- `src/lib/csv.test.ts` — create — 10 specs (incl. U+2028/U+2029 quoting + null cells).
- `src/lib/leads/schemas.ts` — create — Zod for lead-capture POST body.
- `src/lib/leads/schemas.test.ts` — create — 7 specs.

_Endpoints:_

- `src/app/api/bots/[botId]/analytics/route.ts` — create — five-metric overview.
- `src/app/api/bots/[botId]/analytics/route.test.ts` — create — 3 specs.
- `src/app/api/bots/[botId]/conversations/route.ts` — create — list + `?q` search.
- `src/app/api/bots/[botId]/conversations/route.test.ts` — create — 5 specs.
- `src/app/api/bots/[botId]/conversations/[convId]/route.ts` — create — transcript.
- `src/app/api/bots/[botId]/conversations/[convId]/route.test.ts` — create — 4 specs.
- `src/app/api/bots/[botId]/leads/route.ts` — create — GET (owner) + POST (CORS) + OPTIONS.
- `src/app/api/bots/[botId]/leads/route.test.ts` — create — 14 specs.
- `src/app/api/bots/[botId]/leads/export/route.ts` — create — CSV export with RFC 5987 filename.
- `src/app/api/bots/[botId]/leads/export/route.test.ts` — create — 4 specs.
- `src/app/api/notifications/route.ts` — create — list + unread filter + unread count co-rendered.
- `src/app/api/notifications/route.test.ts` — create — 4 specs.
- `src/app/api/notifications/unread-count/route.ts` — create — `{ count }`.
- `src/app/api/notifications/unread-count/route.test.ts` — create — 3 specs.
- `src/app/api/notifications/[id]/read/route.ts` — create — single-row UPDATE with ownership.
- `src/app/api/notifications/[id]/read/route.test.ts` — create — 4 specs.
- `src/app/api/notifications/read-all/route.ts` — create — bulk UPDATE.
- `src/app/api/notifications/read-all/route.test.ts` — create — 3 specs.

Total: 13 new source files + 11 new test files. 521/521 tests pass (450 → 521, net +71), build green.

**Decisions made:**

- **Three small COUNTs over one 4-way LEFT JOIN in analytics.** The plan's SQL `SELECT COUNT(DISTINCT c.id), SUM(c.message_count), COUNT(DISTINCT l.id), ... FROM bots b LEFT JOIN conversations c LEFT JOIN messages m LEFT JOIN leads l WHERE b.id = :botId` is correct but explodes cartesian rows before the SUMs/DISTINCTs aggregate them. Three separate `COUNT(*)::int` queries scoped by `bot_id` each scan a small per-bot index slice and return one row. Postgres planner has no surprises here — equivalent to writing the queries yourself in `psql`.
- **`FIRST_USER_MESSAGE_SQL` as a shared `sql<>` constant.** Drizzle's `sql` template is a descriptor object, so spreading the same reference into both the SELECT projection (to display) and the WHERE clause (for `ILIKE %q%` filtering) is structurally fine — the ORM re-renders it per query. Tradeoff: the count query also runs the subquery, paying the cost even when the preview text is irrelevant. Acceptable at slice-6.2 scale; tech debt logged for if any single bot ever has 10K+ conversations.
- **Idempotent dedupe over server-side rate limiting.** `(botId, conversationId, lowercased email)` is the natural dedupe key for the chat-driven path. The 24h email-only fallback bounds noise when no convId is supplied (lead capture from a misbehaving widget without sessionId). Both layers together absorb double-submits + drag-out spam without inventing a token bucket; the real rate limit lands with Stage 7's Redis layer.
- **`bots.findFirst(isActive=true)` on lead capture.** An owner who flips a bot inactive should not still be receiving leads on it (potential GDPR / off-boarding concern). The Stage 1 chat route already has the same gate; leads inherits.
- **CSV `new RegExp(string)` over regex literal.** U+2028 and U+2029 cannot appear in a regex literal (they close it as line terminators), but can be written via the ` ` / ` ` escape syntax inside a backtick-or-double-quoted string. Building the regex from a string sidesteps the source-level termination problem.
- **RFC 5987 `filename*` over silent ASCII-only.** A bot named "Jané Doe" exporting leads previously got `leads-Jan-Doe-2026-06-19.csv` with the accent silently dropped. The dual-parameter form (`filename="ascii"; filename*=UTF-8''percent-encoded`) is the WHATWG-recommended shape — browsers prefer `filename*` when present, fall back to `filename` when not.
- **Capture `readAt` once in notification-read.** The reviewer-flagged HIGH was small in absolute impact (microsecond skew) but worth fixing for semantic correctness — the API contract says "we set readAt to X and returned X"; two `new Date()` calls produce two different X's.
- **No `next.config.js` CORS change for leads POST.** Unlike the chat route which keeps `POST` body bare and lets `next.config.js` inject CORS headers, the leads route returns through a `jsonWithCors` helper that attaches the headers on every code path. Two CORS strategies coexist in the codebase; this one is self-contained at the route file, which is preferable for endpoints that mix public + owner-gated handlers under the same path.

**Open questions / follow-ups:**

- The `FIRST_USER_MESSAGE_SQL` LATERAL subquery runs in both the rows query AND the count query for conversations list. The count query doesn't need the preview text. Splitting that off into two separate `sql` descriptors (one with preview for the rows query, one without for the count) would let the count avoid the join entirely. Acceptable now; revisit when any bot reaches 10K+ conversations and the dashboard list page starts feeling slow.
- The 4 KB body cap on POST `/leads` is conservative — the largest legitimate payload is `email` (255) + `conversationId` (36) + `contextSummary` (1024) plus JSON overhead, well under 2 KB. Raise the cap if Stage 6.4 ever needs to send a richer payload.
- Notification `payload` is `jsonb` with a permissive `Record<string, unknown>` TS type. A future slice could narrow this with a discriminated union keyed on `kind` for stronger type guarantees on the dashboard side. Not blocking; today there's only one `kind`.
- Slice 6.3 (next) wires the dashboard UI pages on top of these endpoints: overview cards, conversation list/detail, lead list, CSV download. Slice 6.4 adds the in-chat lead-capture card + the bell + 30s polling. Slice 6.5 adds the settings page (editable name/headline/personality/suggested questions + knowledge management UI).

---

### 2026-06-19 22:32 - Stage 6 Slice 6.3: dashboard UI pages + shared query extraction

**What was asked to do:** Build the dashboard UI pages on top of the slice-6.1 schema + slice-6.2 endpoints. Three new sub-routes for each bot (`/conversations`, `/conversations/[convId]`, `/leads`), an aggregated stat row on the dashboard home, and per-bot stat row + sub-nav on the existing bot detail page. Also extract the data-fetching SQL into shared query modules so the API routes (slice 6.2) and the new RSC pages (slice 6.3) call into one place instead of duplicating the same Drizzle queries.

**Locked decisions before any code (Q1-Q10):** Q1 yes, extract shared queries — correctness over churn. Q2 (a) server-render via direct Drizzle queries — matches existing dashboard pattern, no double-network. Q3 (a) linear sub-routes, not tabs in the detail page — bookmarkable, matches plan §6.3. Q4 (a) `useTransition` + `router.replace` for debounced search — Next 14 idiomatic. Q5 (b) react-markdown + remark-gfm for the transcript bubbles — recruiter saw markdown in the chat, the dashboard transcript should match. Q6 lead → conversation link confirmed. Q7 fixed rolling 30-day window; range picker deferred to Stage 7. Q8 empty-state copy drafted, user can revise later. Q9 (a) one global stat row at the top of the dashboard home, then the bot list cards. Q10 single-pass slice (not split 6.3a/b).

**What I did:**

_Shared query modules (3 new — SQL lives in one place):_

- `src/lib/analytics/queries.ts` — `getAnalyticsForBot(botId)` returns the five-metric snapshot the slice-6.2 endpoint already shipped; `getAnalyticsForUser(userId)` adds an aggregated version that joins across all bots the user owns (bots → conversations → messages, bots → leads). Both use parallel small COUNTs over per-tenant index slices rather than a cartesian-explosion 4-way LEFT JOIN.
- `src/lib/conversations/queries.ts` — `listConversations({ botId, q, limit, offset })` with the LATERAL `firstUserMessage` subquery + optional `?q=` ILIKE on email/preview; `getConversationWithMessages({ botId, conversationId })` for the transcript viewer, with the cross-tenant filter (`AND bot_id = ?`) embedded so a forged convId targeting another owner's conversation returns null.
- `src/lib/leads/queries.ts` — `listLeads({ botId, limit, offset })` for the paginated list + `listAllLeadsForExport({ botId })` for the CSV with a 50K row cap. Module-level doc comment makes the **tenancy contract** explicit: callers MUST have verified bot ownership upstream; the functions do not check it themselves.

_Slice-6.2 route refactor (no behavior change — all 31 existing route tests still pass):_

- 4 routes refactored to delegate to the shared queries: `analytics/route.ts`, `conversations/route.ts`, `conversations/[convId]/route.ts`, `leads/route.ts` (GET only — POST/OPTIONS handlers unchanged), `leads/export/route.ts`. The routes are now thin: parse pagination, call the shared function, wrap the result in `NextResponse.json`.

_Dashboard components (5 new):_

- `src/components/dashboard/StatCard.tsx` — label + big tabular-num value + optional hint. Reused 9× across pages.
- `src/components/dashboard/EmptyState.tsx` — title + body + optional action node. Reused for empty conversation list, empty lead list, search-no-results.
- `src/components/dashboard/Pagination.tsx` — URL-driven prev/next + "Page X of Y" indicator. Renders nothing when total fits in one page so callers don't need to gate. `extraParams` prop preserves other query params (e.g. `?q=`) across pagination clicks. Page 1 omits the `?page=` param entirely (canonical URL).
- `src/components/dashboard/SearchBar.tsx` — client component, 300ms debounced `?q=` updater. `router.replace` (not `push`) so back button doesn't fill with keystrokes. Wraps the update in `useTransition` so the input stays responsive while the server-rendered list re-fetches. Drops `?page=` on every search change so a search after navigating to page 5 doesn't land on an empty filtered page. Syncs state from URL on `searchParams` change (defense against stale value when external nav happens). `aria-label` mirrors `placeholder`.
- `src/components/dashboard/TranscriptMessage.tsx` — read-only message bubble. User-role right-aligned in brand-color with `whitespace-pre-wrap`; assistant-role left-aligned in white with `prose prose-sm` markdown styling. Every rendered `<a>` flows through a `SafeLink` component that adds `rel="noopener noreferrer" target="_blank"` — same defense the live chat MessageBubble uses against `window.opener` reach-back from stored transcript text.

_Dashboard pages (3 new, 2 extended):_

- `/dashboard` (extend) — aggregated 5-card stat row at the top (bots, conversations, messages, leads, leads-this-month). Renders only when `totalBots > 0` so first-time visitors still see the existing empty-state CTA instead of a row of zeros. Existing bot-list cards below unchanged.
- `/dashboard/bots/[botId]` (extend) — adds a 4-card per-bot stat row (conversations, messages, leads, live/off status) above the Share/Embed/Theme sections, plus a "Conversations →" + "Leads →" sub-nav strip. Reuses `getAnalyticsForBot` from the shared module.
- `/dashboard/bots/[botId]/conversations` (NEW) — paginated list, server-rendered. Each card: recruiter email or "Anonymous" + 2-line clamped first-user-message preview + relative-time `relTime` formatter + message count. Client `<SearchBar>` updates `?q=` in the URL; server reads `searchParams.q` on the next render. Empty-state copy varies: with `?q=`, "No conversations match \"<q>\"" + clear-search hint; without, "No one has chatted with <bot> yet" + a CTA to the bot detail page.
- `/dashboard/bots/[botId]/conversations/[convId]` (NEW) — transcript viewer. Header card shows recruiter email (or "Anonymous conversation") + start time + message count + safe `mailto:` button (defense-in-depth Zod-like email regex guard before generating the href). Messages rendered chronologically via `TranscriptMessage`.
- `/dashboard/bots/[botId]/leads` (NEW) — paginated list. Each card: clickable safe-mailto email + context summary + capture timestamp + optional "View conversation →" link. "Export CSV" anchor at top-right (only when `total > 0`) points at `/api/bots/[botId]/leads/export` with `download` attribute; same-origin so the session cookie carries auth, no JS gymnastics.

_Code-review pass (2 HIGH + 2 MEDIUM + 1 LOW fixes applied):_

- **HIGH: SearchBar stale value sync.** Original code seeded `value` from `searchParams` at mount but never re-synced. If the URL's `?q=` changed externally (browser nav, server-driven redirect), the input would render the old value while the list reflected the new one. Fixed with a `useEffect([searchParams, paramName])` that calls `setValue` when the URL diverges from local state. Added a regression test asserting aria-label exposure for screen readers.
- **HIGH: `ilike` on a LATERAL subquery expression.** Reviewer flagged that passing a raw `sql<>` template (the LATERAL subquery) as the left operand of Drizzle's `ilike()` helper is dialect-dependent — the safer pattern is explicit `sql\`(${FIRST_USER_MESSAGE_SQL}) ILIKE ${pattern}\`` so the operator wraps a parenthesized scalar-subquery operand. Postgres parses scalar subqueries as ILIKE operands fine, but the explicit form removes ambiguity about what Drizzle's helper emits and is grep-friendly when reading the source.
- **MEDIUM: `mailto:` href XSS defense-in-depth.** Email is Zod-validated at lead-capture time (`.email()`), but a future schema drift or direct-DB write must not let a malformed value flow into an href that a screen reader announces or a click follows. Added `SAFE_EMAIL` regex + `safeMailtoHref()` helper to both the conversation detail page and the leads list page. When validation fails the email renders as plain text instead of a clickable link.
- **MEDIUM: shared-query tenancy contract docs.** Reviewer flagged that `listLeads`, `listConversations`, etc. take a `botId` and trust the caller has verified ownership. Added a clear module-level doc comment to both `src/lib/leads/queries.ts` and `src/lib/conversations/queries.ts` so a future contributor introducing a new call site can't accidentally skip the upstream guard.
- **LOW: SearchBar missing aria-label.** Added `aria-label={placeholder}` and a regression test. Screen readers now have a stable label even if the placeholder text is empty.

**Files changed:**

_Shared queries:_

- `src/lib/analytics/queries.ts` — create — `getAnalyticsForBot` + `getAnalyticsForUser`.
- `src/lib/conversations/queries.ts` — create — `listConversations` + `getConversationWithMessages` + tenancy doc + safe LATERAL ILIKE.
- `src/lib/leads/queries.ts` — create — `listLeads` + `listAllLeadsForExport` + tenancy doc.

_Slice-6.2 route refactor (no test changes needed — behavior identical):_

- `src/app/api/bots/[botId]/analytics/route.ts` — update — delegates to `getAnalyticsForBot`.
- `src/app/api/bots/[botId]/conversations/route.ts` — update — delegates to `listConversations`.
- `src/app/api/bots/[botId]/conversations/[convId]/route.ts` — update — delegates to `getConversationWithMessages`.
- `src/app/api/bots/[botId]/leads/route.ts` — update — GET delegates to `listLeads`; POST + OPTIONS unchanged.
- `src/app/api/bots/[botId]/leads/export/route.ts` — update — delegates to `listAllLeadsForExport`.

_Components:_

- `src/components/dashboard/StatCard.tsx` — create — 4 specs.
- `src/components/dashboard/StatCard.test.tsx` — create.
- `src/components/dashboard/EmptyState.tsx` — create — 3 specs.
- `src/components/dashboard/EmptyState.test.tsx` — create.
- `src/components/dashboard/Pagination.tsx` — create — 6 specs.
- `src/components/dashboard/Pagination.test.tsx` — create.
- `src/components/dashboard/SearchBar.tsx` — create — 5 specs (incl. aria-label regression).
- `src/components/dashboard/SearchBar.test.tsx` — create.
- `src/components/dashboard/TranscriptMessage.tsx` — create — 4 specs.
- `src/components/dashboard/TranscriptMessage.test.tsx` — create.

_Pages:_

- `src/app/(dashboard)/dashboard/page.tsx` — update — aggregated stat row.
- `src/app/(dashboard)/dashboard/bots/[botId]/page.tsx` — update — per-bot stat row + sub-nav.
- `src/app/(dashboard)/dashboard/bots/[botId]/conversations/page.tsx` — create — paginated list + search.
- `src/app/(dashboard)/dashboard/bots/[botId]/conversations/page.test.tsx` — create — 6 specs.
- `src/app/(dashboard)/dashboard/bots/[botId]/conversations/[convId]/page.tsx` — create — transcript viewer + safe mailto.
- `src/app/(dashboard)/dashboard/bots/[botId]/conversations/[convId]/page.test.tsx` — create — 5 specs.
- `src/app/(dashboard)/dashboard/bots/[botId]/leads/page.tsx` — create — list + CSV anchor + safe mailto.
- `src/app/(dashboard)/dashboard/bots/[botId]/leads/page.test.tsx` — create — 5 specs.

Total: 8 new components/pages + 3 new shared modules + 8 new test files + 5 route refactors + 2 page extensions. 559/559 tests pass (521 → 559, net +38), build green, all 5 new dashboard sub-routes register in the production build.

**Decisions made:**

- **Shared queries take `botId`, not `(botId, userId)`.** The functions trust the caller has done the ownership check. Rationale: forcing every caller to thread `userId` would couple the query layer to the auth-session shape, and the existing dashboard pattern (`requireBotOwner` returns the validated bot, then call queries with `bot.id`) is already grep-friendly. The tradeoff is captured in the module-level doc comment so future contributors don't introduce a bypass.
- **Server-render with direct Drizzle queries (no client fetch).** RSC reads `searchParams.q` + `searchParams.page` and calls `listConversations` directly. Pagination + search are URL-driven; the only client component on the list page is `<SearchBar>` for the debounced `?q=` update. Result: bookmarkable URLs, server-side caching benefits, no loading skeletons, browser back/forward works for free.
- **`router.replace` over `router.push` in SearchBar.** Pushing every debounce-flush would clog the history stack (typing "python" → 6 history entries). Replace keeps the most recent search visible to browser back without filling the stack.
- **Drop `?page=` from the URL on search change.** Searches after navigating to page 5 of the unfiltered list would otherwise land on page 5 of the filtered list, which is almost always empty. Reset to page 1 (implicit by omitting the param) on every search change.
- **`Page 1` omits `?page=` from the URL.** The canonical URL has no `page` param at all — keeps the address bar clean for the most common state.
- **Empty-state copy varies on `?q=` presence.** "No conversations match \"python\"" + clear-search hint when filtered; "No one has chatted with <bot> yet" + CTA when unfiltered. Two distinct user states deserve distinct messages.
- **Transcript bubbles use the same Markdown rendering as the live chat.** The recruiter saw `**bold**` and links rendered in the chat at the time. The dashboard transcript should match what they saw, not a downgraded plain-text version. Cost: re-rendering markdown server-side; benefit: visual fidelity.
- **`SafeLink` mirrors the live chat MessageBubble.** Stored transcript text could contain `https://evil.com` that the bot replied with months ago. Without `rel="noopener noreferrer"`, clicking such a link gives the destination's JS access to `window.opener` of the dashboard page. The defense is cheap (one component wrapper); skipping it would be a `tabnabbing` exposure.
- **Explicit `sql\`\`` over Drizzle's `ilike()` for the LATERAL subquery.** The helper's behavior when its first argument is a raw `sql<>` template depends on dialect-internal wrapping. The explicit form removes ambiguity, is grep-friendly, and produces SQL a Postgres engineer can read on sight: `(SELECT LEFT(...) FROM messages WHERE ...) ILIKE '%q%'`.
- **`mailto:` href validated before render.** Even though emails are Zod-validated at lead capture, the cost of a defense-in-depth regex check before generating an href is ~5 lines and zero runtime. A schema drift, an admin SQL backfill, or any future write path that bypasses the lead-capture endpoint could otherwise land malformed text in the field; the validation ensures it cannot flow into an attribute click target.

**Open questions / follow-ups:**

- The shared query modules don't have direct unit tests. They're transitively covered by the (still-passing) slice-6.2 route tests and the slice-6.3 page tests (which mock the shared modules). Direct unit tests would catch SQL-level regressions before mocks; defer until Stage 7 integration tests run against a real Postgres.
- The conversations list's LATERAL subquery still runs once for the projection AND once for the count query (acknowledged tech debt from slice-6.2 review). Refactoring to a CTE that runs the subquery once would let Postgres reuse the result. Defer until a bot reaches 10K+ conversations and the list page feels slow.
- The transcript viewer renders Markdown for every message. For very long conversations (50+ turns), this could be visible CPU cost on the initial render. If profiling shows it, switch to incremental rendering (React.lazy per bubble) or a server-rendered HTML cache. Not blocking today.
- The dashboard home stat row is only shown when `totalBots > 0`. A user who deleted all their bots would still see this row at 0/0/0 because `totalBots > 0` is false — but they'd also see the empty-bot CTA, so the UX is coherent. If we later add an "archived bots" state, the trigger condition might need rethinking.
- Slice 6.4 (next) wires the in-chat lead-capture card + the dashboard notification bell + 30s polling on `/api/notifications/unread-count`.
- Slice 6.5 (final Stage 6 slice) adds the settings page + knowledge management UI: editable name/headline/personality/suggested questions + reuse of the Bot Factory dropzone for knowledge sources.

---

### 2026-06-20 05:57 - Stage 6 Slice 6.4: in-chat lead capture + notification bell + 30s polling

**What was asked to do:** Ship the two coordinated UX surfaces that make Stage 6 a complete loop — the recruiter-side in-chat lead-capture card that appears after the 3rd assistant reply, and the owner-side dashboard notification bell with 30s polling on `/api/notifications/unread-count`. Both halves consume the slice-6.2 endpoints (POST `/leads`, GET `/notifications`, GET `/notifications/unread-count`, POST `/notifications/[id]/read`, POST `/notifications/read-all`). The lead-capture path also requires extending the chat route to return `conversationId` so the card can include it in its POST body for idempotent `(botId, conversationId, email)` dedupe + `conversations.recruiter_email` update.

**Locked decisions before any code (Q1-Q9):** Q1 (a) the lead-capture card is modeled as a new ChatMessage variant `{ role: "system"; kind: "lead_capture" }` rendered inline in the message map — visually coherent, reuses scroll-to-bottom, single state container. Q2 (a) inline "Thanks! {bot} will be in touch" replaces the card on Submit (no toast infra to build). Q3 (a) Skip is permanent for the conversation; no re-show after 5 more replies (respect the dismissal). Q4 (a) clicking a notification row marks read + navigates in one action. Q5 30s polling + Page Visibility API pause when tab hidden. Q6 dropdown closes on outside click, ESC, or notification click. Q7 empty state "You're all caught up." with the "Mark all read" button hidden when nothing is unread. Q8 bell badge caps at "9+" for >= 10. Q9 (a) single-pass slice — both halves ship coherently as Stage 6's "complete loop" moment.

**What I did:**

_Lead capture (recruiter-facing, in chat):_

- `src/lib/client/lead-capture-state.ts` + test (5 specs) — sessionStorage-backed state machine: `pending → shown → captured | dismissed`. Keyed by `(botId, sessionId)` so each conversation gets its own lifecycle independent of other tabs. Garbage stored values, sessionStorage read failures, and key isolation all return `pending` (the benign baseline — worst case is a re-prompt, never a lost dismissal).
- `src/components/chat/types.ts` — extended `ChatMessage` discriminated union with `{ id; role: "system"; kind: "lead_capture" }`. New variant carries no content — the card component owns its own UI/state.
- `src/components/chat/MessageBubble.tsx` — narrowed prop type to `Exclude<ChatMessage, { role: "system" }>` so TypeScript catches accidental routing of system messages to the bubble renderer at compile time.
- `src/components/chat/LeadCaptureCard.tsx` + test (7 specs) — client component with `<input type="email">` + Submit/Skip. State machine: `prompt → submitting → captured`. On valid submit POSTs to `/api/bots/[botId]/leads` with `{ email, conversationId?, contextSummary }`. Captured state replaces the card with an inline green "Thanks! {botName} will be in touch." that stays in the message stream (loop closure for the recruiter). Network failure / 4xx response: returns to `prompt` with inline error.
- `src/components/chat/ChatWindow.tsx` — three changes: (1) `sessionId` lazy-initialized via `useState(() => …)` so it's mount-stable and the lead-capture state lookup matches the value sent to the chat API. (2) `conversationId` state captured from the chat API response, threaded through to the card. (3) Render loop dispatches `m.role === "system" && m.kind === "lead_capture"` to `<LeadCaptureCard>` with an explicit exhaustiveness `never` check after — a new system variant lands as a compile-time error rather than silently routing to the wrong renderer. (4) On every successful reply the orchestrator counts assistant replies in the next-messages array and pushes a sentinel system message when the count first crosses 3 AND `readLeadCaptureState === "pending"` AND no system message exists yet. The state write `writeLeadCaptureState(..., "shown")` happens in the same render so a reload sees `"shown"` and the eligibility check declines to re-add.
- `src/app/api/chat/[botId]/route.ts` — now returns `{ reply, conversationId? }`. `conversationId` is captured from the persistence transaction's `RETURNING { id }` and set in the outer scope. When the transaction throws (analytics-failed path), `conversationId` stays undefined; `NextResponse.json` strips undefined fields so the response shape is `{ reply }` and the card falls back to the server's 24h `(botId, email)` dedupe window.

_Notification bell (owner-facing, in dashboard):_

- `src/components/dashboard/NotificationBell.tsx` + test (6 specs) — bell icon button with badge. `useEffect` orchestrates polling: `setInterval(refresh, 30_000)` paused via Page Visibility API (`document.visibilityState !== "visible"` → clear interval; back to visible → fire immediate refresh + restart interval). Outside-click via `mousedown` listener that bails when `rootRef.current.contains(target)` — the bell itself is inside `rootRef` so clicks on it don't immediately close the freshly-opened dropdown. ESC handler also closes. Badge caps at "9+" for >= 10. Aria-label reflects the unread count for screen readers ("Notifications, 3 unread" vs just "Notifications").
- `src/components/dashboard/NotificationDropdown.tsx` + test (7 specs) — mounted inside `<NotificationBell>` when open. Initial fetch of `/api/notifications?limit=10` populates the list. Per-row click is one action: fire mark-read (idempotent at the server — 404 if already-read is treated as a no-op), call `onItemRead(id)` to decrement the parent badge, `router.push` to `/dashboard/bots/[botId]/leads`, and `onClose()`. "Mark all read" footer button (hidden when nothing is unread) hits `/api/notifications/read-all`; only flips local state on `res.ok` — server-failure leaves the badge as-is so the next poll reconciles without a flicker. Empty state "You're all caught up.", loading skeleton "Loading…", error toast "Couldn't load notifications."
- `src/app/(dashboard)/layout.tsx` — mounted `<NotificationBell />` in the existing header strip, next to the Docs link. Bell is visible on every dashboard page (Q4 from slice-6.2 prep — recruiter could land on any bot, so the bell follows the user across the dashboard).

_Code-review pass (2 HIGH + 1 MEDIUM + 1 LOW fixes applied):_

- **HIGH: `useRef` lazy-init runs in render body — fragile under Strict Mode.** Original `ChatWindow` used `const sessionIdRef = useRef(null); if (sessionIdRef.current === null && typeof window !== "undefined") { sessionIdRef.current = getOrCreateSessionId(); }`. Strict Mode's double-render runs the side-effecting init twice with no cleanup. Fixed by switching to a lazy `useState` initializer: `const [sessionId] = useState(() => typeof window !== "undefined" ? getOrCreateSessionId() : null)`. React contract-guarantees the initializer runs exactly once even under Strict Mode.
- **HIGH: dispatch on `m.role === "system"` was not future-proof.** The previous one-condition discriminator silently routed any future system variant to `<LeadCaptureCard>`. Fixed by adding an inner `m.kind === "lead_capture"` check + a trailing `const _: never = m.kind` exhaustiveness assertion. A new variant lands as a compile-time error here instead of silent runtime misbehavior.
- **MEDIUM: `handleMarkAllRead` fire-and-forget.** Now checks `res.ok`, surfaces an inline "Couldn't clear notifications." error on failure, and skips `onAllRead()` so the local badge state doesn't desync from the server.
- **LOW: `role="menu"` without `menuitem` children.** Changed to `role="region"` with `aria-label="Notifications"` — semantically correct for a notification panel that's not a command menu. Updated 3 test assertions accordingly.
- **MEDIUM not applied: `SAFE_EMAIL` regex vs Zod `.email()`.** Reviewer claimed Zod rejects `a@b.c` (1-char TLD); in practice Zod's `.email()` accepts the HTML5-spec shape which includes 1-char TLDs. Tightening would over-reject. Skipped.
- **LOW not applied: `conversationId` undefined in JSON response.** `NextResponse.json` strips undefined fields via `JSON.stringify`, so the response shape is `{ reply }` (no extra key) when persistence fails. Client-side check `if (body.conversationId)` correctly handles both shapes. No-op fix declined.

**Files changed:**

_Lead capture:_

- `src/lib/client/lead-capture-state.ts` — create — sessionStorage state machine.
- `src/lib/client/lead-capture-state.test.ts` — create — 5 specs.
- `src/components/chat/types.ts` — update — added system+lead_capture variant.
- `src/components/chat/MessageBubble.tsx` — update — narrowed prop type to exclude system variant.
- `src/components/chat/LeadCaptureCard.tsx` — create — client component.
- `src/components/chat/LeadCaptureCard.test.tsx` — create — 7 specs.
- `src/components/chat/ChatWindow.tsx` — update — sessionId via useState, conversationId state, render dispatch with exhaustiveness, lead-capture insertion in success path.
- `src/components/chat/ChatWindow.test.tsx` — update — stateful lead-capture-state mock + 3 new specs (no card before threshold, card at threshold, dismiss is permanent).
- `src/app/api/chat/[botId]/route.ts` — update — return `{ reply, conversationId? }`.
- `src/app/api/chat/[botId]/route.test.ts` — update — 1 new spec (omits conversationId when persistence throws), updated happy-path assertion.

_Notification bell:_

- `src/components/dashboard/NotificationBell.tsx` — create — bell + polling + visibility pause + outside-click/ESC close.
- `src/components/dashboard/NotificationBell.test.tsx` — create — 6 specs (badge, 9+ cap, polling cadence with `shouldAdvanceTime: true`, open/close).
- `src/components/dashboard/NotificationDropdown.tsx` — create — fetch + render + mark-read + mark-all + empty/loading/error states.
- `src/components/dashboard/NotificationDropdown.test.tsx` — create — 7 specs (loading, empty, render, click-marks-read-and-navigates, mark-all-fires-endpoint, mark-all-hidden-when-all-read, fetch error).
- `src/app/(dashboard)/layout.tsx` — update — mounted `<NotificationBell />` in header.

Total: 10 new source files + 6 test files + 5 updated source files. 588/588 tests pass (559 → 588, net +29), build green.

**Decisions made:**

- **System message variant over a sibling overlay.** Putting the lead-capture card in the message stream (as `{ role: "system"; kind: "lead_capture" }`) means it inherits the scroll-to-bottom behavior, sits naturally between bubbles, and the messages array is the single source of truth for "what is the conversation's current state". A sibling overlay would have required a separate `cardVisible` boolean + manual scroll coordination + duplicate persistence logic. The cost is a new union variant + a narrowed prop type on MessageBubble; the benefit is fewer moving parts.
- **`useState` lazy initializer, not `useRef` write-on-render.** This is the React-canonical pattern for "compute once at mount and never again." Strict Mode double-render is safe, no cleanup gymnastics, the value is stable across all renders. The render-body ref write would have worked today but set a risky precedent for future contributors.
- **Exhaustiveness check via `const _: never = m.kind`.** Today the new variant routes correctly; tomorrow's contributor adds `{ kind: "cookie_banner" }` and the compiler flags this line instead of the renderer shipping a lead-capture card with no usable props. One line of code; defends against an entire class of future bugs.
- **Stateful mock for lead-capture-state in ChatWindow tests.** A static `() => "pending"` mock can't model the dismiss-then-no-rerender behavior. The stateful Map-backed mock lets the test exercise the real state-machine semantics without touching real sessionStorage.
- **Page Visibility API for polling pause.** A user with the dashboard open in a background tab shouldn't burn 30s polling forever — both for battery on laptops and for server cost (cheap query, but free isn't zero). Pausing on hidden + immediate refresh on visible is the standard pattern; it adds ~10 lines and removes the entire class of "I left the dashboard open overnight and woke up to dead battery" reports.
- **Single click on a notification = mark-read + navigate.** The reviewer of slice-6.2 prep agreed (Q4) — when a user clicks a notification, they're clearly engaging with it; making them also click a separate "✓" button is friction with no upside. Fire the mark-read in parallel with the navigation since the mark-read endpoint is idempotent and we don't need to await it.
- **Bell badge caps at "9+", not at 99 or 999.** Real-world unread counts beyond 10 are noise — a user with 47 unread leads has already missed the signal. "9+" tells them "you have a backlog to deal with"; the exact number doesn't change the action. Also keeps the badge visually tiny.
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

**What was asked to do:** Ship the final Stage 6 slice — the bot settings page that lets owners edit identity (name, headline, personality, suggested questions) via PATCH, plus the dashboard-side knowledge management UI (list sources, drag-drop upload, per-source delete with a design-system confirmation modal, "Reprocess all"). After this slice, Stage 6 is a complete product loop: BYO-key chat → ingestion → RAG → multi-tenant public chat → embeddable widget → analytics + lead capture + notifications + editable settings. Plan §6 is done.

**Locked decisions before any code (Q1-Q9):** Q1 dedicated `KnowledgeManager` component for the dashboard (no Bot-Factory wizard extraction — the wizard's "create new bot" copy doesn't fit "manage existing knowledge"). Q2 whole-form Save button at the bottom of the identity form — explicit, no surprises. Q3 chip-based suggested-questions editor matching the Bot Factory affordance but as its own component. Q4 `window.confirm`-style confirmation flow, BUT styled per the design system — built a `ConfirmDialog` component (native window.confirm cannot be themed). Q5 inline "Reprocessed N tokens" status next to the button. Q6 Bot Factory radio cards for personality (richer than a select for the dashboard surface). Q7 whole-form Save (single PATCH per click). Q8 drag-and-drop upload zone (parity with Bot Factory's dropzone UX). Q9 single-pass slice.

**What I did:**

_Schema + route widening:_

- `src/lib/bots/schemas.ts` — widened `botPatchInput` from `{themeColor?}` (slice 5) to `{name?, headline?, personality?, suggestedQuestions?, themeColor?}`. Each field independently optional; the `.refine()` "must include at least one field" check stays. `name` is `.trim().min(1).max(100)`; `headline` is `.transform(trim).max(120)` so whitespace-only PATCHes can't leave blank-looking strings in the DB; `personality` is the `PERSONALITY_PRESETS` enum; `suggestedQuestions` is the bounded array (max 6, each ≤ 200 chars).
- `src/app/api/bots/[botId]/route.ts` — PATCH handler unpacks the five whitelisted fields from `parsed.data` and builds the SET payload via explicit conditional assignment. The Zod schema IS the mass-assignment whitelist: fields like `userId`, `isActive`, `contextText`, `emailVerified` are not in `botPatchInput` so they can never reach the SET object even if a hostile client sends them. Returning shape extended to include all four newly-editable fields.
- `src/app/api/bots/[botId]/route.test.ts` — extended from 6 to 13 specs: each new field validates (happy path, name>100, empty name, bad personality enum, >6 suggested questions, name+headline PATCH, personality+suggestedQuestions PATCH, settings mass-assignment regression).

_Reusable components (4 new):_

- `src/components/dashboard/ConfirmDialog.tsx` — design-system styled modal. `role="dialog"`, `aria-modal="true"`, ESC to cancel, backdrop **click** (not mousedown — review fix; mousedown would close on accidental drag-out from inner panel). `destructive` prop swaps the confirm button to rose-600 for delete actions. Confirm button auto-focuses for keyboard flow. 7 specs.
- `src/components/dashboard/SuggestedQuestionsEditor.tsx` — chip-based add/remove. Add via button or Enter. Cap at 6 with input + button disabled state at the cap. **Dedupe with explicit "Already in the list" hint** (review fix — silent dedupe was a HIGH-flagged UX defect; users typed something, hit Add, and nothing visible happened). Chip key is the question value itself (not `idx-q` composite — review fix; values are deduped so the value alone is a stable key). 8 specs.
- `src/components/dashboard/BotSettingsForm.tsx` — whole-form Save with diff-based PATCH (only sends changed fields, saves DB write churn + cleaner audit trail). Uses Bot Factory radio cards for personality (sr-only radio + visual `<label>` styling, accessible via keyboard arrows). State seeded from props once at mount — **intentionally** does NOT sync state from changed initial* props mid-edit (would clobber the user's in-flight typing if the parent server-component re-renders mid-session). `router.refresh()` on success so the page's RSC tree picks up the new values. Saved! transient clears after 1.5s. 7 specs.
- `src/components/dashboard/KnowledgeManager.tsx` — fetches `GET /api/bots/[botId]/knowledge` on mount, renders source list with name + type + chunk count + token count (formatted as "9.3K tokens" for readability). Drag-and-drop OR click-to-choose PDF upload — drops non-PDF files with an inline error. Per-source delete via `<ConfirmDialog destructive>`. "Reprocess all" button hits `/knowledge/reprocess` and shows transient "Reprocessed (14,551 tokens)." status. Empty state when no sources. 7 specs.

_Page + nav (2 new/updated):_

- `src/app/(dashboard)/dashboard/bots/[botId]/settings/page.tsx` — server component, standard `findFirst({where: and(eq(bots.id), eq(bots.userId))})` → `notFound()` tenancy pattern (same as the other slice-6.3 sub-routes). Renders two sections: Identity → `<BotSettingsForm>`; Knowledge sources → `<KnowledgeManager>`. Defense-in-depth fallback to "professional" when the DB stores an unknown personality string (with a comment explaining this should be unreachable since `PERSONALITY_PRESETS` is Zod-enforced at create + PATCH). 4 specs.
- `src/app/(dashboard)/dashboard/bots/[botId]/page.tsx` — added "Settings →" link to the sub-nav strip next to Conversations / Leads.

_Code-review pass (1 HIGH + 1 MEDIUM + 2 LOW fixes applied; 1 HIGH skipped as incorrect analysis):_

- **HIGH applied: silent dedupe in SuggestedQuestionsEditor.** Users typed a duplicate question, hit Add, the input cleared, and nothing visible happened. Added a "Already in the list" hint that surfaces beside the "X of 6 questions" counter so the user knows why their Add appeared to do nothing.
- **HIGH skipped: stale initial-props state after router.refresh().** Reviewer claimed `dirty = name !== initialName` would be evaluated against frozen initials. Wrong — that expression is in the render body, evaluated each render with the latest prop value. After `router.refresh()` the server re-renders with new `initialName` and the client's `dirty` check correctly compares to the latest prop. Syncing state from props on prop change (the reviewer's suggested fix) would actually be worse — it would clobber the user's in-flight typed values whenever the parent re-renders mid-edit. Added a comment to document the intentional pattern.
- **MEDIUM applied: ConfirmDialog backdrop drag-close.** Switched from `onMouseDown` to `onClick` on the backdrop. With mousedown, a user who drag-released from inside the panel onto the backdrop would dismiss the dialog. The `click` event by spec requires both press and release on the same target, so this edge case is impossible.
- **MEDIUM applied: headline whitespace-only PATCH.** Added `.transform((v) => v.trim())` to `botPatchInput.headline` so `{ headline: "   " }` stores the empty string (the canonical "no headline" value) instead of three spaces that render as a blank-looking headline in the widget.
- **MEDIUM acknowledged: file input value reset ordering safe.** Reviewer confirmed `e.target.value = ""` after `handleUpload(e.target.files)` is safe because `Array.from(files)` captures the FileList synchronously before the reset. Added a "do not swap these lines" comment to prevent a future maintainer from reordering.
- **LOW applied: chip key composite → just `q`.** Dedupe enforcement at add-time means `q` alone is unique; the index component partially defeated React's reconciliation on remove-from-middle. Now `key={q}`.
- **LOW applied: personality fallback comment.** Documented that the `isPersonality(bot.personality) ? … : "professional"` fallback is defense-in-depth — unreachable in practice since the value is Zod-enforced at every write path.

**Files changed:**

_Schema + route:_

- `src/lib/bots/schemas.ts` — update — widened `botPatchInput` to 5 fields.
- `src/app/api/bots/[botId]/route.ts` — update — SET-payload + returning extended.
- `src/app/api/bots/[botId]/route.test.ts` — update — +7 specs (13 total).

_Components:_

- `src/components/dashboard/ConfirmDialog.tsx` — create — design-system modal.
- `src/components/dashboard/ConfirmDialog.test.tsx` — create — 7 specs.
- `src/components/dashboard/SuggestedQuestionsEditor.tsx` — create — chip editor.
- `src/components/dashboard/SuggestedQuestionsEditor.test.tsx` — create — 8 specs.
- `src/components/dashboard/BotSettingsForm.tsx` — create — diff-based whole-form save.
- `src/components/dashboard/BotSettingsForm.test.tsx` — create — 7 specs.
- `src/components/dashboard/KnowledgeManager.tsx` — create — list + drag-drop + delete + reprocess.
- `src/components/dashboard/KnowledgeManager.test.tsx` — create — 7 specs.

_Page + nav:_

- `src/app/(dashboard)/dashboard/bots/[botId]/settings/page.tsx` — create — server component.
- `src/app/(dashboard)/dashboard/bots/[botId]/settings/page.test.tsx` — create — 4 specs.
- `src/app/(dashboard)/dashboard/bots/[botId]/page.tsx` — update — added Settings → link.

Total: 10 new source files + 6 test files + 3 updates. 628/628 tests pass (588 → 628, net +40), build green, new `/dashboard/bots/[botId]/settings` route registered (4.36 kB).

**Decisions made:**

- **Zod schema IS the mass-assignment whitelist.** Slice 5 established the pattern for PATCH (themeColor only); slice 6.5 widens to 5 fields with the same shape. Fields not in `botPatchInput` literally cannot reach the SET object — there's no per-field `delete body.x` denylist that could be forgotten.
- **Trim `headline` server-side, not client-side.** Client-side trim is bypassable; server-side trim ensures the DB never holds whitespace-only padding. Same pattern Zod applies to email/username at registration.
- **Diff-based PATCH client side.** Only fields that changed go in the body. Cleaner audit trail, smaller request bodies, and the `.refine()` "at least one field" check is naturally satisfied (if nothing changed, Save is disabled).
- **Whole-form Save over per-section saves.** Two save buttons (Identity, Suggested questions) create "did the second save actually happen?" anxiety. One button keeps mental model simple.
- **Design-system `ConfirmDialog` over `window.confirm`.** Native `window.confirm` cannot be themed — looks out of place against the dashboard. Building the modal is ~80 lines and reusable for any future destructive action.
- **`onClick` on backdrop, not `onMouseDown`.** Click requires press + release on the same target by HTML spec, so accidental drag-out from inner panel doesn't dismiss. Snappier-feeling `mousedown` is the wrong tradeoff for destructive flows.
- **State seeded from props once, not synced on prop change.** Edit forms hold user input; parent re-renders with new initial values are expected (e.g. after `router.refresh()`), but the user's typed-but-unsaved input must NOT be clobbered. The `dirty` check compares to the latest prop value in the render body, so subsequent edits remain correctly diffed against the fresh initials.
- **Personality fallback to "professional", not throw.** A direct-DB write that leaves an unknown personality value would otherwise crash the page render. The fallback degrades gracefully — UI shows "Professional", first save writes the validated value back, the row heals silently.
- **Dedupe with visible hint.** Users who type a duplicate suggested question and hit Add deserve an answer for why the input cleared but the chip list didn't grow. A `role="status"` hint is one line and removes the entire "did Add work?" confusion.
- **Drag-and-drop AND click-to-choose.** Filtering dropped files to `application/pdf` only prevents a 415 round-trip when someone drags a `.txt` or image; the inline error guides them to the right file type.

**Stage 6 closeout — what works after this slice:**

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

- The settings page edits 4 identity fields. `contextText` (the manually-typed text block from the Bot Factory) is intentionally NOT editable here — that field is derived from the `knowledge_base` chunks via `assembleAndSaveBotContext`. If a user wants to edit the manual text block specifically, they go back to the Bot Factory wizard. Acceptable; the KnowledgeManager surface covers the "manage knowledge" need.
- No bulk-delete in KnowledgeManager — each source is deleted one at a time. Acceptable for typical bot counts (1-5 PDFs); add multi-select if users start complaining.
- The reprocess button's "X tokens" status is transient (stays until next action). A persistent "last reprocessed at" timestamp would be nice but isn't blocking.
- `BotSettingsForm` doesn't expose `themeColor` (lives on the bot detail page via `<ThemeColorPicker>`). Could consolidate but the detail page already shows it in context with the embed snippet preview.
- Next step is Stage 7. The build plan describes hardening, OAuth, landing page, GDPR, self-host packaging, monitoring, structured logger. That's a different beast — multiple parallel workstreams; will need a fresh planning pass.

---

### 2026-06-20 07:53 - Dashboard redesign Slice A: layout shell + dashboard home rebuild

**What was asked to do:** Port `design/dashboard.html` (left sidebar + sticky topbar + 4 metric tiles + 7-day chart + top topics + recent leads table + recent conversations + share-your-bot card) into the existing React codebase. Apply the shell to all `(dashboard)` pages. Wire pieces that have data; mark unwired pieces with a faded "Coming soon" pill. The redesign was split into 3 slices; Slice A covers the shell + dashboard home.

**Locked decisions before any code (Q1-Q10):** Q1 the new sidebar+topbar shell applies to all dashboard pages (sub-pages get re-themed in Slice C). Q2 selected bot persists in a per-browser cookie (read by `cookies()` in any RSC; no server-side storage / Redis needed for a single-value preference). Q3 docs links go to `https://docs.probot.dev/guides/embed-widget` (external — a stub page lands in Slice C). Q4 faded content + Coming Soon pill (not blank placeholder cards). Q5 curvy smooth line chart over the conversation counts (Catmull-Rom → cubic Bézier, SVG-native, no chart lib). Q6 multi-bot users: the user's first/most-recently-updated bot is the fallback; selection is per-browser via cookie + dropdown switcher above the workspace nav. Q7 mobile gets a hamburger button + slide-in panel with the full sidebar. Q8 NotificationBell migrates from the old single-row header into the new topbar. Q9 first-time users (no bots) see a focused empty-state CTA. Q10 single-pass slice (Slice A); Slices B (settings 5-tab redesign) and C (polish + sub-page re-theme) ship separately.

**What I did:**

_Server / data layer (4 new modules):_

- `src/lib/server/selected-bot.ts` + test — cookie-backed bot selection. `resolveSelectedBotId(validIds, fallbackId)` reads the cookie and validates the value is in the user's owned bot set; stale or hostile cookie values fall through to the fallback. `writeSelectedBotCookie(botId)` is the writer (httpOnly per the review fix — XSS can't enumerate the user's bot IDs).
- `src/lib/analytics/queries.ts` — added `getDailyConversationCounts({userId, days})` using Postgres `generate_series` to emit one row per day even on zero-count days. `days` is clamped `[1, 365]` defensively. SQL is Drizzle's parameterized `sql\`\`` template — no string interpolation.
- `src/lib/conversations/queries.ts` — added `listRecentConversationsForUser({userId, limit})` joining `conversations` × `bots` so the dashboard can show cross-bot recent activity.
- `src/lib/leads/queries.ts` — added `listRecentLeadsForUser({userId, limit})` joining `leads` × `bots` for the recent leads table.
- `src/lib/ai/provider-labels.ts` — moved the inline PROVIDER_LABELS map from BotFactoryForm into a shared module; `describeProvider(provider, model)` is the consumer-facing helper.
- `src/app/(dashboard)/actions.ts` — `selectBotAction(formData)` server action. Validates session + bot ownership in a single `findFirst({where: and(eq(bots.id), eq(bots.userId))})` before writing the cookie; a forged form payload pointing at another user's bot is silently rejected.

_Shell components (under `src/components/dashboard/`):_

- `ComingSoonPill.tsx` — gray "Coming soon" pill primitive, two sizes.
- `ModelStatusCard.tsx` — bottom-of-sidebar widget showing `describeProvider(user.llmProvider, user.llmModel)` with a brand-deep gradient background. Active indicator + "Manage model & key" CTA.
- `BotSwitcher.tsx` + test — dropdown above the workspace nav. Single-bot users see a static card (button disabled, no caret). Multi-bot users get a click-to-open menu; each item is a `<form action={selectBotAction}>` with hidden `botId` input. Outside-mousedown + ESC close the dropdown.
- `Sidebar.tsx` — desktop sidebar shell (`hidden lg:flex` wrapper in the layout). Renders logo + BotSwitcher + nav sections (Workspace / Build / Account) + ModelStatusCard + user card with sign-out icon link. All SVG glyphs (no external icon-font dependency).
- `SidebarNavLink.tsx` — client component. Active highlight computed via `usePathname()` so the server layout doesn't have to thread the current path. Exact-match for `/dashboard`, prefix-match for everything else. Supports external links (`target="_blank" rel="noopener noreferrer"`), inline count badges (muted gray for "Conversations", brand-color for "Leads" when > 0).
- `MobileSidebar.tsx` — three exports: `MobileSidebarProvider` (context owning open/close state, mounted at the layout root, auto-closes on `usePathname()` change), `MobileSidebarToggle` (hamburger button, `lg:hidden`, lives inside the Topbar), `MobileSidebarPanel` (slide-in fixed panel with backdrop + body-scroll-lock + ESC close, mounted at the layout root and re-rendering the desktop Sidebar's content).
- `Topbar.tsx` — client component (so it can read `usePathname()` for the page title). Renders hamburger + page title + URL pill with `<CopyUrlButton>` + `<NotificationBell>` + "View live bot" CTA. Title derived from a tiny path-to-title map; conversation transcript paths show "Conversation" (singular), list paths show "Conversations" (plural).

_Dashboard sections:_

- `MetricTile.tsx` + test — icon (forum / chat / contact_mail / bolt) + big number + label + optional faded growth pill ("+18%" at opacity-30) + optional Coming Soon pill (also fades the value to opacity-40).
- `ConversationsLineChart.tsx` + test — SVG smooth Bézier curve. `toCoords` converts day counts to (x, y) pixels relative to a `viewBox`. `smoothPath` does Catmull-Rom → cubic Bézier conversion with neighbor-wrap-around at the edges. `fillPath` closes the curve along the baseline for a gradient fill. Falls back to a dashed baseline line on all-zero data so the panel doesn't visually collapse. "Today" label on the last point; weekday short name everywhere else.
- `TopTopicsPlaceholder.tsx` — faded skeleton bars (5 fixed labels at fixed percentages) + Coming Soon pill in the header.
- `RecentLeadsTable.tsx` + test — table with Email · Asked about · Company signal · When · View chat columns. `companyFromEmail` uses a registrable-domain heuristic (second-to-last segment for 3+ segment domains so `mail.stripe.com` → "Stripe" not "Mail"). Public providers (gmail, outlook, etc.) get no pill. "View all" link goes to the first lead's bot's leads page; row click opens the transcript.
- `RecentConversationsList.tsx` — 3 rows with avatar + recruiter email (or "Anonymous visitor") + truncated first-user-message preview + relative-time badge. "View all N conversations" footer link.

_Layout + page:_

- `src/app/(dashboard)/layout.tsx` — full rewrite. Fetches `[ownedBots, analytics, userRow]` in parallel via Promise.all. Resolves the selected bot via cookie. Computes user initials, public URL. Renders `<MobileSidebarProvider>` wrapping: desktop sidebar `<aside className="fixed hidden h-screen w-64 ... lg:flex lg:flex-col">` containing `<Sidebar>`, a main column with `<Topbar>` + `{children}`, and `<MobileSidebarPanel>` mirroring the sidebar content at the layout root.
- `src/app/(dashboard)/dashboard/page.tsx` — full rewrite. Empty state (no bots) renders a focused CTA; populated state renders Welcome greeting + 4 MetricTiles + ConversationsLineChart + TopTopicsPlaceholder + RecentLeadsTable + RecentConversationsList + Share-your-bot card (reuses slice-5 `<EmbedSnippet>` with the 3 cards: Public URL / Website embed / Email signature) + "Full embed guide →" link.

_Code-review pass (0 CRITICAL/HIGH; 3 MEDIUM + 1 LOW applied):_

- **MEDIUM applied: `httpOnly: true` on the bot selection cookie.** The value is bot ID (not a secret), but XSS can't enumerate the user's bot IDs from `document.cookie` with httpOnly. The cookie is only ever read server-side via `cookies()`; client JS has no need to see it.
- **MEDIUM applied: `getDailyConversationCounts` clamps `days` to [1, 365].** Defensive cap so a future caller passing `days = 1_000_000` doesn't generate a million-row `generate_series` in Postgres.
- **MEDIUM applied: `companyFromEmail` uses second-to-last domain segment for 3+ part domains.** `mail.stripe.com` → "Stripe" instead of "Mail". `.co.uk`-style public-suffix edge cases aren't handled (heuristic, not authoritative), but the decoration is correct for the common shapes. Added a regression test.
- **LOW applied: dropped the redundant ownership re-query in the dashboard page.** `ownedBots` is already pre-filtered by `eq(bots.userId, userId)`, so `selectedBot = ownedBots.find(...)` is ownership-verified by construction — no need for an extra DB round-trip.

**Files changed:**

_Server / queries:_

- `src/lib/server/selected-bot.ts` — create — cookie resolver + writer.
- `src/lib/server/selected-bot.test.ts` — create — 6 specs (tenancy boundary).
- `src/lib/analytics/queries.ts` — update — `getDailyConversationCounts` with clamped days.
- `src/lib/conversations/queries.ts` — update — `listRecentConversationsForUser`.
- `src/lib/leads/queries.ts` — update — `listRecentLeadsForUser`.
- `src/lib/ai/provider-labels.ts` — create — shared provider labels.
- `src/app/(dashboard)/actions.ts` — create — `selectBotAction` server action.

_Components:_

- `src/components/dashboard/ComingSoonPill.tsx` — create.
- `src/components/dashboard/ModelStatusCard.tsx` — create.
- `src/components/dashboard/BotSwitcher.tsx` — create.
- `src/components/dashboard/BotSwitcher.test.tsx` — create — 5 specs.
- `src/components/dashboard/Sidebar.tsx` — create.
- `src/components/dashboard/SidebarNavLink.tsx` — create.
- `src/components/dashboard/MobileSidebar.tsx` — create — Provider + Toggle + Panel.
- `src/components/dashboard/Topbar.tsx` — create.
- `src/components/dashboard/MetricTile.tsx` — create.
- `src/components/dashboard/MetricTile.test.tsx` — create — 4 specs.
- `src/components/dashboard/ConversationsLineChart.tsx` — create.
- `src/components/dashboard/ConversationsLineChart.test.tsx` — create — 4 specs.
- `src/components/dashboard/TopTopicsPlaceholder.tsx` — create.
- `src/components/dashboard/RecentLeadsTable.tsx` — create.
- `src/components/dashboard/RecentLeadsTable.test.tsx` — create — 7 specs.
- `src/components/dashboard/RecentConversationsList.tsx` — create.

_Layout + page:_

- `src/app/(dashboard)/layout.tsx` — full rewrite — new shell.
- `src/app/(dashboard)/dashboard/page.tsx` — full rewrite — new dashboard home.

Total: 17 new source files + 5 test files + 5 updated source files. 654/654 tests pass (628 → 654, net +26), build green, new `/dashboard` route at 4.4 kB first-load JS.

**Decisions made:**

- **Cookie over Redis for selected bot.** A single-value per-user preference doesn't need a server-side store. The cookie is read by `cookies()` in any RSC for free; no roundtrip to Redis, no infrastructure dependency.
- **Server action for bot switching, not a client fetch.** The form-action pattern (hidden `botId` input, `<form action={selectBotAction}>`) keeps the dropdown functional without JS in degraded modes AND lets the action `revalidatePath('/')` so every cached dashboard page re-renders against the new selection.
- **Active sidebar state computed via `usePathname()`, not threaded as a prop.** The server layout doesn't have to know which page is rendering; client-side `SidebarNavLink` reads the path itself. The layout stays declarative.
- **Topbar is a client component (not server).** It needs `usePathname()` to derive the page title. NotificationBell and CopyUrlButton are already client islands inside it, so making the wrapper client doesn't move the SSR boundary materially.
- **MobileSidebar uses a context provider, not prop drilling.** The hamburger trigger (inside Topbar) and the panel (mounted at layout root) need to share open/close state without threading through every server component in between.
- **Catmull-Rom → cubic Bézier for the curve (no chart library).** ~50 lines of math, zero dependencies, fully styleable via SVG. Falls back to a dashed baseline on all-zero data so the panel doesn't visually collapse to nothing.
- **Faded content + Coming Soon pill, not blank placeholder cards.** Preserves the design rhythm (4-card metric row, 2-col grid) so the dashboard feels complete; the "soon" signal is unambiguous via the gray pill + opacity-40 content fade.
- **Cookie httpOnly true.** The cookie holds a bot ID, not a secret — but XSS can't enumerate the user's bot IDs even with `document.cookie` access. Free hardening.
- **Registrable-domain heuristic for company-signal pills.** Second-to-last segment for 3+ segment domains catches the common `mail.stripe.com` → "Stripe" shape; public-suffix edge cases (`.co.uk`) are out of scope for a decorative pill.

**Open questions / follow-ups:**

- Slice B: settings page redesign as 5 tabs (Account / Bot configuration / Knowledge base / Security & privacy / AI model & key). The current single-page `BotSettingsForm` + `KnowledgeManager` get folded into the Bot configuration + Knowledge base tabs. AI model & key tab is entirely Coming Soon. Account / Security have placeholder content with Coming Soon pills on the not-yet-wired actions.
- Slice C: polish — sub-page re-theme (conversations / leads / settings sub-pages need their wrapper layouts updated to fit the new shell without duplicate "back to bot" links), the stub `/docs/guides/embed-widget` page (or accept the external 404 for now), Stage-7 task block in plan.md for: AI model & key page, growth pills wiring (week-over-week comparison), response time tracking, top topics NLP categorization.
- The dashboard's metric tiles 1-3 show real numbers + faded fake "+18%/+24%/+3 new" growth pills. The numbers are real; the percentages are decorative until Stage 7 builds week-over-week comparison.
- The "View live bot" topbar button is hidden on small screens (`sm:inline-flex`). Mobile users access the live bot via the sidebar slide-in panel's bot card.
- BotSwitcher dropdown items submit a form per click. There's no loading indicator between click and revalidation — typically completes < 100ms locally, but slow networks would see a flash. A pending-form indicator could land in Slice C.
- `MobileSidebarPanel` body-scroll lock uses `document.body.style.overflow = "hidden"` and restores the previous value on cleanup. Works correctly under React Strict Mode's double-render (each mount snapshots the current overflow and the final cleanup restores it).
- The slice intentionally left out tests for the layout, Sidebar wrapper, SidebarNavLink, ModelStatusCard, Topbar, MobileSidebar, TopTopicsPlaceholder, RecentConversationsList — focused coverage on security-critical / behavior-rich pieces (cookie resolver, MetricTile, RecentLeadsTable, BotSwitcher, ConversationsLineChart). Slice C can backfill if needed.

---

### 2026-06-20 08:17 - Dashboard redesign Slice B: 5-tab settings page

**What was asked to do:** Port `design/settings.html` into the existing settings route. Five tabs (Account, Bot configuration, Knowledge base, Security & privacy, AI model & API key) with URL-driven state. Reuse existing functionality where it's wired; mark unwired surfaces with Coming Soon pills. Per the locked decisions: AI model & key tab is entirely Coming Soon; Account/Security have Coming Soon pills on unwired actions; Bot configuration + Knowledge base fold in existing slice 6.5 functionality.

**What I did:**

_Schema + route widening:_

- `src/lib/bots/schemas.ts` — added `isActive: z.boolean().optional()` to `botPatchInput` so the Bot configuration tab's live/off toggle can write the bit. The slice-1 chat route and the slice-6.2 lead-capture endpoint both already gate on `bots.is_active`, so the toggle has real effect immediately.
- `src/app/api/bots/[botId]/route.ts` — destructures `isActive` and includes it in both the SET payload and the `returning()` projection. Comment block updated to reflect the new whitelist (the old comment listed `isActive` as a blocked field, which was wrong after the widening — review fix).
- `src/app/api/bots/[botId]/route.test.ts` — +2 specs (isActive happy-path; rejects non-boolean). Existing mass-assignment regression rewritten: previously asserted `isActive` was dropped, now asserts `userId`/`contextText`/`createdAt` are dropped while `isActive` is legitimately accepted.

_Tab framework + 5 tabs (new directory `src/components/dashboard/settings/`):_

- `SettingsTabs.tsx` — `<SettingsTabs>` + `<SettingsTabPanel>` pair. Tab state in URL via `?tab=`, written with `router.replace` (no history clog). Default tab is "account" — when active, the param is dropped (canonical URL). Unknown `?tab=` values fall through to the default. WAI-ARIA tabs pattern wired with `role="tablist"`/`role="tab"`/`role="tabpanel"` + `aria-controls`/`aria-labelledby` pairing (review fix — initial draft had the role attrs but no id linkage).
- `AccountTab.tsx` — read-only profile (avatar with initials, name, email, username with `probot.com/u/` prefix) + read-only password placeholder. All inputs disabled; Save button disabled. Section headers carry Coming Soon pills.
- `BotConfigTab.tsx` — status toggle (writes `isActive`), name, headline, personality cards (radio cards with inline SVG icons), Coming Soon Custom instructions textarea, theme color preset swatches + native `<input type="color">`, suggested questions section (reuses slice-6.5 `<SuggestedQuestionsEditor>`). Whole-form Save → PATCH with diffed body (only changed fields), `router.refresh()` on success. State-from-props-once pattern same as slice-6.5 BotSettingsForm (intentional — preserves in-flight user edits across parent re-renders).
- `KnowledgeTab.tsx` — from-scratch rewrite of slice-6.5 KnowledgeManager with the design's layout. Same underlying `/knowledge` endpoints (GET list, POST multipart, DELETE source, POST reprocess). Type-iconed source rows (PDF / text glyphs) with small icon-only delete button, dashed "Add source" upload zone, "Re-index all" button in the section header. Drag-drop still works; ConfirmDialog still used for delete confirmation.
- `SecurityTab.tsx` — rate-limit display cards reading `PER_MINUTE` and `PER_DAY` from `src/lib/ai/rate-limit.ts` directly (review fix — initial draft hardcoded 10/200 which silently disagreed with the actual `PER_DAY` default of 50). `MESSAGE_INPUT_MAX = 8000` mirrors the Zod cap on `/api/chat/[botId]` (sharing a constants module is a Slice C follow-up). Data & privacy rows (Export, Retention) + Danger zone (Delete account) are all Coming Soon — endpoints land in Stage 7 with the GDPR workstream.
- `AIModelKeyTab.tsx` — entire tab is Coming Soon. Renders a faded preview of the future provider/key editor (4-card provider grid, model dropdown, API key input with show/hide) so users see what's coming. Active "key stored locally only" badge mirrors the BYO-key promise.

_Page rewrite:_

- `src/app/(dashboard)/dashboard/bots/[botId]/settings/page.tsx` — full rewrite. Fetches `[bot, userRow]` in parallel (bot needs the new `isActive`/`themeColor` columns; userRow needs `llmProvider`/`llmModel` for AIModelKeyTab). Mounts `<SettingsTabs>` with the 5 `<SettingsTabPanel>` children. Ownership gate via standard `findFirst({where: and(eq(id), eq(userId))})` → `notFound()`. Defense-in-depth personality fallback retained (slice 6.5 review note still applies).

_Removed:_

- `src/components/dashboard/BotSettingsForm.tsx` + test (replaced by `BotConfigTab` — adds status toggle + theme swatches inline + Coming Soon custom instructions).
- `src/components/dashboard/KnowledgeManager.tsx` + test (replaced by `KnowledgeTab` — same endpoints, design-matched layout).

_Code-review pass (2 HIGH + 2 MEDIUM + 2 LOW fixes applied):_

- **HIGH: stale comments in PATCH route.** Two block comments still claimed `isActive` was a blocked field; with the Slice B widening that became wrong and would confuse a future security audit. Updated both blocks to list real blocked fields (`userId`, `contextText`, `createdAt`, `updatedAt`) and call out that `isActive` is legitimately accepted now via the schema widening.
- **HIGH: SecurityTab rate-limit display was wrong.** Initial draft hardcoded `perDay: 200`; the actual default in `src/lib/ai/rate-limit.ts` is `50`. Users on stock defaults would have seen "200/day" in the UI while the enforced limit was 50 — a live correctness bug. Fixed by importing `PER_MINUTE` and `PER_DAY` from the rate limiter module so the display tracks the live values (including env overrides).
- **MEDIUM: `createContext` imported mid-file.** Moved to the top with the other React imports (matches the project's convention; the original placement worked at runtime but was visually misleading).
- **MEDIUM: `useTransition` wrap around `router.replace` was unused.** The pending signal was destructured away with `, ` and `router.replace` is a navigation, not a state update that benefits from concurrent rendering. Removed the wrap; `router.replace` called directly.
- **LOW: WAI-ARIA tab/panel pairing.** Added `id` to each `<button role="tab">` and each `<div role="tabpanel">`, with `aria-controls` (button → panel) and `aria-labelledby` (panel → button) so screen readers announce the relationship correctly.
- **LOW: `JSX.Element` → `React.ReactNode`.** The `PERSONALITY_CARDS.icon` type was `JSX.Element` which excludes fragments. The `creative` variant uses `<>...</>` and worked only because TS narrows JSX fragments to `JSX.Element`. Switched to `ReactNode` for consistency with project convention.

**Files changed:**

_Schema + route:_

- `src/lib/bots/schemas.ts` — update — `isActive` added to `botPatchInput`.
- `src/app/api/bots/[botId]/route.ts` — update — SET payload + returning + comment cleanup.
- `src/app/api/bots/[botId]/route.test.ts` — update — 2 new specs, regression updated.

_Components:_

- `src/components/dashboard/settings/SettingsTabs.tsx` — create — tab strip + URL state.
- `src/components/dashboard/settings/AccountTab.tsx` — create.
- `src/components/dashboard/settings/BotConfigTab.tsx` — create.
- `src/components/dashboard/settings/KnowledgeTab.tsx` — create.
- `src/components/dashboard/settings/SecurityTab.tsx` — create.
- `src/components/dashboard/settings/AIModelKeyTab.tsx` — create.

_Page + cleanup:_

- `src/app/(dashboard)/dashboard/bots/[botId]/settings/page.tsx` — full rewrite.
- `src/app/(dashboard)/dashboard/bots/[botId]/settings/page.test.tsx` — full rewrite — 9 specs covering notFound paths, all 5 tabs renderable via `?tab=`, default tab, unknown-tab fallback, unknown-personality fallback.
- `src/components/dashboard/BotSettingsForm.tsx` + `.test.tsx` — delete (replaced).
- `src/components/dashboard/KnowledgeManager.tsx` + `.test.tsx` — delete (replaced).

Total: 6 new components + 5 file updates + 4 file deletions. 648/648 tests pass (654 → 648; deleted 14 obsolete BotSettingsForm/KnowledgeManager specs, added 5 settings-page specs + 2 PATCH specs + 1 reused). Build green.

**Decisions made:**

- **Tab state in the URL via `?tab=`, not internal state.** Deep links into a specific tab work (e.g. `?tab=kb` opens the Knowledge base tab), browser back navigates between tabs, share-this-link works without losing context. Matches the slice-6.3 conversations-list `?q=` precedent.
- **Default tab is "account" and the URL drops `?tab=account` to keep it canonical.** Two URLs that point at the same logical view produce the same browser bar. Same pattern as `?page=1` being implicit in the slice-6.3 Pagination component.
- **`router.replace` (not `push`).** Tab-switching is a fluid navigation, not a "commit" the user wants to step back through. Push would clog the history with intermediate states.
- **Read-only Account tab over half-functional editing.** No PUT /api/users endpoint exists, so faking editable inputs that don't save would mislead the user. Read-only display of the current values + Coming Soon pills makes the boundary explicit.
- **Hard-import `PER_MINUTE` / `PER_DAY` from `rate-limit.ts` in SecurityTab.** The original hardcoded numbers silently disagreed with reality on day one — a live correctness bug, not theoretical drift. The shared-module import makes the display track whatever the deployment is actually running.
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
- The slice intentionally has no dedicated unit tests for individual tab components — the settings page test covers integration (tab routing, panel rendering, fallback). Slice C can backfill if it surfaces specific behavioral gaps.
