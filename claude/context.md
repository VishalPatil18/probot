# Project Context

> **Purpose:** Living log of work done on this project. Claude Code reads this at the start of every session to understand prior state before acting. Append a new entry after each meaningful prompt — do not rewrite history.

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
4. Never delete past entries — this is an append-only log.

---

## Project Overview

- **Name:** probot
- **Location:** `/Users/vishalpatil/Study/Projects/probot`
- **Status:** Stage 1 / Task 1.1 of 8 complete — project scaffolded, no business logic yet.
- **Planning docs:** [plan.md](plan.md), [srs.md](srs.md), [vai.md](vai.md) (all under `claude/`)
- **Goal:** Open-source, BYO-key AI chatbots for job seekers — each user creates a bot from their resume/career data and shares a public URL or embeddable widget that recruiters can chat with.
- **Target users:** Job seekers (bot owners) and recruiters (anonymous chat visitors).
- **Core value:** Free, MIT-licensed, self-hostable, zero-cost-to-operator (users supply their own LLM API key, stored only in their browser).

---

## Current State

### Tech Stack

- **Language:** TypeScript 5.6 (strict, `noUncheckedIndexedAccess`)
- **Framework:** Next.js 14.2 (App Router) — pinned to `^14.2.35` (security patch applied in Task 1.2)
- **Styling:** Tailwind CSS 3.4 (utility-first per CLAUDE.md §8; no inline CSS)
- **ORM:** Drizzle ORM 0.36 + `drizzle-kit` for migrations. Schema lives in `src/lib/db/schema.ts`; client in `src/lib/db/index.ts` (lazy `pg.Pool` + Drizzle instance).
- **Database:** PostgreSQL (Supabase / Neon / local Postgres via `DATABASE_URL`)
- **Auth:** NextAuth.js 4 (email/password in Stage 1; OAuth deferred to Stage 7). JWT session strategy, `bcryptjs@2.4` for password hashing at cost 10. Config in `src/lib/auth/auth.ts`; route handler at `src/app/api/auth/[...nextauth]/route.ts`; registration at `POST /api/auth/register`. `SessionProvider` mounted in root layout. Login + register UI live in `src/app/(auth)/{login,register}/page.tsx` with shared `(auth)/layout.tsx` chrome.
- **Fonts:** `Bricolage_Grotesque` (display) + `Inter_Tight` (sans) via `next/font/google`, exposed as CSS variables `--font-display` / `--font-sans` and wired to Tailwind's `fontFamily.display` / `fontFamily.sans`.
- **Testing (UI):** Vitest with `@vitejs/plugin-react` for JSX transform, JSDOM env for `*.test.tsx`, `@testing-library/react` + `@testing-library/user-event` + `@testing-library/jest-dom`. `cleanup()` runs in `afterEach` via `src/test/setup.ts`.
- **LLM clients:** Multi-provider BYO-key. `@anthropic-ai/sdk` and `openai` installed; Google Gemini and DeepSeek will be added as full adapters in Task 1.5 (files exist as stubs).
- **Validation:** Zod 3
- **Testing:** Vitest 2.1 + `@vitest/coverage-v8` (set up in Task 1.2; no tests yet — first tests land in Task 1.3).
- **Deployment:** Vercel (also self-hostable on any Node 20+ host) — not yet configured

### Architecture

