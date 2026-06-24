import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { OnboardingForm } from "@/components/onboarding/OnboardingForm";
import { authOptions } from "@/lib/auth/auth";
import { db, users } from "@/lib/db";
import { isPlaceholderUsername } from "@/lib/users/placeholder";

// OAuth/magic-link users land here on first sign-in to
// (a) pick a real username (replacing the `user-<8hex>` placeholder) and
// (b) optionally pick a different animal-icon avatar. Already-onboarded
// users (real username) bounce straight to /dashboard.
export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.username) {
    redirect("/login?next=/onboarding");
  }
  if (!isPlaceholderUsername(session.user.username)) {
    redirect("/dashboard");
  }

  const row = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { image: true },
  });
  const currentImage = row?.image ?? null;

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8">
          <h1 className="font-display text-3xl font-semibold">
            Pick your name and face
          </h1>
          <p className="mt-2 text-sm text-muted">
            Your username becomes your share URL:{" "}
            <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs">
              pro-bot.dev/u/&lt;name&gt;/chat
            </code>
            . Both can be changed later.
          </p>
        </header>
        <OnboardingForm currentImage={currentImage} />
      </div>
    </div>
  );
}
