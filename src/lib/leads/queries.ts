import { desc, eq, sql } from "drizzle-orm";

import { bots, db, leads } from "@/lib/db";

// Shared lead queries. Called by both the API routes
// (paginated list + CSV export) and the dashboard list pages.
//
// **Caller contract - tenancy is the caller's responsibility.** These
// functions take a `botId` and trust the caller has already verified the
// session user owns it (via `requireBotOwner` in API routes, or
// `findFirst({ where: and(eq(bots.id), eq(bots.userId, ...)) })` in
// RSC pages). Do NOT introduce a new call site without that upstream
// guard or this becomes a cross-tenant leak.

export type LeadListItem = {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  linkedinUrl: string | null;
  contextSummary: string | null;
  conversationId: string | null;
  capturedAt: Date;
};

export type LeadListResult = {
  items: LeadListItem[];
  total: number;
};

export type ListLeadsArgs = {
  botId: string;
  limit: number;
  offset: number;
};

export async function listLeads(args: ListLeadsArgs): Promise<LeadListResult> {
  const { botId, limit, offset } = args;

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: leads.id,
        email: leads.email,
        name: leads.name,
        company: leads.company,
        linkedinUrl: leads.linkedinUrl,
        contextSummary: leads.contextSummary,
        conversationId: leads.conversationId,
        capturedAt: leads.capturedAt,
      })
      .from(leads)
      .where(eq(leads.botId, botId))
      .orderBy(desc(leads.capturedAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(leads)
      .where(eq(leads.botId, botId)),
  ]);

  return { items: rows, total: totalRows[0]?.total ?? 0 };
}

// Hard ceiling on the CSV export - 50K rows is well above any realistic
// per-bot lead count and bounds the response size at ~10 MB worst case.
// A future streaming endpoint can lift this; for now we trade
// completeness against DoS risk.
export const MAX_EXPORT_ROWS = 50_000;

export type LeadExportRow = {
  capturedAt: Date;
  name: string | null;
  email: string;
  company: string | null;
  linkedinUrl: string | null;
  contextSummary: string | null;
  conversationId: string | null;
};

export async function listAllLeadsForExport(args: {
  botId: string;
}): Promise<LeadExportRow[]> {
  return db
    .select({
      capturedAt: leads.capturedAt,
      name: leads.name,
      email: leads.email,
      company: leads.company,
      linkedinUrl: leads.linkedinUrl,
      contextSummary: leads.contextSummary,
      conversationId: leads.conversationId,
    })
    .from(leads)
    .where(eq(leads.botId, args.botId))
    .orderBy(desc(leads.capturedAt))
    .limit(MAX_EXPORT_ROWS);
}

// Cross-bot lead feed for the dashboard home.
// Joins through `bots` so the user_id filter is the trust boundary -
// every lead returned is owned by the requesting user.
export type UserLeadRow = {
  id: string;
  email: string;
  contextSummary: string | null;
  conversationId: string | null;
  capturedAt: Date;
  botId: string;
  botName: string;
};

export async function listRecentLeadsForUser(args: {
  userId: string;
  limit: number;
}): Promise<UserLeadRow[]> {
  const { userId, limit } = args;
  return db
    .select({
      id: leads.id,
      email: leads.email,
      contextSummary: leads.contextSummary,
      conversationId: leads.conversationId,
      capturedAt: leads.capturedAt,
      botId: leads.botId,
      botName: bots.name,
    })
    .from(leads)
    .innerJoin(bots, eq(leads.botId, bots.id))
    .where(eq(bots.userId, userId))
    .orderBy(desc(leads.capturedAt))
    .limit(limit);
}
