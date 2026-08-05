import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { contactRepository } from "@/features/inbox/repository/contact.repository";
import { requireFeature, requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";

export default async function ContactsPage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "contacts");
  const t = await getTranslations("contacts");
  const tCommon = await getTranslations("common");

  const contacts = await contactRepository.findByWorkspaceId(workspace.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href="/api/reports/contacts">{tCommon("exportCsv")}</a>
        </Button>
      </div>

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
                  {[contact.phone, contact.email].filter(Boolean).join(" · ") || t("noContactInfo")}
                </p>
                {contact.tags.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {contact.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
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
