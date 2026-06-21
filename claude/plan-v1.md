# ProBot - Version 1.0 Build Plan

> Post-Beta build plan derived from `todo.md`. Beta shipped the engine (7 stages, 803 tests, hybrid managed/self-host key model, GDPR compliance, malware-scan hardening). Version 1.0 is the launch polish + community + architectural pivot work. Eight stages, each independently deployable and testable.

**Naming:** This file is the forward-looking plan. `beta.md` holds the historical Beta build plan with the shipped-features checklist; `plan-v2.md` holds the v2.0 backlog.

---

## Stage Comparison Matrix

| Stage | Title                                       | Priority | Deployable? | Estimated effort |
| ----- | ------------------------------------------- | -------- | ----------- | ---------------- |
| **1** | Branding & Copy Cleanup                     | P0       | yes         | 1–2 days         |
| **2** | Auth UX & Bug-fix Sprint                    | P0       | yes         | 3–4 days         |
| **3** | Account & Settings Hardening                | P0       | yes         | 4–5 days         |
| **4** | Bot Factory & Dashboard Polish              | P1       | yes         | 3–4 days         |
| **5** | Sidebar, Notifications & Empty-State Polish | P1       | yes         | 2–3 days         |
| **6** | Marketing & Trust Pages                     | P1       | yes         | 5–7 days         |
| **7** | SEO, Docs & Discoverability                 | P2       | yes         | 3–4 days         |
| **8** | Performance, Scale & Operational Polish     | P0 perf  | yes         | 1–2 weeks        |
| **9** | Self-Hosted Bot Repo Architecture           | P0 arch  | yes         | 2–3 weeks        |

**Execution order:** strictly Stage 1 → Stage 9. Each stage is mergeable to `main` and deployable on its own. Stage 8 (perf + scale) is sequenced before Stage 9 (architectural rewrite) so the baseline measurements happen against the stable shipping product; Stage 9 then has a clean before/after comparison to validate the rewrite didn't regress latency. Stage 9 is sequenced last because it's an architectural rewrite that touches authentication, deployment, and the API contract; doing it before the polish stages would mean re-doing the polish on a moving target.

**Bugfix fast-lanes:** Two items in the todo list are user-blocking bugs (magic-link not working, "Bot saved but PDF ingestion failed" error). These ride inside Stage 2 (Auth UX) and Stage 4 (Bot Factory Polish) respectively rather than waiting for their stage to come up in normal order - both are addressed in the first three stages.

---

## Stage 1 - Branding & Copy Cleanup

**Priority:** P0 (no engineering risk, immediate user-visible improvement)
**Deployable artifact:** Every page / component reads "AI Assistant" instead of "AI Recruiter"; every reference to `probot.com` becomes `pro-bot.dev`; code comments stop mentioning internal Beta stage names.

### Scope

- Global string replacement: `AI Recruiter` → `AI Assistant` across app code, marketing pages, README, docs, email templates.
- Global string replacement: `probot.com` → `pro-bot.dev` across app code, marketing pages, README, docs, env-example, email templates.
- Strip `Stage N` / `Phase N` / `Slice X` / `Beta` mentions from source-code comments. Replace with "current flow" descriptions. The historical record stays in `beta.md`, `context.md`, and `learnings.md`; new contributors reading the source shouldn't need to learn the Beta vocabulary.
- Update login / signup screen left-side hero copy with the post-Beta product specs (hybrid managed/self-host, four providers, encrypted key storage, no telemetry).

### Acceptance

- `git grep -i "AI Recruiter"` returns only Beta-era log entries in `beta.md` / `context.md` / `learnings.md` / `CHANGELOG.md`.
- `git grep "probot.com"` returns zero results.
- Production build green; visual regression confirmed on landing, login, signup, dashboard.

### Why first

Cheap, broad, and removes the noise that the rest of v1.0 would otherwise inherit. Every stage after this one writes copy on top of the corrected baseline.

---

## Stage 2 - Auth UX & Bug-fix Sprint

**Priority:** P0 (auth blocking issues + UX wins)
**Deployable artifact:** Auth flows feel professional; the magic-link bug from Beta is fixed; signup catches collisions before the API call.

### Scope

