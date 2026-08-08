import "server-only";
import type { Note, NoteType } from "@/db/schema";
import { contactRepository } from "@/features/inbox/repository/contact.repository";
import { notificationRepository } from "@/features/notifications/repository/notification.repository";
import { membershipRepository } from "@/features/workspace/repository/membership.repository";
import { AppError } from "@/lib/errors/app-error";
import { activityRepository } from "../repository/activity.repository";
import { extractMentionTokens } from "../lib/mentions";
import { noteRepository } from "../repository/note.repository";

interface CreateNoteInput {
  contactId: string;
  content: string;
  pinned: boolean;
  type: Exclude<NoteType, "ai">;
}

async function listNotesForContact(workspaceId: string, contactId: string, viewerUserId: string): Promise<Note[]> {
  return noteRepository.findByContactId(contactId, workspaceId, viewerUserId);
}

async function createNote(workspaceId: string, userId: string, input: CreateNoteInput): Promise<Note> {
  const contact = await contactRepository.findById(input.contactId, workspaceId);
  if (!contact) {
    throw new AppError("NOT_FOUND", "Contact not found.");
  }

  const note = await noteRepository.create({
    workspaceId,
    contactId: input.contactId,
    content: input.content,
    pinned: input.pinned,
    type: input.type,
    authorUserId: userId,
  });

  await activityRepository.log({
    workspaceId,
    contactId: input.contactId,
    type: "note_added",
    actor: { type: "human", userId },
    summary: "Note added.",
  });

  await notifyMentionedMembers(workspaceId, input.contactId, input.content, contact.fullName);

  return note;
}

/** PART 4's Notifications "mention" trigger — @token in a note matched against a workspace member's email local-part. */
async function notifyMentionedMembers(workspaceId: string, contactId: string, content: string, contactName: string): Promise<void> {
  const tokens = extractMentionTokens(content);
  if (tokens.length === 0) return;

  const members = await membershipRepository.findMembersByWorkspaceId(workspaceId);
  const mentioned = members.filter(({ user }) => tokens.includes(user.email.split("@")[0].toLowerCase()));

  for (const { user } of mentioned) {
    await notificationRepository.create({
      workspaceId,
      type: "mention",
      title: `You were mentioned: ${contactName}`,
      message: `${user.email} was mentioned in a note about ${contactName}.`,
      link: `/dashboard/contacts/${contactId}`,
    });
  }
}

async function deleteNote(workspaceId: string, noteId: string): Promise<void> {
  await noteRepository.delete(noteId, workspaceId);
}

export const noteService = {
  listNotesForContact,
  createNote,
  deleteNote,
};
