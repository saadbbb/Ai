import "server-only";
import { membershipRepository } from "../repository/membership.repository";
import { rolePermissionRepository } from "../repository/role-permission.repository";

/**
 * Reads the RBAC tables seeded in src/db/seed/roles-permissions.seed.ts
 * (permissions like "workspace.members.invite" mapped to roles like Owner/
 * Admin/Manager/Agent/Viewer) — seeded since the very first commit but never
 * actually checked anywhere until Team Management needed real enforcement.
 */
async function hasPermission(userId: string, workspaceId: string, permissionKey: string): Promise<boolean> {
  const membership = await membershipRepository.findByUserAndWorkspace(userId, workspaceId);
  if (!membership) return false;
  return rolePermissionRepository.roleHasPermission(membership.roleId, permissionKey);
}

export const permissionService = {
  hasPermission,
};
