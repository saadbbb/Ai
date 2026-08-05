import { db } from "@/db/client";
import { aiToolExecutions, type NewAiToolExecution } from "@/db/schema";

export const toolExecutionRepository = {
  async create(data: NewAiToolExecution): Promise<void> {
    await db.insert(aiToolExecutions).values(data);
  },
};
