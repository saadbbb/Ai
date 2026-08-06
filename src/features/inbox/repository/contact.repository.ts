import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { type Contact, type ContactLifecycleStage, contacts, type NewContact } from "@/db/schema";

export interface ContactFilters {
  search?: string;
  lifecycleStage?: ContactLifecycleStage;
  source?: string;
  tag?: string;
}

export const contactRepository = {
  async findByWorkspaceId(workspaceId: string, filters?: ContactFilters): Promise<Contact[]> {
    const trimmed = filters?.search?.trim();
    const pattern = trimmed ? `%${trimmed}%` : undefined;
    return db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.workspaceId, workspaceId),
          pattern ? or(ilike(contacts.fullName, pattern), ilike(contacts.phone, pattern), ilike(contacts.email, pattern)) : undefined,
          filters?.lifecycleStage ? eq(contacts.lifecycleStage, filters.lifecycleStage) : undefined,
          filters?.source ? eq(contacts.source, filters.source) : undefined,
          filters?.tag ? sql`${contacts.tags} @> ${JSON.stringify([filters.tag])}` : undefined,
        ),
      )
      .orderBy(desc(contacts.createdAt));
  },

  async findById(id: string, workspaceId: string): Promise<Contact | null> {
    const [contact] = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.id, id), eq(contacts.workspaceId, workspaceId)))
      .limit(1);
    return contact ?? null;
  },

  async create(data: NewContact): Promise<Contact> {
    const [contact] = await db.insert(contacts).values(data).returning();
    return contact;
  },

  async touchLastContact(id: string, workspaceId: string): Promise<void> {
    await db
      .update(contacts)
      .set({ lastContactAt: new Date(), updatedAt: new Date() })
      .where(and(eq(contacts.id, id), eq(contacts.workspaceId, workspaceId)));
  },

  async update(
    id: string,
    workspaceId: string,
    data: Partial<
      Pick<
        NewContact,
        | "fullName"
        | "phone"
        | "email"
        | "language"
        | "avatarUrl"
        | "country"
        | "city"
        | "source"
        | "assignedAgentId"
      >
    >,
  ): Promise<Contact | null> {
    const [contact] = await db
      .update(contacts)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(contacts.id, id), eq(contacts.workspaceId, workspaceId)))
      .returning();
    return contact ?? null;
  },

  async updateLifecycleStage(id: string, workspaceId: string, lifecycleStage: ContactLifecycleStage): Promise<void> {
    await db
      .update(contacts)
      .set({ lifecycleStage, updatedAt: new Date() })
      .where(and(eq(contacts.id, id), eq(contacts.workspaceId, workspaceId)));
  },

  async updateAiSummary(id: string, workspaceId: string, aiSummary: string): Promise<void> {
    await db
      .update(contacts)
      .set({ aiSummary, updatedAt: new Date() })
      .where(and(eq(contacts.id, id), eq(contacts.workspaceId, workspaceId)));
  },

  async addTag(id: string, workspaceId: string, tag: string): Promise<void> {
    const [contact] = await db
      .select({ tags: contacts.tags })
      .from(contacts)
      .where(and(eq(contacts.id, id), eq(contacts.workspaceId, workspaceId)))
      .limit(1);
    if (!contact || contact.tags.includes(tag)) return;

    await db
      .update(contacts)
      .set({ tags: [...contact.tags, tag], updatedAt: new Date() })
      .where(and(eq(contacts.id, id), eq(contacts.workspaceId, workspaceId)));
  },

  async removeTag(id: string, workspaceId: string, tag: string): Promise<void> {
    const [contact] = await db
      .select({ tags: contacts.tags })
      .from(contacts)
      .where(and(eq(contacts.id, id), eq(contacts.workspaceId, workspaceId)))
      .limit(1);
    if (!contact || !contact.tags.includes(tag)) return;

    await db
      .update(contacts)
      .set({
        tags: contact.tags.filter((existing) => existing !== tag),
        updatedAt: new Date(),
      })
      .where(and(eq(contacts.id, id), eq(contacts.workspaceId, workspaceId)));
  },
};
