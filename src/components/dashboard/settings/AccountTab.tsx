import { ComingSoonPill } from "../ComingSoonPill";

type Props = {
  name: string;
  email: string;
  username: string;
  initials: string;
};

// Slice B - Account tab. Slice 6.5 only edits bot-scoped fields; user-
// scoped account editing (name / email / username / password / photo
// upload) lands in Stage 7 when we wire the corresponding endpoints.
// Inputs render as read-only displays of the current values with
// Coming Soon pills on each section header so users see what's coming
// without being misled into thinking the form already works.
export function AccountTab({ name, email, username, initials }: Props) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border-base bg-white p-6 shadow-soft">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-bold">Profile</h3>
          <ComingSoonPill />
        </div>

        <div className="mb-6 flex items-center gap-4">
          <div className="brand-blue-gradient font-display grid size-16 place-items-center rounded-full text-xl font-extrabold text-white">
            {initials}
          </div>
          <button
            type="button"
            disabled
            className="btn btn-secondary !py-2 cursor-not-allowed text-xs opacity-60"
          >
            Change photo
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <ReadOnlyField label="Full name" value={name || "-"} />
          <ReadOnlyField label="Email" value={email || "-"} />
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold">
              Username
            </label>
            <div className="flex items-center overflow-hidden rounded-xl border border-border-base bg-neutral-50">
              <span className="pl-3 pr-1 text-sm text-muted">
                probot.com/u/
              </span>
              <span className="flex-1 py-2.5 pr-3 text-sm text-ink">
                {username}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border-base bg-white p-6 shadow-soft">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-bold">Password</h3>
          <ComingSoonPill />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <DisabledField label="Current password" type="password" />
          <DisabledField label="New password" type="password" />
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          disabled
          className="btn btn-primary cursor-not-allowed opacity-60"
        >
          Save changes
        </button>
      </div>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold">{label}</label>
      <div className="w-full rounded-xl border border-border-base bg-neutral-50 px-3 py-2.5 text-sm text-ink">
        {value}
      </div>
    </div>
  );
}

function DisabledField({
  label,
  type,
}: {
  label: string;
  type: "password" | "text";
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold">{label}</label>
      <input
        type={type}
        disabled
        placeholder="••••••••"
        className="w-full cursor-not-allowed rounded-xl border border-border-base bg-neutral-50 px-3 py-2.5 text-sm opacity-60"
      />
    </div>
  );
}
