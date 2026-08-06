import { and, count, desc, eq, gte } from "drizzle-orm";
import { db } from "@/db/client";
import { aiUsage, type AiUsage, type NewAiUsage } from "@/db/schema";

function startOfToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export const aiUsageRepository = {
  async create(data: NewAiUsage): Promise<void> {
    await db.insert(aiUsage).values(data);
  },

  async countTodayByWorkspace(workspaceId: string): Promise<number> {
    const [row] = await db
      .select({ count: count() })
      .from(aiUsage)
      .where(and(eq(aiUsage.workspaceId, workspaceId), gte(aiUsage.createdAt, startOfToday())));
    return row?.count ?? 0;
  },

  /**
   * Feeds the tenant-facing AI Usage CSV report. Callers must never surface
   * `provider`/`model` from the returned rows to the tenant — see PART 13B's
   * "No AI Terminology" rule; those two columns exist for Super Admin only.
   */
  async findByWorkspaceId(workspaceId: string): Promise<AiUsage[]> {
    return db.select().from(aiUsage).where(eq(aiUsage.workspaceId, workspaceId)).orderBy(desc(aiUsage.createdAt));
  },
};
