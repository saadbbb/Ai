import { eq, and } from "drizzle-orm";
import { db } from "@/db/client";
import { type NewWorkspaceMember, type WorkspaceMember, workspaceMembers, workspaces, roles } from "@/db/schema";

export const membershipRepository = {
  async create(data: NewWorkspaceMember): Promise<WorkspaceMember> {
    const [member] = await db.insert(workspaceMembers).values(data).returning();
    return member;
  },

  async findByUserAndWorkspace(userId: string, workspaceId: string): Promise<WorkspaceMember | null> {
    const [member] = await db
      .select()
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.workspaceId, workspaceId)))
      .limit(1);
    return member ?? null;
  },

  async findWorkspacesForUser(userId: string) {
    return db
      .select({ workspace: workspaces, role: roles })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
      .innerJoin(roles, eq(workspaceMembers.roleId, roles.id))
      .where(eq(workspaceMembers.userId, userId))
      .orderBy(workspaceMembers.joinedAt);
  },
};
