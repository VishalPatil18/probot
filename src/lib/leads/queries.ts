import { desc, eq, sql } from "drizzle-orm";

import { bots, db, leads } from "@/lib/db";

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
