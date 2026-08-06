import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LeadBoard } from "@/features/crm/components/lead-board";
import { crmService } from "@/features/crm/services/crm.service";
import { requireFeature, requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function LeadsPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "leads");
  const t = await getTranslations("leads");
  const tCommon = await getTranslations("common");

  const leads = await crmService.listLeads(workspace.id, q);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href="/api/reports/leads">{tCommon("exportCsv")}</a>
        </Button>
      </div>
      <form className="max-w-sm">
        <Input type="search" name="q" defaultValue={q ?? ""} placeholder={tCommon("searchPlaceholder")} aria-label={tCommon("search")} />
      </form>
      <LeadBoard initialLeads={leads} />
    </div>
  );
}
