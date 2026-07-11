# probot-self-hosted

Self-hosted ProBot chatbot as an npm package. Install it in your web app,
configure your bot in code, and render `<ProbotBot />` - no separate runtime
to clone or deploy. Optionally link the widget to your ProBot dashboard for
conversation and lead analytics (dashboard is view-only for self-hosted bots).

```bash
npm i probot-self-hosted
```

## Quick example (React / Next.js)

```tsx
"use client";

import { ProbotBot } from "probot-self-hosted";

export function ChatWidget() {
  return (
    <ProbotBot
      name="Ada"
      headline="Ask me about my work"
      personality="professional"
      themeColor="#2563eb"
      context={`I'm Ada Lovelace, a mathematician…`}
      suggestedQuestions={["What projects are you working on?"]}
      captureLead
      sendMessage={async ({ system, messages }) => {
        const res = await fetch("/api/probot-chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ system, messages }),
        });
        const data = await res.json();
        return data.reply;
      }}
      dashboard={{ token: process.env.NEXT_PUBLIC_PROBOT_TOKEN! }}
    />
  );
}
```

Then in a Next.js Route Handler (server-only):

```ts
// app/api/probot-chat/route.ts
import { createOpenAIHandler } from "probot-self-hosted/adapters/openai";

const send = createOpenAIHandler({
  baseUrl: "https://api.openai.com/v1",
  apiKey: process.env.OPENAI_API_KEY!,
  model: "gpt-4o-mini",
});

export async function POST(req: Request) {
  const { system, messages } = await req.json();
  const reply = await send({ system, messages });
  return Response.json({ reply });
}
```

## Choose a model

The widget itself is model-agnostic — the `sendMessage` prop is the seam
between your bot UI and whichever provider you want to call. `probot-self-
hosted` ships three server-only adapters that all return the same
`SendMessage` shape, so switching providers is a one-line change.

| Provider | Adapter | Import path | Extra dep |
|---|---|---|---|
| OpenAI | `createOpenAIHandler` | `probot-self-hosted/adapters/openai` | none |
| Anthropic (Claude) | `createAnthropicHandler` | `probot-self-hosted/adapters/anthropic` | `@anthropic-ai/sdk` |
| Google (Gemini) | `createGoogleHandler` | `probot-self-hosted/adapters/google` | `@google/generative-ai` |
| Grok, Ollama, Azure OpenAI, LM Studio, together.ai, DeepSeek, Mistral… | `createOpenAIHandler` with `baseUrl` | `probot-self-hosted/adapters/openai` | none |

The Anthropic and Google SDKs are **optional peer dependencies**: install
them only if you use those adapters. If you only ship OpenAI (or an
OpenAI-compatible endpoint), there's zero extra bundle cost.

### OpenAI-compatible providers (Grok, Ollama, Azure, …)

Every provider whose API mimics OpenAI's `POST /v1/chat/completions` works
through the same `createOpenAIHandler` — just point `baseUrl` at their host
and pass the right API key + model:

```ts
// Grok (xAI)
createOpenAIHandler({
  baseUrl: "https://api.x.ai/v1",
  apiKey: process.env.XAI_API_KEY!,
  model: "grok-4",
});

// Ollama (local, no key needed)
createOpenAIHandler({
  baseUrl: "http://localhost:11434/v1",
  apiKey: "ollama",
  model: "llama3.2",
});

// Azure OpenAI (baseUrl points at your deployment)
createOpenAIHandler({
  baseUrl: "https://<resource>.openai.azure.com/openai/deployments/<name>",
  apiKey: process.env.AZURE_OPENAI_KEY!,
  model: "<deployment-name>",
});
```

### Switch providers at runtime

Wrap the handler choice in a factory keyed on an env var (or a request
header, or a feature flag) and swap without touching the React tree:

```ts
// app/api/probot-chat/route.ts
import type { SendMessage } from "probot-self-hosted";
import { createAnthropicHandler } from "probot-self-hosted/adapters/anthropic";
import { createGoogleHandler } from "probot-self-hosted/adapters/google";
import { createOpenAIHandler } from "probot-self-hosted/adapters/openai";

function resolveHandler(): SendMessage {
  switch (process.env.PROBOT_PROVIDER) {
    case "anthropic":
      return createAnthropicHandler({
        apiKey: process.env.ANTHROPIC_API_KEY!,
        model: process.env.PROBOT_MODEL ?? "claude-haiku-4-5",
      });
    case "google":
      return createGoogleHandler({
        apiKey: process.env.GOOGLE_API_KEY!,
        model: process.env.PROBOT_MODEL ?? "gemini-2.5-flash",
      });
    default:
      return createOpenAIHandler({
        apiKey: process.env.OPENAI_API_KEY!,
        model: process.env.PROBOT_MODEL ?? "gpt-4o-mini",
      });
  }
}

const send = resolveHandler();
export async function POST(req: Request) {
  const { system, messages } = await req.json();
  const reply = await send({ system, messages });
  return Response.json({ reply });
}
```

Setting `PROBOT_PROVIDER=anthropic PROBOT_MODEL=claude-sonnet-4-5` and
redeploying swaps the model. The widget doesn't care — same `sendMessage`
contract on the client.

Full provider matrix, key-provisioning instructions, and cost notes:
[pro-bot.dev/docs/self-hosted-bot/models-and-keys](https://pro-bot.dev/docs/self-hosted-bot/models-and-keys).

## Vanilla HTML (script tag)

```html
<div id="probot"></div>
<script src="https://unpkg.com/probot-self-hosted/dist/probot-self-hosted.iife.js"></script>
<script>
  ProbotSelfHosted.mount("#probot", {
    name: "Ada",
    context: "…",
    sendMessage: async ({ system, messages }) => {
      const res = await fetch("/api/probot-chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ system, messages }),
      });
      return (await res.json()).reply;
    },
  });
</script>
```

## Dashboard analytics

Register a self-hosted bot in the [ProBot dashboard](https://pro-bot.dev/dashboard),
mint a token from **Settings → Deployment**, and pass it as `dashboard.token`.
Every completed turn and captured lead is POSTed to `/api/v1/bot/*`, showing up
under that bot in your dashboard. Config edits on the dashboard are disabled
for self-hosted bots - the source of truth is your webapp.

## Why an npm package (not a runtime to clone)?

Cloning a separate repo, wiring env vars, and redeploying every time you tweak
persona is friction. The npm package puts the whole bot inside your existing
webapp - one deploy, one env, one config surface. Your LLM key stays in your
backend; the platform never sees it.

## Security

- **Never put your LLM API key in the browser.** Implement `sendMessage`
  against a same-origin `/api/…` route you own; call the model server-side.
  `createOpenAIHandler` helps but is server-only.
- The `dashboard.token` (`pbt_…`) grants conversation+lead writes for one bot
  only. Rotate it from the dashboard if it leaks.

## Full docs

- Setup guide: <https://pro-bot.dev/docs/self-hosted-bot/index>
- Framework examples: <https://pro-bot.dev/docs/self-hosted-bot/nextjs>
- API reference: <https://pro-bot.dev/docs/self-hosted-bot/api-reference>

## License

MIT
