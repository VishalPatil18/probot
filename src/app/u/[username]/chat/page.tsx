import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { ChatWindow } from "@/components/chat/ChatWindow";
import { OwnerCard } from "@/components/u/OwnerCard";
import { isProviderName, type ProviderName } from "@/lib/ai/providers";
import { verifyPreviewToken } from "@/lib/bots/preview-token";
import { bots, db, users } from "@/lib/db";

type PageProps = {
  params: { username: string };
  searchParams: { preview?: string };
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
  isActive: boolean;
  previewToken: string | null;
};

// Wrapped in React `cache()` so `generateMetadata` and the page component
// share a single set of DB queries per request - avoids the 2x lookup
// (users + bots) running 4 times total per page load.
//
// Stage 7 §FR-002.10: lookup no longer hard-filters on isActive. We pull
// the user's bot regardless; the caller decides whether the request is
// authorised to see a draft (i.e. presented a valid preview token).
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
    where: eq(bots.userId, owner.id),
    columns: {
      id: true,
      name: true,
      headline: true,
      suggestedQuestions: true,
      loadingMessages: true,
      isActive: true,
      previewToken: true,
    },
  });
  if (!bot) return null;

  return { owner, bot };
});

function isPreviewAuthorised(
  bot: { id: string; previewToken: string | null },
  suppliedToken: string | undefined,
): boolean {
  if (!suppliedToken || !bot.previewToken) return false;
  if (suppliedToken !== bot.previewToken) return false;
  return verifyPreviewToken(suppliedToken)?.botId === bot.id;
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const resolved = await resolve(params.username);
  if (!resolved) {
    return { title: "Not found · ProBot" };
  }
  const { owner, bot } = resolved;
  // Drafts must NOT leak metadata to crawlers, even if the URL is shared.
  // Public OG data only renders for published bots.
  const previewAuthorised = isPreviewAuthorised(bot, searchParams.preview);
  if (!bot.isActive && !previewAuthorised) {
    return { title: "Not found · ProBot", robots: { index: false } };
  }
  if (!bot.isActive) {
    return { title: `Preview · ${bot.name}`, robots: { index: false } };
  }
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

export default async function PublicChatPage({
  params,
  searchParams,
}: PageProps) {
  // Stage 4: PUBLIC - no auth required for published bots.
  // Stage 7: draft bots require a valid signed preview token in `?preview=`.
  const resolved = await resolve(params.username);
  if (!resolved) notFound();
  const { owner, bot } = resolved;

  const previewAuthorised = isPreviewAuthorised(bot, searchParams.preview);
  if (!bot.isActive && !previewAuthorised) notFound();

  const llmProvider: ProviderName = isProviderName(owner.llmProvider)
    ? owner.llmProvider
    : "anthropic";

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
        {!bot.isActive ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span className="font-semibold">Private preview.</span> This bot is
            still a draft - recruiters can&apos;t reach this URL without your
            token. Publish from the settings page to make it public.
          </div>
        ) : null}
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
            previewToken={
              previewAuthorised ? (searchParams.preview ?? null) : null
            }
          />
        </div>
      </div>
    </div>
  );
}