- **Routing:** Next.js App Router under `src/app/`. Route groups `(auth)` and `(dashboard)` share layouts without affecting URLs. Public chat lives at `/u/[username]/chat` (will be made public-no-auth in Stage 4; currently scaffolded).
- **Data layer:** Drizzle ORM with a singleton `pg.Pool` (lazy — first query opens the TCP connection). Two tables today: `users` (with `username` + `email` unique, `hashed_password`, non-sensitive `llm_provider`/`llm_model` preferences, `email_verified`, timestamps) and `bots` (FK to `users.id` with `ON DELETE CASCADE`, `name`, `headline`, `personality` default `'professional'`, `context_text`, `suggested_questions` JSONB typed as `string[]`, `is_active`, timestamps). `updated_at` auto-bumps via Drizzle `$onUpdate` (app-level only). The LLM API key is **intentionally** not a column.
- **Auth layer:** NextAuth v4 with the Credentials provider and JWT session strategy (no DB adapter; the `authorize()` callback queries Drizzle directly). Password hashing via `bcryptjs` cost 10. Inputs validated by Zod (`src/lib/auth/schemas.ts`) — `USERNAME_REGEX = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/` + reserved-slug set from `plan.md` §4.6 enforced at registration to keep `users.username` valid for Stage 4's `/u/[username]/chat` route. JWT carries `id` + `username`; LLM provider/model are intentionally kept out of the JWT (refetched per chat call to avoid stale prefs). Module augmentation lives in `src/types/next-auth.d.ts`. Registration is `POST /api/auth/register` — pre-check + `UNIQUE`-constraint backstop translates `pg` error code `23505` to a 409 instead of leaking a 500.
- **LLM abstraction:** All chat/embedding calls go through a provider registry in `src/lib/ai/providers/`. Each adapter (`anthropic.ts`, `openai.ts`, `google.ts`, `deepseek.ts`) implements a shared `LLMProvider` interface in `types.ts`. The chat API resolves the user's chosen provider/model from the `users` table and forwards the BYO key only to that provider.
- **BYO-key transport (planned):** The LLM API key is held in browser `localStorage` (`src/lib/client/llm-key-store.ts`, key `probot.llm.key.v1`) and sent to the chat API in an `x-llm-api-key` header — never in the JSON body. The server never logs, persists, or forwards the key except to the chosen provider. Enforced in Task 1.8 (`key-transport.ts`).
- **Sanitization (planned):** `sanitize-input.ts` and `sanitize-output.ts` will port VAi's 40+ input-blocklist patterns and output-leakage detection (Task 1.8).
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
├── .env.example                    # DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL (no LLM keys — BYO)
├── drizzle/                        # generated migrations — 0000_new_misty_knight.sql (users + bots tables)
├── claude/
│   ├── context.md                  # This file — knowledge base
│   ├── plan.md                     # 7-stage build plan (v1.1, SRS-aligned)
│   ├── srs.md                      # Software requirements spec
│   └── vai.md                      # VAi reference implementation (port source for Stage 1)
├── design/                         # Static HTML/CSS mockups (port to Tailwind per surface)
└── src/
    ├── app/
    │   ├── layout.tsx              # Root layout
    │   ├── page.tsx                # "/" landing (Stage 1 scaffold marker)
    │   ├── globals.css             # Tailwind directives
    │   ├── (auth)/login/page.tsx           # placeholder UI — Task 1.4
    │   ├── (auth)/register/page.tsx        # placeholder UI — Task 1.4
    │   ├── (dashboard)/dashboard/page.tsx           # placeholder
    │   ├── (dashboard)/dashboard/bots/new/page.tsx  # placeholder
    │   ├── u/[username]/chat/page.tsx               # placeholder (Stage 4 makes public)
    │   └── api/auth/
    │       ├── [...nextauth]/route.ts       # NextAuth catch-all (signin/session/csrf/...) — Task 1.3 ✓
    │       └── register/route.ts            # POST registration endpoint — Task 1.3 ✓
    ├── components/
    │   ├── chat/                   # ChatWindow, MessageBubble, SuggestedQuestions, LoadingAnimation (stubs)
    │   └── bot-factory/            # BotFactoryForm (stub)
    ├── lib/
    │   ├── db/                     # schema.ts (users + bots Drizzle tables), index.ts (Drizzle client) — Task 1.2 ✓
    │   ├── ai/
    │   │   ├── providers/          # index, types, anthropic, openai, google, deepseek (stubs — Task 1.5)
    │   │   ├── prompt-builder.ts   # stub — Task 1.8
    │   │   ├── sanitize-input.ts   # stub — Task 1.8
    │   │   ├── sanitize-output.ts  # stub — Task 1.8
    │   │   └── key-transport.ts    # stub — Task 1.8
    │   ├── auth/
    │   │   ├── auth.ts             # NextAuth options (Credentials + JWT) — Task 1.3 ✓
    │   │   ├── passwords.ts        # bcryptjs hash + verify at cost 10 — Task 1.3 ✓
    │   │   └── schemas.ts          # Zod registerInput/loginInput + USERNAME_REGEX + RESERVED_SLUGS — Task 1.3 ✓
    │   └── client/llm-key-store.ts # stub — Task 1.6
    └── types/
        ├── index.ts                # stub
        └── next-auth.d.ts          # NextAuth module augmentation: User/Session/JWT add id + username — Task 1.3 ✓
