import { and, count, eq, gte } from "drizzle-orm";
import { db } from "@/db/client";
import { aiUsage, type NewAiUsage } from "@/db/schema";

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
};
