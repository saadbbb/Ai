import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Role, User, Workspace } from "@/db/schema";
import type { MemberListItem } from "../repository/membership.repository";

vi.mock("@/lib/email", () => ({
  emailService: { sendNotificationEmail: vi.fn() },
}));

vi.mock("../repository/invitation.repository", () => ({
  invitationRepository: {
    findPendingByEmail: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
    findByWorkspaceId: vi.fn(),
    findByTokenHash: vi.fn(),
    markAccepted: vi.fn(),
  },
}));

vi.mock("../repository/membership.repository", () => ({
  membershipRepository: {
    findMembersByWorkspaceId: vi.fn(),
    updateRole: vi.fn(),
    remove: vi.fn(),
    findByUserAndWorkspace: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("../repository/role.repository", () => ({
  roleRepository: { findById: vi.fn(), findByKey: vi.fn(), findAll: vi.fn() },
}));

vi.mock("../repository/workspace-audit-log.repository", () => ({
  workspaceAuditLogRepository: { log: vi.fn() },
}));

vi.mock("../repository/workspace.repository", () => ({
  workspaceRepository: { findById: vi.fn() },
}));

const { invitationRepository } = await import("../repository/invitation.repository");
const { membershipRepository } = await import("../repository/membership.repository");
const { roleRepository } = await import("../repository/role.repository");
const { workspaceAuditLogRepository } = await import("../repository/workspace-audit-log.repository");
const { teamService } = await import("./team.service");

const WORKSPACE: Workspace = { id: "workspace-1" } as Workspace;
const ACTOR = { userId: "actor-1", email: "actor@example.com" };

function makeRole(overrides: Partial<Role> = {}): Role {
  return {
    id: "role-manager",
    key: "manager",
    name: "Manager",
    description: null,
    isSystem: true,
    createdAt: new Date(),
    ...overrides,
  };
}

const OWNER_ROLE = makeRole({ id: "role-owner", key: "owner", name: "Owner" });

function makeMember(overrides: Partial<MemberListItem> = {}): MemberListItem {
  return {
    member: { id: "member-1", workspaceId: WORKSPACE.id, userId: "user-1", roleId: "role-manager", joinedAt: new Date() },
    user: { id: "user-1", email: "member@example.com" } as User,
    role: makeRole(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("teamService.inviteMember (owner privilege-escalation guard)", () => {
  it("rejects an invitation targeting the owner role", async () => {
    vi.mocked(roleRepository.findById).mockResolvedValue(OWNER_ROLE);

    await expect(teamService.inviteMember(WORKSPACE, ACTOR, "new@example.com", OWNER_ROLE.id)).rejects.toThrow(
      "The owner role can't be assigned through an invitation.",
    );

    expect(invitationRepository.create).not.toHaveBeenCalled();
  });

  it("rejects an invitation targeting a role id that doesn't exist", async () => {
    vi.mocked(roleRepository.findById).mockResolvedValue(null);

    await expect(teamService.inviteMember(WORKSPACE, ACTOR, "new@example.com", "bogus-role")).rejects.toThrow(
      "That role doesn't exist.",
    );

    expect(invitationRepository.create).not.toHaveBeenCalled();
  });

  it("invites a member for a legitimate non-owner role", async () => {
    vi.mocked(roleRepository.findById).mockResolvedValue(makeRole());
    vi.mocked(invitationRepository.findPendingByEmail).mockResolvedValue(null);
    vi.mocked(invitationRepository.create).mockResolvedValue({
      id: "invitation-1",
      workspaceId: WORKSPACE.id,
      email: "new@example.com",
      roleId: "role-manager",
      invitedByUserId: ACTOR.userId,
      tokenHash: "hash",
      status: "pending",
      expiresAt: new Date(Date.now() + 86400000),
      createdAt: new Date(),
    });

    const result = await teamService.inviteMember(WORKSPACE, ACTOR, "new@example.com", "role-manager");

    expect(result.invitation.id).toBe("invitation-1");
    expect(workspaceAuditLogRepository.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "member_invited" }),
    );
  });
});

describe("teamService.updateMemberRole (owner privilege-escalation guard)", () => {
  it("rejects promoting a member to the owner role", async () => {
    vi.mocked(membershipRepository.findMembersByWorkspaceId).mockResolvedValue([makeMember()]);
    vi.mocked(roleRepository.findById).mockResolvedValue(OWNER_ROLE);

    await expect(teamService.updateMemberRole(WORKSPACE.id, "member-1", OWNER_ROLE.id, ACTOR)).rejects.toThrow(
      "Ownership can't be granted by changing a member's role.",
    );

    expect(membershipRepository.updateRole).not.toHaveBeenCalled();
  });

  it("rejects a role id that doesn't exist", async () => {
    vi.mocked(membershipRepository.findMembersByWorkspaceId).mockResolvedValue([makeMember()]);
    vi.mocked(roleRepository.findById).mockResolvedValue(null);

    await expect(teamService.updateMemberRole(WORKSPACE.id, "member-1", "bogus-role", ACTOR)).rejects.toThrow(
      "That role doesn't exist.",
    );

    expect(membershipRepository.updateRole).not.toHaveBeenCalled();
  });

  it("still blocks changing the current owner's role at all, regardless of target role", async () => {
    vi.mocked(membershipRepository.findMembersByWorkspaceId).mockResolvedValue([
      makeMember({ role: OWNER_ROLE }),
    ]);

    await expect(teamService.updateMemberRole(WORKSPACE.id, "member-1", "role-manager", ACTOR)).rejects.toThrow(
      "The workspace owner's role can't be changed.",
    );

    expect(roleRepository.findById).not.toHaveBeenCalled();
    expect(membershipRepository.updateRole).not.toHaveBeenCalled();
  });

  it("allows changing a non-owner member to a legitimate non-owner role", async () => {
    vi.mocked(membershipRepository.findMembersByWorkspaceId).mockResolvedValue([makeMember()]);
    vi.mocked(roleRepository.findById).mockResolvedValue(makeRole({ id: "role-viewer", key: "viewer", name: "Viewer" }));

    await teamService.updateMemberRole(WORKSPACE.id, "member-1", "role-viewer", ACTOR);

    expect(membershipRepository.updateRole).toHaveBeenCalledWith("member-1", WORKSPACE.id, "role-viewer");
    expect(workspaceAuditLogRepository.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "member_role_changed" }),
    );
  });
});
