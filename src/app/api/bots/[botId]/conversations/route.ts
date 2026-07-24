import { NextResponse } from "next/server";

import { requireBotOwner } from "@/lib/bots/require-bot-owner";
import { listConversations } from "@/lib/conversations/queries";
import { parsePagination } from "@/lib/pagination";

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

  const q = url.searchParams.get("q") ?? undefined;
  const { items, total } = await listConversations({
    botId: owner.bot.id,
    q,
    limit,
    offset,
  });

  return NextResponse.json({ items, total, page, limit });
}
