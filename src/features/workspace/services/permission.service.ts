import "server-only";
import { membershipRepository } from "../repository/membership.repository";
import { rolePermissionRepository } from "../repository/role-permission.repository";

/**
 * Reads the RBAC tables seeded in src/db/seed/roles-permissions.seed.ts
 * (permissions like "workspace.members.invite" mapped to roles like Owner/
 * Admin/Manager/Agent/Viewer) — seeded since the very first commit but never
 * actually checked anywhere until Team Management needed real enforcement.
 *
 * Both the membership lookup and the role's full permission set are
 * request-cached (see membershipRepository/rolePermissionRepository) — a
 * single dashboard layout render calls this 5+ times with the same
 * userId/workspaceId, which used to mean 10+ DB round-trips for what's
 * really 2 queries' worth of data (2026-08-13 perf fix).
 */
async function hasPermission(userId: string, workspaceId: string, permissionKey: string): Promise<boolean> {
  const membership = await membershipRepository.findByUserAndWorkspace(userId, workspaceId);
  if (!membership) return false;
  const permissionKeys = await rolePermissionRepository.findPermissionKeysForRole(membership.roleId);
  return permissionKeys.has(permissionKey);
}

export const permissionService = {
  hasPermission,
};