```

`src/lib/db/` now contains real Drizzle code (Task 1.2). All other `src/components/` and `src/lib/` files are still `export {};` placeholders from Task 1.1. Bodies land in Tasks 1.3–1.8.

### Build / Run / Test Commands

- `npm install` — resolve dependencies (one-time)
- `npm run dev` — Next.js dev server on http://localhost:3000
- `npm run build` — production build + type-check + route validation (green as of Task 1.2)
- `npm run typecheck` — `tsc --noEmit` only
- `npm run lint` — `next lint`
- `npm test` — Vitest one-shot (`--passWithNoTests` for now)
- `npm run test:watch` — Vitest watch mode
- `npm run test:coverage` — Vitest with v8 coverage
- `npm run db:generate` — generate Drizzle migrations from `src/lib/db/schema.ts` → `drizzle/`
- `npm run db:migrate` — apply Drizzle migrations against `DATABASE_URL`

---

## Key Decisions

_Architectural and product decisions, in chronological order. Each entry: date, decision, rationale, alternatives rejected._

- _(none yet)_

---

## Open Questions / TODOs

**Resolved 2026-06-03:**

- [x] ~~Define project goal and scope from `claude/srs.md`~~ — captured in `claude/plan.md` (v1.1 7-stage build plan).
- [x] ~~Choose tech stack~~ — see Current State / Tech Stack.
- [x] ~~Set up initial repo structure~~ — Stage 1 Task 1.1.
- [x] ~~Decide whether `CLAUDE.md` should explicitly instruct Claude to read & update `context.md` each session~~ — done; see CLAUDE.md §9.

**Resolved 2026-06-03 (Task 1.2):**

- [x] ~~**Security:** bump `next@14.2.15` → latest patched 14.2.x~~ — bumped to `^14.2.35` in Task 1.2.
- [x] ~~**Test runner:** decide between Vitest and Jest~~ — chose Vitest 2.1; harness wired but no tests yet.

**Resolved 2026-06-04 (Task 1.3):**

- [x] ~~**First test file:** land at least one real spec in Task 1.3~~ — 43 specs across 4 files now in place (passwords, schemas, auth, register).

**Open:**

- [ ] **Tailwind / design port:** `design/*.html` mockups are not yet ported to Tailwind components. Will land per surface (login → Task 1.4, bot factory → Task 1.6, chat → Task 1.7) per CLAUDE.md §8.
- [ ] **Stage 1 remaining tasks:** 1.4 (login/register UI) · 1.5 (provider clients + BYO key transport) · 1.6 (Bot Factory form + browser key store) · 1.7 (Chat UI port from VAi) · 1.8 (Chat API port from VAi).
- [ ] **Run the migration:** `drizzle/0000_new_misty_knight.sql` is generated and committed but not applied. Run `npm run db:migrate` against a real Postgres (Supabase/Neon free tier or local Docker) before Task 1.4's UI flows can hit a live backend.
- [ ] **Email verification UX:** the `email_verified` column is wired but always `false` at registration. Stage 7 owns the actual verify-email flow; until then login is intentionally not gated on this flag.
- [ ] **Rate limiting on auth routes:** none in Stage 1 (Stage 7's Redis layer wraps everything). Credential stuffing is undefended in the meantime.

---

## Session History

> Append-only. Newest entry at the bottom. Each entry follows the template below.

### Template (copy for each new entry)

```
### YYYY-MM-DD HH:MM — <one-line title summary of whats been done>

**What was asked to do:** <what the user asked to do (not task1.1, but write a title for the work from plan.md file for task1.1)>

**What I did:**
- <action>

**Files changed:**
- `path/to/file` — <create | update | delete> — <why>

**Decisions made:**
- <decision and rationale>

**Open questions / follow-ups:**
- <item>
```

---

### 2026-06-03 15:55 — Stage 1 Task 1.1: Project scaffolding

**What was asked to do:** "Project Scaffolding: set up the initial Next.js 14 app with the specified tech stack and repository structure. Create placeholder files for all major components, routes, and utilities as outlined in the architecture. Ensure the scaffold compiles and routes resolve without errors, even though the bodies are empty. This sets the foundation for incremental development in subsequent tasks."

**What I did:**

- Scaffolded the Next.js 14 App Router skeleton per `claude/plan.md` §1.1.
- Installed the dependency tree via npm (457 packages).
- Verified the scaffold compiles and routes resolve via `npm run build` — all 7 routes generate cleanly (`/`, `/login`, `/register`, `/dashboard`, `/dashboard/bots/new`, `/u/[username]/chat`, `_not-found`).

**Files changed:**

- `package.json` — create — manifest pinning `next@14.2.15`, `react@18.3.1`, `typescript@5.6`, `drizzle-orm@0.36`, `drizzle-kit@0.28`, `pg@8.13`, `next-auth@4.24`, `@anthropic-ai/sdk@0.32`, `openai@4.71`, `zod@3.23`, `tailwindcss@3.4`. Scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `db:generate`, `db:migrate`.
- `tsconfig.json` — create — strict TS, `noUncheckedIndexedAccess`, `@/*` → `./src/*` alias, Next.js plugin.
- `next.config.js` — create — `reactStrictMode: true`.
- `tailwind.config.ts` — create — content glob `./src/**/*.{ts,tsx}`.
- `postcss.config.js` — create — tailwind + autoprefixer.
- `drizzle.config.ts` — create — schema target `./src/lib/db/schema.ts`, dialect `postgresql`.
- `.env.example` — create — `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, optional self-host LLM fallback (commented). No LLM key envs by design (BYO key).
- `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css` — create — root layout, "Stage 1 scaffold" landing, Tailwind directives.
- `src/app/(auth)/login/page.tsx`, `(auth)/register/page.tsx` — create — placeholder pages (`return null`) so routes resolve.
- `src/app/(dashboard)/dashboard/page.tsx`, `(dashboard)/dashboard/bots/new/page.tsx` — create — placeholders.
- `src/app/u/[username]/chat/page.tsx` — create — placeholder (Stage 4 makes public).
- `src/components/chat/{ChatWindow,MessageBubble,SuggestedQuestions,LoadingAnimation}.tsx` — create — `export {};` stubs.
- `src/components/bot-factory/BotFactoryForm.tsx` — create — `export {};` stub.
- `src/lib/db/{schema,index}.ts` — create — `export {};` stubs (Task 1.2 fills in).
- `src/lib/ai/providers/{index,types,anthropic,openai,google,deepseek}.ts` — create — `export {};` stubs.
- `src/lib/ai/{prompt-builder,sanitize-input,sanitize-output,key-transport}.ts` — create — `export {};` stubs.
- `src/lib/auth/auth.ts`, `src/lib/client/llm-key-store.ts`, `src/types/index.ts` — create — `export {};` stubs.

