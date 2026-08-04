import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { type NewUser, type User, users } from "@/db/schema";

export const userRepository = {
  async findByEmail(email: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user ?? null;
  },

  async findById(id: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user ?? null;
  },

  async create(data: NewUser): Promise<User> {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  },

  async setPasswordAndVerify(userId: string, passwordHash: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ passwordHash, emailVerifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  },

  async setPassword(userId: string, passwordHash: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  },
};
