import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { type AiInsights, aiInsights } from "@/db/schema";

export const insightsRepository = {
  async findByWorkspaceId(workspaceId: string): Promise<AiInsights | null> {
    const [row] = await db.select().from(aiInsights).where(eq(aiInsights.workspaceId, workspaceId)).limit(1);
    return row ?? null;
  },

  async upsert(workspaceId: string, insights: string[]): Promise<AiInsights> {
    const [row] = await db
      .insert(aiInsights)
      .values({ workspaceId, insights, generatedAt: new Date() })
      .onConflictDoUpdate({
        target: aiInsights.workspaceId,
        set: { insights, generatedAt: new Date() },
      })
      .returning();
    return row;
  },
};
