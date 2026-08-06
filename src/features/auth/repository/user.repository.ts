import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { type User, users } from "@/db/schema";

export const userRepository = {
  async findByEmail(email: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user ?? null;
  },

  async findById(id: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user ?? null;
  },

  /** id is the Supabase auth.users.id — kept identical here so every other table's userId FK needs no translation. */
  async createFromSupabase(id: string, email: string): Promise<User> {
    const [user] = await db.insert(users).values({ id, email, emailVerifiedAt: new Date() }).returning();
    return user;
  },

  /** Trivial real query used by the /api/health probe to confirm the Postgres pool actually works. */
  async pingHealth(): Promise<void> {
    await db.select({ id: users.id }).from(users).limit(1);
  },
};
