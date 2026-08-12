import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { type NewUser, type User, users } from "@/db/schema";

export const userRepository = {
  async update(id: string, data: Partial<Pick<NewUser, "name" | "theme">>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  },

  async findByEmail(email: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user ?? null;
  },

  async findByPhone(phone: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
    return user ?? null;
  },

  async findById(id: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user ?? null;
  },

  /**
   * id is the Supabase auth.users.id — kept identical here so every other table's userId FK
   * needs no translation. Exactly one of email/phone is expected (see users.ts's comment) —
   * email accounts get emailVerifiedAt stamped immediately since Supabase already confirmed
   * it before this runs; phone accounts have no equivalent verification step to record.
   */
  async createFromSupabase(id: string, identity: { email?: string | null; phone?: string | null }): Promise<User> {
    // Supabase's user object uses "" (not null) for whichever of email/phone wasn't
    // used to sign up — `?? null` doesn't catch that, so every email/Google signup
    // was inserting phone: "" here. Since phone is unique, only the very first such
    // user ever succeeded; every signup after that hit a duplicate-key violation on
    // the empty string and crashed. `|| null` normalizes "" to null like email needs too.
    const [user] = await db
      .insert(users)
      .values({
        id,
        email: identity.email || null,
        phone: identity.phone || null,
        emailVerifiedAt: identity.email ? new Date() : null,
      })
      .returning();
    return user;
  },

  /** Trivial real query used by the /api/health probe to confirm the Postgres pool actually works. */
  async pingHealth(): Promise<void> {
    await db.select({ id: users.id }).from(users).limit(1);
  },
};
