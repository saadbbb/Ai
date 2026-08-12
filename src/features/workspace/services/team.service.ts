import "server-only";
import { createHash, randomBytes } from "crypto";
import type { Invitation, Role, User, Workspace } from "@/db/schema";
import { emailService } from "@/lib/email";
import { getAppUrl } from "@/lib/env";
import { AppError } from "@/lib/errors/app-error";
import { type InvitationListItem, invitationRepository } from "../repository/invitation.repository";
import { type MemberListItem, membershipRepository } from "../repository/membership.repository";
import { roleRepository } from "../repository/role.repository";
import { workspaceAuditLogRepository } from "../repository/workspace-audit-log.repository";
import { workspaceRepository } from "../repository/workspace.repository";

const INVITATION_TTL_DAYS = 7;

/** Who performed a team-management action — logged to the workspace's own audit trail. */
interface AuditActor {
  userId: string;
  name: string | null;
  email: string | null;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

async function getTeam(
  workspaceId: string,
): Promise<{ members: MemberListItem[]; invitations: InvitationListItem[]; roles: Role[] }> {
  const [members, invitations, roles] = await Promise.all([
    membershipRepository.findMembersByWorkspaceId(workspaceId),
    invitationRepository.findByWorkspaceId(workspaceId),
    roleRepository.findAll(),
  ]);
  return { members, invitations, roles };
}

/**
 * Doesn't throw on email failure — the invite link is still valid and shown
 * on-screen, so a broken/sandboxed email provider (see DEFERRED_TASKS.md)
 * never blocks actually inviting someone.
 */
async function inviteMember(
  workspace: Workspace,
  actor: AuditActor,
  email: string,
  roleId: string,
): Promise<{ invitation: Invitation; link: string }> {
  const targetRole = await roleRepository.findById(roleId);
  if (!targetRole) throw new AppError("VALIDATION_ERROR", "That role doesn't exist.");
  if (targetRole.key === "owner") {
    throw new AppError("VALIDATION_ERROR", "The owner role can't be assigned through an invitation.");
  }

  const existingInvite = await invitationRepository.findPendingByEmail(workspace.id, email);
  if (existingInvite) {
    throw new AppError("VALIDATION_ERROR", "This email already has a pending invitation.");
  }

  const token = generateToken();
  const invitation = await invitationRepository.create({
    workspaceId: workspace.id,
    email,
    roleId,
    invitedByUserId: actor.userId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000),
  });

  const link = `${getAppUrl()}/invitations/accept?token=${token}`;

  try {
    await emailService.sendNotificationEmail({
      to: email,
      subject: `You've been invited to join ${workspace.name}`,
      text: `Hi,\n\nYou've been invited to join "${workspace.name}" on the AI Employee Platform.\n\nAccept the invitation: ${link}\n\nThis link expires in ${INVITATION_TTL_DAYS} days.`,
    });
  } catch (error) {
    console.error("[team] invitation email failed:", error);
  }

  await workspaceAuditLogRepository.log({
    workspaceId: workspace.id,
    actorUserId: actor.userId,
    actorEmail: actor.name ?? actor.email ?? "Unknown",
    action: "member_invited",
    targetType: "invitation",
    targetId: invitation.id,
    summary: `Invited ${email} to the workspace`,
    metadata: { roleId },
  });

  return { invitation, link };
}

async function revokeInvitation(workspaceId: string, invitationId: string, actor: AuditActor): Promise<void> {
  const updated = await invitationRepository.updateStatus(invitationId, workspaceId, "revoked");
  if (!updated) throw new AppError("NOT_FOUND", "Invitation not found.");

  await workspaceAuditLogRepository.log({
    workspaceId,
    actorUserId: actor.userId,
    actorEmail: actor.name ?? actor.email ?? "Unknown",
    action: "invitation_revoked",
    targetType: "invitation",
    targetId: invitationId,
    summary: `Revoked invitation for ${updated.email}`,
  });
}

