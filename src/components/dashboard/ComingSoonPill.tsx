type Props = {
  size?: "xs" | "sm";
};

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
