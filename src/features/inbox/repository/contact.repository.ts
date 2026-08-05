import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { type Contact, contacts, type NewContact } from "@/db/schema";

export const contactRepository = {
  async findByWorkspaceId(workspaceId: string): Promise<Contact[]> {
    return db.select().from(contacts).where(eq(contacts.workspaceId, workspaceId)).orderBy(desc(contacts.createdAt));
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
