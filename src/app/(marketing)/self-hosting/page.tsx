import Link from "next/link";

import { buildMetadata } from "@/lib/seo/site";

export const metadata = buildMetadata({
  title: "Self-host your bot",
  description:
    "Run your bot's chat on your own infrastructure with the tiny probot-bot runtime, so your LLM key never touches pro-bot.dev.",
  path: "/self-hosting",
});

const DOCS_QUICKSTART = "https://pro-bot.dev/docs/self-hosted-bot/index";

export default function SelfHostingPage() {
  return (
    <div className="mx-auto max-w-[820px] px-6 py-16">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand mb-3">
        Self-hosting guide
      </p>
      <h1 className="font-display text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.05] mb-4">
        Run your bot on your own infra.
      </h1>
      <p className="text-muted text-lg leading-relaxed mb-10">
        Self-hosting in ProBot means running <strong>your bot&apos;s chat</strong>{" "}
        on your own infrastructure - not operating the whole platform. You deploy
        the tiny <code>probot-bot</code> runtime under your own domain; pro-bot.dev
        keeps handling the dashboard, knowledge, conversations, and leads. Your
        LLM key lives in your runtime and never touches pro-bot.dev.
      </p>

      <section className="mb-10">
        <h2 className="font-display text-2xl font-bold mb-3">How it works</h2>
        <ol className="text-muted leading-relaxed space-y-3 list-decimal pl-5">
          <li>
            A visitor chats with your <code>probot-bot</code> runtime on your
            domain.
          </li>
          <li>
            The runtime asks the platform for the relevant knowledge and your
            bot&apos;s persona over the versioned <code>/api/v1/bot/*</code> API,
            authenticated with a bot token.
          </li>
          <li>
            The runtime calls <strong>your</strong> LLM provider directly - using
            the key in your own environment - and replies.
          </li>
          <li>
            It posts the transcript and any captured lead back to the platform,
            so they appear in your ProBot dashboard exactly like a managed bot.
          </li>
        </ol>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-2xl font-bold mb-3">
          What you&apos;ll need
        </h2>
        <ul className="text-muted leading-relaxed space-y-2 list-disc pl-5">
          <li>
            A ProBot account with a bot already created (build it in the
            dashboard first).
          </li>
          <li>
            A Node 20+ host for the runtime - Vercel, Render, Fly.io, Railway, a
            VM, or Docker. The runtime is tiny, so a free tier is plenty.
          </li>
          <li>An LLM API key from Anthropic, OpenAI, Google, or Azure.</li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-2xl font-bold mb-3">Steps</h2>
        <ol className="text-muted leading-relaxed space-y-3 list-decimal pl-5">
          <li>
            In the dashboard, open <strong>Settings &rarr; Deployment</strong>{" "}
            and switch the bot to <strong>Self-hosted</strong>.
          </li>
          <li>
            <strong>Generate a bot token</strong>. It&apos;s shown once - copy it
            somewhere safe.
          </li>
          <li>
            Deploy the <code>probot-bot</code> runtime with that token in its{" "}
            <code>PROBOT_BOT_TOKEN</code> environment variable and your LLM key in
            its provider key variable.
          </li>
          <li>
            Point your domain at the runtime. Revoke the token any time to
            instantly cut it off.
          </li>
        </ol>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-2xl font-bold mb-3">Why self-host</h2>
        <ul className="text-muted leading-relaxed space-y-2 list-disc pl-5">
          <li>You want the chat served from your own domain.</li>
          <li>You want zero trust in any operator for the chat path.</li>
          <li>You want a tiny, auditable deployment surface you control.</li>
        </ul>
      </section>

      <p className="text-muted leading-relaxed mb-10">
        Full setup, environment variables, and the API contract live in the{" "}
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
        Questions about the deployment? See{" "}
        <Link
          href="/about"
          className="text-brand font-semibold hover:underline"
        >
          About
        </Link>{" "}
        for contact info.
      </p>
    </div>
  );
}
