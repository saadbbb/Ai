import "server-only";
import type { Note } from "@/db/schema";
import { activityRepository } from "../repository/activity.repository";
import { noteRepository } from "../repository/note.repository";

interface CreateNoteInput {
  contactId: string;
  content: string;
  pinned: boolean;
}

async function listNotesForContact(workspaceId: string, contactId: string): Promise<Note[]> {
  return noteRepository.findByContactId(contactId, workspaceId);
}

async function createNote(workspaceId: string, userId: string, input: CreateNoteInput): Promise<Note> {
  const note = await noteRepository.create({
    workspaceId,
    contactId: input.contactId,
    content: input.content,
    pinned: input.pinned,
    authorUserId: userId,
  });

  await activityRepository.log({
    workspaceId,
    contactId: input.contactId,
    type: "note_added",
    actor: { type: "human", userId },
    summary: "Note added.",
  });

  return note;
}

async function deleteNote(workspaceId: string, noteId: string): Promise<void> {
  await noteRepository.delete(noteId, workspaceId);
}

export const noteService = {
  listNotesForContact,
  createNote,
  deleteNote,
};
