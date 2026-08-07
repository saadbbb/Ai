import { and, eq, inArray, max, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { type Contact, contacts, orders } from "@/db/schema";

export interface ChurnRiskCandidate {
  contact: Contact;
  lastOrderAt: Date | null;
}

const CUSTOMER_LIFECYCLE_STAGES = ["customer", "repeat_customer", "vip", "loyal_customer"] as const;

export const churnRiskRepository = {
  /** Every contact past the "lead" stage — i.e. someone who has actually bought something — with their most recent order date, if any. */
  async findCandidates(workspaceId: string): Promise<ChurnRiskCandidate[]> {
    const rows = await db
      .select({ contact: contacts, lastOrderAt: max(orders.createdAt) })
      .from(contacts)
      .leftJoin(orders, eq(orders.contactId, contacts.id))
      .where(and(eq(contacts.workspaceId, workspaceId), inArray(contacts.lifecycleStage, CUSTOMER_LIFECYCLE_STAGES)))
      .groupBy(contacts.id)
      .orderBy(sql`${contacts.lastContactAt} asc nulls first`);
    return rows;
  },
};
