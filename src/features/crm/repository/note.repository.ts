import { and, desc, eq, ne, or } from "drizzle-orm";
import { db } from "@/db/client";
import { type NewNote, type Note, notes } from "@/db/schema";

export const noteRepository = {
  /** `viewerUserId` filters out other people's private notes — pass it whenever the result reaches a UI. */
  async findByContactId(contactId: string, workspaceId: string, viewerUserId?: string): Promise<Note[]> {
    return db
      .select()
      .from(notes)
      .where(
        and(
          eq(notes.contactId, contactId),
          eq(notes.workspaceId, workspaceId),
          viewerUserId
            ? or(ne(notes.type, "private"), eq(notes.authorUserId, viewerUserId))
            : undefined,
        ),
      )
      .orderBy(desc(notes.pinned), desc(notes.createdAt));
  },

  async create(data: NewNote): Promise<Note> {
    const [note] = await db.insert(notes).values(data).returning();
    return note;
  },

  async delete(id: string, workspaceId: string): Promise<void> {
    await db.delete(notes).where(and(eq(notes.id, id), eq(notes.workspaceId, workspaceId)));
  },
};
