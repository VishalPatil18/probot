# Contributing to ProBot

Thanks for considering a contribution. This guide covers the workflow we use and what you can expect after opening an issue or PR.

> **Before anything else**, please read the [Code of Conduct](./CODE_OF_CONDUCT.md). Treat reviewers and other contributors the way you'd want to be treated. We don't enforce process for the sake of it - we enforce it because it makes maintenance possible.

---

## Quickstart for contributors

This is the same Quickstart the README ships. If they ever diverge, the README is canonical.

### 1. Prerequisites

| Tool     | Version | Why                                                                        |
| -------- | ------- | -------------------------------------------------------------------------- |
| Node.js  | 20+     | Next.js 14 + React 18 + Vitest 2                                           |
| npm      | 10+     | Package manager (yarn / pnpm work too but lockfile is `package-lock.json`) |
| Postgres | 15+     | Local Docker or a Supabase / Neon free-tier project                        |
| Git      | any     | For PRs                                                                    |

You also need at least one LLM API key to actually chat with a bot:

- **Anthropic** - `console.anthropic.com`, model `claude-haiku-4-5` is cheapest
- **OpenAI** - `platform.openai.com`, model `gpt-4o-mini` is cheapest
- **Azure OpenAI** - your own Azure deployment (endpoint + deployment name + API version + key)

You can ship code changes without a key (the test suite mocks all SDK calls), but you can't smoke-test the chat flow locally without one.

### 2. Clone and bootstrap

```bash
git clone https://github.com/vishalpatil18/probot.git
cd probot

npm install
cp .env.example .env.local
# Fill in:
#   DATABASE_URL=postgresql://user:pass@host:6543/db?sslmode=require
#   NEXTAUTH_SECRET=<openssl rand -base64 32>
#   NEXTAUTH_URL=http://localhost:3000
```

For local Postgres via Docker:

```bash
docker run --name probot-pg -e POSTGRES_PASSWORD=probot -e POSTGRES_DB=probot \
  -p 5432:5432 -d postgres:16
# DATABASE_URL=postgres://postgres:probot@localhost:5432/probot
```

For Supabase: Settings → Database → Connection string → use the **Transaction pooler** (port 6543) for app traffic, and the **Direct connection** (port 5432) only when running `npm run db:migrate`.

### 3. Run it

```bash
npm run db:migrate                # apply both Drizzle migrations
npm run dev                       # http://localhost:3000
```

Open <http://localhost:3000/register>. Create an account. Navigate manually to `/dashboard/bots/new`. Walk through the 5-step bot factory. Click **Preview bot**. Type a message. You should get a real LLM reply.

If you can't get this working in under 15 minutes, that's a bug - open an issue, we'll fix it.

### 4. Run the tests

```bash
npm test                          # Vitest one-shot
npm run test:watch                # Vitest watch mode
npm run test:coverage             # with v8 coverage report
npm run typecheck                 # tsc --noEmit
npm run lint                      # next lint
```

We expect every PR to land with `npm test` green and `npm run typecheck` clean. CI will run these on push (Stage 7).

---

## Branching

- `main` is always shippable. Current development happens on `development`.
- Work in topic branches off `development`: `feat/<thing>`, `fix/<thing>`, `docs/<thing>`, `refactor/<thing>`.
- Rebase your branch on top of the latest `development` before requesting review. We squash on merge, so commit hygiene inside the branch matters less than the squashed message.

## Commit messages

We follow Conventional Commits-lite:

```
<type>: <short description>

<optional body>
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`.

Examples:

- `feat: azure openai provider in registry`
- `fix: rate-limit per-day rollback when per-minute already consumed`
- `docs: deployment guide for vercel + supabase`
- `refactor: drop dead _bot parameter from sanitizeOutput`

## Pull requests

1. Open the PR - the template will prefill itself.
2. Fill the **Summary**, **Linked issue**, and **Test plan** sections. None of these are optional.
3. Attach a screenshot or recording for any UI change.
4. Wait for CI to go green.
5. Request review when the PR is _done_, not when you'd like a sanity check - for the latter, mark it Draft.

### What reviewers look for