async function updateMemberRole(workspaceId: string, memberId: string, roleId: string, actor: AuditActor): Promise<void> {
  const members = await membershipRepository.findMembersByWorkspaceId(workspaceId);
  const target = members.find((item) => item.member.id === memberId);
  if (!target) throw new AppError("NOT_FOUND", "Member not found.");
  if (target.role.key === "owner") throw new AppError("VALIDATION_ERROR", "The workspace owner's role can't be changed.");

  const newRole = await roleRepository.findById(roleId);
  if (!newRole) throw new AppError("VALIDATION_ERROR", "That role doesn't exist.");
  if (newRole.key === "owner") {
    throw new AppError("VALIDATION_ERROR", "Ownership can't be granted by changing a member's role.");
  }

  await membershipRepository.updateRole(memberId, workspaceId, roleId);
  await workspaceAuditLogRepository.log({
    workspaceId,
    actorUserId: actor.userId,
    actorEmail: actor.name ?? actor.email ?? "Unknown",
    action: "member_role_changed",
    targetType: "workspace_member",
    targetId: memberId,
    summary: `Changed ${target.user.email}'s role from ${target.role.name} to ${newRole?.name ?? roleId}`,
    metadata: { previousRoleId: target.role.id, newRoleId: roleId },
  });
}

async function removeMember(workspaceId: string, memberId: string, actor: AuditActor): Promise<void> {
  const members = await membershipRepository.findMembersByWorkspaceId(workspaceId);
  const target = members.find((item) => item.member.id === memberId);
  if (!target) throw new AppError("NOT_FOUND", "Member not found.");
  if (target.role.key === "owner") throw new AppError("VALIDATION_ERROR", "The workspace owner can't be removed.");

  await membershipRepository.remove(memberId, workspaceId);

  await workspaceAuditLogRepository.log({
    workspaceId,
    actorUserId: actor.userId,
    actorEmail: actor.name ?? actor.email ?? "Unknown",
    action: "member_removed",
    targetType: "workspace_member",
    targetId: memberId,
    summary: `Removed ${target.user.email} from the workspace`,
  });
}

export type InvitationPreviewStatus = "valid" | "not_found" | "expired" | "already_used";

export interface InvitationPreview {
  status: InvitationPreviewStatus;
  workspaceName?: string;
  roleName?: string;
  invitedEmail?: string;
}

/** Read-only lookup for the accept page — never mutates, so link previews/crawlers can't side-effect it. */
async function getInvitationPreview(token: string): Promise<InvitationPreview> {
  const invitation = await invitationRepository.findByTokenHash(hashToken(token));
  if (!invitation) return { status: "not_found" };
  if (invitation.status !== "pending") return { status: "already_used" };
  if (invitation.expiresAt.getTime() < Date.now()) return { status: "expired" };

  const [workspace, role] = await Promise.all([
    workspaceRepository.findById(invitation.workspaceId),
    roleRepository.findById(invitation.roleId),
  ]);

  return {
    status: "valid",
    workspaceName: workspace?.name,
    roleName: role?.name,
    invitedEmail: invitation.email,
  };
}

async function acceptInvitation(token: string, user: User): Promise<{ workspaceId: string }> {
  const invitation = await invitationRepository.findByTokenHash(hashToken(token));
  if (!invitation) throw new AppError("NOT_FOUND", "This invitation link is invalid.");
  if (invitation.status !== "pending") throw new AppError("VALIDATION_ERROR", "This invitation is no longer valid.");
  if (invitation.expiresAt.getTime() < Date.now()) {
    throw new AppError("VALIDATION_ERROR", "This invitation has expired.");
  }
  if (!user.email || invitation.email.toLowerCase() !== user.email.toLowerCase()) {
    throw new AppError("VALIDATION_ERROR", "This invitation was sent to a different email address.");
  }

  const existingMembership = await membershipRepository.findByUserAndWorkspace(user.id, invitation.workspaceId);
  if (!existingMembership) {
    await membershipRepository.create({ workspaceId: invitation.workspaceId, userId: user.id, roleId: invitation.roleId });
  }
  await invitationRepository.markAccepted(invitation.id);

  return { workspaceId: invitation.workspaceId };
}

export const teamService = {
  getTeam,
  inviteMember,
  revokeInvitation,
  updateMemberRole,
  removeMember,
  getInvitationPreview,
  acceptInvitation,
};
