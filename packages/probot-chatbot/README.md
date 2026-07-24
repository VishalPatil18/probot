# probot-chatbot

[![npm](https://img.shields.io/npm/v/probot-chatbot.svg)](https://www.npmjs.com/package/probot-chatbot)

> Install: `npm i probot-chatbot` · npm: [npmjs.com/package/probot-chatbot](https://www.npmjs.com/package/probot-chatbot)

Embed a [ProBot](https://pro-bot.dev) AI chatbot on any website with a single script tag. ProBot turns your resume into an AI assistant that answers recruiters' questions in your voice, 24/7 - BYO LLM key, free and open source.

## Quick start (no build step)

The fastest way - load straight from a CDN, no install:

```html
<script
  src="https://unpkg.com/probot-chatbot@latest/dist/probot-chatbot.js"
  data-bot-id="YOUR_BOT_ID"
  async
></script>
```

Copy the exact snippet (with your real bot ID prefilled) from the **Embed** section of your ProBot dashboard. The script injects a floating chat bubble in the bottom-right corner.

## Install via npm

```bash
npm i probot-chatbot
```

Then either:

**A) Serve the asset yourself** - copy `node_modules/probot-chatbot/dist/probot-chatbot.js` into your static assets and reference it with a `<script>` tag (same `data-bot-id` attribute as above).

**B) Import it in a bundler** (Vite, webpack, Next.js, etc.):

```html
<!-- somewhere in your page -->
<script data-bot-id="YOUR_BOT_ID"></script>
```

```js
// in your app entry - importing for its side effect mounts the widget
import "probot-chatbot";
```

The widget reads `data-bot-id` from its own (or any) `<script>` tag on the page and mounts itself.

## Configuration

| Attribute | Required | Description |
| --- | --- | --- |
| `data-bot-id` | yes | Your bot's ID, from the dashboard Embed section. |
| `data-api-base` | no | Override the platform URL (default `https://pro-bot.dev`). Set this if you self-host the platform. |
| `async` | recommended | Load without blocking page render. |

## How it works

The widget is a tiny (~8 KB), dependency-free, iframe-isolated chat surface. It talks to the bot owner's hosted chat endpoint, so **your LLM key is never exposed to the embedding site** - the visitor uses the owner's hosted endpoint, not the key.

## Choose a model

Model choice for a hosted bot lives in the ProBot dashboard — **Settings → AI Model & Key**. Pick from Anthropic (Claude), OpenAI (GPT), Google (Gemini), Grok (xAI), or Azure OpenAI, paste the API key, save. The widget picks up the new model on the next visitor turn — no code change, no redeploy, and the same `<script>` embed stays valid.

The API key you paste is stored server-side (envelope-encrypted) and never leaves the platform. Recruiters chatting with your bot never see it.

Want to run the widget without ProBot picking the model for you? Use the [self-hosted npm package (`probot-self-hosted`)](https://npmjs.com/package/probot-self-hosted) instead — you wire `sendMessage` to whichever provider you want, and your LLM key stays in your own backend.

## Links

- npm: [npmjs.com/package/probot-chatbot](https://www.npmjs.com/package/probot-chatbot) (`npm i probot-chatbot`)
- Website: [pro-bot.dev](https://pro-bot.dev)
- Docs: [pro-bot.dev/docs](https://pro-bot.dev/docs)
- Embed & share guide: [pro-bot.dev/docs/embed-share](https://pro-bot.dev/docs/embed-share)
- Source: [github.com/vishalpatil18/probot](https://github.com/vishalpatil18/probot)

## License

MIT
