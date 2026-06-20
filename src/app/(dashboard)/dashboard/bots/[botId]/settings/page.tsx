import { and, eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BotSettingsForm } from "@/components/dashboard/BotSettingsForm";
import { KnowledgeManager } from "@/components/dashboard/KnowledgeManager";
import { authOptions } from "@/lib/auth/auth";
import { bots, db } from "@/lib/db";
import type { Personality } from "@/lib/bots/schemas";
import { PERSONALITY_PRESETS } from "@/lib/bots/schemas";

// Stage 6 §6.5: bot settings page. Edits identity (name/headline/
// personality/suggested questions) via the slice-6.5-widened PATCH
// endpoint and manages knowledge sources via the existing slice-2
// `/knowledge` endpoints.
//
// Ownership: standard `findFirst({ where: and(eq(id), eq(userId)) })` →
// `notFound()` so non-owners get 404 (not 403).

function isPersonality(value: string): value is Personality {
  return (PERSONALITY_PRESETS as readonly string[]).includes(value);
}

export default async function BotSettingsPage({
  params,
}: {
  params: { botId: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) notFound();

  const bot = await db.query.bots.findFirst({
    where: and(eq(bots.id, params.botId), eq(bots.userId, session.user.id)),
    columns: {
      id: true,
      name: true,
      headline: true,
      personality: true,
      suggestedQuestions: true,
    },
  });
  if (!bot) notFound();

  // Defense-in-depth: PERSONALITY_PRESETS is enforced by Zod at create
  // and at PATCH, so this fallback should be unreachable in practice. If
  // a future migration / direct-DB write somehow leaves an unknown value
  // here we render the picker on "professional" instead of crashing.
  // The first user save will write the (validated) value back, healing
  // the row silently.
  const personality = isPersonality(bot.personality)
    ? bot.personality
    : "professional";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href={`/dashboard/bots/${bot.id}`}
        className="mb-4 inline-flex text-xs font-semibold text-muted hover:text-text-base"
      >
        ← Back to {bot.name}
      </Link>

      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Edit bot identity, suggested questions, and knowledge sources.
        </p>
      </header>

      <section className="mb-10">
        <h2 className="mb-4 font-display text-xl font-semibold">Identity</h2>
        <BotSettingsForm
          botId={bot.id}
          initialName={bot.name}
          initialHeadline={bot.headline ?? ""}
          initialPersonality={personality}
          initialSuggestedQuestions={bot.suggestedQuestions ?? []}
        />
      </section>

      <section>
        <h2 className="mb-4 font-display text-xl font-semibold">
          Knowledge sources
        </h2>
        <KnowledgeManager botId={bot.id} />
      </section>
    </div>
  );
}
