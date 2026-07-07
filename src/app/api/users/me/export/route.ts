import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { buildExportBundle, type ExportBundle } from "@/lib/account/export";
import { authOptions } from "@/lib/auth/auth";

// GET /api/users/me/export?scope=all|bots|knowledge|conversations|leads
//
// Portable JSON dump of the signed-in user's data. `scope` narrows the
// bundle to a single category so the Security & Privacy tab can offer a
// per-type export button. `all` (default) mirrors the previous behavior.
// Streamed with a `Content-Disposition: attachment` header so browsers
// offer a save dialog rather than rendering JSON in a new tab; the
// filename encodes the scope + timestamp so repeated exports don't
// overwrite each other.

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

// Slice a full bundle down to the fields relevant to the requested scope.
// Keeps `user` metadata in every response so the export is self-describing
// (which account did this dump come from, when?), but drops the
// per-bot arrays we don't need. For `bots`, the bot rows are kept but the
// child arrays are cleared - the intent is "give me the bot config, not
// its history."
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
  // scope === "leads"
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
