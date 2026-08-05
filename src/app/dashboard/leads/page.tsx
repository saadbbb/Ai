import { getTranslations } from "next-intl/server";
import { LeadBoard } from "@/features/crm/components/lead-board";
import { crmService } from "@/features/crm/services/crm.service";
import { requireFeature, requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";

export default async function LeadsPage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "leads");
  const t = await getTranslations("leads");

  const leads = await crmService.listLeads(workspace.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <LeadBoard initialLeads={leads} />
    </div>
  );
}
