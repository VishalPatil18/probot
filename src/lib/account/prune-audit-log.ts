import { lt } from "drizzle-orm";

import { db, decryptAuditLog } from "@/lib/db";

// Cleanup: the decrypt audit log is documented as 30-day
// retention. Read queries already enforce the window so the dashboard
// payload size is bounded; this delete keeps the DB itself from growing
// unboundedly.

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export async function pruneOldAuditLogs(): Promise<{ deleted: number }> {
  const cutoff = new Date(Date.now() - RETENTION_MS);
  const removed = await db
    .delete(decryptAuditLog)
    .where(lt(decryptAuditLog.decryptedAt, cutoff))
    .returning({ id: decryptAuditLog.id });
  return { deleted: removed.length };
}
