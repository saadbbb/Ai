import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { type Invitation, type InvitationStatus, invitations, type NewInvitation, type Role, roles } from "@/db/schema";

export interface InvitationListItem {
  invitation: Invitation;
  role: Role;
}

export const invitationRepository = {
  async findByWorkspaceId(workspaceId: string): Promise<InvitationListItem[]> {
    return db
      .select({ invitation: invitations, role: roles })
      .from(invitations)
      .innerJoin(roles, eq(roles.id, invitations.roleId))
      .where(eq(invitations.workspaceId, workspaceId))
      .orderBy(desc(invitations.createdAt));
  },

  async findPendingByEmail(workspaceId: string, email: string): Promise<Invitation | null> {
    const [invitation] = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.workspaceId, workspaceId),
          eq(invitations.email, email.toLowerCase()),
          eq(invitations.status, "pending"),
        ),
      )
      .limit(1);
    return invitation ?? null;
  },

  async findByTokenHash(tokenHash: string): Promise<Invitation | null> {
    const [invitation] = await db.select().from(invitations).where(eq(invitations.tokenHash, tokenHash)).limit(1);
    return invitation ?? null;
  },

  async create(data: NewInvitation): Promise<Invitation> {
    const [invitation] = await db
      .insert(invitations)
      .values({ ...data, email: data.email.toLowerCase() })
      .returning();
    return invitation;
  },

  async updateStatus(id: string, workspaceId: string, status: InvitationStatus): Promise<Invitation | null> {
    const [invitation] = await db
      .update(invitations)
      .set({ status })
      .where(and(eq(invitations.id, id), eq(invitations.workspaceId, workspaceId)))
      .returning();
    return invitation ?? null;
  },

  async markAccepted(id: string): Promise<void> {
    await db.update(invitations).set({ status: "accepted" }).where(eq(invitations.id, id));
  },
};
