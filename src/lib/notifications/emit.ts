import { db, notifications } from "@/lib/db";

// Single funnel for dashboard-bell notification emission. Wraps the raw
// insert so every future site (rate limiting, batching, per-user opt-outs,
// email fan-out) has one place to change. Fire-and-forget by contract:
// callers never `await` the promise on a critical path (chat reply, lead
// capture, knowledge upload) - a DB pool exhaustion or constraint failure
// on the notifications table must never fail the user-visible action.
//
// The kind CHECK constraint lives in `notifications_kind_check`. Adding a
// kind here requires widening that check and running `drizzle-kit push`.

export type NotificationKind =
  | "lead_captured"
  | "conversation_started"
  | "knowledge_updated";

export interface EmitOptions {
  userId: string;
  kind: NotificationKind;
  payload: Record<string, unknown>;
  botId?: string;
}

export async function emitNotification(opts: EmitOptions): Promise<void> {
  try {
    await db.insert(notifications).values({
      userId: opts.userId,
      botId: opts.botId ?? null,
      kind: opts.kind,
      payload: opts.payload,
    });
  } catch (err) {
    // Swallow to match the "analytics never blocks the user path" pattern
    // used elsewhere (`[chat] conversation persistence failed`,
    // `[leads] ...`). Log for observability so a broken constraint or
    // pool exhaustion is still surfaced in operator logs.
    console.warn("[notifications] emit failed", {
      kind: opts.kind,
      userId: opts.userId,
      err,
    });
  }
}
