# ProBot - Version 2.0 Backlog

> Forward-looking backlog for items the team has intentionally deferred past v1.0. These came out of the v1.0 planning pass; each is a real feature, not a maybe. The grouping below maps to the rough sequence we'd build them in once v1.0 is shipped.

## How this file relates to the others

- [`beta.md`](./beta.md) - frozen Beta build plan + the complete shipped-features checklist.
- [`plan-v1.md`](./plan-v1.md) - frozen v1.0 build plan + the complete shipped-features checklist.
- **This file (`plan-v2.md`)** - v2.0 items. No commitment to dates or sequencing beyond the priority bands below.

---

## Priority bands

| Band   | Meaning                                           | Items                                                       |
| ------ | ------------------------------------------------- | ----------------------------------------------------------- |
| **P0** | Strong community / SEO signal once v1.0 is live   | Multi-bot generation, blog section                          |
| **P1** | High-value, well-scoped                           | Advanced answering controls, guided knowledge-base builder, portfolio scraping, knowledge graph viz, walkthrough modals |
| **P2** | Nice-to-haves with clear UX impact                | Feedback modal, upvote/downvote                             |
| **P3** | Single-button "Delete all knowledge base" cleanup |                                                             |

---

## P0 - Community + scale

### Multi-bot generation per user

**Today:** ProBot's data model is one-bot-per-user. The `bots` table has no soft constraint, but the upsert in `POST /api/bots` updates the user's existing bot rather than creating a new one. The dashboard surfaces assume a single bot.

**v2.0 scope:**

- Lift the one-bot-per-user assumption. Each user can create N bots.
- **Bot switcher + management (UI already stubbed in v1.0):** clicking the current bot name in the top-left sidebar opens a dropdown listing all the user's bots; below the list a **"Create New Bot"** button (shipped in v1.0 with a "coming soon" chip) opens the bot-creation modal. v2.0 wires that button to a real create flow and lets the user manage (rename/duplicate/delete/switch) every bot from this list.
- **Create from preset:** the v1.0 "Save bot settings" feature stores reusable presets (`bot_presets` table). The Create-New-Bot modal should offer "Start from a saved preset" so a user can spin up a new bot pre-filled with a previous bot's configuration.
- Per-bot pricing: still free per ProBot, but the user's BYO LLM key now amortises across multiple bots - make that explicit in copy.
- Per-bot domains: each bot keeps its `/u/[username]/[botSlug]/chat` URL (today the URL is `/u/[username]/chat`).
- Migration: existing single-bot users get a default `botSlug` of `default` so their URL stays meaningful (`/u/jane/default/chat`).

**Risks:** dashboard analytics queries (`conversations_bot_started_idx`, lead lists, audit logs) all assume one-bot scope. Each needs a `[botId]` filter parameter and a `selectedBotId` cookie / dashboard URL state.

---

### Dynamic "thinking" / generating messages

**Today:** each bot stores a small `loading_messages` array (JSONB) and the chat UI cycles through them while the LLM responds. They're static per bot.

**v2.0 scope:**

- Let owners author richer, context-aware "thinking" messages - e.g. a Claude-style "Thinking…", "Searching your resume…", "Drafting a reply…" sequence that reflects the actual stage of generation (retrieval vs. completion), making the wait feel responsive and engaging.
- Optionally surface a live status string driven by the pipeline phase (embedding lookup → retrieval → LLM call) rather than a fixed cycle, so the message tracks what the bot is really doing.
- A small editor in Bot configuration to add/reorder these messages, with sensible defaults seeded for new bots.

**Why post-v1.0:** the static `loading_messages` already covers the baseline UX; phase-aware streaming status depends on the realtime-transport decision below (SSE/WebSockets).

**Why post-v1.0:** rewrites every dashboard query. Doing it during v1.0 would slow down the polish stages that are higher-value-per-day.

---

### Blog section

**Today:** No blog. SEO relies entirely on the marketing pages.

**v2.0 scope:**

- New `/blog` index + `/blog/[slug]` per-post routes.
- MDX-driven post pipeline (no CMS - posts live in `content/blog/*.mdx`).
- Initial 5-post launch series:
  1. **"Why I built ProBot"** - the motivation, the CNBC-featured VAi origin story, the F-1-friendly free-tier design constraint.
  2. **"The Beta journey"** - 7-stage build retrospective from `beta.md`; ~3000 words.
  3. **"Envelope encryption in 30 lines of Node"** - the Stage 7 Phase 3 deep dive (key concept already written up in `learnings.md`).
  4. **"GDPR for an open-source SaaS"** - the 7-day grace + undo flow design walk-through.
  5. **"The Beta vs v1.0 plan"** - comparing roadmaps as a transparency move.
- RSS + sitemap inclusion.
- OG cards via `next/og` per post.

