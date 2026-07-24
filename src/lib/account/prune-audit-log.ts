import { lt } from "drizzle-orm";

import { db, decryptAuditLog } from "@/lib/db";

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export async function pruneOldAuditLogs(): Promise<{ deleted: number }> {
  const cutoff = new Date(Date.now() - RETENTION_MS);
  const removed = await db
    .delete(decryptAuditLog)
    .where(lt(decryptAuditLog.decryptedAt, cutoff))
    .returning({ id: decryptAuditLog.id });
  return { deleted: removed.length };
}
