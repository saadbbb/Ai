import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { type WorkspaceAuditAction, type WorkspaceAuditLog, workspaceAuditLogs } from "@/db/schema";

interface LogWorkspaceAuditEventInput {
  workspaceId: string;
  actorUserId: string;
  actorEmail: string;
  action: WorkspaceAuditAction;
  targetType: string;
  targetId?: string;
  summary: string;
  metadata?: Record<string, unknown>;
}

const RECENT_LIMIT = 200;

export const workspaceAuditLogRepository = {
  async log(input: LogWorkspaceAuditEventInput): Promise<void> {
    await db.insert(workspaceAuditLogs).values({
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      actorEmail: input.actorEmail,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      summary: input.summary,
      metadata: input.metadata ?? null,
    });
  },

  async findRecentForWorkspace(workspaceId: string): Promise<WorkspaceAuditLog[]> {
    return db
      .select()
      .from(workspaceAuditLogs)
      .where(eq(workspaceAuditLogs.workspaceId, workspaceId))
      .orderBy(desc(workspaceAuditLogs.createdAt))
      .limit(RECENT_LIMIT);
  },
};
