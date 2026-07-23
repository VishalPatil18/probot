import { ComingSoonPill } from "./ComingSoonPill";

const SKELETON_BARS = [
  { label: "Work experience", widthPct: 34 },
  { label: "Skills & stack", widthPct: 28 },
  { label: "Work authorization", widthPct: 19 },
  { label: "Projects", widthPct: 12 },
  { label: "Availability", widthPct: 7 },
];

export function TopTopicsPlaceholder() {
  return (
    <div className="rounded-2xl border border-border-base bg-white p-6 shadow-soft">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h3 className="font-bold">Top topics asked</h3>
        <ComingSoonPill />
      </div>
      <p className="mb-5 text-xs text-muted">
        What recruiters want to know
      </p>
      <div className="space-y-4 opacity-40">
        {SKELETON_BARS.map((b) => (
          <div key={b.label}>
            <div className="mb-1.5 flex justify-between text-xs">
              <span className="font-medium">{b.label}</span>
              <span className="text-muted">{b.widthPct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-neutral-100">
              <div
                className="brand-blue-gradient h-full rounded-full"
                style={{ width: `${b.widthPct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
