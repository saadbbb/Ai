import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { NewTicketForm } from "@/features/support/components/new-ticket-form";
import { requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";

export default async function NewSupportTicketPage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireWorkspacePermission(user.id, workspace.id, "support.tickets.view");
  const t = await getTranslations("support.new");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
      <NewTicketForm />
    </div>
  );
}
