import { CalendarDays, MessageSquare, ShoppingCart, Target, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { JoinedBdi } from "@/components/ltr-text";
import { PageHeader } from "@/components/page-header";
import { StatTile } from "@/components/stat-grid";
import { WORKSPACE_TIMEZONE } from "@/db/schema";
import { dashboardService } from "@/features/dashboard/services/dashboard.service";
import { appointmentRepository } from "@/features/appointments/repository/appointment.repository";
import { leadRepository } from "@/features/crm/repository/lead.repository";
import { conversationRepository } from "@/features/inbox/repository/conversation.repository";
import { contactRepository } from "@/features/inbox/repository/contact.repository";
import { orderGrandTotal } from "@/features/orders/lib/order-total";
import { orderRepository } from "@/features/orders/repository/order.repository";
import { ImpersonationBanner } from "@/features/platform-admin/components/impersonation-banner";
import { ResetPasswordButton } from "@/features/platform-admin/components/reset-password-button";
import { auditLogRepository } from "@/features/platform-admin/repository/audit-log.repository";
import { userRepository } from "@/features/auth/repository/user.repository";
import { membershipRepository } from "@/features/workspace/repository/membership.repository";
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
    actorEmail: admin.name ?? admin.email ?? "Unknown",
    action: "impersonation_started",
    targetType: "workspace",
    targetId: workspace.id,
    summary: `Viewed workspace "${workspace.name}" as Super Admin (read-only).`,
  });

  const [summary, contacts, conversations, leads, orders, appointments, ownerUserId] = await Promise.all([
    dashboardService.getSummary(workspaceId),
    contactRepository.findByWorkspaceId(workspaceId),
    conversationRepository.findByWorkspaceId(workspaceId),
    leadRepository.findByWorkspaceId(workspaceId),
    orderRepository.findByWorkspaceId(workspaceId),
    appointmentRepository.findByWorkspaceId(workspaceId),
    membershipRepository.findOwnerUserId(workspaceId),
  ]);
  const owner = ownerUserId ? await userRepository.findById(ownerUserId) : null;

  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: WORKSPACE_TIMEZONE,
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="space-y-6">
      <ImpersonationBanner workspaceName={workspace.name} />

      <PageHeader title={workspace.name} description={t("readOnlyNotice")} />

      {owner && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-muted-foreground">{t("ownerHeading")}</p>
            <p className="truncate text-sm font-semibold">{owner.name ?? "—"}</p>
            <p className="truncate text-xs text-muted-foreground">
              <JoinedBdi items={[owner.email, owner.phone]} />
            </p>
          </div>
          <ResetPasswordButton userId={owner.id} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label={t("stats.contacts")} value={summary.totalContacts} icon={Users} />
        <StatTile label={t("stats.activePipeline")} value={summary.activePipelineCount} icon={Target} />
        <StatTile label={t("stats.activeOrders")} value={summary.activeOrdersCount} icon={ShoppingCart} />
        <StatTile label={t("stats.needsHuman")} value={summary.needsHumanCount} icon={MessageSquare} tone="warning" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">{t("conversationsHeading")}</h2>
          {conversations.length === 0 ? (
            <EmptyState icon={MessageSquare} title={t("empty")} />
          ) : (
            <div className="divide-y overflow-hidden rounded-xl border bg-card shadow-sm">
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
          <h2 className="text-sm font-semibold text-foreground">{t("contactsHeading")}</h2>
          {contacts.length === 0 ? (
            <EmptyState icon={Users} title={t("empty")} />
          ) : (
            <div className="divide-y overflow-hidden rounded-xl border bg-card shadow-sm">
              {contacts.slice(0, LIST_LIMIT).map((contact) => (
                <div key={contact.id} className="p-3 text-sm">
                  <p className="truncate font-medium">{contact.fullName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    <JoinedBdi items={[contact.phone, contact.email]} />
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">{t("leadsHeading")}</h2>
          {leads.length === 0 ? (
            <EmptyState icon={Target} title={t("empty")} />
          ) : (
            <div className="divide-y overflow-hidden rounded-xl border bg-card shadow-sm">
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
          <h2 className="text-sm font-semibold text-foreground">{t("ordersHeading")}</h2>
          {orders.length === 0 ? (
            <EmptyState icon={ShoppingCart} title={t("empty")} />
          ) : (
            <div className="divide-y overflow-hidden rounded-xl border bg-card shadow-sm">
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
          <h2 className="text-sm font-semibold text-foreground">{t("appointmentsHeading")}</h2>
          {appointments.length === 0 ? (
            <EmptyState icon={CalendarDays} title={t("empty")} />
          ) : (
            <div className="divide-y overflow-hidden rounded-xl border bg-card shadow-sm">
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
