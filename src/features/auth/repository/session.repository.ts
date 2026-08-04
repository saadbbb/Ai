import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { type NewSession, type Session, sessions } from "@/db/schema";

export const sessionRepository = {
  async create(data: NewSession): Promise<Session> {
    const [session] = await db.insert(sessions).values(data).returning();
    return session;
  },

  async findById(id: string): Promise<Session | null> {
    const [session] = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
    return session ?? null;
  },

  async touch(id: string): Promise<void> {
    await db.update(sessions).set({ lastUsedAt: new Date() }).where(eq(sessions.id, id));
  },

  async deleteById(id: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.id, id));
  },

  async deleteAllForUser(userId: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.userId, userId));
  },
};
