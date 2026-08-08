"use server";

import type { Note } from "@/db/schema";
import { requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { noteService } from "../services/note.service";
import { createNoteSchema } from "../validation/schemas";

export async function createNoteAction(input: unknown): Promise<ActionResult<Note>> {
  const parsed = createNoteSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireWorkspacePermission(user.id, workspace.id, "crm.records.manage");

  try {
    const note = await noteService.createNote(workspace.id, user.id, parsed.data);
    return actionOk(note);
  } catch (error) {
    return actionFail(error);
  }
}
