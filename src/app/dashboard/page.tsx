import { getTranslations } from "next-intl/server";
import { membershipRepository } from "@/features/workspace/repository/membership.repository";
import { requireUser } from "@/lib/auth/auth-guard";

export default async function DashboardPage() {
  const user = await requireUser();
  const workspaceMemberships = await membershipRepository.findWorkspacesForUser(user.id);
  const t = await getTranslations("dashboard");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("welcomeBack")}</h1>
      <p className="text-muted-foreground">{t("signedInAs", { email: user.email })}</p>
      {workspaceMemberships.map(({ workspace, role }) => (
        <div key={workspace.id} className="rounded-lg border p-4">
          <p className="font-medium">{workspace.name}</p>
          <p className="text-sm text-muted-foreground">
            {t("yourRole", { role: role.name, timezone: workspace.timezone })}
          </p>
        </div>
      ))}
    </div>
  );
}