**Acceptance:** Five posts live, RSS validates, every post ranks in Lighthouse SEO 95+.

**Why post-v1.0:** Blogs are a sustained-effort surface, not a one-time launch task. Better to ship after v1.0 so the launch posts can reference the live product.

---

## P1 - High-value, well-scoped

### Advanced answering controls (LLM generation settings)

**Today:** Each bot dispatches to the provider with fixed, sensible generation defaults (the adapters accept `maxTokens` / `temperature` but nothing is owner-configurable). Owners can pick provider + model and a personality preset, but not the underlying sampling knobs.

**v2.0 scope:**

- A new **"Answering"** panel in Bot configuration that lets owners tune how the model generates replies:
  - **Temperature** - creativity vs. determinism.
  - **Top-p** (nucleus sampling) - probability-mass cutoff.
  - **Max tokens** - response-length ceiling (separate from the per-message char cap).
  - **Stop sequences** - up to N strings that end generation.
  - **Frequency penalty** + **Presence penalty** - discourage repetition / encourage new topics.
  - **Top-k** - candidate-token cap (providers that support it).
  - **Seed** - fixed seed for reproducible answers when debugging a bot's voice.
- **Sensible defaults + "Reset to recommended"** so casual users never have to touch this; the panel is collapsed/advanced by default.
- **Provider-capability gating:** not every provider exposes every knob (e.g. `top_k`, `seed`, penalties vary across Anthropic / OpenAI / Azure / Gemini). The UI only shows controls the selected provider/model supports, and the dispatch layer drops unsupported params rather than erroring.
- **Per-bot persistence:** store as a single `generation_settings` JSONB column on `bots` (validated by a Zod schema with min/max clamps) so adding a future knob doesn't need a migration.
- Each value is range-validated client- and server-side; out-of-range inputs clamp with an inline hint instead of failing the save.

**Risks:** param semantics differ subtly per provider; a value that's safe for one model can degrade another. Mitigation: per-provider min/max/default tables and the capability gating above. Setting `temperature` and `top_p` together is discouraged by some providers - surface a gentle warning, don't hard-block.

**Why post-v1.0:** v1.0's fixed defaults already produce good answers; this is power-user polish that benefits from real usage data on which knobs people actually want.

### Guided knowledge-base builder + custom sections

**Today:** Knowledge comes from Wizard Step 2 (PDF upload + free-text paste) and the `context_text` field. There's no structured, guided way to describe yourself - users stare at a blank box and may miss the details recruiters care about.

**v2.0 scope:**

- A **guided, application-style form** that walks owners through the fields recruiters expect, each optional:
  - **Basics:** name, professional email, location, headline.
  - **Education:** degrees, institutions, dates, highlights.
  - **Career:** roles, companies, dates, responsibilities, achievements.
  - **Skills:** technical + soft, optionally grouped.
  - **Projects:** title, description, links, tech stack, outcomes.
  - **Interests** and other relevant background.
- Each completed section is compiled into clean, labelled prose and written to the bot's knowledge base (chunked + embedded through the existing pipeline, `source_type='profile'`), so the bot answers from a well-structured profile rather than an unstructured blob.
- **Custom sections:** an "Add custom section" control where the user supplies a **heading**, a short **description** of what the section covers, and the **value/content**. These are appended to the knowledge base alongside the standard sections - giving full flexibility for anything the standard form doesn't capture (publications, certifications, volunteering, "ask me about…", etc.).
- Sections are **editable and re-orderable**; re-saving a section re-embeds only that section's chunks (incremental, not a full rebuild).
- Plays nicely with existing sources: the guided profile, PDFs, pasted text, and (P1) scraped URLs all coexist in one knowledge base.

**Risks:** re-embedding on every keystroke would be wasteful - debounce and only re-embed a section on explicit save. Duplicate facts across the form and an uploaded résumé can cause redundant chunks; the (P1) knowledge-graph view helps surface those.

**Why post-v1.0:** v1.0 ships the raw ingestion pipeline; this is the friendly, conversion-boosting layer on top that's worth designing once the pipeline is stable.

### Portfolio website scraping for the knowledge base

**Today:** Wizard Step 2 accepts PDF + text only. The todo list explicitly says "Show placeholder text with a message 'Coming Soon in version 2.0'."

**v2.0 scope:**

- New "URL" tab in Wizard Step 2 alongside PDF + text.
- User pastes a portfolio URL; backend fetches with `cheerio`, extracts text from semantic sections (`<main>`, `<article>`, headers + paragraphs), respects `robots.txt`, caps page size at 500 KB.
- Same chunking + embedding pipeline as PDF.
- Stored as `source_type='url'` in `knowledge_base`.
- LinkedIn explicitly NOT supported (ToS violation); user has to paste their bio manually for LinkedIn-sourced content.

