"use client";

import { TOTAL_STEPS } from "../constants";

export function StepHeading({
  step,
  title,
  subtitle,
}: {
  step: number;
  title: string;
  subtitle: string;
}) {
  return (
    <>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand mb-2">
        Step {step} of {TOTAL_STEPS}
      </p>
      <h1 className="font-display text-3xl font-extrabold tracking-tight mb-2">
        {title}
      </h1>
      <p className="text-muted text-sm mb-8">{subtitle}</p>
    </>
  );
}
