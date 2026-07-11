# self-hosted-vanilla

Tests the vanilla IIFE build of
[`probot-self-hosted`](../../packages/probot-self-hosted/). Loads the widget
in a plain HTML page with no React setup and no bundler on the host side.

## What this covers

- The IIFE bundle boots and exposes `window.ProbotSelfHosted`.
- `ProbotSelfHosted.mount(selector, config)` renders `<ProbotBot />` into any
  element on the host page.
- Full visual language (widget.css) is shipped inside the IIFE.
- Echo `sendMessage` — no LLM key, no network dependency.

## Prerequisites

The IIFE must exist at
`packages/probot-self-hosted/dist/probot-self-hosted.iife.js`. Build it once:

```bash
cd packages/probot-self-hosted
npm install
npm run build
```

## Run

```bash
cd manual-testing/self-hosted-vanilla
npm start
```

Open <http://localhost:5501>.

`npm start` copies the freshly-built IIFE from
`packages/probot-self-hosted/dist/` into this folder and then serves the
folder on port 5501. The copy step exists because static file servers
(`serve`, `http-server`, `python -m http.server`, etc.) block parent-
directory traversal, so a `<script src="../../packages/…">` would 404.
Re-running `npm start` after each package rebuild always picks up the
latest bundle.

## What to verify in the browser

- Bubble bottom-right with the sparkles icon (matches the
  `probot-chatbot` script-tag widget visually).
- Click the bubble → dialog opens.
- Header shows the ringed avatar, "Ada · AI Assistant", and the headline
  "Ask me about my work".
- Suggested pill chips render for the three configured questions.
- Send a message → typing dots animate → echo reply arrives with **bold**
  formatting (proves markdown rendering works in the IIFE too).
- After the first turn the chips are hidden and the lightbulb toggle in the
  input bar reveals the full list.

## Common gotchas

- `ProbotSelfHosted is not defined` → the IIFE hasn't been built. Run
  `npm run build` inside `packages/probot-self-hosted`.
- Blank page → open DevTools; the relative script path (`../../packages/…`)
  assumes this folder lives at `manual-testing/self-hosted-vanilla/`. If
  you moved the folder, either update the path or copy the IIFE alongside
  the HTML.
