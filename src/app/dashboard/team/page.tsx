import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/page-container";
import { PageHeader } from "@/components/page-header";
import { TeamManager } from "@/features/workspace/components/team-manager";
import { permissionService } from "@/features/workspace/services/permission.service";
import { teamService } from "@/features/workspace/services/team.service";
import { requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";

export default async function TeamPage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireWorkspacePermission(user.id, workspace.id, "workspace.members.view");
  const t = await getTranslations("team");

  const [{ members, invitations, roles }, canInvite, canManage] = await Promise.all([
    teamService.getTeam(workspace.id),
    permissionService.hasPermission(user.id, workspace.id, "workspace.members.invite"),
    permissionService.hasPermission(user.id, workspace.id, "workspace.members.manage"),
  ]);

  return (
    <PageContainer className="mx-auto max-w-2xl">
      <PageHeader title={t("title")} description={t("description")} />
      <TeamManager
        initialMembers={members}
        initialInvitations={invitations}
        roles={roles}
        canInvite={canInvite}
        canManage={canManage}
        currentUserId={user.id}
      />
    </PageContainer>
  );
}
