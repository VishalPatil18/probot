import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { buildExportBundle, type ExportBundle } from "@/lib/account/export";
import { authOptions } from "@/lib/auth/auth";

type Scope = "all" | "bots" | "knowledge" | "conversations" | "leads";

const VALID_SCOPES: readonly Scope[] = [
  "all",
  "bots",
  "knowledge",
  "conversations",
  "leads",
];

function parseScope(raw: string | null): Scope {
  if (raw && (VALID_SCOPES as readonly string[]).includes(raw)) {
    return raw as Scope;
  }
  return "all";
}

function sliceBundle(bundle: ExportBundle, scope: Scope): unknown {
  if (scope === "all") return bundle;

  const base = {
    exportedAt: bundle.exportedAt,
    scope,
    user: bundle.user,
  };

  if (scope === "bots") {
    return {
      ...base,
      bots: bundle.bots.map((b) => b.bot),
    };
  }
  if (scope === "knowledge") {
    return {
      ...base,
      bots: bundle.bots.map((b) => ({
        botId: b.bot.id,
        botName: b.bot.name,
        knowledge: b.knowledge,
      })),
    };
  }
  if (scope === "conversations") {
    return {
      ...base,
      bots: bundle.bots.map((b) => ({
        botId: b.bot.id,
        botName: b.bot.name,
        conversations: b.conversations,
        messages: b.messages,
      })),
    };
  }
  return {
    ...base,
    bots: bundle.bots.map((b) => ({
      botId: b.bot.id,
      botName: b.bot.name,
      leads: b.leads,
    })),
  };
}

export async function GET(request: Request): Promise<Response> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scope = parseScope(new URL(request.url).searchParams.get("scope"));

  let bundle: ExportBundle;
  try {
    bundle = await buildExportBundle(session.user.id);
  } catch {
    return NextResponse.json({ error: "export_failed" }, { status: 500 });
  }

  const body = sliceBundle(bundle, scope);
  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19);
  const filename = `probot-export-${scope}-${stamp}.json`;

  return new NextResponse(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
