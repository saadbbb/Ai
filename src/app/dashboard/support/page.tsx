import { LifeBuoy } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { RowList } from "@/components/data-table";
import { PageContainer } from "@/components/page-container";
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
    <PageContainer className="mx-auto max-w-2xl">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Button asChild>
            <Link href="/dashboard/support/new">{t("newTicket")}</Link>
          </Button>
        }
      />

      <RowList
        items={tickets}
        getRowKey={(ticket) => ticket.id}
        getRowHref={(ticket) => `/dashboard/support/${ticket.id}`}
        emptyState={{ icon: LifeBuoy, title: t("emptyState") }}
        renderRow={(ticket) => (
          <>
            <span className="min-w-0 flex-1 truncate font-medium">{ticket.subject}</span>
            <span className="shrink-0 text-muted-foreground">{t(`statuses.${ticket.status}`)}</span>
          </>
        )}
      />
    </PageContainer>
  );
}
