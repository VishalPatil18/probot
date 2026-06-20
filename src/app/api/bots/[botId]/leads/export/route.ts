import { desc, eq } from "drizzle-orm";

import { requireBotOwner } from "@/lib/bots/require-bot-owner";
import { toCsv } from "@/lib/csv";
import { db, leads } from "@/lib/db";

// GET /api/bots/[botId]/leads/export
//
// Stage 6 §6.4: CSV download of every captured lead for this bot, ordered
// by capture time. Owner-gated. Streams a Content-Disposition: attachment
// response so the browser triggers a file download with a date-stamped
// filename (e.g. `leads-Jane-Doe-2026-06-19.csv`).
//
// Columns: captured_at, email, bot_name, context_summary, conversation_id
// (per the slice-6.2 Q6 lock).
//
// No pagination — exports are full snapshots. Risk: a bot with 100K leads
// produces a multi-MB response. Acceptable now; revisit if any single bot
// gets there (Stage 7 streaming).

const MAX_EXPORT_ROWS = 50_000;

function isoDate(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toISOString();
}

function safeFilenameSegment(input: string): string {
  // RFC 5987 escape would be more correct but ASCII-only + replace makes
  // every browser happy without quoted-string semantics getting in the way.
  return input.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

export async function GET(
  _request: Request,
  { params }: { params: { botId: string } },
): Promise<Response> {
  const owner = await requireBotOwner(params.botId);
  if (!owner.ok) return owner.response;
  const { bot } = owner;

  const rows = await db
    .select({
      capturedAt: leads.capturedAt,
      email: leads.email,
      contextSummary: leads.contextSummary,
      conversationId: leads.conversationId,
    })
    .from(leads)
    .where(eq(leads.botId, bot.id))
    .orderBy(desc(leads.capturedAt))
    .limit(MAX_EXPORT_ROWS);

  const csv = toCsv(rows, [
    { header: "captured_at", cell: (r) => isoDate(r.capturedAt) },
    { header: "email", cell: (r) => r.email },
    { header: "bot_name", cell: () => bot.name },
    { header: "context_summary", cell: (r) => r.contextSummary ?? "" },
    { header: "conversation_id", cell: (r) => r.conversationId ?? "" },
  ]);

  const dateStamp = new Date().toISOString().slice(0, 10);
  const asciiName = safeFilenameSegment(bot.name) || "bot";
  const asciiFilename = `leads-${asciiName}-${dateStamp}.csv`;
  // RFC 5987: `filename*` carries the UTF-8-encoded original name so that
  // browsers render an accurate non-ASCII filename, while the plain
  // `filename` parameter remains as the safe ASCII fallback for legacy
  // clients. Both are needed — older browsers ignore `filename*` and
  // newer browsers prefer it when both are present.
  const utf8Filename = encodeURIComponent(`leads-${bot.name}-${dateStamp}.csv`);

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${asciiFilename}"; filename*=UTF-8''${utf8Filename}`,
      "Cache-Control": "no-store",
    },
  });
}
