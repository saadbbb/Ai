import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { roles, type SubscriptionStatus, users, type Workspace, workspaceMembers, workspaces } from "@/db/schema";

export interface WorkspaceAdminListItem {
  workspace: Workspace;
  ownerEmail: string | null;
}

/**
 * Deliberately separate from the tenant-scoped workspaceRepository — every
 * other repository in the app filters by workspaceId to enforce tenant
 * isolation, but the Super Admin Platform is the one place that's allowed
 * to see across all workspaces. Only ever called from requirePlatformAdmin()
 * -gated actions/pages.
 */
export const workspaceAdminRepository = {
  async findAllWithOwner(): Promise<WorkspaceAdminListItem[]> {
    const rows = await db
      .select({ workspace: workspaces, ownerEmail: users.email })
      .from(workspaces)
      .leftJoin(workspaceMembers, eq(workspaceMembers.workspaceId, workspaces.id))
      .leftJoin(roles, eq(roles.id, workspaceMembers.roleId))
      .leftJoin(users, eq(users.id, workspaceMembers.userId))
      .where(eq(roles.key, "owner"))
      .orderBy(desc(workspaces.createdAt));
    return rows;
  },

  async updateSubscriptionStatus(id: string, status: SubscriptionStatus): Promise<Workspace | null> {
    const [workspace] = await db
      .update(workspaces)
      .set({ subscriptionStatus: status, updatedAt: new Date() })
      .where(eq(workspaces.id, id))
      .returning();
    return workspace ?? null;
  },
};
