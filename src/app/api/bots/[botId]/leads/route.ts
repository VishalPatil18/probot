import { and, desc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireBotOwner } from "@/lib/bots/require-bot-owner";
import { corsPreflight, PUBLIC_CORS_HEADERS } from "@/lib/bots/cors-headers";
import { bots, conversations, db, leads, notifications } from "@/lib/db";
import { leadCaptureInput } from "@/lib/leads/schemas";
import { parsePagination } from "@/lib/pagination";

// /api/bots/[botId]/leads
//
// GET  (owner-gated, same-origin) — paginated lead list for the dashboard.
// POST (public, CORS allow-list)   — chat-UI lead capture call.
//
// The POST handler is the only Stage 6 write surface that is anonymous +
// cross-origin (the embeddable widget on a third-party site). It is
// idempotent on (conversationId, lowercased email) so a double-submit
// from the UI produces a single lead row + a single notification row.
//
// **No rate limiting in slice 6.2** — explicit deferral to Stage 7's
// Redis layer (per the slice-6.2 design Q2 lock). The 4 KB body cap, Zod
// schema, idempotent dedupe, and 24h email-only window combine to make
// raw brute-force noise expensive without rate-limit middleware. A spam
// attack that cycles emails to defeat the dedupe still bounds at one DB
// transaction per unique email per 24h window per bot — acceptable for
// slice 6.2 scope; revisit if observed in practice.

const MAX_BODY_BYTES = 4096;

// Stage 5 widget: CORS preflight. Returns 204 with the public allow-list.
export function OPTIONS(): Response {
  return corsPreflight();
}

export async function GET(
  request: Request,
  { params }: { params: { botId: string } },
): Promise<Response> {
  const owner = await requireBotOwner(params.botId);
  if (!owner.ok) return owner.response;
  const { bot } = owner;

  const url = new URL(request.url);
  const pag = parsePagination(url.searchParams);
  if (!pag.ok) return pag.response;
  const { page, limit, offset } = pag.pagination;

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: leads.id,
        email: leads.email,
        contextSummary: leads.contextSummary,
        conversationId: leads.conversationId,
        capturedAt: leads.capturedAt,
      })
      .from(leads)
      .where(eq(leads.botId, bot.id))
      .orderBy(desc(leads.capturedAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(leads)
      .where(eq(leads.botId, bot.id)),
  ]);

  return NextResponse.json({
    items: rows,
    total: totalRows[0]?.total ?? 0,
    page,
    limit,
  });
}

export async function POST(
  request: Request,
  { params }: { params: { botId: string } },
): Promise<Response> {
  // 1. Content-Type
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return jsonWithCors({ error: "unsupported_media_type" }, 415);
  }

  // 2. Body read with size cap (the chat-route pattern: don't trust
  // Content-Length, measure the read).
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

  // 3. Zod validate (lowercases + trims email for idempotent dedupe key)
  const parsed = leadCaptureInput.safeParse(raw);
  if (!parsed.success) {
    return jsonWithCors(
      { error: "validation_failed", details: parsed.error.flatten() },
      400,
    );
  }
  const { email, conversationId, contextSummary } = parsed.data;

  // 4. Resolve bot (anonymous endpoint — we need bot.user_id for the
  // notification row + bot.name for the notification payload).
  const bot = await db.query.bots.findFirst({
    where: and(eq(bots.id, params.botId), eq(bots.isActive, true)),
    columns: { id: true, userId: true, name: true },
  });
  if (!bot) {
    return jsonWithCors({ error: "bot_not_found" }, 404);
  }

  // 5. Idempotent dedupe on (botId, conversationId, lowercased email).
  // If the recruiter double-submits, we return the existing row + skip the
  // second notification. Without a conversationId we still dedupe on
  // (botId, email) within the last 24h to absorb the widget's double-
  // click fallback when the conversation hasn't been established.
  const existing = await findExistingLead(
    bot.id,
    email,
    conversationId,
  );
  if (existing) {
    return jsonWithCors({ lead: existing, deduped: true }, 200);
  }

  // 6. Atomic write: lead + conversations.recruiter_email + notification.
  // All three in one transaction so a partial commit can't (a) leave a
  // lead with no notification (owner never sees it) or (b) increment the
  // badge without a backing lead (broken click target).
  try {
    const result = await db.transaction(async (tx) => {
      const [lead] = await tx
        .insert(leads)
        .values({
          botId: bot.id,
          conversationId: conversationId ?? null,
          email,
          contextSummary: contextSummary ?? null,
        })
        .returning({
          id: leads.id,
          email: leads.email,
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
          botId: bot.id,
          botName: bot.name,
          contextSummary: contextSummary ?? null,
        },
      });

      return lead;
    });

    return jsonWithCors({ lead: result, deduped: false }, 201);
  } catch (err) {
    console.warn("[leads] capture failed", err);
    return jsonWithCors({ error: "capture_failed" }, 500);
  }
}

// 24h window for the conversation-less dedupe fallback. Prevents a hostile
// site from filling an owner's notification feed by hitting the endpoint
// with the same email across many sessions.
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
