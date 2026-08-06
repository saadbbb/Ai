import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ExportButtons } from "@/components/export-buttons";
import { Input } from "@/components/ui/input";
import { contactLifecycleStageEnum, type ContactLifecycleStage } from "@/db/schema";
import { contactRepository } from "@/features/inbox/repository/contact.repository";
import { requireFeature, requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";

interface PageProps {
  searchParams: Promise<{ q?: string; lifecycleStage?: string; tag?: string }>;
}

export default async function ContactsPage({ searchParams }: PageProps) {
  const { q, lifecycleStage, tag } = await searchParams;
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "contacts");
  const t = await getTranslations("contacts");
  const tCommon = await getTranslations("common");

  const validLifecycleStage = contactLifecycleStageEnum.enumValues.includes(lifecycleStage as ContactLifecycleStage)
    ? (lifecycleStage as ContactLifecycleStage)
    : undefined;

  const contacts = await contactRepository.findByWorkspaceId(workspace.id, {
    search: q,
    lifecycleStage: validLifecycleStage,
    tag: tag?.trim() || undefined,
  });
  const hasActiveFilters = Boolean(q || validLifecycleStage || tag);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <ExportButtons
          reportPath="/api/reports/contacts"
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
        <select
          name="lifecycleStage"
          defaultValue={validLifecycleStage ?? ""}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">{t("filters.lifecycleAll")}</option>
          {contactLifecycleStageEnum.enumValues.map((stage) => (
            <option key={stage} value={stage}>
              {t(`lifecycle.${stage}`)}
            </option>
          ))}
        </select>
        <Input name="tag" defaultValue={tag ?? ""} placeholder={t("filters.tagPlaceholder")} className="max-w-40" />
        <Button type="submit" variant="secondary" size="sm">
          {tCommon("search")}
        </Button>
        {hasActiveFilters && (
          <Button asChild type="button" variant="ghost" size="sm">
            <Link href="/dashboard/contacts">{t("filters.clear")}</Link>
          </Button>
        )}
      </form>

      {contacts.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {t("emptyState")}
        </p>
      ) : (
        <div className="divide-y rounded-lg border">
          {contacts.map((contact) => (
            <Link
              key={contact.id}
              href={`/dashboard/contacts/${contact.id}`}
              className="flex items-center justify-between gap-4 p-4 hover:bg-muted"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{contact.fullName}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {[contact.phone, contact.email, contact.country].filter(Boolean).join(" · ") || t("noContactInfo")}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {t(`lifecycle.${contact.lifecycleStage}`)}
                  </span>
                  {contact.tags.map((contactTag) => (
                    <span key={contactTag} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {contactTag}
                    </span>
                  ))}
                </div>
              </div>
              {contact.lastContactAt && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(contact.lastContactAt).toISOString().slice(0, 10)}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
