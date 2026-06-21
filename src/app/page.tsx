import Link from "next/link";

import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";

const DOCS_URL = "https://pro-bot-ai.vercel.app/docs";

const EMBED_SNIPPET =
  '<script src="probot.com/widget.js" data-bot-id="…"></script>';

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

export default function HomePage() {
  return (
    <>
      <SiteHeader />

      <main>
        {/* ============ HERO ============ */}
        <section className="dot-pattern border-b border-border-base">
          <div className="mx-auto max-w-[1180px] px-6 py-16 lg:py-24 grid lg:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col gap-6 rise">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-brand text-xs font-bold w-fit border border-blue-100">
                <span className="size-1.5 rounded-full bg-brand" /> Free to Use
                · Bring your own API key
              </span>
              <h1 className="font-display text-5xl lg:text-[64px] font-extrabold tracking-tight leading-[1.02] text-balance">
                Don&apos;t just send a resume. Send a representative.
              </h1>
              <p className="text-muted text-lg leading-relaxed max-w-md">
                ProBot turns your resume, LinkedIn, and portfolio into a
                personal AI chatbot that answers recruiters&apos; questions -
                powered by <strong className="text-ink">your own LLM</strong>{" "}
                (Claude, Gemini, OpenAI &amp; more).{" "}
                <Link
                  href="/about#hybrid"
                  className="text-brand font-semibold hover:underline"
                >
                  Self-host or use managed
                </Link>{" "}
                - your key, your call.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/dashboard/bots/new"
                  className="btn btn-primary !px-6 !py-3 !text-base"
                >
                  Create your bot in 2 min
                  <MaterialIcon name="arrow_forward" className="!text-lg" />
                </Link>
                <Link
                  href="/u/vishal/chat"
                  className="btn btn-secondary !px-6 !py-3 !text-base"
                >
                  <MaterialIcon name="play_circle" className="!text-lg" />
                  See a live demo
                </Link>
              </div>
              <div className="flex items-center gap-6 pt-2 text-sm text-muted">
                <span className="flex items-center gap-1.5">
                  <MaterialIcon
                    name="check_circle"
                    className="!text-base text-success"
                  />
                  100% Free to Use
                </span>
                <span className="flex items-center gap-1.5">
                  <MaterialIcon
                    name="check_circle"
                    className="!text-base text-success"
                  />
                  Envelope-encrypted keys (or self-host)
                </span>
              </div>
            </div>

            {/* Live bot card */}
            <div className="relative rise" style={{ animationDelay: ".1s" }}>
              <div className="absolute -inset-4 bg-brand/5 rounded-[2rem] blur-2xl" />
              <div className="relative bg-white rounded-2xl border border-border-base shadow-floating overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-border-base">
                  <div className="size-10 rounded-full brand-blue-gradient grid place-items-center text-white shrink-0">
                    <MaterialIcon name="smart_toy" className="!text-xl" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold leading-tight">
                      Vishal&apos;s AI Recruiter
                    </p>
                    <p className="text-[11px] text-success font-semibold flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-success" />
                      Online now · usually replies instantly
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-muted">
                    probot.com/u/vishal
                  </span>
                </div>
                <div className="px-5 py-5 space-y-3 bg-bg-app/40">
                  <div className="bubble-bot px-3.5 py-2.5 text-sm w-fit max-w-[85%]">
                    What&apos;s Vishal&apos;s experience with AI and RAG?
                  </div>
                  <div className="bubble-user px-3.5 py-2.5 text-sm w-fit max-w-[88%] ml-auto">
                    He&apos;s an AI Software Engineer Intern at UMD building
                    production RAG chatbots with LangChain &amp; Pinecone, and
                    shipped an ML phishing detector at{" "}
                    <strong>96% accuracy</strong>. 🎯
                  </div>
                  <div className="bubble-bot px-3.5 py-2.5 text-sm w-fit max-w-[85%]">
                    Is he authorized to work in the US?
                  </div>
                  <div className="flex items-center gap-1.5 px-1">
                    <div className="typing">
                      <span />
                      <span />
                      <span />
                    </div>
                    <span className="text-[11px] text-muted">
                      ProBot is typing…
                    </span>
                  </div>
                </div>
                <div className="px-5 py-4 border-t border-border-base">
                  <div className="flex items-center gap-2 border border-border-base rounded-xl px-3.5 py-2.5 bg-white">
                    <span className="text-sm text-muted flex-1">
                      Ask anything about Vishal…
                    </span>
                    <button
                      type="button"
                      className="size-7 grid place-items-center rounded-lg brand-blue-gradient text-white"
                    >
                      <MaterialIcon
                        name="arrow_upward"
                        className="!text-base"
                      />
                    </button>
                  </div>
                  <p className="text-[10px] text-muted text-center mt-2">
                    Powered by your own LLM key ·{" "}
                    <span className="text-brand font-semibold">
                      encrypted or self-hosted
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ TRUST STRIP ============ */}
        <section className="border-b border-border-base bg-white">
          <div className="mx-auto max-w-[1180px] px-6 py-8 grid grid-cols-2 md:grid-cols-4 divide-x divide-border-base">
            <div className="px-4 text-center">
              <p className="font-display text-3xl font-extrabold">2 min</p>
              <p className="text-xs text-muted mt-1">From resume to live bot</p>
            </div>
            <div className="px-4 text-center">
              <p className="font-display text-3xl font-extrabold">Any LLM</p>
              <p className="text-xs text-muted mt-1">Claude, Gemini, OpenAI…</p>
            </div>
            <div className="px-4 text-center">
              <p className="font-display text-3xl font-extrabold">$0</p>
              <p className="text-xs text-muted mt-1">
                Free &amp; self-hostable
              </p>
            </div>
            <div className="px-4 text-center">
              <p className="font-display text-3xl font-extrabold">100%</p>
              <p className="text-xs text-muted mt-1">Local key storage</p>
            </div>
          </div>
        </section>

        {/* ============ LIVE PIPELINE ============ */}
        <section className="border-b border-border-base bg-white">
          <div className="mx-auto max-w-[1180px] px-6 py-20">
            <div className="max-w-2xl mb-12">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand mb-3">
                Live pipeline
              </p>
              <h2 className="font-display text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.05]">
                Your career data in. The right answer out.
              </h2>
              <p className="text-muted text-lg leading-relaxed mt-4 max-w-xl">
                Everything you add is embedded into a private vector store. When
                a recruiter asks, ProBot retrieves what&apos;s relevant and
                replies in your voice - in real time.
              </p>
            </div>

            <div className="relative rounded-2xl border border-border-base shadow-soft overflow-hidden bg-bg-app/40">
              <div className="absolute inset-0 grid-pattern pointer-events-none" />
              <svg
                className="il-stage relative block w-full h-auto"
                viewBox="0 0 1180 460"
                role="img"
                aria-label="Animation: résumé, LinkedIn and portfolio data flowing into ProBot's AI engine, which answers a recruiter's question in a chat window."
              >
                <defs>
                  <linearGradient id="il-blue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="oklch(0.60 0.1737 245.16)" />
                    <stop offset="1" stopColor="oklch(0.55 0.193 251.78)" />
                  </linearGradient>
                  <radialGradient id="il-orbglow" cx="0.5" cy="0.5" r="0.5">
                    <stop
                      offset="0"
                      stopColor="oklch(0.62 0.17 248)"
                      stopOpacity="0.45"
                    />
                    <stop
                      offset="1"
                      stopColor="oklch(0.62 0.17 248)"
                      stopOpacity="0"
                    />
                  </radialGradient>
                  <radialGradient id="il-orbsheen" cx="0.35" cy="0.3" r="0.8">
                    <stop offset="0" stopColor="#fff" stopOpacity="0.4" />
                    <stop offset="1" stopColor="#fff" stopOpacity="0" />
                  </radialGradient>
                  <path id="il-pA" d="M242,110 C 360,110 432,206 546,222" />
                  <path id="il-pB" d="M242,230 C 384,230 440,230 544,230" />
                  <path id="il-pC" d="M242,350 C 360,350 432,254 546,238" />
                  <path id="il-pD" d="M656,230 C 706,230 724,210 760,210" />
                </defs>

                <use href="#il-pA" className="il-wire" />
                <use href="#il-pB" className="il-wire" />
                <use href="#il-pC" className="il-wire" />
                <use href="#il-pD" className="il-wire" />

                {/* A: Résumé */}
                <g className="il-float">
                  <rect
                    x="30"
                    y="78"
                    width="212"
                    height="64"
                    rx="14"
                    fill="#fff"
                    stroke="oklch(0.90 0.008 264)"
                  />
                  <rect
                    x="46"
                    y="92"
                    width="36"
                    height="36"
                    rx="10"
                    fill="oklch(0.93 0.04 252)"
                  />
                  <rect
                    x="56"
                    y="100"
                    width="16"
                    height="20"
                    rx="3"
                    fill="none"
                    stroke="oklch(0.55 0.193 251.78)"
                    strokeWidth="2"
                  />
                  <line
                    x1="59"
                    y1="106"
                    x2="69"
                    y2="106"
                    stroke="oklch(0.55 0.193 251.78)"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <line
                    x1="59"
                    y1="110"
                    x2="69"
                    y2="110"
                    stroke="oklch(0.55 0.193 251.78)"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <line
                    x1="59"
                    y1="114"
                    x2="65"
                    y2="114"
                    stroke="oklch(0.55 0.193 251.78)"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <text
                    x="96"
                    y="106"
                    className="il-t-display"
                    fontSize="16"
                    fontWeight="700"
                    fill="oklch(0.19 0.02 261)"
                  >
                    Résumé.pdf
                  </text>
                  <text
                    x="96"
                    y="124"
                    fontSize="11.5"
                    fill="oklch(0.46 0.02 262)"
                  >
                    2 pages · parsed
                  </text>
                </g>
                {/* B: LinkedIn */}
                <g className="il-float d1">
                  <rect
                    x="30"
                    y="198"
                    width="212"
                    height="64"
                    rx="14"
                    fill="#fff"
                    stroke="oklch(0.90 0.008 264)"
                  />
                  <rect
                    x="46"
                    y="212"
                    width="36"
                    height="36"
                    rx="10"
                    fill="oklch(0.93 0.04 252)"
                  />
                  <text
                    x="55"
                    y="237"
                    className="il-t-display"
                    fontSize="18"
                    fontWeight="800"
                    fill="oklch(0.55 0.193 251.78)"
                  >
                    in
                  </text>
                  <text
                    x="96"
                    y="226"
                    className="il-t-display"
                    fontSize="16"
                    fontWeight="700"
                    fill="oklch(0.19 0.02 261)"
                  >
                    LinkedIn
                  </text>
                  <text
                    x="96"
                    y="244"
                    fontSize="11.5"
                    fill="oklch(0.46 0.02 262)"
                  >
                    profile + activity
                  </text>
                </g>
                {/* C: Portfolio */}
                <g className="il-float d2">
                  <rect
                    x="30"
                    y="318"
                    width="212"
                    height="64"
                    rx="14"
                    fill="#fff"
                    stroke="oklch(0.90 0.008 264)"
                  />
                  <rect
                    x="46"
                    y="332"
                    width="36"
                    height="36"
                    rx="10"
                    fill="oklch(0.93 0.04 252)"
                  />
                  <circle
                    cx="64"
                    cy="350"
                    r="9"
                    fill="none"
                    stroke="oklch(0.55 0.193 251.78)"
                    strokeWidth="2"
                  />
                  <ellipse
                    cx="64"
                    cy="350"
                    rx="4"
                    ry="9"
                    fill="none"
                    stroke="oklch(0.55 0.193 251.78)"
                    strokeWidth="2"
                  />
                  <line
                    x1="55"
                    y1="350"
                    x2="73"
                    y2="350"
                    stroke="oklch(0.55 0.193 251.78)"
                    strokeWidth="2"
                  />
                  <text
                    x="96"
                    y="346"
                    className="il-t-display"
                    fontSize="16"
                    fontWeight="700"
                    fill="oklch(0.19 0.02 261)"
                  >
                    Portfolio
                  </text>
                  <text
                    x="96"
                    y="364"
                    fontSize="11.5"
                    fill="oklch(0.46 0.02 262)"
                  >
                    projects &amp; links
                  </text>
                </g>

                {/* Travelling particles */}
                {[
                  { id: "il-pA", begin: "0s" },
                  { id: "il-pA", begin: "1.1s" },
                  { id: "il-pB", begin: "0.5s" },
                  { id: "il-pB", begin: "1.6s" },
                  { id: "il-pC", begin: "0.3s" },
                  { id: "il-pC", begin: "1.4s" },
                ].map((p, i) => (
                  <circle key={i} className="il-particle" r="4">
                    <animateMotion
                      dur="2.2s"
                      repeatCount="indefinite"
                      begin={p.begin}
                    >
                      <mpath href={`#${p.id}`} />
                    </animateMotion>
                  </circle>
                ))}
                <circle className="il-particle" r="4.5">
                  <animateMotion
                    dur="1.6s"
                    repeatCount="indefinite"
                    begin="0.2s"
                  >
                    <mpath href="#il-pD" />
                  </animateMotion>
                </circle>

                {/* AI Orb */}
                <circle
                  className="il-orb-glow"
                  cx="600"
                  cy="230"
                  r="120"
                  fill="url(#il-orbglow)"
                />
                <circle className="il-ring" cx="600" cy="230" />
                <circle className="il-ring r2" cx="600" cy="230" />
                <circle
                  cx="600"
                  cy="230"
                  r="58"
                  fill="url(#il-blue)"
                  stroke="oklch(0.48 0.16 253)"
                />
                <circle cx="600" cy="230" r="58" fill="url(#il-orbsheen)" />
                <g className="il-eyes">
                  <circle cx="585" cy="230" r="10" fill="#fff" />
                  <circle cx="615" cy="230" r="10" fill="#fff" opacity="0.65" />
                </g>
                <text
                  x="600"
                  y="320"
                  textAnchor="middle"
                  className="il-t-display"
                  fontSize="15"
                  fontWeight="700"
                  fill="oklch(0.19 0.02 261)"
                >
                  Private vector store
                </text>
                <text
                  x="600"
                  y="340"
                  textAnchor="middle"
                  fontSize="11.5"
                  fill="oklch(0.46 0.02 262)"
                >
                  your knowledge, embedded
                </text>

                {/* Chat panel */}
                <rect
                  x="760"
                  y="62"
                  width="388"
                  height="332"
                  rx="20"
                  fill="#fff"
                  stroke="oklch(0.90 0.008 264)"
                />
                <circle cx="800" cy="104" r="20" fill="url(#il-blue)" />
                <circle cx="794" cy="104" r="4.5" fill="#fff" />
                <circle cx="807" cy="104" r="4.5" fill="#fff" opacity="0.65" />
                <text
                  x="832"
                  y="100"
                  className="il-t-display"
                  fontSize="15"
                  fontWeight="700"
                  fill="oklch(0.19 0.02 261)"
                >
                  AI Recruiter
                </text>
                <circle cx="836" cy="118" r="3.5" fill="oklch(0.62 0.16 150)" />
                <text
                  x="846"
                  y="122"
                  fontSize="11.5"
                  fill="oklch(0.46 0.02 262)"
                >
                  online · replies instantly
                </text>
                <line
                  x1="780"
                  y1="140"
                  x2="1130"
                  y2="140"
                  stroke="oklch(0.90 0.008 264)"
                />

                <g>
                  <rect
                    x="780"
                    y="158"
                    width="252"
                    height="42"
                    rx="13"
                    fill="oklch(0.96 0.004 264)"
                  />
                  <text
                    x="796"
                    y="184"
                    fontSize="13"
                    fill="oklch(0.19 0.02 261)"
                  >
                    Has Vishal ever led a team?
                  </text>
                </g>

                <g className="il-typing-grp">
                  <rect
                    x="812"
                    y="222"
                    width="84"
                    height="40"
                    rx="14"
                    fill="oklch(0.96 0.004 264)"
                  />
                  <circle
                    className="il-dot"
                    cx="836"
                    cy="242"
                    r="4"
                    fill="oklch(0.46 0.02 262)"
                  />
                  <circle
                    className="il-dot b"
                    cx="854"
                    cy="242"
                    r="4"
                    fill="oklch(0.46 0.02 262)"
                  />
                  <circle
                    className="il-dot c"
                    cx="872"
                    cy="242"
                    r="4"
                    fill="oklch(0.46 0.02 262)"
                  />
                </g>

                <g className="il-answer-grp">
                  <rect
                    x="812"
                    y="220"
                    width="320"
                    height="128"
                    rx="14"
                    fill="url(#il-blue)"
                  />
                  <text x="832" y="252" fontSize="13" fill="#fff">
                    Yes - he led GDSC as Lead and ran
                  </text>
                  <text x="832" y="276" fontSize="13" fill="#fff">
                    the Community of Coders core team,
                  </text>
                  <text x="832" y="300" fontSize="13" fill="#fff">
                    mentoring 30+ student developers. 🎯
                  </text>
                  <text x="832" y="330" fontSize="11" fill="#fff" opacity="0.7">
                    Source: positions_of_responsibility · 0.91
                  </text>
                </g>
              </svg>
            </div>
          </div>
        </section>

        {/* ============ HOW IT WORKS ============ */}
        <section id="how" className="border-b border-border-base">
          <div className="mx-auto max-w-[1180px] px-6 py-20">
            <div className="max-w-2xl mb-14">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand mb-3">
                How it works
              </p>
              <h2 className="font-display text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.05]">
                Live in three steps. No code required.
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  num: "01",
                  icon: "upload_file",
                  title: "Upload your career data",
                  body: "Drop in your resume PDF, paste your LinkedIn URL, or type a bio. Up to 5 files, any combination.",
                },
                {
                  num: "02",
                  icon: "network_intelligence",
                  title: "Plug in your own LLM",
                  body: "Add your API key for Claude, Gemini, OpenAI, or any supported model. ProBot indexes your data into a private vector store - your key stays on your machine.",
                },
                {
                  num: "03",
                  icon: "share",
                  title: "Share a link or embed it",
                  body: "Get a personal URL and a one-line widget snippet for your portfolio, email signature, or LinkedIn.",
                },
              ].map((s) => (
                <div
                  key={s.num}
                  className="bg-white rounded-2xl border border-border-base p-7 shadow-soft"
                >
                  <div className="flex items-center justify-between mb-5">
                    <div className="size-11 rounded-xl bg-blue-50 grid place-items-center text-brand">
                      <MaterialIcon name={s.icon} />
                    </div>
                    <span className="font-display text-5xl font-extrabold text-border-base">
                      {s.num}
                    </span>
                  </div>
                  <h3 className="font-display text-xl font-bold mb-2">
                    {s.title}
                  </h3>
                  <p className="text-sm text-muted leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ FEATURES BENTO ============ */}
        <section
          id="features"
          className="dot-pattern border-b border-border-base"
        >
          <div className="mx-auto max-w-[1180px] px-6 py-20">
            <div className="max-w-2xl mb-14">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand mb-3">
                Features
              </p>
              <h2 className="font-display text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.05]">
                Everything your bot needs to land you the interview.
              </h2>
            </div>
            <div className="grid md:grid-cols-12 gap-6">
              {/* RAG (big) */}
              <div className="md:col-span-7 bg-white rounded-2xl border border-border-base overflow-hidden shadow-soft flex flex-col">
                <div className="p-8 pb-0">
                  <div className="size-11 rounded-xl bg-blue-50 grid place-items-center text-brand mb-4">
                    <MaterialIcon name="manage_search" />
                  </div>
                  <h3 className="font-display text-2xl font-bold mb-2">
                    RAG-powered, never made-up
                  </h3>
                  <p className="text-sm text-muted leading-relaxed max-w-md">
                    Each question is embedded and matched against the top-3 most
                    relevant chunks of your data. If it&apos;s not in your
                    history, the bot says so and points to you directly.
                  </p>
                </div>
                <div className="mt-6 mx-8 mb-8 rounded-xl border border-border-base bg-bg-app/50 p-4 font-mono text-[11px] space-y-1.5">
                  <p className="text-muted">
                    {'// recruiter: "Has he led a team?"'}
                  </p>
                  <p className="text-brand">
                    → retrieve top-3 chunks · namespace: vishal
                  </p>
                  <p className="text-ink">
                    matched: positions_of_responsibility (0.91)
                  </p>
                  <p className="text-success">
                    {'"Yes - GDSC Lead & Community of Coders core team…"'}
                  </p>
                </div>
              </div>
              {/* Security */}
              <div className="md:col-span-5 brand-deep-gradient dot-pattern-light rounded-2xl border border-brand-deep/30 overflow-hidden text-white p-8 flex flex-col">
                <div className="size-11 rounded-xl bg-white/10 grid place-items-center mb-4 border border-white/10">
                  <MaterialIcon name="shield_lock" />
                </div>
                <h3 className="font-display text-2xl font-bold mb-2">
                  Security-hardened by default
                </h3>
                <p className="text-sm text-white/60 leading-relaxed mb-6">
                  Inherits a battle-tested defense stack: 40+ prompt-injection
                  patterns, unicode homoglyph normalization, output
                  sanitization, and per-bot rate limiting. Your LLM key never
                  leaves your machine.
                </p>
                <div className="mt-auto grid grid-cols-2 gap-2 text-[11px]">
                  {[
                    "Identity lock",
                    "Prompt protection",
                    "Output scanning",
                    "Rate limiting",
                  ].map((t) => (
                    <span
                      key={t}
                      className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              {/* Widget */}
              <div className="md:col-span-4 bg-white rounded-2xl border border-border-base p-8 shadow-soft">
                <div className="size-11 rounded-xl bg-blue-50 grid place-items-center text-brand mb-4">
                  <MaterialIcon name="code" />
                </div>
                <h3 className="font-display text-xl font-bold mb-2">
                  One-line embed widget
                </h3>
                <p className="text-sm text-muted leading-relaxed mb-4">
                  Drop a floating chat bubble on any site. Shadow-DOM isolated,
                  &lt;50KB, zero CSS conflicts.
                </p>
                <code className="block text-[10px] bg-ink text-blue-200 rounded-lg p-3 font-mono break-all">
                  {EMBED_SNIPPET}
                </code>
              </div>
              {/* Leads */}
              <div className="md:col-span-4 bg-white rounded-2xl border border-border-base p-8 shadow-soft">
                <div className="size-11 rounded-xl bg-blue-50 grid place-items-center text-brand mb-4">
                  <MaterialIcon name="contact_mail" />
                </div>
                <h3 className="font-display text-xl font-bold mb-2">
                  Automatic lead capture
                </h3>
                <p className="text-sm text-muted leading-relaxed">
                  After a few messages, the bot politely asks recruiters for
                  their email - and notifies you, with full context.
                </p>
              </div>
              {/* BYO model */}
              <div className="md:col-span-4 bg-white rounded-2xl border border-border-base p-8 shadow-soft">
                <div className="size-11 rounded-xl bg-blue-50 grid place-items-center text-brand mb-4">
                  <MaterialIcon name="hub" />
                </div>
                <h3 className="font-display text-xl font-bold mb-2">
                  Bring your own model
                </h3>
                <p className="text-sm text-muted leading-relaxed mb-4">
                  Pick Claude, Gemini, OpenAI, or Azure - whatever you prefer.
                  Your key is{" "}
                  <strong className="text-ink">
                    envelope-encrypted on our infra or never sent at all
                  </strong>{" "}
                  if you self-host. Your call, your trust level.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {["Claude", "Gemini", "OpenAI"].map((m) => (
                    <span
                      key={m}
                      className="px-2 py-1 rounded-md bg-neutral-100 text-[11px] font-semibold"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ FREE TO USE ============ */}
        <section id="free-to-use" className="border-b border-border-base">
          <div className="mx-auto max-w-[1180px] px-6 py-20">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand mb-3">
                  Free to Use
                </p>
                <h2 className="font-display text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.05] mb-4">
                  Free forever. Yours to run.
                </h2>
                <p className="text-muted leading-relaxed mb-6 max-w-md">
                  ProBot is fully free to use. Use the hosted version for free,
                  or self-host the whole stack on your own infrastructure. No
                  paywalls, no usage meters - you bring the LLM key, you stay in
                  control.
                </p>
                <ul className="space-y-3 mb-8">
                  <li className="flex gap-3 text-sm">
                    <MaterialIcon
                      name="check_circle"
                      className="!text-xl text-success"
                    />
                    <span>
                      <strong className="text-ink">
                        Bring your own API key.
                      </strong>{" "}
                      Claude, Gemini, OpenAI &amp; more - swap any time from
                      config.
                    </span>
                  </li>
                  <li className="flex gap-3 text-sm">
                    <MaterialIcon
                      name="check_circle"
                      className="!text-xl text-success"
                    />
                    <span>
                      <strong className="text-ink">Keys stored locally.</strong>{" "}
                      Your credentials live on your machine and are{" "}
                      <em>never</em> sent to or tracked by ProBot.
                    </span>
                  </li>
                  <li className="flex gap-3 text-sm">
                    <MaterialIcon
                      name="check_circle"
                      className="!text-xl text-success"
                    />
                    <span>
                      <strong className="text-ink">
                        Self-host in minutes.
                      </strong>{" "}
                      Clone the repo, set your config, deploy anywhere.
                    </span>
                  </li>
                </ul>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/dashboard/bots/new"
                    className="btn btn-primary !px-6 !py-3 !text-base"
                  >
                    <MaterialIcon name="rocket_launch" className="!text-lg" />
                    Create your bot for free
                  </Link>
                  <a
                    href={DOCS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary !px-6 !py-3 !text-base"
                  >
                    Read the setup guide
                  </a>
                </div>
              </div>
              <div className="relative">
                <div className="absolute -inset-4 bg-brand/5 rounded-[2rem] blur-2xl" />
                <div className="relative bg-ink rounded-2xl border border-ink shadow-floating overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
                    <span className="size-3 rounded-full bg-red-400/80" />
                    <span className="size-3 rounded-full bg-yellow-400/80" />
                    <span className="size-3 rounded-full bg-green-400/80" />
                    <span className="text-[11px] text-white/40 font-mono ml-2">
                      probot.config.json
                    </span>
                  </div>
                  <pre className="p-5 font-mono text-[12px] leading-relaxed text-blue-200 overflow-x-auto thin-scroll">
                    <span className="text-white/40">
                      // Your key never leaves this machine
                    </span>
                    {"\n{\n  "}
                    <span className="text-blue-300">&quot;provider&quot;</span>
                    {": "}
                    <span className="text-green-300">
                      &quot;anthropic&quot;
                    </span>
                    {",\n  "}
                    <span className="text-blue-300">&quot;model&quot;</span>
                    {": "}
                    <span className="text-green-300">
                      &quot;claude-opus-4&quot;
                    </span>
                    {",\n  "}
                    <span className="text-blue-300">&quot;apiKey&quot;</span>
                    {": "}
                    <span className="text-green-300">
                      &quot;sk-ant-•••• (local only)&quot;
                    </span>
                    {",\n  "}
                    <span className="text-blue-300">&quot;storage&quot;</span>
                    {": "}
                    <span className="text-green-300">&quot;local&quot;</span>
                    {",\n  "}
                    <span className="text-blue-300">&quot;telemetry&quot;</span>
                    {": "}
                    <span className="text-orange-300">false</span>
                    {"\n}"}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ DOCS CTA BAND (replaces counter band) ============ */}
        <section className="px-6 py-16">
          <div className="mx-auto max-w-[1180px] brand-blue-gradient dot-pattern-light rounded-3xl overflow-hidden">
            <div className="grid lg:grid-cols-2">
              <div className="p-10 lg:p-14 text-white">
                <h2 className="font-display text-4xl font-extrabold tracking-tight leading-[1.05] mb-3">
                  Read the docs.
                </h2>
                <p className="text-white/70 leading-relaxed max-w-md">
                  Full setup guide, model and API key reference, embedding the
                  widget, and self-hosting how-tos - all in one place.
                </p>
              </div>
              <div className="p-10 lg:p-14 grid place-items-center bg-white/5 backdrop-blur border-t lg:border-t-0 lg:border-l border-white/10">
                <a
                  href={DOCS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn bg-white text-brand !px-7 !py-3.5 !text-base font-bold w-full lg:w-auto"
                >
                  Open the docs
                  <MaterialIcon name="arrow_forward" className="!text-lg" />
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