**Decisions made:**

- **Package manager:** npm — no extra install needed, zero-cost, simplest. (User confirmed.)
- **Stubs:** `export {};` placeholders (user's choice from option (a)). Future Task 1.x sessions fill bodies without renaming files.
- **Route groups:** `(auth)` and `(dashboard)` created as empty placeholders now so routes resolve cleanly; real layouts land in later tasks.
- **Tailwind without design port:** Tailwind is wired (config + globals.css directives) but no `design/*.html` styles ported yet. Per-surface ports land in Tasks 1.4 / 1.6 / 1.7.
- **`pg` + Drizzle pinned now:** `drizzle.config.ts` needs a dialect target; deferring would force a second `package.json` touch in Task 1.2.
- **Browser-side BYO key:** key store lives in `src/lib/client/llm-key-store.ts` (browser-only `localStorage`); never sent in request body — `x-llm-api-key` header only (Task 1.8 will enforce).

**Open questions / follow-ups:**

- `next@14.2.15` security advisory flagged during `npm install` — bump to latest patched 14.2.x before Task 1.2.

---

### 2026-06-03 16:45 — Stage 1 Task 1.2: Drizzle schema + DB client + Vitest harness

**What was asked to do:** "Drizzle schema + DB client + Vitest harness: Define the initial Drizzle schema with `users` and `bots` tables as per the plan. Set up a singleton `pg.Pool` and Drizzle client for database interactions. Generate the first migration SQL file. Install Vitest and configure it for future testing, ensuring it runs without tests (green with an empty suite). This lays the groundwork for database operations and testing in upcoming tasks."

**What I did:**

- Bumped `next` `14.2.15` → `^14.2.35` and `eslint-config-next` to match — closes the security advisory queued in Open Questions.
- Added Vitest 2.1 + `@vitest/coverage-v8` and three test scripts (`test`, `test:watch`, `test:coverage`) with `--passWithNoTests` so the empty suite is a green baseline.
- Wrote `src/lib/db/schema.ts` with two Drizzle tables (`users`, `bots`) matching `claude/plan.md` §1.2 exactly: UUID PK with `gen_random_uuid()` default, unique `username`/`email`, `personality` default `'professional'`, `is_active` default true, `email_verified` default false, FK `bots.user_id → users.id` `ON DELETE CASCADE`, JSONB `suggested_questions` typed as `string[]`. Exported `User`, `NewUser`, `Bot`, `NewBot` via `$inferSelect`/`$inferInsert`.
- Wrote `src/lib/db/index.ts` — singleton `pg.Pool({ connectionString: process.env.DATABASE_URL })` + `drizzle(pool, { schema })`, plus `export * from "./schema"`. Pool is lazy — `import { db }` does **not** require `DATABASE_URL` at module-load time; only the first query does.
- Wrote `vitest.config.ts` — node environment, v8 coverage with `include: ["src/**/*.{ts,tsx}"]` and `exclude: ["src/**/*.test.{ts,tsx}", "src/types/**"]`, `@/*` resolve alias mirroring `tsconfig.json`.
- Ran `npm run db:generate` → produced `drizzle/0000_new_misty_knight.sql` (2 tables, 1 FK with `ON DELETE CASCADE`, unique constraints on `users.username` and `users.email`). Committed to repo. Migration **not** applied — no live DB yet (per Q2 option (b)).
- Verified: `npm run typecheck` clean, `npm run build` green (all 7 routes still generate), `npm test` exits 0 with "No test files found".

**Files changed:**

- `package.json` — update — bumped `next` and `eslint-config-next` to `^14.2.35`; added `vitest@^2.1.9`, `@vitest/coverage-v8@^2.1.9` to devDeps; added 3 test scripts.
- `package-lock.json` — update — npm regenerated for the bumps and new deps.
- `src/lib/db/schema.ts` — update — replaced `export {};` stub with real Drizzle schema (61 lines).
- `src/lib/db/index.ts` — update — replaced `export {};` stub with `pg.Pool` + Drizzle client + schema re-export (14 lines).
- `vitest.config.ts` — create — Vitest config with node env, v8 coverage, `@/*` alias.
- `drizzle/0000_new_misty_knight.sql` — create (generated) — initial migration. `drizzle/meta/` is gitignored per existing `.gitignore`.
- `claude/context.md` — update — Tech Stack, Architecture, Repository Layout, Build/Run/Test, Open Questions (2 closed, 2 new), this Session History entry.

**Decisions made:**

- **Bump Next.js while touching `package.json` anyway:** the security advisory was already queued; doing it alongside the Vitest install avoids a second `npm install` round-trip. `14.2.35` is patch-compatible with `14.2.15`, so no API churn.
- **Lazy `pg.Pool` (KISS):** chose `new Pool({ connectionString: process.env.DATABASE_URL })` over a proxy/getter pattern. `pg.Pool` does not connect on construction, so `import { db }` succeeds even with `DATABASE_URL` unset — the build is safe today (no consumer imports it yet) and future builds get the same forgiving behavior. The first query throws at runtime if the env is missing — the right point to fail loudly.
- **Drizzle `mode: "date"`:** timestamps deserialize to `Date` objects (per Q3). Easier date math and serialization (`createdAt.toISOString()`) at the app layer.
- **App-level `$onUpdate` for `updated_at`:** per Q4. All writes go through Drizzle in Stage 1, so the trigger is unnecessary. A DB-level trigger can land later if raw-SQL writers appear.
- **Vitest over Jest (per Q1):** Vitest cold-starts in ~200ms vs Jest's 2–5s, native ESM/TS, simpler config, zero-cost. Jest's "Next.js default" advantage is moot since we're not testing Next.js internals.
- **`--passWithNoTests` on by default:** keeps `npm test` green from day one. Real coverage targets per `~/.claude/rules/ecc/common/testing.md` (80%) kick in when actual specs land in Task 1.3.
- **No tests for the schema itself:** Drizzle schema is declarative data, not behavior. The migration SQL output _is_ the verification. Tests add value at Task 1.3 (NextAuth flows, credential validation) and Task 1.8 (sanitizers, prompt builder).
- **Migration generated, not applied:** per Q2 option (b). The user runs `npm run db:migrate` once they have a real Postgres (Supabase free tier, Neon free tier, or local Docker) — that decision is theirs.

**Open questions / follow-ups:**

- Apply the migration before Task 1.3 needs persistence (`npm run db:migrate` against a real Postgres).
- Land the first real Vitest spec in Task 1.3.

---

### 2026-06-04 09:45 — Stage 1 Task 1.3: NextAuth email/password + registration + first tests

**What was asked to do:** NextAuth email/password + registration + first tests. Implement NextAuth.js email/password auth, registration endpoint, bcrypt hashing, Zod validation, and the first real Vitest specs. Approved Q1–Q4: bcryptjs + cost 10; no email-verified gate at login; mock-DB integration tests (option B); enforce Stage 4 username rules at registration now.

**What I did:**

- Added `bcryptjs@^2.4.3` (deps) and `@types/bcryptjs@^2.4.6` (devDeps); ran `npm install` (no advisories).
- Wrote `src/lib/auth/passwords.ts` — `hashPassword`/`verifyPassword` thin wrappers around `bcryptjs` at cost 10.
- Wrote `src/lib/auth/schemas.ts` — Zod `registerInput`/`loginInput`, `USERNAME_REGEX` and `RESERVED_SLUGS` per `plan.md` §4.6, plus exported `RegisterInput`/`LoginInput` types via `z.infer`.
- Replaced the `src/lib/auth/auth.ts` Task 1.1 stub with a real `NextAuthOptions` export — JWT session strategy, `signIn: "/login"` custom page, Credentials provider whose `authorize()` validates with `loginInput`, looks up by email via Drizzle, verifies with bcryptjs, and returns `{ id, username, email }`. `jwt` and `session` callbacks copy `id`/`username` from user → token → session.
- Wrote `src/types/next-auth.d.ts` — module augmentation: `User`/`Session.user`/`JWT` all carry `id: string` + `username: string`.
- Wrote `src/app/api/auth/[...nextauth]/route.ts` — three-line catch-all (`NextAuth(authOptions)` exported as `GET` + `POST`).
- Wrote `src/app/api/auth/register/route.ts` — `POST` handler: parses JSON (400 on invalid), `registerInput.safeParse` (400 on validation error), pre-check via `db.query.users.findFirst({ where: or(eq(users.email, email), eq(users.username, username)) })` (409 on duplicate, with field disambiguation), bcrypt the password, insert via `db.insert(users).values(...).returning(...)`, and catch Postgres `unique_violation` (code `23505`) as a 409 to cover the pre-check → insert race window.
- Wrote 4 Vitest specs (43 tests total, all green):
  - `src/lib/auth/passwords.test.ts` — bcrypt hash shape, verify roundtrip, wrong-password rejection, salt produces distinct hashes (4 tests).
  - `src/lib/auth/schemas.test.ts` — `it.each` matrix for valid/invalid registerInput, USERNAME_REGEX positive/negative cases, RESERVED_SLUGS membership (27 tests).
  - `src/lib/auth/auth.test.ts` — mocks `@/lib/db` with `vi.mock`, exercises `authorize()` for happy path + missing user + wrong password + invalid credential shape, plus `authOptions.session.strategy === "jwt"` and `pages.signIn === "/login"` invariants (6 tests).
  - `src/app/api/auth/register/route.test.ts` — chained `vi.fn()` for `db.insert(users).values().returning()`, asserts 201 happy path (and confirms the inserted `hashedPassword` is bcrypt-shaped, not plaintext), 409 email-dupe, 409 username-dupe, 400 validation, 400 invalid-JSON, and 409 on simulated `code: "23505"` race (6 tests).
- Debugged one failing test ("returns the user on valid credentials") via per-line `console.log` in both test and source. **Root cause:** NextAuth v4's `CredentialsProvider({...})` factory returns `{ id, name, type, credentials, authorize: () => null, options }` — the user-supplied `authorize` lives on `.options.authorize`, while the top-level `.authorize` is a stub that always returns `null`. My test helper `getAuthorize()` had been reaching for the top-level (stub) and never invoked my real function. Fixed the helper to read `provider.options.authorize`. After the fix: 43/43 tests pass.
- Verified `npm run typecheck` clean, `npm run build` green (`/api/auth/[...nextauth]` and `/api/auth/register` show up as dynamic functions in the route table).

**Files changed:**

- `package.json` — update — added `bcryptjs@^2.4.3` (deps) and `@types/bcryptjs@^2.4.6` (devDeps); no script changes.
- `package-lock.json` — update — npm regenerated.
- `src/lib/auth/passwords.ts` — create — bcryptjs wrapper.
- `src/lib/auth/schemas.ts` — create — Zod schemas + username constants.
- `src/lib/auth/auth.ts` — update — replaced `export {};` stub with `authOptions` (Credentials provider + JWT callbacks).
- `src/types/next-auth.d.ts` — create — NextAuth module augmentation.
- `src/app/api/auth/[...nextauth]/route.ts` — create — catch-all route handler.
- `src/app/api/auth/register/route.ts` — create — registration endpoint with pre-check + unique-violation backstop.
- `src/lib/auth/passwords.test.ts` — create — 4 specs.
- `src/lib/auth/schemas.test.ts` — create — 27 specs.
- `src/lib/auth/auth.test.ts` — create — 6 specs.
- `src/app/api/auth/register/route.test.ts` — create — 6 specs.
- `claude/context.md` — update — Current State (Tech Stack, Architecture, Repository Layout, Build commands implied), Open Questions (1 closed: first test file; 2 new follow-ups: email-verification UX and auth rate-limiting), this Session History entry.

**Decisions made:**

- **`bcryptjs` (not `bcrypt`):** pure JS, no native bindings, deploys cleanly to Vercel/Docker/CI without `node-gyp` headaches. ~30% slower per hash than the native lib but cost 10 is still ~50–100ms — fine for an auth path.
- **Cost factor 10:** OWASP 2025 minimum, NextAuth default. Easy to bump in Stage 7 hardening once we benchmark prod hardware.
- **JWT, not DB sessions:** Credentials provider doesn't ship a DB-sessions story without a custom adapter + `sessions` table (which the schema deliberately doesn't have). JWT keeps the data layer unchanged and avoids a per-request DB lookup on every authenticated route.
- **Login by email only:** simpler. Username is the public slug for `/u/[username]/chat`, not a login identifier.
- **JWT payload kept minimal:** `id` + `username` + NextAuth's default `email`. `llmProvider`/`llmModel` are intentionally _not_ in the JWT — they can change (user switches provider in dashboard) and a stale JWT would make the chat API hit the wrong provider. The chat API will fetch these per request (one indexed lookup; cheap).
- **Enforce username rules at registration today:** prevents `users.username` from accumulating values that would later be invalid for Stage 4's `/u/[username]/chat` route (`Jane.Doe`, reserved slugs like `admin`/`api`/`u`/...). Same constraint, zero migration cost.
- **No login gate on `email_verified`:** Stage 7 owns the actual verify-email flow. Stage 1 leaves the column as `false` at registration; future "please verify" UX hooks into the existing flag without changing the schema.
- **Race-condition backstop with Postgres `code: 23505`:** the pre-check + `UNIQUE`-constraint combo handles concurrent registration without leaking a 500. Justified per CLAUDE.md §2 — this is a real concurrency case, not a hypothetical.
- **Module augmentation in `src/types/`:** keeps the cross-cutting NextAuth type extension out of the auth module itself; it's auto-picked-up by `tsconfig.json`'s `**/*.ts` include.
- **Skip-auth rate-limiting in Stage 1:** Stage 7's Redis-backed rate limiter wraps every endpoint uniformly. Adding an in-memory limiter just for auth now would mean rewriting it in Stage 7. Noted as an open gap.

