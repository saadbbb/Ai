import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { type Role, roles } from "@/db/schema";

export const roleRepository = {
  async findByKey(key: string): Promise<Role | null> {
    const [role] = await db.select().from(roles).where(eq(roles.key, key)).limit(1);
    return role ?? null;
  },
};
