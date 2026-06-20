type Props = {
  size?: "xs" | "sm";
};

// Tiny gray pill used to mark surfaces whose underlying functionality is
// not yet wired (growth %, response time, top topics, AI model & key
// page, etc). The surrounding content is rendered faded so the layout
// rhythm is preserved while the inactive state is unambiguous.
export function ComingSoonPill({ size = "xs" }: Props) {
  const sizing =
    size === "sm"
      ? "px-2 py-0.5 text-[11px]"
      : "px-1.5 py-0.5 text-[10px]";
  return (
    <span
      className={`inline-flex items-center rounded-full bg-neutral-200 font-semibold text-neutral-600 ${sizing}`}
    >
      Coming soon
    </span>
  );
}
