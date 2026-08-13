import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceMember } from "@/db/schema";

vi.mock("../repository/membership.repository", () => ({
  membershipRepository: {
    findByUserAndWorkspace: vi.fn(),
  },
}));

vi.mock("../repository/role-permission.repository", () => ({
  rolePermissionRepository: {
    findPermissionKeysForRole: vi.fn(),
  },
}));

const { membershipRepository } = await import("../repository/membership.repository");
const { rolePermissionRepository } = await import("../repository/role-permission.repository");
const { permissionService } = await import("./permission.service");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("permissionService.hasPermission", () => {
  it("returns false without checking role permissions when there is no membership", async () => {
    vi.mocked(membershipRepository.findByUserAndWorkspace).mockResolvedValue(null);

    const result = await permissionService.hasPermission("user-1", "workspace-1", "analytics.view");

    expect(result).toBe(false);
    expect(rolePermissionRepository.findPermissionKeysForRole).not.toHaveBeenCalled();
  });

  it("returns true when the role's permission set includes the requested key", async () => {
    vi.mocked(membershipRepository.findByUserAndWorkspace).mockResolvedValue({
      roleId: "role-owner",
    } as WorkspaceMember);
    vi.mocked(rolePermissionRepository.findPermissionKeysForRole).mockResolvedValue(new Set(["analytics.view"]));

    const result = await permissionService.hasPermission("user-1", "workspace-1", "analytics.view");

    expect(result).toBe(true);
    expect(rolePermissionRepository.findPermissionKeysForRole).toHaveBeenCalledWith("role-owner");
  });

  it("returns false when the role's permission set doesn't include the requested key", async () => {
    vi.mocked(membershipRepository.findByUserAndWorkspace).mockResolvedValue({
      roleId: "role-viewer",
    } as WorkspaceMember);
    vi.mocked(rolePermissionRepository.findPermissionKeysForRole).mockResolvedValue(new Set());

    const result = await permissionService.hasPermission("user-1", "workspace-1", "workspace.manage");

    expect(result).toBe(false);
  });
});
