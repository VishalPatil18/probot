import type { Metadata } from "next";
import Link from "next/link";

import {
  CONTACT_EMAIL,
  OPERATOR_DESCRIPTION,
  OPERATOR_NAME,
} from "@/lib/marketing/legal";

const GITHUB_URL = "https://github.com/VishalPatil18";
const LINKEDIN_URL = "https://www.linkedin.com/in/vishalrameshpatil/";
const PORTFOLIO_URL = "https://vishalpatil.vercel.app/";

export const metadata: Metadata = {
  title: "About · ProBot",
  description:
    "ProBot is a free, open-source AI representative for job seekers. Built by an individual maintainer with a bring-your-own-key philosophy.",
};

function MaterialIcon({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  return (
    <span className={`material-symbols-outlined ${className}`} aria-hidden>
      {name}
    </span>
  );
}

const PRINCIPLES = [
  {
    icon: "key",
    title: "You own the keys",
    body: "Your LLM API key lives in your browser. The server never sees it, never stores it, never bills you for it.",
  },
  {
    icon: "lock",
    title: "You own the data",
    body: "Your resume, your conversations, your captured leads - all visible only to you in your dashboard. Delete your account and it's gone within 30 days.",
  },
  {
    icon: "code",
    title: "MIT-licensed, end to end",
    body: "Every line of ProBot is open source. Fork it, audit it, self-host it on your own infrastructure. No hidden modules, no upsell tier.",
  },
  {
    icon: "payments",
    title: "Zero dollars, zero meters",
    body: "No subscriptions, no usage quotas, no rate-limits dressed up as 'fair use'. Free isn't a marketing tier - it's the only tier.",
  },
];

export default function AboutPage() {
  return (
    <>
      {/* HERO */}
      <section className="dot-pattern border-b border-border-base">
        <div className="mx-auto max-w-[1180px] px-6 py-20 lg:py-24">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-brand text-xs font-bold border border-blue-100 mb-6">
              <span className="size-1.5 rounded-full bg-brand" /> About ProBot
            </span>
            <h1 className="font-display text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05] text-balance mb-6">
              A free AI representative for every job seeker.
            </h1>
            <p className="text-lg text-muted leading-relaxed max-w-2xl">
              Recruiters skim a resume in six seconds. ProBot turns that resume
              into a chatbot that answers their questions instead - accurately,
              in your voice, 24/7. No paywall. No vendor lock-in. Your data and
              your model keys, always.
            </p>
          </div>
        </div>
      </section>

      {/* WHY */}
      <section className="border-b border-border-base bg-white">
        <div className="mx-auto max-w-[1180px] px-6 py-20">
          <div className="grid lg:grid-cols-2 gap-14">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand mb-3">
                Why this exists
              </p>
              <h2 className="font-display text-4xl font-extrabold tracking-tight leading-[1.1] mb-6">
                The interview funnel is broken.
              </h2>
              <div className="space-y-4 text-muted leading-relaxed">
                <p>
                  A typical applicant sends 100+ resumes for a single offer.
                  Most are never opened by a human. The ones that are get six
                  seconds of attention, against a screen of buzzword
                  pattern-matching by an ATS.
                </p>
                <p>
                  ProBot rewrites that asymmetry. Instead of hoping a recruiter
                  reads page two, you hand them a chatbot that has read every
                  page - and your LinkedIn, your portfolio, your projects - and
                  answers their actual questions.
                </p>
                <p>
                  The bot replies with what&apos;s in your data and only
                  what&apos;s in your data. If you didn&apos;t put it in, ProBot
                  won&apos;t make it up.
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand mb-3">
                What we built
              </p>
              <h2 className="font-display text-4xl font-extrabold tracking-tight leading-[1.1] mb-6">
                A retrieval-grounded chatbot in your pocket.
              </h2>
              <div className="space-y-4 text-muted leading-relaxed">
                <p>
                  ProBot uses retrieval-augmented generation (RAG): your data is
                  chunked, embedded into a private vector store, and the top
                  matches are handed to the LLM with strict instructions to
                  cite, not invent.
                </p>
                <p>
                  Every answer carries a confidence score and a source pointer
                  back to the chunk it came from. Recruiters trust it because
                  it&apos;s verifiable. You trust it because nothing leaves your
                  data - and your key never leaves your browser.
                </p>
                <p>
                  The whole stack - front-end, RAG pipeline, vector store - runs
                  on free-tier infrastructure. No charge to you, ever.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRINCIPLES */}
      <section className="dot-pattern border-b border-border-base">
        <div className="mx-auto max-w-[1180px] px-6 py-20">
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand mb-3">
              Principles
            </p>
            <h2 className="font-display text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.05]">
              Four rules we don&apos;t break.
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {PRINCIPLES.map((p) => (
              <div
                key={p.title}
                className="bg-white rounded-2xl border border-border-base p-7 shadow-soft"
              >
                <div className="size-11 rounded-xl bg-blue-50 grid place-items-center text-brand mb-4">
                  <MaterialIcon name={p.icon} />
                </div>
                <h3 className="font-display text-xl font-bold mb-2">
                  {p.title}
                </h3>
                <p className="text-sm text-muted leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HYBRID KEY STORAGE */}
      <section id="hybrid" className="border-b border-border-base scroll-mt-20">
        <div className="mx-auto max-w-[1180px] px-6 py-20">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand mb-3">
              Your key, your trust level
            </p>
            <h2 className="font-display text-4xl font-extrabold tracking-tight leading-[1.1] mb-4">
              Two ways to run ProBot.
            </h2>
            <p className="text-muted leading-relaxed">
              ProBot ships in a hybrid model. Either path lets you put your own
              LLM key behind your bot; what differs is who holds the key at the
              moment a recruiter chats with it.
            </p>
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-border-base p-7 shadow-soft">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand">
                Managed (pro-bot.dev)
              </p>
              <h3 className="font-display text-2xl font-bold mt-1 mb-3">
                Encrypted on our infra.
              </h3>
              <p className="text-sm text-muted leading-relaxed mb-4">
                You paste your LLM key into the dashboard. We{" "}
                <strong className="text-ink">
                  envelope-encrypt it with a per-bot key
                </strong>
                , which is itself wrapped under a key encryption key (KEK) that
                lives in our deployment environment, not the database.
                Decryption happens in-memory for the duration of one recruiter
                chat, then discarded. We never log it, never echo it, and the
                dashboard surfaces every server- side decrypt in a 30-day audit
                panel.
              </p>
              <ul className="space-y-2 text-sm text-muted">
                <li className="flex gap-2">
                  <MaterialIcon
                    name="check_circle"
                    className="!text-base text-success shrink-0 mt-0.5"
                  />
                  <span>Your bot keeps replying when you&apos;re offline.</span>
                </li>
                <li className="flex gap-2">
                  <MaterialIcon
                    name="check_circle"
                    className="!text-base text-success shrink-0 mt-0.5"
                  />
                  <span>
                    DB leak alone can&apos;t decrypt - the KEK isn&apos;t in the
                    database.
                  </span>
                </li>
                <li className="flex gap-2">
                  <MaterialIcon
                    name="check_circle"
                    className="!text-base text-success shrink-0 mt-0.5"
                  />
                  <span>Audit log of every decrypt, in your dashboard.</span>
                </li>
              </ul>
            </div>
            <div className="bg-white rounded-2xl border border-border-base p-7 shadow-soft">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted">
                Self-hosted
              </p>
              <h3 className="font-display text-2xl font-bold mt-1 mb-3">
                Never leaves your server.
              </h3>
              <p className="text-sm text-muted leading-relaxed mb-4">
                Clone the open-source repo and deploy it under your own domain.
                Your LLM key goes into your own environment as a config value.
                ProBot never sees it - your bot calls the LLM provider directly
                from your infra. The right pick if you can&apos;t trust any
                operator (including us) with the key, ever.
              </p>
              <ul className="space-y-2 text-sm text-muted">
                <li className="flex gap-2">
                  <MaterialIcon
                    name="check_circle"
                    className="!text-base text-success shrink-0 mt-0.5"
                  />
                  <span>Zero key material on pro-bot.dev infra.</span>
                </li>
                <li className="flex gap-2">
                  <MaterialIcon
                    name="check_circle"
                    className="!text-base text-success shrink-0 mt-0.5"
                  />
                  <span>Full source, MIT licensed - audit every byte.</span>
                </li>
                <li className="flex gap-2">
                  <MaterialIcon
                    name="check_circle"
                    className="!text-base text-success shrink-0 mt-0.5"
                  />
                  <span>
                    You own deploy, scaling, and uptime - small ops cost.
                  </span>
                </li>
              </ul>
              <Link
                href="/self-hosting"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
              >
                Self-hosting guide
                <MaterialIcon name="arrow_forward" className="!text-base" />
              </Link>
            </div>
          </div>
          <p className="text-xs text-muted mt-6 max-w-2xl">
            Honest caveat: managed mode protects against database leaks and code
            leaks, but NOT against full infrastructure compromise of pro-bot.dev
            (anyone with deploy access can read the KEK). If that&apos;s the
            threat you&apos;re defending against, self-host is the right answer
            - that&apos;s exactly why both paths exist.
          </p>
        </div>
      </section>

      {/* WHO */}
      <section className="border-b border-border-base bg-white">
        <div className="mx-auto max-w-[1180px] px-6 py-20">
          <div className="grid lg:grid-cols-3 gap-12">
            <div className="lg:col-span-1">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand mb-3">
                Who builds it
              </p>
              <h2 className="font-display text-4xl font-extrabold tracking-tight leading-[1.1]">
                {OPERATOR_NAME}.
              </h2>
              <p className="text-muted mt-2 text-sm leading-relaxed">
                {OPERATOR_DESCRIPTION}.
              </p>
            </div>
            <div className="lg:col-span-2 space-y-4 text-muted leading-relaxed">
              <p>
                ProBot is built and maintained by {OPERATOR_NAME}, an AI
                software engineer focused on retrieval-augmented systems and
                production-grade chatbot infrastructure. It started as a
                personal portfolio piece - a tool I wished existed for my own
                job hunt - and grew into the free, open-source project you see
                here.
              </p>
              <p>
                There is no company behind ProBot. No investors, no revenue, no
                team. That&apos;s deliberate: it keeps the product honest, keeps
                the data minimal, and keeps the keys in your hands instead of a
                vendor&apos;s.
              </p>
              <p>
                For questions, feedback, or a chat about the engineering, you
                can reach me at{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-brand font-semibold hover:underline"
                >
                  {CONTACT_EMAIL}
                </a>{" "}
                - or anywhere below.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <a
                  href={PORTFOLIO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                >
                  <MaterialIcon name="public" className="!text-base" />
                  Portfolio
                </a>
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                >
                  <MaterialIcon name="code" className="!text-base" />
                  GitHub
                </a>
                <a
                  href={LINKEDIN_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                >
                  <MaterialIcon name="badge" className="!text-base" />
                  LinkedIn
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-[1180px] brand-blue-gradient dot-pattern-light rounded-3xl overflow-hidden">
          <div className="grid lg:grid-cols-2">
            <div className="p-10 lg:p-14 text-white">
              <h2 className="font-display text-4xl font-extrabold tracking-tight leading-[1.05] mb-3">
                Build your representative.
              </h2>
              <p className="text-white/70 leading-relaxed max-w-md">
                Upload your resume, plug in your LLM key, share the link. Two
                minutes from sign-up to live bot.
              </p>
            </div>
            <div className="p-10 lg:p-14 grid place-items-center bg-white/5 backdrop-blur border-t lg:border-t-0 lg:border-l border-white/10">
              <Link
                href="/dashboard/bots/new"
                className="btn bg-white text-brand !px-7 !py-3.5 !text-base font-bold w-full lg:w-auto"
              >
                Create your bot for free
                <MaterialIcon name="arrow_forward" className="!text-lg" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
