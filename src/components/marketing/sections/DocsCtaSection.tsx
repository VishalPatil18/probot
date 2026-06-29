import { Icon } from "@/components/ui/Icon";

import { DOCS_URL } from "./constants";

export function DocsCtaSection() {
  return (
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
              <Icon name="arrow_forward" className="!text-lg" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
