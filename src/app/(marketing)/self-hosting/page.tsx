import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Self-hosting ProBot · ProBot",
  description:
    "Deploy ProBot on your own infrastructure so your LLM key never touches pro-bot.dev.",
};

export default function SelfHostingPage() {
  return (
    <div className="mx-auto max-w-[820px] px-6 py-16">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand mb-3">
        Self-hosting guide
      </p>
      <h1 className="font-display text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.05] mb-4">
        Run ProBot on your own infra.
      </h1>
      <p className="text-muted text-lg leading-relaxed mb-10">
        ProBot is MIT-licensed open source. Deploy it under your own domain and
        your LLM key never leaves your server - ProBot.dev never sees it, never
        logs it, never knows it exists. This page walks through what you need.
      </p>

      <section className="mb-10">
        <h2 className="font-display text-2xl font-bold mb-3">
          What you&apos;ll need
        </h2>
        <ul className="text-muted leading-relaxed space-y-2 list-disc pl-5">
          <li>
            A Vercel (or Netlify / Render / any Next.js-compatible) account for
            the app server.
          </li>
          <li>
            A Postgres database with the <code>pgvector</code> extension -
            Supabase Free or Neon Free both work.
          </li>
          <li>
            A Resend account for transactional emails (magic-link sign-in,
            password reset, account-deletion notices). Free tier: 100
            emails/day.
          </li>
          <li>
            GitHub and/or Google OAuth client credentials, if you want those
            sign-in options.
          </li>
          <li>An LLM API key from Anthropic, OpenAI, Google, or Azure.</li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-2xl font-bold mb-3">Steps</h2>
        <ol className="text-muted leading-relaxed space-y-3 list-decimal pl-5">
          <li>
            Fork the repo from{" "}
            <a
              href="https://github.com/VishalPatil18/probot"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand font-semibold hover:underline"
            >
              github.com/VishalPatil18/probot
            </a>{" "}
            and clone locally.
          </li>
          <li>
            Copy <code>.env.example</code> to <code>.env.local</code> and fill
            in every required value. The file is heavily commented; anything
            labelled <em>optional</em> can stay empty for a minimal deploy.
          </li>
          <li>
            Run the database migrations:{" "}
            <code>npm install &amp;&amp; npm run db:migrate</code>.
          </li>
          <li>
            Deploy. <code>vercel</code> auto-detects Next.js and runs the
            included <code>vercel.json</code> (which schedules the daily
            account-purge cron).
          </li>
          <li>
            In Vercel project settings, add every env var from your local
            <code>.env.local</code> to the production environment. Set{" "}
            <code>NEXTAUTH_URL</code> to your real domain.
          </li>
        </ol>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-2xl font-bold mb-3">
          Key storage choice
        </h2>
        <p className="text-muted leading-relaxed mb-3">
          You have two options for where the LLM key lives:
        </p>
        <ul className="text-muted leading-relaxed space-y-3 list-disc pl-5">
          <li>
            <strong className="text-ink">Pure self-host (recommended).</strong>{" "}
            Leave <code>PROBOT_KEY_ENCRYPTION_KEY</code> unset. The managed-key
            path in the dashboard refuses with a 503; users authenticate every
            chat request with the key held in their own browser. Your server
            never sees the key in any form.
          </li>
          <li>
            <strong className="text-ink">
              Self-host + opt-in managed storage.
            </strong>{" "}
            Set <code>PROBOT_KEY_ENCRYPTION_KEY</code> to a base64-encoded
            32-byte value (<code>openssl rand -base64 32</code>). Users who opt
            in via the dashboard get their key encrypted at rest in your
            database, decryptable only by your running server. Same as
            pro-bot.dev&apos;s managed mode, but YOU are the operator holding
            the KEK.
          </li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-2xl font-bold mb-3">KEK rotation</h2>
        <p className="text-muted leading-relaxed mb-3">
          Rotate the key encryption key quarterly:
        </p>
        <ol className="text-muted leading-relaxed space-y-2 list-decimal pl-5">
          <li>
            Generate a new key: <code>openssl rand -base64 32</code>.
          </li>
          <li>
            Add it to your production env as{" "}
            <code>PROBOT_KEY_ENCRYPTION_KEY_NEXT</code> (don&apos;t touch the
            existing <code>PROBOT_KEY_ENCRYPTION_KEY</code> yet).
          </li>
          <li>Redeploy so both env vars are live.</li>
          <li>
            From a deploy with DB access, run <code>npm run kek:rotate</code>.
            The script re-wraps every stored DEK with the new KEK; the encrypted
            LLM keys themselves are unchanged. Run with{" "}
            <code>-- --dry-run</code> first to confirm row counts.
          </li>
          <li>
            Once the script reports success, set{" "}
            <code>PROBOT_KEY_ENCRYPTION_KEY</code> to the new value and remove{" "}
            <code>PROBOT_KEY_ENCRYPTION_KEY_NEXT</code>. Redeploy.
          </li>
        </ol>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-2xl font-bold mb-3">
          Vercel Cron secret
        </h2>
        <p className="text-muted leading-relaxed">
          The daily account-purge cron at{" "}
          <code>/api/cron/purge-deleted-accounts</code> requires a{" "}
          <code>CRON_SECRET</code> env var. Vercel Cron sets the{" "}
          <code>Authorization: Bearer $CRON_SECRET</code> header automatically
          when this env var is configured in the project. Generate one with{" "}
          <code>openssl rand -base64 32</code> and add it before deploy. If you
          leave it unset, the cron handler fail-closes (503) and scheduled
          deletions never run.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-2xl font-bold mb-3">Honest caveats</h2>
        <ul className="text-muted leading-relaxed space-y-3 list-disc pl-5">
          <li>
            Free-serverless malware scanning doesn&apos;t exist; the upload
            route uses a heuristic check (magic bytes + extension + MIME +
            executable / Office-macro signature blocklist). For a real AV scan,
            run ClamAV as a sidecar and call it from{" "}
            <code>src/lib/uploads/malware-scan.ts</code>.
          </li>
          <li>
            Rate limiting is per-process. A scaled-out deployment with many
            concurrent serverless invocations will see per-instance counts. If
            that&apos;s a problem, swap <code>src/lib/ai/rate-limit.ts</code>{" "}
            for an Upstash-Redis backed version (Stage 8).
          </li>
          <li>
            The provider circuit breaker is also per-process. Same reasoning,
            same fix path.
          </li>
        </ul>
      </section>

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
