---
name: Bug report
about: Report a defect you've reproduced
title: "[bug] "
labels: ["bug", "triage"]
assignees: []
---

## What happened?

A clear, concrete description of the bug. One sentence, then details.

## Steps to reproduce

1. Go to '…'
2. Click on '…'
3. See error

## Expected behaviour

What you thought would happen.

## Screenshots / logs

If applicable, paste screenshots, the chat-route response body from DevTools Network tab, or `npm run dev` terminal output.

```
<paste here>
```

## Environment

- **ProBot version / commit:** `git rev-parse --short HEAD`
- **OS:** macOS 14.x / Ubuntu 24.04 / Windows 11
- **Browser:** Chrome 127 / Firefox 128 / Safari 17
- **Running locally or hosted?** local `npm run dev` / Vercel deployment
- **Node.js:** `node -v`
- **Postgres:** Supabase / Neon / local Docker
- **LLM provider in use:** Anthropic / OpenAI / Azure OpenAI / (none - failure is pre-LLM)

## Anything else?

Context that might help (recent changes, related issues, suspected cause).

> ⚠️ **Do NOT paste your LLM API key, `NEXTAUTH_SECRET`, or `DATABASE_URL` anywhere in this issue.** If a log line includes any of them, redact it before pasting. If you suspect a key was leaked in a server log, report it via [SECURITY.md](../../SECURITY.md) instead of a public issue.
