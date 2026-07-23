"use client";

export function StepperHeader({ step }: { step: number }) {
  const labels = ["Identity", "Knowledge", "Personality", "AI Model", "Deploy"];
  return (
    <header className="bg-white border-b border-border-base sticky top-16 z-20 lg:static lg:z-auto shrink-0">
      <div className="px-6 h-14 flex items-center max-w-[1280px] mx-auto w-full">
        <div className="flex-1 flex items-center justify-center gap-3">
          {labels.map((label, i) => {
            const n = i + 1;
            const state =
              n < step ? "done" : n === step ? "current" : "upcoming";
            return (
              <div key={label} className="flex items-center gap-2">
                <span
                  className={`size-7 rounded-full grid place-items-center text-xs font-bold ${
                    state === "done"
                      ? "bg-success text-white"
                      : state === "current"
                        ? "bg-brand text-white"
                        : "bg-neutral-100 text-muted"
                  }`}
                  aria-current={state === "current" ? "step" : undefined}
                >
                  {state === "done" ? "✓" : n}
                </span>
                <span className="text-sm font-semibold hidden md:block">
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </header>
  );
}
