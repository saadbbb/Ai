import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { type AiAgent, aiAgents, type NewAiAgent } from "@/db/schema";

export const aiAgentRepository = {
  async create(data: NewAiAgent): Promise<AiAgent> {
    const [agent] = await db.insert(aiAgents).values(data).returning();
    return agent;
  },

  async findByWorkspaceId(workspaceId: string): Promise<AiAgent | null> {
    const [agent] = await db.select().from(aiAgents).where(eq(aiAgents.workspaceId, workspaceId)).limit(1);
    return agent ?? null;
  },

  async update(workspaceId: string, data: Partial<Omit<NewAiAgent, "workspaceId">>): Promise<AiAgent> {
    const [agent] = await db
      .update(aiAgents)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(aiAgents.workspaceId, workspaceId))
      .returning();
    return agent;
  },
};
