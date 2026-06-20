import { and, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { ChatWindow } from "@/components/chat/ChatWindow";
import { OwnerCard } from "@/components/u/OwnerCard";
import { isProviderName, type ProviderName } from "@/lib/ai/providers";
import { bots, db, users } from "@/lib/db";

type PageProps = {
  params: { username: string };
};

type ResolvedOwner = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  llmProvider: string;
};

type ResolvedBot = {
  id: string;
  name: string;
  headline: string | null;
  suggestedQuestions: string[] | null;
  loadingMessages: string[];
};

// Wrapped in React `cache()` so `generateMetadata` and the page component
// share a single set of DB queries per request - avoids the 2x lookup
// (users + bots) running 4 times total per page load.
const resolve = cache(async function resolve(
  username: string,
): Promise<{ owner: ResolvedOwner; bot: ResolvedBot } | null> {
  const owner = await db.query.users.findFirst({
    where: eq(users.username, username),
    columns: {
      id: true,
      username: true,
      name: true,
      image: true,
      llmProvider: true,
    },
  });
  if (!owner) return null;

  const bot = await db.query.bots.findFirst({
    where: and(eq(bots.userId, owner.id), eq(bots.isActive, true)),
    columns: {
      id: true,
      name: true,
      headline: true,
      suggestedQuestions: true,
      loadingMessages: true,
    },
  });
  if (!bot) return null;

  return { owner, bot };
});

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const resolved = await resolve(params.username);
  if (!resolved) {
    return { title: "Not found · ProBot" };
  }
  const { owner, bot } = resolved;
  const displayName = owner.name ?? params.username;
  const description =
    bot.headline ?? `Ask ${displayName}'s AI assistant about their career.`;
  return {
    title: `Chat with ${displayName}'s AI · ProBot`,
    description,
    openGraph: {
      title: `Ask ${displayName}'s AI anything about their career`,
      description,
      type: "website",
      ...(owner.image ? { images: [{ url: owner.image }] } : {}),
    },
    twitter: {
      card: owner.image ? "summary_large_image" : "summary",
      title: `Ask ${displayName}'s AI anything about their career`,
      description,
      ...(owner.image ? { images: [owner.image] } : {}),
    },
    robots: { index: true, follow: true },
  };
}

export default async function PublicChatPage({ params }: PageProps) {
  // Stage 4: PUBLIC - no auth required. Anyone with the URL can chat.
  const resolved = await resolve(params.username);
  if (!resolved) notFound();
  const { owner, bot } = resolved;

  const llmProvider: ProviderName = isProviderName(owner.llmProvider)
    ? owner.llmProvider
    : "anthropic";

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
        <OwnerCard
          name={owner.name ?? owner.username}
          headline={bot.headline}
          image={owner.image}
        />
        <div className="mt-6">
          <ChatWindow
            botId={bot.id}
            botName={bot.name}
            botHeadline={bot.headline}
            suggestedQuestions={bot.suggestedQuestions ?? []}
            loadingMessages={bot.loadingMessages}
            llmProvider={llmProvider}
          />
        </div>
      </div>
    </div>
  );
}
