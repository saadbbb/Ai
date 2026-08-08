import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { StatTile } from "@/features/dashboard/components/stat-tile";
import { ticketAdminService } from "@/features/support/services/ticket-admin.service";
import { requirePlatformAdmin } from "@/lib/auth/auth-guard";

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
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
        <StatTile label={t("avgResponseTime")} value={formatSeconds(timing.avgResponseSeconds, t)} />
        <StatTile label={t("avgResolutionTime")} value={formatSeconds(timing.avgResolutionSeconds, t)} />
      </div>

      {tickets.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{t("emptyState")}</p>
      ) : (
        <div className="divide-y rounded-lg border">
          {tickets.map(({ ticket, workspaceName, assignedAdminEmail }) => (
            <Link
              key={ticket.id}
              href={`/admin/tickets/${ticket.id}`}
              className="flex items-center justify-between gap-4 p-3 text-sm hover:bg-muted/50"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{ticket.subject}</p>
                <p className="truncate text-muted-foreground">
                  {workspaceName} · {t(`categories.${ticket.category}`)}
                  {assignedAdminEmail && ` · ${assignedAdminEmail}`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-muted-foreground">
                <span>{t(`priorities.${ticket.priority}`)}</span>
                <span>{t(`statuses.${ticket.status}`)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
