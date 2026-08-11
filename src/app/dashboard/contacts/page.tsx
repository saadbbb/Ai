import { Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { ExportButtons } from "@/components/export-buttons";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
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
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <ExportButtons
            reportPath="/api/reports/contacts"
            labels={{ csv: tCommon("exportCsv"), excel: tCommon("exportExcel"), pdf: tCommon("exportPdf") }}
          />
        }
      />

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
          className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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
        <EmptyState icon={Users} title={t("emptyState")} />
      ) : (
        <div className="divide-y overflow-hidden rounded-xl border bg-card shadow-md shadow-foreground/[0.03]">
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
                <div className="mt-1.5 flex flex-wrap items-center gap-1">
                  <Badge variant="secondary">{t(`lifecycle.${contact.lifecycleStage}`)}</Badge>
                  {contact.tags.map((contactTag) => (
                    <Badge key={contactTag} variant="outline">
                      {contactTag}
                    </Badge>
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
