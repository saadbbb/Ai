import { eq } from "drizzle-orm";
import { businessPolicies, type BusinessPolicy, type NewBusinessPolicy } from "@/db/schema";
import { db } from "@/db/client";

export const policyRepository = {
  async findByWorkspaceId(workspaceId: string): Promise<BusinessPolicy | null> {
    const [policy] = await db
      .select()
      .from(businessPolicies)
      .where(eq(businessPolicies.workspaceId, workspaceId))
      .limit(1);
    return policy ?? null;
  },

  async upsert(data: NewBusinessPolicy): Promise<BusinessPolicy> {
    const [policy] = await db
      .insert(businessPolicies)
      .values(data)
      .onConflictDoUpdate({
        target: businessPolicies.workspaceId,
        set: {
          shippingPolicy: data.shippingPolicy,
          returnsPolicy: data.returnsPolicy,
          paymentsPolicy: data.paymentsPolicy,
          updatedAt: new Date(),
        },
      })
      .returning();
    return policy;
  },
};