**Risks:** scraping ToS varies by site; document that the user is responsible for only scraping sites they own.

### Knowledge base as a draggable graph

**Today:** Knowledge base is a flat list in Settings → Knowledge base.

**v2.0 scope:**

- Force-directed graph (e.g., `react-force-graph`) where:
  - Nodes are knowledge chunks (color-coded by source: PDF / text / URL).
  - Edges are cosine-similarity above a threshold (e.g., 0.7).
  - Hovering a node previews the chunk text.
  - Dragging rearranges; layout persists per user.
- Useful for: spotting redundant chunks, seeing which knowledge clusters are dense vs sparse, identifying "lonely" chunks that don't get retrieved.

**Risks:** rendering performance with 100+ chunks. Mitigation: lazy-load the graph only when the user clicks into a dedicated `/dashboard/bots/[botId]/knowledge/graph` route.

### Dashboard walkthrough modals for new users

**Today:** Users land on the dashboard cold after creating their first bot.

**v2.0 scope:**

- 6–7 step modal walkthrough triggered on first dashboard visit (gated by `users.dashboard_walkthrough_completed` boolean).
- Each step is an arrow + tooltip pointing at a dashboard region:
  1. "This is your bot's public URL. Share it anywhere."
  2. "Lead emails captured by recruiters show up here."
  3. "Your conversation log - see what recruiters ask."
  4. "Settings → 5 tabs, including a Danger Zone for deletion."
  5. "Notifications - bell badge for new leads."
  6. "Help docs are one click away."
- Skippable at any step; "Don't show again" sets the flag.
- Built with a small library like `react-joyride` or a hand-rolled overlay.

**Risks:** walkthrough overlays often break on responsive breakpoints. Test on mobile + 4K.

---

## P2 - Engagement features

### Feedback button modal

**Today:** No in-product feedback surface. Users have to find the GitHub repo or the contact email.

**v2.0 scope:**

- Floating "Feedback" button in the dashboard's bottom-right corner.
- Click opens a modal with:
  - Feedback type radio (Bug / Feature request / Question / Other)
  - Free-text textarea (max 2000 chars)
  - Optional email (defaults to the signed-in user's email)
  - Screenshot upload (optional, max 2 MB)
- POST to `/api/feedback` which writes to a new `feedback` table.
- Operator email notification on every new submission (Resend transport already wired).
- Visible only to signed-in users for spam reasons.

**Acceptance:** A user can submit feedback in under 30 seconds; the operator receives an email within 1 minute.

### Upvote / downvote on submitted feedback

**Today:** N/A (no feedback surface yet).

**v2.0 scope:**

- Public `/feedback` page listing approved submissions (operator moderates).
- Per-item upvote / downvote (one vote per signed-in user, stored in `feedback_votes`).
- Sort by net score, recency, or "trending" (decayed score).
- Operator dashboard tab to approve / reject / archive submissions.
- Auto-link the feedback page from the dashboard feedback modal ("see what others have suggested").

**Risks:** moderation load grows with userbase. Mitigation: archive after 90 days of no activity; soft-delete via a `hidden` flag.

**Depends on:** the feedback button modal landing first.

---

## P3 - Small cleanup

### "Delete all knowledge base" button

**Today:** Users delete sources one-by-one in Settings → Knowledge base. The todo list says "Show placeholder text with a message 'Coming Soon in version 2.0'."

**v2.0 scope:**

- Red "Delete all" button at the top of the Knowledge base tab.
- GitHub-style confirmation modal (typed-bot-name + "delete all my knowledge") matching the pattern used in `DeleteBotModal`.
- `DELETE /api/bots/[botId]/knowledge` route that truncates all `knowledge_base` rows for the bot in one transaction, then re-embeds nothing.
- After deletion, the bot falls back to its `context_text` (which may be empty); the chat surface shows a friendly "I don't have any data yet" reply rather than failing.

**Risks:** users may accidentally lose months of curated chunks. The GitHub-style confirmation modal is the safeguard; we don't add a soft-delete or undo (the user can re-upload).

---

## Open architectural questions for v2.0

These don't have a feature owner yet but are worth tracking:

- **Multi-tenant billing model.** v1.0 doesn't bill anyone (BYO key model). If multi-bot generation drives serious adoption, do we add an optional paid tier for users who want managed key storage with a built-in LLM quota (no BYO key)? Decision deferred until after v1.0 launch + 3 months of data.
- **Realtime conversation transport.** Today the chat polls. v2.0 may want SSE or WebSockets for typing indicators, multi-message responses, and tool-use streaming.
- **Voice mode** (from SRS §11 V2 list). Lower priority than the items above; left in the SRS V2 list.
- **Interview simulation** (from SRS §11). Same - left in the SRS V2 list.
