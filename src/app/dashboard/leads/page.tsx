import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ExportButtons } from "@/components/export-buttons";
import { Input } from "@/components/ui/input";
import { LeadBoard } from "@/features/crm/components/lead-board";
import { crmService } from "@/features/crm/services/crm.service";
import { requireFeature, requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";

interface PageProps {
  searchParams: Promise<{ q?: string; tag?: string; language?: string }>;
}

export default async function LeadsPage({ searchParams }: PageProps) {
  const { q, tag, language } = await searchParams;
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "leads");
  const t = await getTranslations("leads");
  const tCommon = await getTranslations("common");

  const leads = await crmService.listLeads(workspace.id, {
    search: q,
    tag: tag?.trim() || undefined,
    language: language?.trim() || undefined,
  });
  const hasActiveFilters = Boolean(q || tag || language);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <ExportButtons
          reportPath="/api/reports/leads"
          labels={{ csv: tCommon("exportCsv"), excel: tCommon("exportExcel"), pdf: tCommon("exportPdf") }}
        />
      </div>
      <form className="flex flex-wrap items-end gap-2">
        <Input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder={tCommon("searchPlaceholder")}
          aria-label={tCommon("search")}
          className="max-w-sm"
        />
        <Input name="tag" defaultValue={tag ?? ""} placeholder={t("filters.tagPlaceholder")} className="max-w-40" />
        <Input
          name="language"
          defaultValue={language ?? ""}
          placeholder={t("filters.languagePlaceholder")}
          className="max-w-32"
        />
        <Button type="submit" variant="secondary" size="sm">
          {tCommon("search")}
        </Button>
        {hasActiveFilters && (
          <Button asChild type="button" variant="ghost" size="sm">
            <Link href="/dashboard/leads">{t("filters.clear")}</Link>
          </Button>
        )}
      </form>
      <LeadBoard initialLeads={leads} />
    </div>
  );
}
