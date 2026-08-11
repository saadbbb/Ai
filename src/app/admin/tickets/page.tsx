import { CheckCircle2, Clock3, Ticket as TicketIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { RowList } from "@/components/data-table";
import { PageContainer } from "@/components/page-container";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { StatGrid } from "@/components/stat-grid";
import { ticketAdminService } from "@/features/support/services/ticket-admin.service";
import { requirePlatformAdmin } from "@/lib/auth/auth-guard";

const PRIORITY_TONE: Record<string, string> = {
  urgent: "bg-error-soft text-error",
  high: "bg-warning-soft text-warning-foreground",
};

const STATUS_TONE: Record<string, string> = {
  open: "bg-info-soft text-info",
  in_progress: "bg-warning-soft text-warning-foreground",
  resolved: "bg-success-soft text-success",
};

function formatSeconds(seconds: number | null, t: (key: string, values?: Record<string, string | number>) => string): string {
  if (seconds === null) return "—";
  const hours = Math.round(seconds / 3600);
  return hours < 1 ? t("underAnHour") : t("hoursValue", { count: hours });
}

export default async function AdminTicketsPage() {
  await requirePlatformAdmin();
  const t = await getTranslations("platformAdmin.tickets");

  const [tickets, timing] = await Promise.all([ticketAdminService.listTickets(), ticketAdminService.getTimingStats()]);

  return (
    <PageContainer>
      <PageHeader title={t("title")} description={t("description")} />

      <StatGrid
        className="sm:grid-cols-2 lg:grid-cols-2"
        stats={[
          { label: t("avgResponseTime"), value: formatSeconds(timing.avgResponseSeconds, t), icon: Clock3 },
          { label: t("avgResolutionTime"), value: formatSeconds(timing.avgResolutionSeconds, t), icon: CheckCircle2, tone: "success" },
        ]}
      />

      <RowList
        items={tickets}
        getRowKey={({ ticket }) => ticket.id}
        getRowHref={({ ticket }) => `/admin/tickets/${ticket.id}`}
        emptyState={{ icon: TicketIcon, title: t("emptyState") }}
        renderRow={({ ticket, workspaceName, assignedAdminEmail }) => (
          <>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{ticket.subject}</p>
              <p className="truncate text-muted-foreground">
                {workspaceName} · {t(`categories.${ticket.category}`)}
                {assignedAdminEmail && ` · ${assignedAdminEmail}`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant="secondary" className={cn(PRIORITY_TONE[ticket.priority])}>
                {t(`priorities.${ticket.priority}`)}
              </Badge>
              <Badge variant="secondary" className={cn(STATUS_TONE[ticket.status])}>
                {t(`statuses.${ticket.status}`)}
              </Badge>
            </div>
          </>
        )}
      />
    </PageContainer>
  );
}
