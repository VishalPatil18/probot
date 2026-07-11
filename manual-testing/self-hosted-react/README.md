# self-hosted-react

Full-fat test harness for the React entry of
[`probot-self-hosted`](../../packages/probot-self-hosted/). One Vite app,
three runtime modes:

- **Echo** — local stub `sendMessage`. No LLM, no network. Fastest smoke.
- **OpenAI** — round-trips through `createOpenAIHandler` behind a Vite dev
  middleware. Needs `OPENAI_API_KEY`.
- **Dashboard-linked** — echo transport + the `dashboard: { token, apiUrl }`
  link. Exercises the `reportConversation` and `reportLead` adapters against
  the Next dev server's `/api/v1/bot/*` endpoints.

## What this covers

- `<ProbotBot />` React component + `useProbotChat` hook.
- `createOpenAIHandler` adapter, invoked server-side inside Vite's dev
  process (same-origin, no CORS).
- `reportConversation` / `reportLead` dashboard adapters.
- Lead capture (`captureLead: true` + `onLead` callback).
- Live prop swaps between transports (the harness `key={mode}` remounts the
  widget so conversation state is fresh per test).

## Prerequisites

1. Build the package once:
   ```bash
   cd packages/probot-self-hosted
   npm install
   npm run build
   ```
2. Install this project's deps:
   ```bash
   cd manual-testing/self-hosted-react
   npm install
   ```

## Run

### Echo mode (no keys, no server)

```bash
npm run dev
```

Open the URL Vite prints (default <http://localhost:5173>) and the Echo
radio is selected by default. Send a message → the widget echoes it back
with a 400 ms delay so the typing dots are visible.

### OpenAI mode

```bash
OPENAI_API_KEY=sk-... OPENAI_MODEL=gpt-4o-mini npm run dev
```

Toggle **OpenAI (via Vite middleware)** in the harness. The client's
`sendMessage` posts to `/api/chat`; the Vite plugin in
[`vite.config.ts`](./vite.config.ts) invokes `createOpenAIHandler` and
returns the reply. Key stays in the Node process — never touches the
browser.

Any OpenAI-compatible endpoint works — set the `baseUrl` in the
`createOpenAIHandler` call inside `vite.config.ts` (Grok, together.ai,
Ollama, LM Studio, …).

### Dashboard-linked mode

1. Boot the Next dev server: `npm run dev` at the repo root
   (<http://localhost:3000>).
2. Register a self-hosted bot at
   <http://localhost:3000/dashboard/bots/new-self-hosted>. Copy the raw
   token (`pbt_…`) — it's shown once.
3. In this harness, toggle **Dashboard-linked**, paste the token, and keep
   the API URL as `http://localhost:3000`.
4. Send a chat turn. Then submit an email in the lead form.
5. Check `http://localhost:3000/dashboard` → your bot's conversations +
   leads should tick up.

## What to verify in the browser

- Radio selection swaps the widget cleanly (widget re-mounts, no bleed
  from previous mode's messages).
- Echo mode: chat works with no key.
- OpenAI mode: real replies stream in; if the key is bad or missing,
  the widget shows an error notice.
- Dashboard mode: DevTools Network panel shows POST requests to
  `/api/v1/bot/conversations` and `/api/v1/bot/leads` with the token in
  the `Authorization` header.
- Lead capture: with `captureLead` on, the "Leave your email" chip
  appears above the footer. Submitting fires `onLead` and shows the
  green "onLead fired with email: …" strip on the page.

## Common gotchas

- **`Cannot find package 'probot-self-hosted'`** — you haven't built the
  package yet, or `npm install` hasn't been run in this folder. Run both.
- **Invalid hook call** — React de-duped incorrectly. Delete
  `node_modules` + `package-lock.json`, rerun `npm install`. The
  `dedupe: ["react", "react-dom"]` in `vite.config.ts` should prevent
  this in fresh installs.
- **OpenAI mode returns 500** — check the terminal running `npm run dev`
  for the error. Most common: bad or missing key, or the account has no
  credit for the chosen model.
- **Dashboard POSTs 401** — token is wrong or the bot was revoked. Mint a
  new token from the bot's Settings → Deployment tab.

## Portability check

Before publishing changes to the package, verify a real
`npm install` works:

```bash
cd ../../packages/probot-self-hosted
npm pack
cd -
npm install ../../packages/probot-self-hosted/probot-self-hosted-*.tgz
npm run dev
```

If the harness still boots and Echo mode still works, other people's
devices will get the same behavior when they install from the registry.
