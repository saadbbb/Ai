import { desc } from "drizzle-orm";
import { db } from "@/db/client";
import { type AuditAction, type AuditLog, auditLogs } from "@/db/schema";

interface LogAuditEventInput {
  actorUserId: string;
  actorEmail: string;
  action: AuditAction;
  targetType: string;
  targetId?: string;
  summary: string;
  metadata?: Record<string, unknown>;
}

const RECENT_LIMIT = 200;

export const auditLogRepository = {
  async log(input: LogAuditEventInput): Promise<void> {
    await db.insert(auditLogs).values({
      actorUserId: input.actorUserId,
      actorEmail: input.actorEmail,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      summary: input.summary,
      metadata: input.metadata ?? null,
    });
  },

  async findRecent(): Promise<AuditLog[]> {
    return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(RECENT_LIMIT);
  },
};
