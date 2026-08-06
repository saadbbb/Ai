import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  activities,
  auditLogs,
  conversations,
  invitations,
  messages,
  notes,
  tasks,
  type User,
  users,
  workspaceAuditLogs,
  workspaceMembers,
} from "@/db/schema";
import { workspaceService } from "@/features/workspace/services/workspace.service";
import { userRepository } from "../repository/user.repository";

/**
 * One-time re-key for accounts created before the Supabase Auth migration (see
 * PROJECT_GAP_ANALYSIS.md Phase 2): a pre-existing public.users row (old,
 * randomly-generated id, from the retired custom auth system) needs to end up
 * at the same id Supabase just assigned that email, since every other table's
 * userId FK is not translated anywhere else in the app.
 *
 * Runs as one transaction: free the email from the old row (unique constraint),
 * insert the new Supabase-linked row, repoint every FK that referenced the old
 * id, then delete the old row (its sessions cascade-delete with it — the
 * custom-auth session table is being retired regardless).
 */
async function reKeyUserId(oldId: string, newId: string, email: string): Promise<User> {
  return db.transaction(async (tx) => {
    await tx.update(users).set({ email: `migrated+${oldId}@invalid.local` }).where(eq(users.id, oldId));
    const [newUser] = await tx.insert(users).values({ id: newId, email, emailVerifiedAt: new Date() }).returning();

    await tx.update(workspaceMembers).set({ userId: newId }).where(eq(workspaceMembers.userId, oldId));
    await tx.update(activities).set({ actorUserId: newId }).where(eq(activities.actorUserId, oldId));
    await tx.update(auditLogs).set({ actorUserId: newId }).where(eq(auditLogs.actorUserId, oldId));
    await tx.update(workspaceAuditLogs).set({ actorUserId: newId }).where(eq(workspaceAuditLogs.actorUserId, oldId));
    await tx.update(conversations).set({ assignedUserId: newId }).where(eq(conversations.assignedUserId, oldId));
    await tx.update(invitations).set({ invitedByUserId: newId }).where(eq(invitations.invitedByUserId, oldId));
    await tx.update(messages).set({ senderUserId: newId }).where(eq(messages.senderUserId, oldId));
    await tx.update(notes).set({ authorUserId: newId }).where(eq(notes.authorUserId, oldId));
    await tx.update(tasks).set({ assignedToUserId: newId }).where(eq(tasks.assignedToUserId, oldId));
    await tx.update(tasks).set({ createdByUserId: newId }).where(eq(tasks.createdByUserId, oldId));

    await tx.delete(users).where(eq(users.id, oldId));

    return newUser;
  });
}

/**
 * The single place that turns "a Supabase-authenticated identity" into "a
 * public.users row workspace_members/roles/etc. can reference" — called by
 * requireUser() whenever a Supabase user has no matching local row yet.
 * Creates the workspace in the same beat as the local user row, since
 * Supabase now owns the credential/verification step that used to precede
 * completeRegistrationAction's workspace creation.
 */
async function ensureLocalUser(supabaseUserId: string, email: string): Promise<User> {
  const existingByEmail = await userRepository.findByEmail(email);
  if (existingByEmail) {
    if (existingByEmail.id === supabaseUserId) return existingByEmail;
    return reKeyUserId(existingByEmail.id, supabaseUserId, email);
  }

  const user = await userRepository.createFromSupabase(supabaseUserId, email);
  await workspaceService.createWorkspaceForNewUser(user.id, user.email);
  return user;
}

export const profileSyncService = {
  ensureLocalUser,
};
