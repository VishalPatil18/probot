import { Icon, type IconName } from "@/components/ui/Icon";

export function HowItWorksSection() {
  return (
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
              body: "Add your API key for Claude, Gemini, OpenAI, or any supported model. ProBot indexes your data into a private vector store - your key is envelope-encrypted and never logged in plaintext.",
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
                  <Icon name={s.icon as IconName} />
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
  );
}
