import { z } from "zod";

export const inviteMemberSchema = z.object({
  email: z.string().trim().email(),
  roleId: z.string().uuid(),
});

export const revokeInvitationSchema = z.object({ invitationId: z.string().uuid() });
export const updateMemberRoleSchema = z.object({ memberId: z.string().uuid(), roleId: z.string().uuid() });
export const removeMemberSchema = z.object({ memberId: z.string().uuid() });
export const acceptInvitationSchema = z.object({ token: z.string().trim().min(1) });
