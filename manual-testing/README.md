# Manual testing

Isolated test harnesses for the two published packages. Each folder is a
self-contained mini-project — `cd`, run, open in the browser.

## Packages under test

- **[probot-chatbot](../packages/probot-chatbot/)** — one-line `<script>` embed
  widget. Talks to the ProBot platform (`pro-bot.dev` or a local Next dev
  server) for config and chat.
- **[probot-self-hosted](../packages/probot-self-hosted/)** — npm package for
  developers who want to host the bot inside their own app. Ships a React
  component, a headless hook, a vanilla IIFE, and a same-origin OpenAI
  adapter.

## Test projects

| Folder | Package | What it exercises |
|---|---|---|
| [chatbot-script-tag/](./chatbot-script-tag/) | `probot-chatbot` | Script-tag embed, config fetch, chat, suggested questions, markdown, mobile |
| [self-hosted-vanilla/](./self-hosted-vanilla/) | `probot-self-hosted` (vanilla IIFE) | `window.ProbotSelfHosted.mount()`, styling, echo `sendMessage` |
| [self-hosted-react/](./self-hosted-react/) | `probot-self-hosted` (React ESM + adapters) | `<ProbotBot />`, `useProbotChat`, `createOpenAIHandler`, dashboard `reportConversation` / `reportLead`, lead capture |

The existing [`html project/`](./html%20project/) folder is your quick smoke
with a real bot ID hard-coded — kept as-is. Prefer `chatbot-script-tag/` for
structured testing.

## Prerequisites

1. **Node 20+** (any version that runs the repo).
2. **Built packages.** From the repo root:
   ```bash
   ( cd packages/probot-chatbot && npm install && node build.mjs )
   ( cd packages/probot-self-hosted && npm install && PATH="$(pwd)/packages/probot-self-hosted/node_modules/.bin:$PATH" node build.mjs )
   ```
   or run `npm run build` inside each package folder (npm scripts auto-add
   `.bin` to PATH).
3. **Next dev server** (only for `chatbot-script-tag/` and the dashboard
   mode of `self-hosted-react/`): `npm run dev` from repo root, listens on
   `http://localhost:3000`. A real bot ID from your dashboard is needed for
   the script-tag test.

## Recommended running order

1. `self-hosted-vanilla/` — smallest surface, no LLM needed. Confirms the
   IIFE build boots and paints the styled widget.
2. `chatbot-script-tag/` — confirms the script-tag widget hydrates its
   config from the Next dev server.
3. `self-hosted-react/` — the full-fat React + adapter test. Toggle between
   echo, OpenAI, and dashboard-linked modes without restarting.

## Portability check

Each test uses a **`file:` install** or a **relative path** to the built
package under `packages/`. That's a symlink under the hood. Before
publishing, sanity-check with `npm pack`:

```bash
cd packages/probot-self-hosted && npm pack
cd ../../manual-testing/self-hosted-react
npm install ../../packages/probot-self-hosted/probot-self-hosted-*.tgz
```

If the app still boots against the tarball, other people's devices will get
the same experience when they `npm install probot-self-hosted` from the
registry.
