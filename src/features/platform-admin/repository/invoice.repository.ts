import { and, count, desc, eq, gte } from "drizzle-orm";
import { db } from "@/db/client";
import { type Currency, type Invoice, type InvoiceStatus, invoices, type NewInvoice, workspaces } from "@/db/schema";

export interface InvoiceWithWorkspace {
  invoice: Invoice;
  workspaceName: string;
}

export interface PaidInvoiceBasic {
  workspaceId: string;
  currency: Currency;
  amount: string;
  issuedAt: Date;
}

export const invoiceRepository = {
  async findByWorkspaceId(workspaceId: string): Promise<Invoice[]> {
    return db.select().from(invoices).where(eq(invoices.workspaceId, workspaceId)).orderBy(desc(invoices.issuedAt));
  },

  /** Used to populate the platform admin's refund picker — recent invoices across every tenant. */
  async findRecentWithWorkspace(limit = 200): Promise<InvoiceWithWorkspace[]> {
    const rows = await db
      .select({ invoice: invoices, workspaceName: workspaces.name })
      .from(invoices)
      .innerJoin(workspaces, eq(invoices.workspaceId, workspaces.id))
      .orderBy(desc(invoices.issuedAt))
      .limit(limit);
    return rows;
  },

  async findById(id: string, workspaceId: string): Promise<Invoice | null> {
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.workspaceId, workspaceId)))
      .limit(1);
    return invoice ?? null;
  },

  /** Platform-admin only (e.g. refunds) — not workspace-scoped, unlike findById above. */
  async findByIdAny(id: string): Promise<Invoice | null> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
    return invoice ?? null;
  },

  async create(data: NewInvoice): Promise<Invoice> {
    const [invoice] = await db.insert(invoices).values(data).returning();
    return invoice;
  },

  /** Feeds the next sequential invoice number — see invoice.service.ts for the formatting. */
  async countAll(): Promise<number> {
    const [row] = await db.select({ value: count() }).from(invoices);
    return row?.value ?? 0;
  },

  /** Feeds revenue.service.ts's new-vs-renewal split and LTV calculation. */
  async findAllPaidBasic(): Promise<PaidInvoiceBasic[]> {
    return db
      .select({ workspaceId: invoices.workspaceId, currency: invoices.currency, amount: invoices.amount, issuedAt: invoices.issuedAt })
      .from(invoices)
      .where(eq(invoices.status, "paid"));
  },

  async countByStatusSince(status: InvoiceStatus, since: Date): Promise<number> {
    const [row] = await db
      .select({ value: count() })
      .from(invoices)
      .where(and(eq(invoices.status, status), gte(invoices.issuedAt, since)));
    return row?.value ?? 0;
  },
};
