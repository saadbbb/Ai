import { LifeBuoy } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ticketService } from "@/features/support/services/ticket.service";
import { requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";

export default async function SupportPage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireWorkspacePermission(user.id, workspace.id, "support.tickets.view");
  const t = await getTranslations("support");

  const tickets = await ticketService.listTickets(workspace.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Button asChild>
            <Link href="/dashboard/support/new">{t("newTicket")}</Link>
          </Button>
        }
      />

      {tickets.length === 0 ? (
        <EmptyState icon={LifeBuoy} title={t("emptyState")} />
      ) : (
        <div className="divide-y overflow-hidden rounded-xl border bg-card shadow-md shadow-foreground/[0.03]">
          {tickets.map((ticket) => (
            <Link
              key={ticket.id}
              href={`/dashboard/support/${ticket.id}`}
              className="flex items-center justify-between gap-4 p-3 text-sm hover:bg-muted/50"
            >
              <span className="min-w-0 flex-1 truncate font-medium">{ticket.subject}</span>
              <span className="shrink-0 text-muted-foreground">{t(`statuses.${ticket.status}`)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
