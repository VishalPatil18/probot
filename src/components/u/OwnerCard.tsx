type Props = {
  name: string;
  headline: string | null;
  image: string | null;
};

export function OwnerCard({ name, headline, image }: Props) {
  return (
    <header className="flex items-center gap-4 rounded-2xl border border-border-base bg-white p-5 shadow-sm">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt={`${name}'s avatar`}
          width={64}
          height={64}
          loading="eager"
          decoding="async"
          className="h-16 w-16 flex-shrink-0 rounded-full bg-neutral-100 object-cover"
        />
      ) : (
        <div
          aria-hidden="true"
          className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-brand/10 text-lg font-semibold text-brand"
        >
          {initials(name)}
        </div>
      )}
      <div className="min-w-0">
        <h1 className="truncate font-display text-xl font-semibold leading-tight">
          {name}
        </h1>
        {headline ? (
          <p className="mt-0.5 truncate text-sm text-muted">{headline}</p>
        ) : null}
      </div>
    </header>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}
