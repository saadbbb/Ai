import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { type NewRefund, type Refund, refunds, workspaces } from "@/db/schema";

export interface RefundWithWorkspace {
  refund: Refund;
  workspaceName: string;
}

export const refundRepository = {
  async findAllWithWorkspace(): Promise<RefundWithWorkspace[]> {
    const rows = await db
      .select({ refund: refunds, workspaceName: workspaces.name })
      .from(refunds)
      .innerJoin(workspaces, eq(refunds.workspaceId, workspaces.id))
      .orderBy(desc(refunds.createdAt));
    return rows;
  },

  async findById(id: string): Promise<Refund | null> {
    const [refund] = await db.select().from(refunds).where(eq(refunds.id, id)).limit(1);
    return refund ?? null;
  },

  async findByInvoiceId(invoiceId: string): Promise<Refund[]> {
    return db.select().from(refunds).where(eq(refunds.invoiceId, invoiceId));
  },

  async create(data: NewRefund): Promise<Refund> {
    const [refund] = await db.insert(refunds).values(data).returning();
    return refund;
  },

  async updateStatus(id: string, status: Refund["status"], decidedAt: Date): Promise<Refund | null> {
    const [refund] = await db.update(refunds).set({ status, decidedAt }).where(eq(refunds.id, id)).returning();
    return refund ?? null;
  },
};
