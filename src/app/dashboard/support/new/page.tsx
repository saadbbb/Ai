import { getTranslations } from "next-intl/server";
import { NewTicketForm } from "@/features/support/components/new-ticket-form";
import { requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";

export default async function NewSupportTicketPage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireWorkspacePermission(user.id, workspace.id, "support.tickets.view");
  const t = await getTranslations("support.new");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <NewTicketForm />
    </div>
  );
}
