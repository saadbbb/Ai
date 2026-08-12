"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Role } from "@/db/schema";
import { inviteMemberAction } from "../actions/invite-member.action";
import { removeMemberAction } from "../actions/remove-member.action";
import { revokeInvitationAction } from "../actions/revoke-invitation.action";
import { updateMemberRoleAction } from "../actions/update-member-role.action";
import type { InvitationListItem } from "../repository/invitation.repository";
import type { MemberListItem } from "../repository/membership.repository";
import { inviteMemberSchema } from "../validation/team-schemas";

type InviteFormValues = z.infer<typeof inviteMemberSchema>;

export function TeamManager({
  initialMembers,
  initialInvitations,
  roles,
  canInvite,
  canManage,
  currentUserId,
}: {
  initialMembers: MemberListItem[];
  initialInvitations: InvitationListItem[];
  roles: Role[];
  canInvite: boolean;
  canManage: boolean;
  currentUserId: string;
}) {
  const t = useTranslations("team");
  const tCommon = useTranslations("common");
  const [members, setMembers] = useState(initialMembers);
  const [invitations, setInvitations] = useState(initialInvitations);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteFormValues>({ resolver: zodResolver(inviteMemberSchema) });

  const onInvite = handleSubmit(async (values) => {
    setIsSubmitting(true);
    const result = await inviteMemberAction(values);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    const role = roles.find((r) => r.id === values.roleId);
    if (role) {
      setInvitations((current) => [{ invitation: result.data.invitation, role }, ...current]);
    }
    setInviteLink(result.data.link);
    reset();
  });

  async function handleRoleChange(memberId: string, roleId: string) {
    const previous = members;
    const role = roles.find((r) => r.id === roleId);
    if (!role) return;

    setMembers((current) =>
      current.map((item) => (item.member.id === memberId ? { ...item, member: { ...item.member, roleId }, role } : item)),
    );

    const result = await updateMemberRoleAction({ memberId, roleId });
    if (!result.success) {
      toast.error(result.error.message);
      setMembers(previous);
    }
  }

  async function handleRemove(memberId: string) {
    if (!window.confirm(tCommon("confirmDelete"))) return;

    const result = await removeMemberAction({ memberId });
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setMembers((current) => current.filter((item) => item.member.id !== memberId));
  }

  async function handleRevoke(invitationId: string) {
    const result = await revokeInvitationAction({ invitationId });
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setInvitations((current) => current.filter((item) => item.invitation.id !== invitationId));
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h2 className="text-sm font-medium">{t("membersHeading")}</h2>
        <div className="divide-y rounded-lg border">
          {members.map(({ member, user, role }) => (
            <div key={member.id} className="flex items-center justify-between gap-4 p-3 text-sm">
              <span className="truncate">
                {user.name ?? user.email ?? user.phone}
                {user.id === currentUserId && <span className="text-muted-foreground"> ({t("you")})</span>}
              </span>
              <div className="flex shrink-0 items-center gap-2">
                {role.key === "owner" || !canManage ? (
                  <span className="text-xs text-muted-foreground">{role.name}</span>
                ) : (
                  <Select value={role.id} onValueChange={(value) => handleRoleChange(member.id, value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roles
                        .filter((r) => r.key !== "owner")
                        .map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
                {role.key !== "owner" && canManage && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleRemove(member.id)}>
                    {tCommon("delete")}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {invitations.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium">{t("pendingHeading")}</h2>
          <div className="divide-y rounded-lg border">
            {invitations.map(({ invitation, role }) => (
              <div key={invitation.id} className="flex items-center justify-between gap-4 p-3 text-sm">
                <span className="truncate">{invitation.email}</span>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-muted-foreground">{role.name}</span>
                  {canManage && invitation.status === "pending" && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => handleRevoke(invitation.id)}>
                      {t("revoke")}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {canInvite && (
        <div className="space-y-3 rounded-lg border border-dashed p-4">
          <h2 className="text-sm font-medium">{t("inviteHeading")}</h2>
          <form onSubmit={onInvite} className="flex items-start gap-2">
            <div className="flex-1 space-y-1">
              <Input placeholder={t("emailPlaceholder")} {...register("email")} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="w-32 space-y-1">
              <Controller
                control={control}
                name="roleId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("rolePlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {roles
                        .filter((r) => r.key !== "owner")
                        .map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.roleId && <p className="text-sm text-destructive">{errors.roleId.message}</p>}
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("inviting") : t("invite")}
            </Button>
          </form>
          {inviteLink && (
            <div className="rounded-md bg-muted p-2 text-xs">
              <p className="mb-1 text-muted-foreground">{t("linkHint")}</p>
              <code className="break-all">{inviteLink}</code>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
