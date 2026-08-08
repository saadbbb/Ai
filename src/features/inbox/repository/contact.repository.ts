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

  /** Used to dedupe a returning visitor on the public storefront inquiry form — phone is the only reliable identifier a public form can collect. */
  async findByPhone(phone: string, workspaceId: string): Promise<Contact | null> {
    const [contact] = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.phone, phone), eq(contacts.workspaceId, workspaceId)))
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
        | "address"
        | "budget"
        | "preferredContactMethod"
        | "preferredProducts"
        | "birthDate"
        | "gender"
        | "timezone"
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

  async updateLifecycleStage(id: string, workspaceId: string, lifecycleStage: ContactLifecycleStage): Promise<Contact | null> {
    const [contact] = await db
      .update(contacts)
      .set({ lifecycleStage, updatedAt: new Date() })
      .where(and(eq(contacts.id, id), eq(contacts.workspaceId, workspaceId)))
      .returning();
    return contact ?? null;
  },

  async updateAiSummary(id: string, workspaceId: string, aiSummary: string): Promise<void> {
    await db
      .update(contacts)
      .set({ aiSummary, updatedAt: new Date() })
      .where(and(eq(contacts.id, id), eq(contacts.workspaceId, workspaceId)));
  },

  /**
   * A single atomic UPDATE instead of read-modify-write — Postgres re-evaluates
   * the SET expression against the row's current value under the row lock the
   * UPDATE itself takes, so two concurrent addTag calls for the same contact
   * can never silently drop one of them (the read-then-write version could).
   */
  async addTag(id: string, workspaceId: string, tag: string): Promise<void> {
    const tagAsJsonArray = JSON.stringify([tag]);
    await db
      .update(contacts)
      .set({
        tags: sql`case when ${contacts.tags} @> ${tagAsJsonArray}::jsonb then ${contacts.tags} else ${contacts.tags} || ${tagAsJsonArray}::jsonb end`,
        updatedAt: new Date(),
      })
      .where(and(eq(contacts.id, id), eq(contacts.workspaceId, workspaceId)));
  },

  /** Same atomicity rationale as addTag — the jsonb `-` operator removes a matching array element in one statement. */
  async removeTag(id: string, workspaceId: string, tag: string): Promise<void> {
    await db
      .update(contacts)
      .set({
        tags: sql`${contacts.tags} - ${tag}::text`,
        updatedAt: new Date(),
      })
      .where(and(eq(contacts.id, id), eq(contacts.workspaceId, workspaceId)));
  },
};
