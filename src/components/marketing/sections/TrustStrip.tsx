export function TrustStrip() {
  return (
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
  );
}
