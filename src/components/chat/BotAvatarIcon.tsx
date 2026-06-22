// Bot avatar shown in the chat header and on each assistant reply. Renders the
// uploaded bot picture when set, otherwise the default ProBot mark (two dots)
// on a circle tinted with the bot's theme accent (`--bot-accent`). Size is
// controlled by the caller via `sizeClass` (e.g. "size-12" or "size-8").

interface BotAvatarIconProps {
  image?: string | null;
  name: string;
  sizeClass: string;
}

export function BotAvatarIcon({ image, name, sizeClass }: BotAvatarIconProps) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt={`${name} avatar`}
        className={`${sizeClass} shrink-0 rounded-full object-cover`}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      style={{ background: "var(--bot-accent, #0070dd)" }}
      className={`${sizeClass} grid shrink-0 place-items-center rounded-full`}
    >
      <svg viewBox="0 0 40 40" fill="none" className="h-3/5 w-3/5">
        <circle cx="14" cy="20" r="3.4" fill="#fff" />
        <circle cx="26" cy="20" r="3.4" fill="#fff" opacity="0.65" />
      </svg>
    </div>
  );
}
