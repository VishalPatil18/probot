import Link from "next/link";

import { buildMetadata } from "@/lib/seo/site";

export const metadata = buildMetadata({
  title: "Self-host your bot",
  description:
    "Install the probot-self-hosted npm package to embed a ProBot chatbot directly in your web app - no separate runtime to clone, your LLM key stays in your infra.",
  path: "/self-hosting",
});

const DOCS_QUICKSTART = "https://pro-bot.dev/docs/self-hosted-bot/index";
const NPM_PACKAGE = "https://www.npmjs.com/package/probot-self-hosted";

export default function SelfHostingPage() {
  return (
    <div className="mx-auto max-w-[820px] px-6 py-16">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand mb-3">
        Self-hosting guide
      </p>
      <h1 className="font-display text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.05] mb-4">
        Drop the bot into your webapp.
      </h1>
      <p className="text-muted text-lg leading-relaxed mb-10">
        Self-hosting used to mean cloning a separate runtime repo. Now it&apos;s
        one npm package:{" "}
        <a
          href={NPM_PACKAGE}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand font-semibold hover:underline"
        >
          probot-self-hosted
        </a>
        . Install it in your web app, render <code>&lt;ProbotBot /&gt;</code>,
        and the whole bot - persona, knowledge, provider, theme - is
        configured in your code. Your LLM key stays in your own backend and
        never touches pro-bot.dev. Register the bot in your ProBot dashboard
        (optional) to get conversation and lead analytics.
      </p>

      <section className="mb-10">
        <h2 className="font-display text-2xl font-bold mb-3">How it works</h2>
        <ol className="text-muted leading-relaxed space-y-3 list-decimal pl-5">
          <li>
            <code>npm i probot-self-hosted</code> in your project.
          </li>
          <li>
            Render <code>&lt;ProbotBot /&gt;</code> with your bot config
            (name, headline, personality, knowledge, theme, suggested
            questions).
          </li>
          <li>
            Implement a <code>sendMessage</code> that proxies through your own
            <code>/api/…</code> route - the LLM key lives on your server, not
            in the browser.
          </li>
          <li>
            (Optional) Register the bot at{" "}
            <Link
              href="/dashboard/bots/new-self-hosted"
              className="text-brand font-semibold hover:underline"
            >
              Dashboard → Register self-hosted bot
            </Link>{" "}
            for a token, then set <code>dashboard.token</code> so conversations
            and leads flow into your dashboard for analytics.
          </li>
        </ol>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-2xl font-bold mb-3">
          What you&apos;ll need
        </h2>
        <ul className="text-muted leading-relaxed space-y-2 list-disc pl-5">
          <li>
            An existing web app (React, Next.js, Vite, or plain HTML via the
            vanilla build).
          </li>
          <li>
            An LLM API key (OpenAI, Anthropic, Grok, Ollama, or any
            OpenAI-compatible endpoint), reached from your backend - not the
            browser.
          </li>
          <li>Optional: a ProBot account, if you want dashboard analytics.</li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-2xl font-bold mb-3">Why an npm package</h2>
        <ul className="text-muted leading-relaxed space-y-2 list-disc pl-5">
          <li>
            One install, one deploy - no separate runtime repo, no extra
            infrastructure to babysit.
          </li>
          <li>
            All bot configuration lives in your codebase, version-controlled
            with the rest of your app.
          </li>
          <li>
            Your LLM key stays entirely in your own backend - never posted to,
            stored on, or logged by pro-bot.dev.
          </li>
          <li>Analytics on the dashboard are read-only for self-hosted bots.</li>
        </ul>
      </section>

      <p className="text-muted leading-relaxed mb-10">
        Full setup, framework examples (Next.js, Vite, Vue, vanilla), and the
        API contract live in the{" "}
        <a
          href={DOCS_QUICKSTART}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand font-semibold hover:underline"
        >
          self-hosting quickstart
        </a>
        .
      </p>

      <p className="text-sm text-muted mt-12">
        Questions about the setup? See{" "}
        <Link href="/about" className="text-brand font-semibold hover:underline">
          About
        </Link>{" "}
        for contact info.
      </p>
    </div>
  );
}
