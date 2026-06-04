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
- **Framework:** Next.js 14.2 (App Router)
- **Styling:** Tailwind CSS 3.4 (utility-first per CLAUDE.md §8; no inline CSS)
- **ORM:** Drizzle ORM 0.36 + `drizzle-kit` for migrations
- **Database:** PostgreSQL (Supabase / Neon / local Postgres via `DATABASE_URL`)
- **Auth:** NextAuth.js 4 (email/password in Stage 1; OAuth deferred to Stage 7)
- **LLM clients:** Multi-provider BYO-key. `@anthropic-ai/sdk` and `openai` installed; Google Gemini and DeepSeek will be added as full adapters in Task 1.5 (files exist as stubs).
- **Validation:** Zod 3
- **Deployment:** Vercel (also self-hostable on any Node 20+ host) — not yet configured

### Architecture

- **Routing:** Next.js App Router under `src/app/`. Route groups `(auth)` and `(dashboard)` share layouts without affecting URLs. Public chat lives at `/u/[username]/chat` (will be made public-no-auth in Stage 4; currently scaffolded).
- **LLM abstraction:** All chat/embedding calls go through a provider registry in `src/lib/ai/providers/`. Each adapter (`anthropic.ts`, `openai.ts`, `google.ts`, `deepseek.ts`) implements a shared `LLMProvider` interface in `types.ts`. The chat API resolves the user's chosen provider/model from the `users` table and forwards the BYO key only to that provider.
- **BYO-key transport (planned):** The LLM API key is held in browser `localStorage` (`src/lib/client/llm-key-store.ts`, key `probot.llm.key.v1`) and sent to the chat API in an `x-llm-api-key` header — never in the JSON body. The server never logs, persists, or forwards the key except to the chosen provider. Enforced in Task 1.8 (`key-transport.ts`).
- **Sanitization (planned):** `sanitize-input.ts` and `sanitize-output.ts` will port VAi's 40+ input-blocklist patterns and output-leakage detection (Task 1.8).
- **Path alias:** `@/*` → `./src/*` (configured in `tsconfig.json`).

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
├── .env.example                    # DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL (no LLM keys — BYO)
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
    │   ├── (auth)/login/page.tsx           # placeholder
    │   ├── (auth)/register/page.tsx        # placeholder
    │   ├── (dashboard)/dashboard/page.tsx           # placeholder
    │   ├── (dashboard)/dashboard/bots/new/page.tsx  # placeholder
    │   └── u/[username]/chat/page.tsx               # placeholder (Stage 4 makes public)
    ├── components/
    │   ├── chat/                   # ChatWindow, MessageBubble, SuggestedQuestions, LoadingAnimation (stubs)
    │   └── bot-factory/            # BotFactoryForm (stub)
    ├── lib/
    │   ├── db/                     # schema.ts, index.ts (stubs — Task 1.2)
    │   ├── ai/
    │   │   ├── providers/          # index, types, anthropic, openai, google, deepseek (stubs — Task 1.5)
    │   │   ├── prompt-builder.ts   # stub — Task 1.8
    │   │   ├── sanitize-input.ts   # stub — Task 1.8
    │   │   ├── sanitize-output.ts  # stub — Task 1.8
    │   │   └── key-transport.ts    # stub — Task 1.8
    │   ├── auth/auth.ts            # stub — Task 1.3
    │   └── client/llm-key-store.ts # stub — Task 1.6
    └── types/index.ts              # stub