**Open questions / follow-ups:**

- Email-verification UX (when Stage 7 lands the email-send flow).
- Auth-route rate limiting (Stage 7).
- Apply the Drizzle migration before Task 1.4's UI can talk to a live `/api/auth/register`.

---

### 2026-06-04 10:30 — Stage 1 Task 1.4: Login + register UI ported from design/login.html

**What was asked to do:** Port the login/register surface from `design/login.html` onto the existing `(auth)/login` and `(auth)/register` Next.js placeholders, wire the forms to the Task 1.3 backend (`POST /api/auth/register` + `signIn("credentials")`), and ship the design tokens (oklch palette + Bricolage Grotesque / Inter Tight fonts) into the project's Tailwind config — per `srs.md` FR-001 (email/password parts; OAuth + password-reset deferred to Stage 7).

**What I did:**

- Ported the design tokens from `design/login.html`'s inline `tailwind.config` and `design/assets/probot.css` into `tailwind.config.ts` (`theme.extend.colors` for the 8 oklch tokens, `theme.extend.fontFamily` pointing at CSS variables) and `src/app/globals.css` (`@layer components` with `.btn` family + `.brand-deep-gradient` + `.dot-pattern-light` + `.shadow-floating/soft`).
- Wired `next/font/google` (`Bricolage_Grotesque` + `Inter_Tight`) in `src/app/layout.tsx`, exposed as CSS variables `--font-display` / `--font-sans` that Tailwind reads.
- Mounted `SessionProvider` (new `src/lib/auth/session-provider.tsx`) in the root layout.
- Built shared `(auth)/layout.tsx` (lg:grid-cols-2 chrome) + `BrandPanel.tsx` (left server component with brand copy + sample chat card + trust badges, all inline SVGs).
- Built `OAuthDisabledRow.tsx` — Google + GitHub + LinkedIn buttons rendered `disabled` with absolute-positioned "SOON" badge (Q1=b).
- Built `LoginForm.tsx` ("use client") — `signIn("credentials", { redirect: false })` → push `/dashboard` on success, alert on error. "Forgot?" greyed with Stage-7 tooltip.
- Built `RegisterForm.tsx` ("use client") — POST `/api/auth/register` → auto `signIn` on 201 → push `/dashboard`. Surfaces server message on 409, first field error on 400, "Network error" on fetch reject; falls back to `/login` if auto-signin fails.
- Replaced the `return null` placeholders in `(auth)/login/page.tsx` and `(auth)/register/page.tsx` with metadata exports + form renders.
- Stood up the **component-test harness:** added `@vitejs/plugin-react`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom` to devDeps; updated `vitest.config.ts` (`plugins: [react()]`, `environmentMatchGlobs` → JSDOM for `.tsx`); wrote `src/test/setup.ts` that loads jest-dom matchers and calls `cleanup()` in `afterEach`.
- Wrote 10 component tests (4 for `LoginForm`, 6 for `RegisterForm`) — all green.
- Hit one gotcha: tests passed individually but failed when run together (duplicated "Create account" buttons in DOM). Root cause: `@testing-library/react`'s auto-cleanup wasn't firing. Fixed by adding explicit `afterEach(cleanup)` in `src/test/setup.ts`.
- Verified: `npm test` → **53 / 53 pass** across 6 files. `npm run typecheck` clean. `npm run build` green — `/login` 108 kB, `/register` 109 kB First Load JS, both under the 150 kB landing-page budget.

**Files changed:**

- `package.json` — update — added `@testing-library/jest-dom@^6.6.3`, `@testing-library/react@^16.1.0`, `@testing-library/user-event@^14.5.2`, `@vitejs/plugin-react@^4.3.4`, `jsdom@^25.0.1` to devDeps.
- `tailwind.config.ts` — update — `theme.extend.colors` (8 oklch tokens) + `theme.extend.fontFamily` (display + sans → CSS variables).
- `vitest.config.ts` — update — `plugins: [react()]`, `environmentMatchGlobs` for `.tsx` → jsdom, `setupFiles`, `src/test/**` in coverage exclude.
- `src/test/setup.ts` — create — jest-dom matchers + `afterEach(cleanup)`.
- `src/app/layout.tsx` — update — `next/font/google` (Bricolage Grotesque + Inter Tight) on `<html>`, body classes, `<SessionProvider>` wrap.
- `src/app/globals.css` — update — appended design-system layer.
- `src/lib/auth/session-provider.tsx` — create — `"use client"` `<NextAuthSessionProvider>` wrapper.
- `src/app/(auth)/layout.tsx` — create — lg:grid-cols-2 chrome.
- `src/components/auth/BrandPanel.tsx` — create — left panel + inline SVGs.
- `src/components/auth/OAuthDisabledRow.tsx` — create — disabled OAuth buttons with SOON badges.
- `src/components/auth/LoginForm.tsx` — create — client form, `signIn` flow.
- `src/components/auth/RegisterForm.tsx` — create — client form, POST + auto-signIn.
- `src/components/auth/LoginForm.test.tsx` — create — 4 specs.
- `src/components/auth/RegisterForm.test.tsx` — create — 6 specs.
- `src/app/(auth)/login/page.tsx` — update — metadata + `<LoginForm />`.
- `src/app/(auth)/register/page.tsx` — update — metadata + `<RegisterForm />`.
- `claude/context.md` — update — Tech Stack (Auth row extended, new Fonts and Testing-UI rows), this Session History entry.

**Decisions made:**

- **Two pages + shared `(auth)/layout.tsx`** (Q2=a). Real URLs + single chrome source.
- **OAuth + Forgot disabled with SOON badge** (Q1=b) — surface looks complete without dead UI.
- **`@testing-library/*` now** (Q3=a) — form-submit logic is where silent regressions hide.
- **`next/font/google`** (Q4=yes) — self-hosted at build time; no FOUC, no DNS round-trip.
- **Inline SVGs** (Q5=a) — no icon-lib payload tax.
- **CSS-variable bridge for fonts:** `next/font` writes `--font-display`/`--font-sans`; Tailwind's `fontFamily` reads them. Decouples font loader from design tokens.
- **Server-validation-only:** HTML5 attrs for trivial cases; rely on `/api/auth/register` 400 `details: parsed.error.flatten()` payload otherwise. No `react-hook-form` — KISS.
- **Auto-sign-in after registration:** lands user in `/dashboard` without typing the password twice; falls back to `/login` if `signIn` fails post-201.
- **Explicit `afterEach(cleanup)`** instead of relying on testing-library's "automatic" cleanup — more reliable across versions.
- **No tests on the static `BrandPanel`:** per web/testing.md, visual regression > markup snapshots on highly visual chrome. Manual smoke-test via `npm run dev`.

**Open questions / follow-ups:**

- Apply the Drizzle migration before the live `/api/auth/register` path is end-to-end exercisable — still queued from Task 1.2/1.3.
- `/dashboard` placeholder still returns null (Task 1.1) so the post-login redirect renders nothing. Cosmetic for now; Task 1.6 wires it.
- OAuth + password reset wiring lands in Stage 7 — the disabled buttons + greyed "Forgot?" make the gap visible.
- Visual regression / Playwright for auth surfaces — not in scope this turn; consider alongside chat UI tests in Task 1.7.

---
