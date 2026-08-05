import { eq, and } from "drizzle-orm";
import { db } from "@/db/client";
import {
  type NewWorkspaceMember,
  type Role,
  type User,
  users,
  type WorkspaceMember,
  workspaceMembers,
  workspaces,
  roles,
} from "@/db/schema";

export interface MemberListItem {
  member: WorkspaceMember;
  user: User;
  role: Role;
}

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

  async findOwnerUserId(workspaceId: string): Promise<string | null> {
    const [row] = await db
      .select({ userId: workspaceMembers.userId })
      .from(workspaceMembers)
      .innerJoin(roles, eq(workspaceMembers.roleId, roles.id))
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(roles.key, "owner")))
      .limit(1);
    return row?.userId ?? null;
  },

  async findMembersByWorkspaceId(workspaceId: string): Promise<MemberListItem[]> {
    return db
      .select({ member: workspaceMembers, user: users, role: roles })
      .from(workspaceMembers)
      .innerJoin(users, eq(users.id, workspaceMembers.userId))
      .innerJoin(roles, eq(roles.id, workspaceMembers.roleId))
      .where(eq(workspaceMembers.workspaceId, workspaceId))
      .orderBy(workspaceMembers.joinedAt);
  },

  async updateRole(id: string, workspaceId: string, roleId: string): Promise<void> {
    await db
      .update(workspaceMembers)
      .set({ roleId })
      .where(and(eq(workspaceMembers.id, id), eq(workspaceMembers.workspaceId, workspaceId)));
  },

  async remove(id: string, workspaceId: string): Promise<void> {
    await db.delete(workspaceMembers).where(and(eq(workspaceMembers.id, id), eq(workspaceMembers.workspaceId, workspaceId)));
  },
};
