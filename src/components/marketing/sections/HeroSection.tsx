import Link from "next/link";

import { DemoVideoModal } from "@/components/marketing/DemoVideoModal";
import { Icon } from "@/components/ui/Icon";

export function HeroSection() {
  return (
    <section className="dot-pattern border-b border-border-base">
      <div className="mx-auto max-w-[1180px] px-6 py-16 lg:py-24 grid lg:grid-cols-2 gap-12 items-center">
        <div className="flex flex-col gap-6 rise">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-brand text-xs font-bold w-fit border border-blue-100">
            <span className="size-1.5 rounded-full bg-brand" /> Free &amp;
            open source · Bring your own API key
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
              <Icon name="arrow_forward" className="!text-lg" />
            </Link>
            <DemoVideoModal />
          </div>
          <div className="flex items-center gap-6 pt-2 text-sm text-muted">
            <span className="flex items-center gap-1.5">
              <Icon
                name="check_circle"
                className="!text-base text-success"
              />
              100% Free to Use
            </span>
            <span className="flex items-center gap-1.5">
              <Icon
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
                <Icon name="smart_toy" className="!text-xl" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold leading-tight">
                  Vishal&apos;s AI Assistant
                </p>
                <p className="text-[11px] text-success font-semibold flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-success" />
                  Online now · usually replies instantly
                </p>
              </div>
              <span className="text-[10px] font-mono text-muted">
                pro-bot.dev/u/vishal
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
                  <Icon
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
  );
}
