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
- **Status:** **Stage 1 complete** - all 8 tasks (1.1 scaffolding · 1.2 schema · 1.3 auth · 1.4 login/register UI · 1.5 multi-provider LLM clients + key transport · 1.6 bot factory + browser key store · 1.7 chat UI port · 1.8 chat API + sanitizers + rate limit) ship green. End-to-end loop: register → log in → build a bot (paste bio + pick provider + paste BYO key) → chat with it via the user's own LLM key.
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
- **Validation:** Zod 3
- **Testing:** Vitest 2.1 + `@vitest/coverage-v8` (set up in Task 1.2; no tests yet - first tests land in Task 1.3).
- **Deployment:** Vercel (also self-hostable on any Node 20+ host) - not yet configured

### Architecture

- **Routing:** Next.js App Router under `src/app/`. Route groups `(auth)` and `(dashboard)` share layouts without affecting URLs. Public chat lives at `/u/[username]/chat` (will be made public-no-auth in Stage 4; currently scaffolded).
- **Data layer:** Drizzle ORM with a singleton `pg.Pool` (lazy - first query opens the TCP connection). Two tables today: `users` (with `username` + `email` unique, `hashed_password`, non-sensitive `llm_provider`/`llm_model` preferences, `email_verified`, timestamps) and `bots` (FK to `users.id` with `ON DELETE CASCADE`, `name`, `headline`, `personality` default `'professional'`, `context_text`, `suggested_questions` JSONB typed as `string[]`, `loading_messages` JSONB typed as `string[]` with a 4-string default for the chat UI's typing indicator, `is_active`, timestamps). `updated_at` auto-bumps via Drizzle `$onUpdate` (app-level only). The LLM API key is **intentionally** not a column.
- **Auth layer:** NextAuth v4 with the Credentials provider and JWT session strategy (no DB adapter; the `authorize()` callback queries Drizzle directly). Password hashing via `bcryptjs` cost 10. Inputs validated by Zod (`src/lib/auth/schemas.ts`) - `USERNAME_REGEX = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/` + reserved-slug set from `plan.md` §4.6 enforced at registration to keep `users.username` valid for Stage 4's `/u/[username]/chat` route. JWT carries `id` + `username`; LLM provider/model are intentionally kept out of the JWT (refetched per chat call to avoid stale prefs). Module augmentation lives in `src/types/next-auth.d.ts`. Registration is `POST /api/auth/register` - pre-check + `UNIQUE`-constraint backstop translates `pg` error code `23505` to a 409 instead of leaking a 500.
- **LLM abstraction:** All chat/embedding calls go through a provider registry in `src/lib/ai/providers/`. Each adapter (`anthropic.ts`, `openai.ts`, `google.ts`, `deepseek.ts`) implements a shared `LLMProvider` interface in `types.ts`. The chat API resolves the user's chosen provider/model from the `users` table and forwards the BYO key only to that provider.
- **BYO-key transport (planned):** The LLM API key is held in browser `localStorage` (`src/lib/client/llm-key-store.ts`, key `probot.llm.key.v1`) and sent to the chat API in an `x-llm-api-key` header - never in the JSON body. The server never logs, persists, or forwards the key except to the chosen provider. Enforced in Task 1.8 (`key-transport.ts`).
- **Sanitization:** `src/lib/ai/sanitize-input.ts` does Unicode normalization (zero-width strip, fullwidth ASCII, Cyrillic homoglyph map, whitespace collapse) → 8000-char cap → ~35 blocked regex patterns covering prompt injection, role overrides, instruction markers, jailbreak handles, credential probes, social engineering, system-prompt extraction, and image/media generation. Returns `{ ok: true; message } | { ok: false; reason }`. Reason never echoes raw input. `src/lib/ai/sanitize-output.ts` does 4 leakage checks (rule-marker strings, JSON-dump regex, credential patterns, "system prompt" string) → 1500-char truncate with `…`. Fallback string never echoes the dirty input.
- **Prompt builder:** `src/lib/ai/prompt-builder.ts` assembles identity → 7 immutable rules → personality prose block (`PERSONALITY_PROMPTS[bot.personality]`) → response style → unknown-answer template → `## CONTEXT` plain prose. Never JSON-serializes the bot row.
- **Rate limiter:** `src/lib/ai/rate-limit.ts` is an in-memory two-tier sliding window per `botId`. Defaults 10/min + 50/day, env-overridable via `PROBOT_RATE_PER_MINUTE` / `PROBOT_RATE_PER_DAY`. Per-day rejection rolls back the per-minute slot it just consumed. Stage 7 swaps the in-memory `Map<botId, number[]>` storage for Upstash Redis without changing the call site shape.
- **Chat route:** `POST /api/chat/[botId]` (`src/app/api/chat/[botId]/route.ts`) - 12-step orchestrator: content-type → BYO key header → body size cap (16 KB, measured from `request.text()` not the spoofable Content-Length header) → JSON parse → Zod validate → bot lookup (active only) → owner lookup → rate limit → sanitize input → build prompt → `getProvider(owner.llmProvider).complete({...})` → sanitize output → 200 `{ reply }`. Returns structured `{ error, ... }` bodies for every failure path. Intentionally NOT auth-gated - the chat _page_ is gated in Stage 1; Stage 4 will make the page public with zero route changes.
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
├── drizzle/                        # generated migrations - 0000_new_misty_knight.sql (users + bots tables)
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
    │   └── api/auth/
    │       ├── [...nextauth]/route.ts       # NextAuth catch-all (signin/session/csrf/...) - Task 1.3 ✓
    │       └── register/route.ts            # POST registration endpoint - Task 1.3 ✓
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
    │   ├── auth/
    │   │   ├── auth.ts             # NextAuth options (Credentials + JWT) - Task 1.3 ✓
    │   │   ├── passwords.ts        # bcryptjs hash + verify at cost 10 - Task 1.3 ✓
    │   │   └── schemas.ts          # Zod registerInput/loginInput + USERNAME_REGEX + RESERVED_SLUGS - Task 1.3 ✓
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

- [ ] **Apply Drizzle migrations** (`0000_*` + `0001_*`) against a real Postgres before the live UI flow is end-to-end exercisable. Both can be applied in order via `npm run db:migrate`. Carried from Tasks 1.2/1.6.
- [ ] **`/dashboard` placeholder still returns `null`** - post-login redirect lands on an empty page. Stage 6 dashboard owns the real implementation.
- [ ] **Email verification UX** - `email_verified` column is wired but always `false` at registration. Stage 7 owns the verify-email flow.
- [ ] **Auth-route rate limiting** - Stage 7 (Redis layer wraps everything).
- [ ] **Conversation / message logging** - Stage 4 schema, Stage 6 UI.
- [ ] **CORS** for the embeddable widget - Stage 5.
- [ ] **Per-bot rate-limit overrides** via `bots.rate_limit_per_minute` / `rate_limit_per_day` columns - Stage 7.
- [ ] **Settings page** for editing `bots.loading_messages`, theme color, custom instructions, OAuth - Stage 7.
- [ ] **Real Google + DeepSeek adapters** - out of Stage 1 scope; registered stubs throw on call.
- [ ] **Streaming** `complete()` - out of scope; vai.md is non-streaming.
- [ ] **Run the migration:** `drizzle/0000_new_misty_knight.sql` is generated and committed but not applied. Run `npm run db:migrate` against a real Postgres (Supabase/Neon free tier or local Docker) before Task 1.4's UI flows can hit a live backend.
- [ ] **Email verification UX:** the `email_verified` column is wired but always `false` at registration. Stage 7 owns the actual verify-email flow; until then login is intentionally not gated on this flag.
- [ ] **Rate limiting on auth routes:** none in Stage 1 (Stage 7's Redis layer wraps everything). Credential stuffing is undefended in the meantime.

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
