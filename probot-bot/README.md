# probot-bot

A tiny, single-purpose runtime for a **self-hosted ProBot**. Clone it, drop in a
bot token, deploy it on your own domain. It talks to the ProBot platform over
the versioned `/api/v1/bot/*` API - it does **not** contain the ProBot
dashboard, auth, or admin surfaces, and it never sees another tenant's data.

> This folder is a **scaffold/template**. In production it lives in its own
> repository (`probot-bot`), separate from the main `probot` platform repo. It
> is intentionally excluded from the platform's typecheck/test.

## What it does

1. Serves a minimal chat page.
2. On each visitor message, asks the platform for the relevant knowledge
   (`POST /api/v1/bot/knowledge`) and the bot's persona (`GET /api/v1/bot/config`).
3. Calls **your own** LLM provider (the key lives here, never on the platform).
4. Posts the transcript back (`POST /api/v1/bot/conversations`) and any captured
   lead (`POST /api/v1/bot/leads`) so they appear in your ProBot dashboard.

## Setup

1. In the ProBot dashboard, open your bot → **Settings → Deployment**, switch
   the mode to **Self-hosted**, and **Generate token** (copy it - shown once).
2. Copy `.env.example` to `.env.local` and fill in:
   - `PROBOT_API_URL` - usually `https://pro-bot.dev`
   - `PROBOT_BOT_TOKEN` - the `pbt_…` token from step 1
   - `OPENAI_API_KEY` - your own LLM key (this runtime calls the provider)
3. `npm install && npm run dev`, then deploy to Vercel / any Node 20+ host.

## Security

The bot token grants **read-only knowledge access for one bot** plus
conversation/lead writes for that bot - nothing else. If it leaks, revoke it
from the dashboard; the platform rejects it instantly. Keep `PROBOT_BOT_TOKEN`
and `OPENAI_API_KEY` server-side only (never ship them to the browser).

See the full guide at https://pro-bot.dev/docs/self-hosted-bot/quickstart