- **Show password button** on login + signup password fields (eye/eye-slash icon toggle).
- **Remember me checkbox** on login; persists session beyond default expiry.
- **Username/email already exists** check on signup form: debounced fetch to a new `GET /api/auth/check-availability?username=…&email=…` endpoint; inline red error before the submit button is enabled.
- **Forgot password as modal** (today it's a separate page route): same flow, opened from the login form's "Forgot?" link, closes on success.
- **Magic-link button position fix** on login + signup OAuth row (alignment with Google + GitHub buttons).
- **Magic-link not working** investigation + fix. Likely Resend / `EMAIL_FROM` config drift; verify end-to-end on production.
- **Onboarding screen for Google + email signup** parity with the GitHub flow (show username + profile avatar picker).
- **Signout inline modal**: when the user clicks Signout in the sidebar, show a small confirmation panel inline above the button (in place of the "Models & Keys" section), not a centered modal.

### Acceptance

- Magic-link signup + login both work end-to-end in production.
- Signup blocks submission when the typed username or email already exists.
- Show-password toggle works on every password field on the site.
- All three OAuth/magic providers render in a single visually-aligned row.
- Signout confirmation appears inline; no centered modal.

### Dependencies

None. All work is in `src/app/(auth)`, `src/components/auth`, and one new `/api/auth/check-availability` route.

---

## Stage 3 - Account & Settings Hardening

**Priority:** P0 (every user-facing surface in settings → Account is currently read-only or stubbed)
**Deployable artifact:** Users can edit their name, username, password, profile photo; the Security & Privacy tab is fully wired; the AI Model & API Key panel is the post-Beta managed-key surface.

### Scope

- **Full-name + username update** in Settings → Account: editable fields, debounced uniqueness check on username (reuse Stage 2 availability endpoint), `PATCH /api/users/me/profile`.
- **Password change** in Settings → Account: current-password verification + new-password input (with show-password toggle from Stage 2), `POST /api/users/me/password`.
- **Profile photo upload** in Settings → Account: image upload to free-tier storage (Vercel Blob or a Postgres `bytea` MVP), 2 MB max, jpg/png/webp; default to deterministic animal avatar (Beta behavior).
- **Bot personality + custom instructions** moved from current location into Settings → Bot configuration (they already exist as columns from Beta Phase 2; this stage is the UX repositioning).
- **Theme color picker** redesigned as a picker icon with the currently-selected color shown, not a row of square swatches.
- **Settings → Security & Privacy** updates per design: live values for the rate-limit cards, "Export my data" button (Beta-shipped, verify wiring), "Delete account" button + GitHub-style modal (Beta-shipped, verify).
- **AI Model & API Key panel** updates: confirm Beta Phase 3 surface (provider switcher, managed-key storage, decrypt audit log) renders cleanly under the post-Beta visual system.

### Acceptance

- Editing name + username from Settings → Account persists and updates the JWT on next request.
- Password change requires current password and rejects mismatches with a clear inline error.
- Profile photo round-trips end-to-end and renders on the chat page header.
- Theme color picker is a single colored circle that opens a swatch grid + native color input on click.

### Dependencies

Stage 2 (show-password toggle, availability endpoint).

---

## Stage 4 - Bot Factory & Dashboard Polish

**Priority:** P1 (highest UX-impact wizard pass since Beta Phase 2)
**Deployable artifact:** Wizard step 1 has a bot avatar picker; PDF removal uses a dustbin icon; the dashboard's "Share your bot" section shows embed snippets as code blocks; PDF-ingestion failure no longer surfaces as a generic error.

### Scope

- **Bot profile picture in Bot Factory Step 1**: default to the ProBot icon; allow user to upload (same storage path as Stage 3 profile photo).
- **Theme color + custom instructions in Bot Factory Step 3**: confirm Beta Phase 2 wiring; refresh layout if the picker icon redesign from Stage 3 needs to flow through.
- **PDF dustbin icon** in Bot Factory Step 2: replace the "Remove" text link with a red trash-can icon.
- **"Bot saved but PDF ingestion failed" error fix**: investigate the cause (likely `assertSafeBuffer` reject or pdf-parse failure on multi-file uploads), surface a per-file inline error in the wizard instead of a single page-level error string. Allow the user to retry just the failed file without re-submitting the whole bot.
- **Dashboard → Share your bot**: the website embed `<script>` tag and email signature snippets should render as syntax-highlighted code blocks (dark background, monospace font, copy button) instead of plain text.

### Acceptance

- The wizard's Step 1 includes an avatar upload; new bots get the ProBot icon when the user skips.
- Removing a queued PDF is a one-tap trash-can.
- PDF ingestion failures are per-file inline, not a wizard-killer.
- Embed snippets in the dashboard render as dark code blocks with a copy button.

### Dependencies

Stage 3 (profile photo storage path).

---

## Stage 5 - Sidebar, Notifications & Empty-State Polish

**Priority:** P1
**Deployable artifact:** Sidebar adapts to zero-bot users; notifications grow beyond in-app polling; ToS-change banner exists for the first material legal revision.

### Scope

- **Sidebar workspace section hidden when user has 0 bots** (Dashboard / Conversations / Leads links are dead-ends until a bot exists). Show only Account settings + Create bot CTA.
- **Account settings still visible without a bot**: the current route gates on `bot.id`; refactor so Account / Security / AI-Model tabs render even when no bot exists.
- **Sidebar bottom profile section is clickable**: clicking the username/avatar takes the user to Account settings.
- **Docs link beside the notification bell** on every dashboard screen (small "?" or "book" icon → `https://docs.pro-bot.dev`).
- **Embed & share links** in the dashboard point at `https://docs.pro-bot.dev/embed-share` (anchor section to be added in Stage 7 docs work).
- **Notifications surface improvements**: email notification opt-in for lead capture (reuses the Resend transport already wired for auth emails); per-notification mark-read; bulk "mark all read."
- **ToS-change dashboard banner**: dismissible top-of-dashboard banner that appears when `LEGAL_EFFECTIVE_DATE` in `src/lib/marketing/legal.ts` is newer than what the user has acknowledged. Persists acknowledgement on `users.last_legal_ack_date`.

### Acceptance

- Brand-new user (zero bots) sees a clean sidebar with only Account + Create bot.
- Clicking the sidebar profile area navigates to Account settings.
- Lead-capture notifications can be enabled via email from the notification panel preferences.
- ToS banner appears in production the first time the effective date is bumped; dismissible; doesn't reappear after dismiss.

### Dependencies

Stage 3 (settings refactor for the no-bot path).

---

## Stage 6 - Marketing & Trust Pages

**Priority:** P1 (launch readiness for conversion)
**Deployable artifact:** Landing page has a live-demo video modal; comparison page lives at `/why-pro-bot`; Hire-me page lives at `/hire-me`; Roadmap page lives at `/roadmap` and is auto-generated from `plan-v1.md`.

### Scope

- **Live demo video modal**: floating "Watch demo" button on the landing page opens a borderless modal with a 1-minute video and a small "×" close button at the top-right. Video uploaded to a free CDN (YouTube embed or Cloudflare R2 + native `<video>`).
  - **Synthesia script (1 minute, 8 scenes):**
    1. (0:00–0:08) "Recruiters skim a resume in six seconds. Most never make it to page two."
    2. (0:08–0:18) "ProBot turns your resume into an AI assistant that answers their questions instead. Accurate, in your voice, 24/7."
    3. (0:18–0:28) "Upload your PDF or paste your bio. ProBot embeds it into a private vector store, top-3 chunks fed to the LLM with strict citation rules - no hallucinations."
    4. (0:28–0:38) "Pick any provider - Anthropic, OpenAI, Azure, or Google Gemini. Your API key stays encrypted in your browser or, if you opt in, envelope-encrypted on our infra."
    5. (0:38–0:46) "Share the public link or paste the embed code. The chatbot lives on your portfolio. Lead capture is built in."
    6. (0:46–0:54) "Free to use. MIT licensed. Self-host if you want zero trust in any operator."
    7. (0:54–0:58) "Two minutes to live. No credit card."
    8. (0:58–1:00) "ProBot - pro-bot.dev. Create yours today."
- **"Why ProBot" comparison page** at `/why-pro-bot`: honest side-by-side vs "generic chatbot platforms." Green checks for ProBot strengths (BYO key, free tier, open source, GDPR built in), red X for what others lack. Keep it factually defensible.
- **Hire Me page** at `/hire-me`: about the creator Vishal Patil, his Spec-Driven Development skills, open to work across US + Europe, link to portfolio, mention CNBC feature on the VAi chatbot that motivated ProBot.
- **Roadmap page** at `/roadmap`: auto-generated render of `plan-v1.md` stages + completion status, with a "Suggest a feature" CTA pointing at GitHub Discussions.
- **Changelog page** linked in the footer (Stage 7-Phase-7 already wired to `https://docs.pro-bot.dev/changelog`; verify the route lives at the right domain).

### Acceptance

- Landing-page Watch-Demo button opens a clean video modal; closing it returns the user to the same scroll position.
- `/why-pro-bot`, `/hire-me`, `/roadmap` all render and rank in `sitemap.xml`.
- The Synthesia video is uploaded and the page references the correct CDN URL.

### Dependencies

Stage 1 (copy must be consistent before the video is recorded).

---

## Stage 7 - SEO, Docs & Discoverability

**Priority:** P2 (post-launch growth)
**Deployable artifact:** Site scores 95+ on Lighthouse SEO; Mintlify docs reorganized for SaaS; architecture-diagram README; sitemap + robots updated.

### Scope

- **Best-in-class SEO**:
  - `next-sitemap` for `sitemap.xml` + `robots.txt` regeneration on every build.
  - Per-page `metadata` exports with Open Graph + Twitter cards.
  - JSON-LD `Organization` + `SoftwareApplication` structured data on landing.
  - Pre-rendered OG images for the main routes via `next/og`.
- **Mintlify docs reorganization for SaaS**:
  - Restructure groups: Get started / Concepts / Guides / API reference / Release notes (already wired in Beta Phase 7) / Self-hosting.
  - Add missing pages: `/concepts/managed-vs-self-hosted`, `/guides/custom-instructions`, `/guides/managed-key-storage`, `/guides/account-deletion`.
  - Add an `Embed & Share` page that the Stage 5 dashboard links to.
- **Architecture diagrams + detailed README**:
  - Mermaid diagrams for system architecture, request flow (managed vs self-hosted), envelope encryption, deletion lifecycle.
  - `docs/decisions/` folder with ADRs (architectural decision records) for the major Beta choices already captured in `learnings.md` (hybrid key model, 7-day grace, circuit breaker key choice).
- **Beta-narrative cleanup in docs**: docs/concepts/stages.mdx currently references the Beta 7-stage breakdown - rewrite as "Architecture" describing the current shipping product, pointing to the Beta build plan in the repo for historians.

### Acceptance

- Lighthouse SEO scores 95+ on the landing page + every (marketing) page.
- `sitemap.xml` + `robots.txt` regenerated automatically.
- Mintlify docs render with the new structure; the embed-share section is reachable at the deep link the Stage 5 dashboard uses.

### Dependencies

Stage 6 (the new marketing pages need to be in sitemap.xml).

---

## Stage 8 - Performance, Scale & Operational Polish

**Priority:** P0 perf (post-launch baseline + the "make it scale" follow-ups deferred from Beta Stage 7)
**Deployable artifact:** Production hits the SRS §6.1 performance budgets with measurement and tuning; per-process rate-limit + circuit-breaker state moves to shared Upstash Redis so multi-instance deployments behave correctly; Sentry / alerting are live for the failure modes that today silently fall back.

### Goal

Take the launch-ready platform from the Beta and harden it for sustained traffic. Two themes: (1) hit the SRS §6.1 performance budgets with measurement and tuning, and (2) replace per-process state (rate limiter, circuit breaker) with shared Upstash Redis so a multi-instance deployment behaves correctly. Sequenced before the Stage 9 architectural rewrite so the baseline measurements happen against the stable shipping product.

### Scope - Performance NFRs (SRS §6.1, deferred from Beta Stage 7)

| ID      | Requirement                     | Metric            | Approach                                                            |
| ------- | ------------------------------- | ----------------- | ------------------------------------------------------------------- |
| NFR-P01 | Chat response latency           | < 3 seconds (P95) | Vercel Speed Insights + Sentry traces; tune RAG chunk count.        |
| NFR-P02 | Page load time (chat interface) | < 2 seconds (LCP) | `next/font` swap mode, prefetched OG image, smaller initial JS.     |
| NFR-P03 | Widget load time                | < 1 second        | Already 8KB minified - measure on real CDN, may need preconnect.    |
| NFR-P04 | Data ingestion (1–3 page PDF)   | < 60 seconds      | Defer embedding to a background job if pdf-parse + embed > 30s.     |
| NFR-P05 | Vector similarity search        | < 200ms (P99)     | HNSW index audit; cap top-K at 3; warm queries with a pre-prompt.   |
| NFR-P06 | Concurrent users per bot        | 50+ simultaneous  | Load test (k6) + ensure rate-limit windows don't deadlock.          |
| NFR-P07 | Dashboard page load             | < 3 seconds       | Move N+1 queries (`buildExportBundle`, dashboard listings) to CTEs. |

### Scope - Shared-state infrastructure

- **Upstash Redis backing for `src/lib/ai/rate-limit.ts`** so per-bot limits are accurate across cold-started serverless instances (today they reset every cold start).
- **Upstash Redis backing for `src/lib/ai/circuit-breaker.ts`** so an outage tripping one instance immediately protects every other instance.
- **Vercel Pro upgrade** if cron-job count grows beyond one (Hobby limit). Today the daily purge job is the only cron; Stage 8 may add an audit-log-prune-only cron, a metrics-scrape cron, or a "resend deletion link after 3 days" reminder cron.

### Scope - Smaller hardening items deferred from Beta Stage 7

- "Resend deletion email" UI for users who lose the undo link before the 7-day grace expires.
- "Account deletion revokes OTHER browser sessions at init time" - today only the current session is signed out.
- Dashboard breaker-state indicator ("your provider is currently throttled - retrying soon").
- Real malware scan via a ClamAV sidecar (current heuristic catches accidental misuploads; a real AV scan needs persistent infrastructure).
- Provider-mismatch dashboard prompt: "your stored managed key was minted for OpenAI but you've switched to Anthropic - re-store?"
- Sentry / structured-logger wiring for the chat route's circuit-breaker `circuit_open` events so operators get an alert when a provider outage starts.
- Gemini SDK error-mapping integration test against a real free-tier endpoint (current mapping is regex-on-message and could drift on SDK upgrades).
- Per-tab CSRF on bearer-authenticated routes if user research shows real attack patterns.

### Acceptance

- All 7 SRS §6.1 performance NFRs are measured in production with a documented dashboard.
- Rate-limit + circuit-breaker state observed to be consistent across two simultaneously-warm Vercel instances (verified via k6 load test).
- A Sentry breadcrumb fires within 10 seconds of a `circuit_open` event in production.
- The "resend deletion email" button works end-to-end during the 7-day grace.

### Dependencies

Stages 1–7 must be merged so this stage is measuring the stable shipping product, not a moving target. Independent of Stage 9 (the bot-repo rewrite) by design - Stage 9 inherits the Redis-backed limits as a free benefit.

### Risks

- **Upstash free tier limits.** Free tier is 10K commands/day; a busy deployment may need the paid tier. Document the breakpoint.
- **Sentry free tier limits.** 5K events/month on the free tier; tune the breaker-event sampling rate.

---

## Stage 9 - Self-Hosted Bot Repo Architecture (V1.0 capstone)

**Priority:** P0 architecture (highest-impact change in v1.0; sequenced last because everything else can ship without it)
**Deployable artifact:** A new `probot-bot` repository that a user can clone, configure, and deploy on their own infrastructure. The bot in that repo authenticates with the ProBot API and uses ProBot services (knowledge base, conversations, leads) WITHOUT exposing the main ProBot codebase or its secrets. The self-hosted bot is registered and manageable from the ProBot dashboard.

### Why this is a separate stage

The Beta self-hosting story is "clone the entire `probot` repo and run it yourself." That works but has two problems for the user the todo item identifies:

1. **Codebase scope.** Self-host operators get every API route, every internal admin tool, every secret-handling surface - far more than they need to run a single bot. Audit cost is high.
2. **Operational scope.** Operators must run their own Postgres, Resend account, Vercel project, cron infra, AND track upstream ProBot updates. That's "deploy a SaaS for yourself," not "deploy a bot."

The post-v1.0 self-hosting story is "clone a tiny `probot-bot` runtime that connects to the ProBot platform API." The user gets a single-purpose deployment surface; the ProBot codebase stays minimal in their hands; the platform handles the heavy services.

### Scope - research + architecture phase

This stage has two sub-stages because the architecture isn't fully designed yet.

#### 9a - Research (1 week)

- Survey the prior art for "tiny runtime that authenticates to a platform API" patterns. Reference points:
  - Discord bot tokens + Discord API
  - Telegram bot tokens + Telegram Bot API
  - Vercel project tokens + Vercel deploy hooks
  - GitHub Apps with installation tokens
- Decide the auth model:
  - **API token per bot** (simple; revocation = delete row; ProBot dashboard mints + shows once)
  - **OAuth-style flow** with rotating refresh tokens (more secure; more moving parts)
  - **Mutual TLS** (overkill for v1)
- Decide what the self-hosted bot needs from the platform:
  - Knowledge-base read (vector retrieval as a service?)
  - Conversation persistence (POST conversation/messages to platform?)
  - Lead capture (POST lead to platform?)
  - LLM provider call (still happens on the bot's own infra; platform is not in the chat critical path?)
- Threat model: what's the worst case if a self-hosted bot's API token leaks? (Answer should map to "read-only knowledge access for that bot only; no cross-tenant exposure.")
- Decide the bot ↔ platform API surface (4–6 endpoints max).

**Deliverable:** ADR document at `docs/decisions/0001-self-hosted-bot.md` with the chosen design.

#### 9b - Implementation (2 weeks)

Once the design is locked:

- **New repo `probot-bot`** with the minimal Next.js runtime: chat endpoint, widget bundle, env-driven configuration. No dashboard, no auth UI, no admin surface.
- **New ProBot dashboard surface**: "Self-hosted bots" tab. Lists registered tokens, last-seen timestamp, revoke button. Token-mint flow with "show once" pattern (same as personal access tokens on GitHub).
- **New ProBot platform API endpoints** matching the surface chosen in 9a. Auth via the bot-token header.
- **Documentation**: extensive setup guide at `docs/self-hosted-bot/` with the deploy flow.

### Acceptance

- A user can:
  1. Create a bot in the ProBot dashboard.
  2. Switch its "deployment mode" to "Self-hosted."
  3. Mint a bot token (shown once).
  4. Clone `probot-bot`, drop the token into env, deploy on their domain.
  5. See lead captures + conversation logs from the self-hosted bot in their ProBot dashboard.
- Revoking the token from the dashboard instantly stops the bot from reaching the platform.
- The main `probot` repo's API endpoints used by the bot runtime are explicitly versioned (`/api/v1/bot/*`) so the bot runtime can pin to a contract.

### Dependencies

All prior stages. This stage rewrites assumptions the dashboard makes about "one bot, one user" - best to do it after the rest of v1.0 is stable.

### Risks

- **Scope blowout.** Two weeks is a floor, not a ceiling. If 9a research reveals a complex token-rotation requirement, 9b might need to slip to v1.1.
- **Versioning lock-in.** Once the bot-runtime API contract ships, it's hard to break compatibly. Plan for a "v1 deprecated" announcement window before any breaking change.

---

## What's NOT in v1.0 (deferred to plan-v2.md)

The todo list flags these as v2.0:

- Portfolio website scraping for the knowledge base
- Knowledge base as a draggable graph
- "Delete all knowledge base" button
- Multi-bot generation per user
- Dashboard walkthrough modals for new users
- Blog section + post pipeline
- Feedback button modal + upvote / downvote on submitted feedback

These are tracked in `plan-v2.md`.

---

## Stage close-out checklist (per-stage)

Before merging the final PR for each stage:

- [ ] All new code typechecks (`npm run typecheck`).
- [ ] All tests pass (`npm test`).
- [ ] No new violations in the key-leak guard (`npm run check:key-leaks`).
- [ ] Production build green (`npm run build`).
- [ ] Manual smoke test of every new user-facing surface in a browser.
- [ ] Append a session entry to `context.md` per CLAUDE.md §9.
- [ ] If non-obvious teaching moments happened, append to `learnings.md` per §10.
- [ ] Add a release-notes entry to `docs/changelog.mdx` under a new "Version 1.0" subsection.
- [ ] Tick the stage in the matrix at the top of this file.
