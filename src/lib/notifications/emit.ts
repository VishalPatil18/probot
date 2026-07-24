import { db, notifications } from "@/lib/db";

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
    console.warn("[notifications] emit failed", {
      kind: opts.kind,
      userId: opts.userId,
      err,
    });
  }
}
