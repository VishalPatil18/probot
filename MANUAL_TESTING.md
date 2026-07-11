# Manual testing

> Guide for open-source contributors who want to test the two published
> npm packages end-to-end on their own machine before shipping a PR or
> cutting a release.

This complements the unit/integration suite (`npm test`) — that catches
logic bugs, but visual widget behavior, cross-browser rendering, and
end-to-end LLM round-trips need real browsers and real network hops.
Everything below runs 100% locally, with no dependency on pro-bot.dev
in production.

---

## When to run manual testing

- You changed anything under [`src/widget/`](./src/widget/) — the
  script-tag embed widget shipped as `probot-chatbot`.
- You changed anything under
  [`packages/probot-self-hosted/`](./packages/probot-self-hosted/) — the
  React component / hooks / adapters.
- You touched [`src/lib/ai/providers/`](./src/lib/ai/providers/) and want
  to verify the provider adapter behaves end-to-end.
- You're about to publish a new version of either package (see
  [Portability check](#portability-check-npm-pack) below).

For pure logic changes (parsing, rate limiting, DB queries), the unit
suite is enough — skip manual testing.

---

## Prerequisites

| Tool | Version | Why |
|---|---|---|
| Node.js | 20+ | Vite + Next dev servers |
| npm | 10+ | Package installs (yarn/pnpm work; lockfile is `package-lock.json`) |
| Chrome or Firefox | any recent | Widget rendering, DevTools inspection |
| An LLM API key | optional | Only if you want to test real chat replies. Free tier: Google Gemini (see [Environment variables](#environment-variables--secrets)) |

The **Next dev server** (`npm run dev` at the repo root) is only needed
for two of the three tests — the vanilla IIFE test runs standalone.

---

## Test projects

Three self-contained mini-projects live under
[`manual-testing/`](./manual-testing/). Each has its own README with a
per-scenario verification checklist:

| Folder | Package under test | Runs on |
|---|---|---|
| [`chatbot-script-tag/`](./manual-testing/chatbot-script-tag/) | `probot-chatbot` | localhost:5500 |
| [`self-hosted-vanilla/`](./manual-testing/self-hosted-vanilla/) | `probot-self-hosted` (vanilla IIFE) | localhost:5501 |
| [`self-hosted-react/`](./manual-testing/self-hosted-react/) | `probot-self-hosted` (React ESM + adapters) | localhost:5173 |

The [`manual-testing/README.md`](./manual-testing/README.md) is the
operational reference for each folder — this file is the entry point
for someone who has just cloned the repo and needs a compact
"where do I start" answer.

---

## One-shot setup

From the repo root, build both packages once:

```bash
# Widget bundle used by `chatbot-script-tag/`
( cd packages/probot-chatbot && npm install && npm run build )

# ESM/CJS + IIFE bundles used by both self-hosted tests
( cd packages/probot-self-hosted && npm install && npm run build )
```

If you plan to run [`chatbot-script-tag/`](./manual-testing/chatbot-script-tag/)
or the dashboard-linked mode of
[`self-hosted-react/`](./manual-testing/self-hosted-react/), also boot the
platform:

```bash
# Once, to seed a local Postgres and env file (follow CONTRIBUTING.md § 2)
cp .env.example .env  # then fill in DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL
npm install
npm run dev            # Next dev server on http://localhost:3000
```

---

## Quickstart per scenario

### 1. probot-chatbot (script-tag widget)

```bash
cd manual-testing/chatbot-script-tag
# Edit index.html → replace REPLACE_WITH_BOT_ID with a real bot id from
# your local dashboard (register one at localhost:3000/dashboard).
npx serve -p 5500
```

Open <http://localhost:5500>. **Verify:** floating sparkles bubble
bottom-right → click → dialog with ringed avatar and `· AI Assistant`
suffix → send a message → response arrives with markdown formatting →
resize viewport &lt;480 px → dialog fills width edge-to-edge.

### 2. probot-self-hosted (vanilla IIFE)

```bash
cd manual-testing/self-hosted-vanilla
npm start              # copies the freshly-built IIFE, then serves the folder
```

Open <http://localhost:5501>. **Verify:** bubble bottom-right → dialog
opens with "Ada · AI Assistant" title, three suggested chips → send a
message → typing dots animate → echo reply appears with **bold**
markdown → surrounding page (h1, paragraphs) has normal spacing
(confirms the widget's CSS reset is isolated inside the Shadow DOM).

No LLM key or Next server required — this is a pure widget smoke test.

### 3. probot-self-hosted (React + adapters)

```bash
cd manual-testing/self-hosted-react
npm install
npm run dev            # Vite on http://localhost:5173
```

Three transport modes selectable in the harness UI without restarting:

- **Echo** — no key, no server. Chat works immediately.
- **OpenAI** — set `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`) before
  `npm run dev`. Vite dev middleware invokes `createOpenAIHandler` in the
  same Node process; the key never touches the browser.
- **Dashboard-linked** — needs the Next dev server on :3000. Register a
  self-hosted bot at
  <http://localhost:3000/dashboard/bots/new-self-hosted>, mint a token,
  paste it in the harness. Turns and lead submissions POST to
  `/api/v1/bot/{conversations,leads}` — verify in DevTools Network panel
  and the dashboard's analytics tab.

**Verify:** mode switch fully re-mounts the widget (no bleed of previous
mode's messages); OpenAI mode returns real replies; Dashboard mode's
POSTs carry the `pbt_…` token in the `Authorization` header; the lead
form calls back into `onLead` and shows the green "onLead fired" strip.

---

## Environment variables & secrets

Local test harnesses read from `.env` files inside their own folders. The
repo's [`.gitignore`](./.gitignore) blocks every `.env` variant (`.env`,
`.env.local`, `.env.production`, `.env.staging`, `.env.development`) at
any depth, so you can drop keys directly in
`manual-testing/self-hosted-react/.env` without risking a commit.

Example:

```bash
# manual-testing/self-hosted-react/.env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

Template files (`.env.example`, `.env.sample`, `.env.template`) **are**
allowed through — use them if you want to publish a "here's what to
set" reminder to fellow contributors.

**Zero-cost keys** if you don't want to pay for testing:
- Google Gemini has a free tier — [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey). Use with the [Google adapter](./docs/self-hosted-bot/models-and-keys.mdx).
- Ollama runs locally, no key needed — see [docs/self-hosted-bot/models-and-keys.mdx](./docs/self-hosted-bot/models-and-keys.mdx#openai-compatible-endpoints-grok-ollama-azure-).

---

## Portability check (`npm pack`)

`npm install file:../../packages/probot-self-hosted` (which the React
harness uses by default) is a symlink under the hood. That's fast for
iteration but hides real bugs: missing files in `"files"`, wrong
`exports` paths, unbundled internal imports. Before publishing, verify
with a real tarball install:

```bash
cd packages/probot-self-hosted
npm run build
npm pack                        # → probot-self-hosted-0.1.0.tgz

cd ../../manual-testing/self-hosted-react
npm install ../../packages/probot-self-hosted/probot-self-hosted-*.tgz
npm run dev
```

If the harness still boots and all three modes still work, other
people's devices will get the same behavior when they `npm install
probot-self-hosted` from the registry. If anything breaks — that's the
bug to fix before publishing, not after.

The same drill applies to `probot-chatbot`, though there's no `npm
install` in its story — copy the packed `dist/probot-chatbot.js` into
the script-tag test folder and load it from there:

```bash
cd packages/probot-chatbot && npm pack
# inspect the tarball
tar -tzf probot-chatbot-*.tgz | sort
```

Every path listed in `package.json` `exports` should appear in the
tarball. If any don't, consumers will hit "cannot resolve" errors.

---

## Common gotchas

- **`ProbotSelfHosted is not defined` in the vanilla test.** The IIFE
  hasn't been built or hasn't been copied next to the HTML. Re-run
  `npm start` in `manual-testing/self-hosted-vanilla/` — the `prestart`
  script copies the freshly-built bundle.
- **`Cannot find package 'probot-self-hosted'` in the React harness.**
  Either build the package (`cd packages/probot-self-hosted && npm run
  build`) or `rm -rf node_modules package-lock.json && npm install`.
- **"Invalid hook call" in the React harness.** React de-duped
  incorrectly (usually happens after switching between `file:` and
  tarball installs). Wipe `node_modules` + `package-lock.json` in the
  harness and reinstall; the `dedupe: ["react", "react-dom"]` in
  [`vite.config.ts`](./manual-testing/self-hosted-react/vite.config.ts)
  prevents this on fresh installs.
- **OpenAI mode returns 500.** Check the terminal running `npm run dev`
  for the underlying error. Most common causes: missing/wrong
  `OPENAI_API_KEY`, no billing credit for the chosen model.
- **`tsc: command not found` when building `probot-self-hosted`.** The
  build script shells out to `tsc` without npx. Either run it via `npm
  run build` (npm scripts auto-add `.bin` to PATH), or prepend it
  manually: `PATH="$(pwd)/node_modules/.bin:$PATH" node build.mjs`.
- **Anthropic/Google adapters fail to resolve.** Their SDKs are optional
  peer deps in `probot-self-hosted`. Install the one you need in your
  consumer app: `npm install @anthropic-ai/sdk` or `npm install
  @google/generative-ai`.
- **Widget bubble missing on a plain HTML page.** Static file servers
  (`serve`, `http-server`, `python -m http.server`) block parent-
  directory traversal, so `<script src="../../packages/…">` silently
  404s. Copy the bundle into the served folder — see the `prestart`
  pattern in [`self-hosted-vanilla/package.json`](./manual-testing/self-hosted-vanilla/package.json).

---

## Related docs

- **[CONTRIBUTING.md](./CONTRIBUTING.md)** — Full contributor workflow:
  branch model, commit style, PR checklist.
- **[manual-testing/README.md](./manual-testing/README.md)** —
  Operational index; per-project READMEs with full verification
  checklists.
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — How a chat request flows
  through the stack.
- **[BYO-KEY.md](./BYO-KEY.md)** — Where your LLM key goes (and doesn't)
  in both the managed and self-hosted paths.
- **[docs/self-hosted-bot/models-and-keys.mdx](./docs/self-hosted-bot/models-and-keys.mdx)** —
  Full provider matrix for the self-hosted package: which adapter to
  import, where to get each provider's API key, and how to switch
  providers at runtime.
- **[packages/probot-chatbot/README.md](./packages/probot-chatbot/README.md)**
  and **[packages/probot-self-hosted/README.md](./packages/probot-self-hosted/README.md)** —
  Per-package public docs shipped to npm.
