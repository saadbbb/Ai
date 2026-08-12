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
import { platformAdminService } from "@/features/platform-admin/services/platform-admin.service";
import { workspaceService } from "@/features/workspace/services/workspace.service";
import { emailService } from "@/lib/email";
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
 * Best-effort platform-admin heads-up on every real new signup (PART 9's
 * Admin Notifications example) — never blocks or fails registration; a
 * broken email provider shouldn't stop someone from signing up. Not sent
 * for the reKeyUserId migration path above, since that's an existing
 * account being re-keyed, not a new one.
 */
async function notifyAdminsOfNewSignup(workspaceName: string, ownerEmail: string): Promise<void> {
  try {
    const admins = await platformAdminService.listAssignableAdmins();
    await Promise.all(
      admins.map((admin) =>
        emailService
          .sendNotificationEmail({
            to: admin.email,
            subject: `New signup: "${workspaceName}"`,
            text: `A new workspace "${workspaceName}" was just created by ${ownerEmail}.`,
          })
          .catch((error) => console.error(`[profile-sync] admin signup email failed for ${admin.email}:`, error)),
      ),
    );
  } catch (error) {
    console.error("[profile-sync] admin signup notification failed:", error);
  }
}

/**
 * The single place that turns "a Supabase-authenticated identity" into "a
 * public.users row workspace_members/roles/etc. can reference" — called by
 * requireUser() whenever a Supabase user has no matching local row yet.
 * Creates the workspace in the same beat as the local user row, since
 * Supabase now owns the credential/verification step that used to precede
 * completeRegistrationAction's workspace creation.
 *
 * Identity is email OR phone (see users.ts) — phone accounts (see the phone
 * sign-up action) have no email at all, so there's nothing to re-key by; the
 * migration-era reKeyUserId path only applies to the email side.
 */
async function ensureLocalUser(
  supabaseUserId: string,
  identity: { email?: string | null; phone?: string | null },
): Promise<User> {
  // Supabase's User object uses "" (not null) for whichever of email/phone wasn't
  // used to sign up — normalize here too so nothing downstream treats "" as a real value.
  const email = identity.email || null;
  const phone = identity.phone || null;

  if (email) {
    const existingByEmail = await userRepository.findByEmail(email);
    if (existingByEmail) {
      if (existingByEmail.id === supabaseUserId) return existingByEmail;
      return reKeyUserId(existingByEmail.id, supabaseUserId, email);
    }
  } else if (phone) {
    const existingByPhone = await userRepository.findByPhone(phone);
    if (existingByPhone) return existingByPhone;
  }

  const user = await userRepository.createFromSupabase(supabaseUserId, { email, phone });
  const workspace = await workspaceService.createWorkspaceForNewUser(user.id, user.email ?? user.phone ?? user.id);
  // Awaited, not fire-and-forget — a serverless function can be frozen/killed
  // right after returning, so a detached promise here risks silently never
  // running. The try/catch inside already guarantees this can't fail registration.
  await notifyAdminsOfNewSignup(workspace.name, user.email ?? user.phone ?? "unknown");
  return user;
}

export const profileSyncService = {
  ensureLocalUser,
};
