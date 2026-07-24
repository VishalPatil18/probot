import { requireBotOwner } from "@/lib/bots/require-bot-owner";
import { toCsv } from "@/lib/csv";
import { listAllLeadsForExport } from "@/lib/leads/queries";

function isoDate(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toISOString();
}

function safeFilenameSegment(input: string): string {
  return input.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

export async function GET(
  _request: Request,
  { params }: { params: { botId: string } },
): Promise<Response> {
  const owner = await requireBotOwner(params.botId);
  if (!owner.ok) return owner.response;
  const { bot } = owner;

  const rows = await listAllLeadsForExport({ botId: bot.id });

  const csv = toCsv(rows, [
    { header: "captured_at", cell: (r) => isoDate(r.capturedAt) },
    { header: "name", cell: (r) => r.name ?? "" },
    { header: "email", cell: (r) => r.email },
    { header: "company", cell: (r) => r.company ?? "" },
    { header: "linkedin_url", cell: (r) => r.linkedinUrl ?? "" },
    { header: "bot_name", cell: () => bot.name },
    { header: "context_summary", cell: (r) => r.contextSummary ?? "" },
    { header: "conversation_id", cell: (r) => r.conversationId ?? "" },
  ]);

  const dateStamp = new Date().toISOString().slice(0, 10);
  const asciiName = safeFilenameSegment(bot.name) || "bot";
  const asciiFilename = `leads-${asciiName}-${dateStamp}.csv`;
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
