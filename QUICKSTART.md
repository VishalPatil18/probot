# Quickstart (local development)

Run ProBot on your machine in a few minutes. For using the hosted product, just
go to [pro-bot.dev](https://pro-bot.dev); for production self-hosting, see the
[self-hosting guide](https://pro-bot.dev/docs/hosting/self-hosting).

```bash
git clone https://github.com/vishalpatil18/probot.git
cd probot

npm install
cp .env.example .env.local        # fill DATABASE_URL + NEXTAUTH_SECRET
npx drizzle-kit push              # apply the schema to your database
npm run dev                       # http://localhost:3000
```

You need:

1. A Postgres database with `gen_random_uuid()` - Supabase or Neon free tier works; local Docker `postgres:16` also works.
2. A `NEXTAUTH_SECRET` - generate with `openssl rand -base64 32`.
3. An LLM API key from at least one supported provider (Anthropic, OpenAI, Azure OpenAI, Google Gemini). You paste it into the Bot Factory at chat time - never in env vars.

Open [localhost:3000/register](http://localhost:3000/register), create an account, go to **Create bot**, walk the Bot Factory, then preview and publish.

For the full product walkthrough, see the [docs](https://pro-bot.dev/docs).
