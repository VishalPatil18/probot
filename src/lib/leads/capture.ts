import { and, eq } from "drizzle-orm";

import { conversations, db, leads, notifications } from "@/lib/db";

export interface CaptureLeadArgs {
  botId: string;
  ownerUserId: string;
  botName: string;
  email: string;
  name?: string | null;
  company?: string | null;
  linkedinUrl?: string | null;
  conversationId?: string | null;
  contextSummary?: string | null;
}

export interface CapturedLead {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  linkedinUrl: string | null;
  contextSummary: string | null;
  conversationId: string | null;
  capturedAt: Date;
}

export async function captureLead(
  args: CaptureLeadArgs,
): Promise<{ lead: CapturedLead; deduped: boolean }> {
  const { botId, ownerUserId, botName, email } = args;
  const conversationId = args.conversationId ?? null;
  const contextSummary = args.contextSummary ?? null;
  const name = args.name?.trim() || null;
  const company = args.company?.trim() || null;
  const linkedinUrl = args.linkedinUrl?.trim() || null;

  const projection = {
    id: leads.id,
    email: leads.email,
    name: leads.name,
    company: leads.company,
    linkedinUrl: leads.linkedinUrl,
    contextSummary: leads.contextSummary,
    conversationId: leads.conversationId,
    capturedAt: leads.capturedAt,
  } as const;

  if (conversationId) {
    const existing = await db.query.leads.findFirst({
      columns: {
        id: true,
        email: true,
        name: true,
        company: true,
        linkedinUrl: true,
        contextSummary: true,
        conversationId: true,
        capturedAt: true,
      },
      where: and(
        eq(leads.botId, botId),
        eq(leads.conversationId, conversationId),
        eq(leads.email, email),
      ),
    });
    if (existing) return { lead: existing, deduped: true };
  }

  const lead = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(leads)
      .values({
        botId,
        conversationId,
        email,
        name,
        company,
        linkedinUrl,
        contextSummary,
      })
      .returning(projection);
    if (!inserted) throw new Error("lead_insert_failed");

    if (conversationId) {
      await tx
        .update(conversations)
        .set({ recruiterEmail: email })
        .where(
          and(
            eq(conversations.id, conversationId),
            eq(conversations.botId, botId),
          ),
        );
    }

    await tx.insert(notifications).values({
      userId: ownerUserId,
      botId,
      kind: "lead_captured",
      payload: {
        leadId: inserted.id,
        email,
        name,
        company,
        botId,
        botName,
        contextSummary,
      },
    });

    return inserted;
  });

  return { lead, deduped: false };
}
