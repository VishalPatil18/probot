# chatbot-script-tag

Tests the [`probot-chatbot`](../../packages/probot-chatbot/) script-tag embed
widget.

## What this covers

- `<script src="…/widget.js" data-bot-id="…" data-api-base="…">` mounts.
- Config fetch from `GET /api/bots/[botId]/config`.
- Chat round-trip against `POST /api/chat/[botId]`.
- Suggested questions, markdown rendering, mobile responsive dialog.

## Prerequisites

- Next dev server running (`npm run dev` from the repo root, listens on
  `http://localhost:3000`). The Next dev server serves `/widget.js` and the
  chat API endpoints the widget calls.
- A **real bot id** from your dashboard. The bot needs a managed LLM key
  stored on the server (or the chat replies will fall back to the "not set
  up" error message — which is also worth testing).

## Run

1. Edit [`index.html`](./index.html): replace `REPLACE_WITH_BOT_ID` with your
   bot's id. Optionally change `data-api-base` to `https://pro-bot.dev` to
   test against production instead of local.
2. Serve this folder:
   ```bash
   npx serve -p 5500
   ```
3. Open <http://localhost:5500>.

## What to verify in the browser

- **Bubble** appears bottom-right with the sparkles icon, glowing.
- **Click** the bubble → dialog opens above it with:
  - Bot avatar (ringed, with green online dot).
  - Title reads `<Owner Name> · AI Assistant`.
  - Subtitle is either the bot's headline or "Online now".
- **Suggested questions** render as pill chips inside the dialog body.
- **Send a message** → typing dots animate → response bubble arrives with
  markdown rendering (bold, code, links, lists).
- **After the first turn**, the suggested-chip strip is hidden; a lightbulb
  toggle appears in the input bar. Click it → dropdown of the full
  suggested-question list.
- **Footer** shows "Open full chat ↗ · Powered by ProBot".
- **Resize the viewport to &lt;480px** → dialog stretches full-width, still
  usable.

## Common gotchas

- Blank bubble / dialog never opens → check DevTools network tab; the widget
  needs `/widget.js` to be reachable. Make sure `npm run dev` is up and the
  widget bundle finished building on Next start.
- Chat returns "This bot isn't set up yet" → the bot has no managed LLM key
  stored. Open its Settings → AI Model & Key and store one (or test with a
  different bot).
