import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { type NewPlan, type Plan, plans } from "@/db/schema";

export const planRepository = {
  async findAll(): Promise<Plan[]> {
    return db.select().from(plans).orderBy(plans.createdAt);
  },

  async findById(id: string): Promise<Plan | null> {
    const [plan] = await db.select().from(plans).where(eq(plans.id, id)).limit(1);
    return plan ?? null;
  },

  async create(data: NewPlan): Promise<Plan> {
    const [plan] = await db.insert(plans).values(data).returning();
    return plan;
  },

  async update(id: string, data: Partial<Omit<NewPlan, "id">>): Promise<Plan | null> {
    const [plan] = await db
      .update(plans)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(plans.id, id))
      .returning();
    return plan ?? null;
  },

  async delete(id: string): Promise<void> {
    await db.delete(plans).where(eq(plans.id, id));
  },
};
