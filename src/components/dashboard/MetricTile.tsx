import { ComingSoonPill } from "./ComingSoonPill";

type Props = {
  label: string;
  value: string | number;
  icon: "forum" | "chat" | "contact_mail" | "bolt";
  /** Faded right-corner pill text (e.g. "+18%"). */
  fadedGrowth?: string;
  /** When true, the entire content is faded and a Coming Soon pill is rendered. */
  comingSoon?: boolean;
};

const ICON_PATHS: Record<Props["icon"], JSX.Element> = {
  forum: (
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  ),
  chat: (
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  ),
  contact_mail: (
    <>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </>
  ),
  bolt: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
};

// Dashboard top-row metric tile. The number stays at full opacity even
// when `comingSoon` is true - the value itself is real or placeholder
// "1.4s"; the faded pill carries the not-yet-wired-up signal.
export function MetricTile({
  label,
  value,
  icon,
  fadedGrowth,
  comingSoon = false,
}: Props) {
  return (
    <div className="rounded-2xl border border-border-base bg-white p-5 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <span className="grid size-9 place-items-center rounded-lg bg-blue-50 text-brand">
          <svg
            aria-hidden
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {ICON_PATHS[icon]}
          </svg>
        </span>
        {fadedGrowth ? (
          <span className="text-[11px] font-bold text-success opacity-30">
            {fadedGrowth}
          </span>
        ) : null}
      </div>
      <p
        className={`font-display text-3xl font-extrabold ${
          comingSoon ? "opacity-40" : ""
        }`}
      >
        {value}
      </p>
      <div className="mt-0.5 flex items-center gap-2">
        <p className="text-xs text-muted">{label}</p>
        {comingSoon ? <ComingSoonPill /> : null}
      </div>
    </div>
  );
}
