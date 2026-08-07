import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { type ApiKey, apiKeys, type NewApiKey } from "@/db/schema";

export const apiKeyRepository = {
  async findByWorkspaceId(workspaceId: string): Promise<ApiKey[]> {
    return db.select().from(apiKeys).where(eq(apiKeys.workspaceId, workspaceId)).orderBy(desc(apiKeys.createdAt));
  },

  async create(data: Pick<NewApiKey, "workspaceId" | "name" | "keyPrefix" | "keyHash">): Promise<ApiKey> {
    const [row] = await db.insert(apiKeys).values(data).returning();
    return row;
  },

  async revoke(id: string, workspaceId: string): Promise<ApiKey | null> {
    const [row] = await db
      .update(apiKeys)
      .set({ revokedAt: new Date() })
      .where(and(eq(apiKeys.id, id), eq(apiKeys.workspaceId, workspaceId)))
      .returning();
    return row ?? null;
  },

  /** Public-API auth lookup — only ever matches a non-revoked key, regardless of workspace. */
  async findActiveByHash(hash: string): Promise<ApiKey | null> {
    const [row] = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.keyHash, hash), isNull(apiKeys.revokedAt)))
      .limit(1);
    return row ?? null;
  },

  async touchLastUsed(id: string): Promise<void> {
    await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, id));
  },
};