```

All `src/components/` and `src/lib/` files are `export {};` placeholders introduced in Task 1.1 so the directory tree resolves and `tsc`/`next build` succeed. Bodies land in Tasks 1.2–1.8.

### Build / Run / Test Commands

- `npm install` — resolve dependencies (one-time)
- `npm run dev` — Next.js dev server on http://localhost:3000
- `npm run build` — production build + type-check + route validation (green as of Task 1.1)
- `npm run typecheck` — `tsc --noEmit` only
- `npm run lint` — `next lint`
- `npm run db:generate` — generate Drizzle migrations from `src/lib/db/schema.ts` (schema empty until Task 1.2)
- `npm run db:migrate` — apply Drizzle migrations

No test runner configured yet (Stage 1 testing strategy lands with the first real module — Task 1.2).

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

**Open:**

- [ ] **Security:** bump `next@14.2.15` → latest patched 14.2.x. npm flagged a Next.js security advisory during Task 1.1 install. Address before Task 1.2 touches `package.json`.
- [ ] **Tailwind / design port:** `design/*.html` mockups are not yet ported to Tailwind components. Will land per surface (login → Task 1.4, bot factory → Task 1.6, chat → Task 1.7) per CLAUDE.md §8.
- [ ] **Stage 1 remaining tasks:** 1.2 (Drizzle schema) · 1.3 (NextAuth) · 1.4 (login/register UI) · 1.5 (provider clients + BYO key transport) · 1.6 (Bot Factory form + browser key store) · 1.7 (Chat UI port from VAi) · 1.8 (Chat API port from VAi).
- [ ] **Test runner:** none configured yet. Decide between Vitest (lighter, modern) and Jest (Next.js default) when Task 1.2 lands.

---

## Session History

> Append-only. Newest entry at the bottom. Each entry follows the template below.

### Template (copy for each new entry)

```
### YYYY-MM-DD HH:MM — <one-line prompt summary>

**Prompt:** <verbatim or paraphrased user request>

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

### 2026-06-02 — Bootstrap context.md

**Prompt:** Build a `context.md` file where details of the code are appended after each prompt, so Claude Code can read prior project history before acting.

**What I did:**

- Inspected the project — found planning docs in `claude/` but no source code yet.
- Created `context.md` at repo root with: usage instructions for Claude, project overview, current state, key decisions, open questions, and an append-only session history.

**Files changed:**

- `context.md` — create — establish the persistent context log.

**Decisions made:**

- Placed file at repo root (not under `claude/`) so it sits next to `CLAUDE.md` and is the obvious second file to read.
- Append-only log format — past entries are never edited; only "Current State", "Open Questions", and "Key Decisions" sections are mutated.
- Kept structure lightweight: no rigid schema, just a copy-paste template entry that future sessions follow.

**Open questions / follow-ups:**

- Should `CLAUDE.md` be edited to explicitly tell Claude "read context.md first, append an entry last"? Recommend yes — without it, future sessions may forget the protocol.

---

### 2026-06-03 15:55 — Stage 1 Task 1.1: Project scaffolding

**Prompt:** "let's start working stage 1 task 1.1. Follow all the instructions as stated in CLAUDE.md file"

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

### 2026-06-03 16:15 — Switch prompt log → context.md knowledge base

**Prompt:** Remove `claude/prompts.md`; instead instruct Claude (via CLAUDE.md) to read `context.md` before coding and append knowledge-base details after each prompt that changes code/design/architecture.

**What I did:**

- Deleted `claude/prompts.md`. The verbatim prompt log is retired in favor of a distilled, append-only knowledge base.
- Rewrote `CLAUDE.md` §9 — renamed "Prompt History Logging" → "Project Knowledge Base (`context.md`)". New rules: (1) read `context.md` (Current State + last 2–3 Session History entries) before coding; (2) after code/design/architecture changes, append a Session History entry and update Current State / Key Decisions / Open Questions as needed; (3) never edit past Session History entries.
- Refreshed `claude/context.md` **Current State** (was "Planning phase — no source code yet"; now reflects Stage 1 Task 1.1 scaffold — tech stack, architecture, repo layout, build commands).
- Updated **Open Questions / TODOs** — closed 4 stale items, added the Next.js security advisory, the design/Tailwind port follow-up, the Stage 1 task roadmap, and the test-runner decision.
- Backfilled the Task 1.1 entry above so the knowledge base is complete from day one.

**Files changed:**

- `claude/prompts.md` — delete — verbatim prompt log retired in favor of distilled knowledge base.
- `CLAUDE.md` — update — §9 rewritten (~17 lines replaced).
- `claude/context.md` — update — Project Overview, Current State, Open Questions / TODOs, Session History (this entry + Task 1.1 backfill). Bootstrap entry (2026-06-02) intentionally left untouched per append-only contract — note that its claim the file lives at "repo root" is inaccurate; the file actually lives at `claude/context.md`. Future readers: trust the most recent entry over older ones.

**Decisions made:**

- **Knowledge base, not verbatim log:** distilled "what was built and how" is more useful to future sessions than raw prompt text. The append-only history preserves the audit trail without the noise.
- **Append-only respected for backfill:** the 2026-06-02 bootstrap entry has a minor inaccuracy ("repo root") but was not edited. This entry records the correct location instead.
- **Skip-append exception:** §9 explicitly allows skipping the append on pure clarifying-question turns. "When in doubt, append."

**Open questions / follow-ups:**

- None for this change.
