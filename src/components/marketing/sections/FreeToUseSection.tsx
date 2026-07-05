import Link from "next/link";

import { Icon } from "@/components/ui/Icon";

import { DOCS_URL } from "./constants";

export function FreeToUseSection() {
  return (
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
              or self-host your bot on your own infrastructure. No paywalls,
              no usage meters - you bring the LLM key, you stay in control.
            </p>
            <ul className="space-y-3 mb-8">
              <li className="flex gap-3 text-sm">
                <Icon
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
                <Icon
                  name="check_circle"
                  className="!text-xl text-success"
                />
                <span>
                  <strong className="text-ink">Keys stay encrypted.</strong>{" "}
                  Envelope-encrypted at rest, decrypted in memory for one
                  request, then <em>discarded</em>. Never logged in plaintext.
                </span>
              </li>
              <li className="flex gap-3 text-sm">
                <Icon
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
                <Icon name="rocket_launch" className="!text-lg" />
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
                  // Envelope-encrypted, never logged in plaintext
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
  );
}
