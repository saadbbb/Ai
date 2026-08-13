import { and, eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db/client";
import { permissions, rolePermissions } from "@/db/schema";

async function findPermissionKeysForRole(roleId: string): Promise<Set<string>> {
  const rows = await db
    .select({ key: permissions.key })
    .from(rolePermissions)
    .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
    .where(eq(rolePermissions.roleId, roleId));
  return new Set(rows.map((row) => row.key));
}

export const rolePermissionRepository = {
  async roleHasPermission(roleId: string, permissionKey: string): Promise<boolean> {
    const [row] = await db
      .select({ id: permissions.id })
      .from(rolePermissions)
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(and(eq(rolePermissions.roleId, roleId), eq(permissions.key, permissionKey)))
      .limit(1);
    return row !== undefined;
  },

  // A single dashboard page load routinely checks 5+ different permission
  // keys for the same role (nav visibility, feature gates) — cached per
  // request so that's one query total instead of one per key checked
  // (2026-08-13 perf fix; see permissionService.hasPermission).
  findPermissionKeysForRole: cache(findPermissionKeysForRole),
};
