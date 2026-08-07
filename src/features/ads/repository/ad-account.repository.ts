import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { type AdAccount, adAccounts, type NewAdAccount } from "@/db/schema";

export const adAccountRepository = {
  async findByWorkspaceId(workspaceId: string): Promise<AdAccount | null> {
    const [row] = await db.select().from(adAccounts).where(eq(adAccounts.workspaceId, workspaceId)).limit(1);
    return row ?? null;
  },

  async create(data: NewAdAccount): Promise<AdAccount> {
    const [row] = await db.insert(adAccounts).values(data).returning();
    return row;
  },
};
