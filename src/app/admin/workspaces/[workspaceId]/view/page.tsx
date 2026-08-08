import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { StatTile } from "@/features/dashboard/components/stat-tile";
import { dashboardService } from "@/features/dashboard/services/dashboard.service";
import { appointmentRepository } from "@/features/appointments/repository/appointment.repository";
import { leadRepository } from "@/features/crm/repository/lead.repository";
import { conversationRepository } from "@/features/inbox/repository/conversation.repository";
import { contactRepository } from "@/features/inbox/repository/contact.repository";
import { orderGrandTotal } from "@/features/orders/lib/order-total";
import { orderRepository } from "@/features/orders/repository/order.repository";
import { ImpersonationBanner } from "@/features/platform-admin/components/impersonation-banner";
import { auditLogRepository } from "@/features/platform-admin/repository/audit-log.repository";
import { workspaceRepository } from "@/features/workspace/repository/workspace.repository";
import { requirePrimaryPlatformAdmin } from "@/lib/auth/auth-guard";

const LIST_LIMIT = 20;

interface PageProps {
  params: Promise<{ workspaceId: string }>;
}

export default async function AdminWorkspaceViewPage({ params }: PageProps) {
  const { workspaceId } = await params;
  const admin = await requirePrimaryPlatformAdmin();
  const t = await getTranslations("platformAdmin.impersonation");
  const tLeads = await getTranslations("leads");
  const tOrders = await getTranslations("orders");
  const tAppointments = await getTranslations("appointments");

  const workspace = await workspaceRepository.findById(workspaceId);
  if (!workspace) notFound();

  // Logged on every view, not just once — a Super Admin looking at a tenant's
  // real customer/business data is exactly the kind of event Part 9's audit
  // trail exists for, regardless of how many times they've viewed it before.
  await auditLogRepository.log({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: "impersonation_started",
    targetType: "workspace",
    targetId: workspace.id,
    summary: `Viewed workspace "${workspace.name}" as Super Admin (read-only).`,
  });

  const [summary, contacts, conversations, leads, orders, appointments] = await Promise.all([
    dashboardService.getSummary(workspaceId),
    contactRepository.findByWorkspaceId(workspaceId),
    conversationRepository.findByWorkspaceId(workspaceId),
    leadRepository.findByWorkspaceId(workspaceId),
    orderRepository.findByWorkspaceId(workspaceId),
    appointmentRepository.findByWorkspaceId(workspaceId),
  ]);

  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: workspace.timezone,
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="space-y-6">
      <ImpersonationBanner workspaceName={workspace.name} />

      <div>
        <h1 className="text-xl font-semibold">{workspace.name}</h1>
        <p className="text-sm text-muted-foreground">{t("readOnlyNotice")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label={t("stats.contacts")} value={summary.totalContacts} />
        <StatTile label={t("stats.activePipeline")} value={summary.activePipelineCount} />
        <StatTile label={t("stats.activeOrders")} value={summary.activeOrdersCount} />
        <StatTile label={t("stats.needsHuman")} value={summary.needsHumanCount} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-sm font-medium">{t("conversationsHeading")}</h2>
          {conversations.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <div className="divide-y rounded-lg border">
              {conversations.slice(0, LIST_LIMIT).map(({ conversation, contact }) => (
                <div key={conversation.id} className="p-3 text-sm">
                  <p className="truncate font-medium">{contact.fullName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {conversation.lastMessagePreview ?? t("noMessages")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-medium">{t("contactsHeading")}</h2>
          {contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <div className="divide-y rounded-lg border">
              {contacts.slice(0, LIST_LIMIT).map((contact) => (
                <div key={contact.id} className="p-3 text-sm">
                  <p className="truncate font-medium">{contact.fullName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[contact.phone, contact.email].filter(Boolean).join(" · ")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-medium">{t("leadsHeading")}</h2>
          {leads.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <div className="divide-y rounded-lg border">
              {leads.slice(0, LIST_LIMIT).map(({ lead, contact }) => (
                <div key={lead.id} className="flex items-center justify-between p-3 text-sm">
                  <span className="truncate">{contact.fullName}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{tLeads(`stages.${lead.stage}`)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-medium">{t("ordersHeading")}</h2>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <div className="divide-y rounded-lg border">
              {orders.slice(0, LIST_LIMIT).map(({ order, contact, items }) => (
                <div key={order.id} className="flex items-center justify-between p-3 text-sm">
                  <span className="truncate">{contact.fullName}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {tOrders(`statuses.${order.status}`)} · {orderGrandTotal(items, order).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-medium">{t("appointmentsHeading")}</h2>
          {appointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <div className="divide-y rounded-lg border">
              {appointments.slice(0, LIST_LIMIT).map(({ appointment, contact }) => (
                <div key={appointment.id} className="flex items-center justify-between p-3 text-sm">
                  <span className="truncate">{contact.fullName}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatter.format(appointment.scheduledAt)} ·{" "}
                    {tAppointments(`statuses.${appointment.status}`)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
