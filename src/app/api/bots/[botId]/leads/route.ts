import { and, desc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { sendLeadCapturedEmail } from "@/lib/auth/email";
import { requireBotOwner } from "@/lib/bots/require-bot-owner";
import { corsPreflight, PUBLIC_CORS_HEADERS } from "@/lib/bots/cors-headers";
import { bots, conversations, db, leads, notifications, users } from "@/lib/db";
import { listLeads } from "@/lib/leads/queries";
import { leadCaptureInput } from "@/lib/leads/schemas";
import { parsePagination } from "@/lib/pagination";
import { appBaseUrl } from "@/lib/uploads/image-upload";

const MAX_BODY_BYTES = 4096;

export function OPTIONS(): Response {
  return corsPreflight();
}

export async function GET(
  request: Request,
  { params }: { params: { botId: string } },
): Promise<Response> {
  const owner = await requireBotOwner(params.botId);
  if (!owner.ok) return owner.response;

  const url = new URL(request.url);
  const pag = parsePagination(url.searchParams);
  if (!pag.ok) return pag.response;
  const { page, limit, offset } = pag.pagination;

  const { items, total } = await listLeads({
    botId: owner.bot.id,
    limit,
    offset,
  });

  return NextResponse.json({ items, total, page, limit });
}

export async function POST(
  request: Request,
  { params }: { params: { botId: string } },
): Promise<Response> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return jsonWithCors({ error: "unsupported_media_type" }, 415);
  }

  const bodyText = await request.text();
  if (bodyText.length > MAX_BODY_BYTES) {
    return jsonWithCors({ error: "request_too_large" }, 413);
  }
  let raw: unknown;
  try {
    raw = JSON.parse(bodyText);
  } catch {
    return jsonWithCors({ error: "invalid_json" }, 400);
  }

  const parsed = leadCaptureInput.safeParse(raw);
  if (!parsed.success) {
    return jsonWithCors(
      { error: "validation_failed", details: parsed.error.flatten() },
      400,
    );
  }
  const { name, email, company, linkedinUrl, conversationId, contextSummary } =
    parsed.data;

  const bot = await db.query.bots.findFirst({
    where: and(eq(bots.id, params.botId), eq(bots.isActive, true)),
    columns: { id: true, userId: true, name: true },
  });
  if (!bot) {
    return jsonWithCors({ error: "bot_not_found" }, 404);
  }

  const existing = await findExistingLead(bot.id, email, conversationId);
  if (existing) {
    return jsonWithCors({ lead: existing, deduped: true }, 200);
  }

  try {
    const result = await db.transaction(async (tx) => {
      const [lead] = await tx
        .insert(leads)
        .values({
          botId: bot.id,
          conversationId: conversationId ?? null,
          email,
          name: name?.trim() || null,
          company: company?.trim() || null,
          linkedinUrl: linkedinUrl?.trim() || null,
          contextSummary: contextSummary ?? null,
        })
        .returning({
          id: leads.id,
          email: leads.email,
          name: leads.name,
          company: leads.company,
          linkedinUrl: leads.linkedinUrl,
          contextSummary: leads.contextSummary,
          conversationId: leads.conversationId,
          capturedAt: leads.capturedAt,
        });
      if (!lead) throw new Error("lead_insert_failed");

      if (conversationId) {
        await tx
          .update(conversations)
          .set({ recruiterEmail: email })
          .where(
            and(
              eq(conversations.id, conversationId),
              eq(conversations.botId, bot.id),
            ),
          );
      }

      await tx.insert(notifications).values({
        userId: bot.userId,
        botId: bot.id,
        kind: "lead_captured",
        payload: {
          leadId: lead.id,
          email,
          name: name?.trim() || null,
          company: company?.trim() || null,
          botId: bot.id,
          botName: bot.name,
          contextSummary: contextSummary ?? null,
        },
      });

      return lead;
    });

    try {
      const owner = await db.query.users.findFirst({
        where: eq(users.id, bot.userId),
        columns: { email: true, notifyLeadsEmail: true },
      });
      if (owner?.notifyLeadsEmail && owner.email) {
        await sendLeadCapturedEmail({
          to: owner.email,
          botName: bot.name,
          leadEmail: email,
          dashboardUrl: `${appBaseUrl()}/dashboard/bots/${bot.id}/leads`,
        });
      }
    } catch (err) {
      console.warn("[leads] notify email failed", err);
    }

    return jsonWithCors({ lead: result, deduped: false }, 201);
  } catch (err) {
    console.warn("[leads] capture failed", err);
    return jsonWithCors({ error: "capture_failed" }, 500);
  }
}

const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;

async function findExistingLead(
  botId: string,
  email: string,
  conversationId: string | undefined,
) {
  const projection = {
    id: leads.id,
    email: leads.email,
    contextSummary: leads.contextSummary,
    conversationId: leads.conversationId,
    capturedAt: leads.capturedAt,
  } as const;

  if (conversationId) {
    return db.query.leads.findFirst({
      columns: {
        id: true,
        email: true,
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
  }

  const since = new Date(Date.now() - DEDUPE_WINDOW_MS);
  const [row] = await db
    .select(projection)
    .from(leads)
    .where(
      and(
        eq(leads.botId, botId),
        eq(leads.email, email),
        sql`${leads.capturedAt} >= ${since}`,
      ),
    )
    .orderBy(desc(leads.capturedAt))
    .limit(1);
  return row;
}

function jsonWithCors(body: unknown, status: number): Response {
  return NextResponse.json(body, { status, headers: PUBLIC_CORS_HEADERS });
}