- **Behaviour correctness** first. Does it do what it claims?
- **Tests added or updated.** Every PR that changes behavior must change at least one test. We're at 260/260 specs - keep us green.
- **Type-check clean.** No `tsc` errors. No `any` in production code. Use `unknown` for untrusted input then narrow.
- **No `console.*` in production code.** Use proper error responses; debug logs come out before review.
- **No `dangerouslySetInnerHTML`, no `rehype-raw`.** The XSS-safety of the chat UI rests on this; new contributors sometimes try to add raw-HTML support without realizing the threat model.
- **The BYO-key invariant.** If your change touches the chat path, error path, or any logging surface, prove (with a canary test) that the key value can't escape. See [`SECURITY.md`](./SECURITY.md) for the full invariant.
- **Diff scope.** PRs that bundle unrelated cleanups are harder to review. Open separate PRs.
- **No half-finished features behind unused flags.** YAGNI. Per `CLAUDE.md §2`.

### Review etiquette

- Comments are about the code, not the person. "This branches on `null` twice" is fine. "Why would you do this?" is not.
- If you're blocked on a clarification, ask in the PR thread rather than in DM - future maintainers will read this.
- Approve when you're ready to take responsibility for the change if something breaks after merge.

---

## Project layout

```
probot/
├── CLAUDE.md                 # Behavioral guidelines for AI-pair-programming sessions
├── README.md
├── SECURITY.md               # Threat model + reporting channels (READ THIS for security PRs)
├── CONTRIBUTING.md           # This file
├── CODE_OF_CONDUCT.md
├── CHANGELOG.md
├── package.json              # Next.js 14 / React 18 / Drizzle / NextAuth / Anthropic + OpenAI SDKs / Zod / Vitest
├── drizzle/                  # Generated Drizzle migrations (committed)
├── claude/
│   ├── beta.md               # 7-stage Beta build plan (shipped) + features checklist
│   ├── plan-v1.md            # Active 9-stage Version 1.0 plan
│   ├── plan-v2.md            # Version 2.0 backlog
│   ├── srs.md                # Software Requirements Specification
│   ├── context.md            # Append-only session history
│   └── learnings.md          # Topic-keyed learning journal
├── design/                   # Static HTML/Tailwind design mockups (ported per surface)
└── src/
    ├── app/                  # Next.js App Router
    │   ├── (auth)/           # Login + Register
    │   ├── (dashboard)/      # Bot factory; full dashboard lands Stage 6
    │   ├── api/              # API routes (auth, bots, chat)
    │   ├── u/[username]/chat/  # Public chat (auth-gated in Stage 1, public in Stage 4)
    │   └── icon.svg          # Brand mark (Next 14 auto-injects <link rel="icon">)
    ├── components/
    │   ├── auth/             # Login/Register forms + brand panel
    │   ├── bot-factory/      # 5-step BotFactoryForm
    │   └── chat/             # ChatWindow + MessageBubble + LoadingAnimation
    └── lib/
        ├── ai/
        │   ├── providers/    # Anthropic + OpenAI + Azure (real) + Google (stub) + ProviderError
        │   ├── key-transport.ts  # x-llm-api-key header parsing
        │   ├── sanitize-input.ts # ~35 blocked regexes + Unicode normalization
        │   ├── sanitize-output.ts # 4 leakage checks + 1500-char cap
        │   ├── prompt-builder.ts  # System prompt assembler
        │   └── rate-limit.ts      # In-memory 2-tier sliding window
        ├── auth/             # NextAuth + Zod schemas + bcryptjs
        ├── bots/             # Zod bot input + personality enum
        ├── client/llm-key-store.ts  # localStorage for BYO key + Azure creds
        └── db/               # Drizzle schema + pg.Pool client
```

## Where to start

- **First-time?** Look for issues labelled [`good first issue`](https://github.com/vishalpatil18/probot/labels/good%20first%20issue).
- **Larger feature?** Open a feature-request issue first so we can align on scope before you build. The active plan in `claude/plan-v1.md` is the source of truth for what's in-flight (and `claude/plan-v2.md` lists what's on the backlog).
- **Doc fix?** Just open the PR - no issue needed.
- **Security issue?** **Don't open a public issue or PR.** See [`SECURITY.md`](./SECURITY.md).

## Reporting security issues

Do **not** open public issues for vulnerabilities. Use GitHub's private Security Advisories - see [SECURITY.md](./SECURITY.md). The BYO-key non-leak guarantee is the single most important invariant in this codebase; if you find a way around it, that's a Critical severity issue.

## License

By contributing, you agree your contributions are licensed under the same [MIT License](./LICENSE) that covers the rest of the project.
