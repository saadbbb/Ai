import { and, desc, eq, ilike, isNull, lt, notInArray, or } from "drizzle-orm";
import { db } from "@/db/client";
import { type Contact, contacts, type Lead, leads, type LeadStage, type NewLead } from "@/db/schema";

export interface LeadListItem {
  lead: Lead;
  contact: Contact;
}

const listSelection = { lead: leads, contact: contacts };
const CLOSED_LEAD_STAGES: LeadStage[] = ["won", "lost", "cancelled"];

export const leadRepository = {
  async findByWorkspaceId(workspaceId: string, search?: string): Promise<LeadListItem[]> {
    const trimmed = search?.trim();
    return db
      .select(listSelection)
      .from(leads)
      .innerJoin(contacts, eq(leads.contactId, contacts.id))
      .where(and(eq(leads.workspaceId, workspaceId), trimmed ? ilike(contacts.fullName, `%${trimmed}%`) : undefined))
      .orderBy(desc(leads.createdAt));
  },

  async findByContactId(contactId: string, workspaceId: string): Promise<Lead[]> {
    return db
      .select()
      .from(leads)
      .where(and(eq(leads.contactId, contactId), eq(leads.workspaceId, workspaceId)))
      .orderBy(desc(leads.createdAt));
  },

  async findByConversationId(conversationId: string, workspaceId: string): Promise<Lead | null> {
    const [lead] = await db
      .select()
      .from(leads)
      .where(and(eq(leads.conversationId, conversationId), eq(leads.workspaceId, workspaceId)))
      .limit(1);
    return lead ?? null;
  },

  async create(data: NewLead): Promise<Lead> {
    const [lead] = await db.insert(leads).values(data).returning();
    return lead;
  },

  async updateStage(id: string, workspaceId: string, stage: LeadStage): Promise<Lead | null> {
    const [lead] = await db
      .update(leads)
      .set({ stage, updatedAt: new Date() })
      .where(and(eq(leads.id, id), eq(leads.workspaceId, workspaceId)))
      .returning();
    return lead ?? null;
  },

  /**
   * Intentionally cross-tenant, unlike every other method here — only called by
   * the crm-followups cron (a trusted, secret-authenticated batch job that scans
   * every workspace once a day), which then processes each row with its own
   * correct workspaceId preserved. Same pattern as workspaceAdminRepository's
   * cron-only queries; never call this from a request handling one tenant.
   */
  async findStaleOpenLeads(staleContactBefore: Date, notifiedBefore: Date): Promise<LeadListItem[]> {
    return db
      .select(listSelection)
      .from(leads)
      .innerJoin(contacts, eq(leads.contactId, contacts.id))
      .where(
        and(
          notInArray(leads.stage, CLOSED_LEAD_STAGES),
          or(isNull(contacts.lastContactAt), lt(contacts.lastContactAt, staleContactBefore)),
          or(isNull(leads.lastFollowupNotifiedAt), lt(leads.lastFollowupNotifiedAt, notifiedBefore)),
        ),
      );
  },

  async markFollowupNotified(id: string): Promise<void> {
    await db.update(leads).set({ lastFollowupNotifiedAt: new Date() }).where(eq(leads.id, id));
  },
};
