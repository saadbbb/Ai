"use server";

import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { noteService } from "../services/note.service";
import { deleteNoteSchema } from "../validation/schemas";

export async function deleteNoteAction(input: unknown): Promise<ActionResult<undefined>> {
  const parsed = deleteNoteSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);

  try {
    await noteService.deleteNote(workspace.id, parsed.data.noteId);
    return actionOk(undefined);
  } catch (error) {
    return actionFail(error);
  }
}
