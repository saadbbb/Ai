import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { contactRepository } from "@/features/inbox/repository/contact.repository";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";

export default async function ContactsPage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  const t = await getTranslations("contacts");

  const contacts = await contactRepository.findByWorkspaceId(workspace.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
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
