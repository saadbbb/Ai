import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { appointmentRepository } from "@/features/appointments/repository/appointment.repository";
import { LifecycleStageSelect } from "@/features/crm/components/lifecycle-stage-select";
import { NotePanel } from "@/features/crm/components/note-panel";
import { TagManager } from "@/features/crm/components/tag-manager";
import { TaskPanel } from "@/features/crm/components/task-panel";
import { activityRepository } from "@/features/crm/repository/activity.repository";
import { calculateLeadScore, leadTemperature } from "@/features/crm/lib/lead-score";
import { suggestNextAction } from "@/features/crm/lib/next-action";
import { mergeTimeline, type TimelineItem } from "@/features/crm/lib/timeline";
import { leadRepository } from "@/features/crm/repository/lead.repository";
import { noteRepository } from "@/features/crm/repository/note.repository";
import { taskRepository } from "@/features/crm/repository/task.repository";
import { conversationRepository } from "@/features/inbox/repository/conversation.repository";
import { contactRepository } from "@/features/inbox/repository/contact.repository";
import { messageRepository } from "@/features/inbox/repository/message.repository";
import { orderGrandTotal } from "@/features/orders/lib/order-total";
import { orderRepository } from "@/features/orders/repository/order.repository";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";

interface PageProps {
  params: Promise<{ contactId: string }>;
}

export default async function ContactDetailPage({ params }: PageProps) {
  const { contactId } = await params;
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  const t = await getTranslations("contacts");
  const tLeads = await getTranslations("leads");
  const tOrders = await getTranslations("orders");
  const tAppointments = await getTranslations("appointments");
  const tActivity = await getTranslations("activity");

  const contact = await contactRepository.findById(contactId, workspace.id);
  if (!contact) notFound();

  const [conversations, leads, orders, appointmentList, tasks, notes, activities] = await Promise.all([
    conversationRepository.findByContactId(contactId, workspace.id),
    leadRepository.findByContactId(contactId, workspace.id),
    orderRepository.findByContactId(contactId, workspace.id),
    appointmentRepository.findByContactId(contactId, workspace.id),
    taskRepository.findByContactId(contactId, workspace.id),
    noteRepository.findByContactId(contactId, workspace.id, user.id),
    activityRepository.findByContactId(contactId, workspace.id),
  ]);

  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: workspace.timezone,
    dateStyle: "medium",
    timeStyle: "short",
  });

  const leadConversationIds = leads.map((lead) => lead.conversationId).filter((id): id is string => id !== null);
  const messageCounts = await messageRepository.countByConversationIds(leadConversationIds);
  const hasOrder = orders.length > 0;
  const hasAppointment = appointmentList.length > 0;

  const COMPLETED_ORDER_STATUSES = ["delivered", "completed"];
  const completedOrders = orders.filter((item) => COMPLETED_ORDER_STATUSES.includes(item.order.status));
  const lifetimeValue = completedOrders.reduce((sum, item) => sum + orderGrandTotal(item.items, item.order), 0);

  const productQuantities = new Map<string, number>();
  for (const item of completedOrders) {
    for (const line of item.items) {
      productQuantities.set(line.name, (productQuantities.get(line.name) ?? 0) + line.quantity);
    }
  }
  const favoriteProducts = [...productQuantities.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);

  const CLOSED_LEAD_STAGES = ["won", "lost", "cancelled"];
  const isHotLead = leads.some((lead) => {
    if (CLOSED_LEAD_STAGES.includes(lead.stage)) return false;
    const score = calculateLeadScore({
      messageCount: lead.conversationId ? (messageCounts.get(lead.conversationId) ?? 0) : 0,
      hasOrder,
      hasAppointment,
      tags: contact.tags,
      stage: lead.stage,
      lastContactAt: contact.lastContactAt,
    });
    const temperature = leadTemperature(score);
    return temperature === "hot" || temperature === "priority";
  });
  const now = new Date();
  const overdueTask = tasks
    .filter((task) => task.status === "open" && task.dueAt && task.dueAt < now)
    .sort((a, b) => (a.dueAt as Date).getTime() - (b.dueAt as Date).getTime())[0];
  const hasUpcomingAppointment = appointmentList.some(
    (item) => ["scheduled", "confirmed"].includes(item.appointment.status) && item.appointment.scheduledAt > now,
  );
  const daysSinceLastContact = contact.lastContactAt
    ? Math.floor((now.getTime() - contact.lastContactAt.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const nextAction = suggestNextAction({
    hasDraftOrder: orders.some((item) => item.order.status === "draft"),
    overdueTaskTitle: overdueTask?.title ?? null,
    hasUpcomingAppointment,
    isHotLead,
    lifecycleStage: contact.lifecycleStage,
    daysSinceLastContact,
  });

  const timeline = mergeTimeline(
    conversations.map(
      ({ conversation }): TimelineItem => ({
        id: `conversation-${conversation.id}`,
        label: conversation.lastMessagePreview ?? t("noMessagesYet"),
        meta: tActivity("channelActivity"),
        timestamp: conversation.lastMessageAt ?? conversation.createdAt,
        href: `/dashboard/inbox/${conversation.id}`,
      }),
    ),
    leads.map((lead): TimelineItem => {
      const score = calculateLeadScore({
        messageCount: lead.conversationId ? (messageCounts.get(lead.conversationId) ?? 0) : 0,
        hasOrder,
        hasAppointment,
        tags: contact.tags,
        stage: lead.stage,
        lastContactAt: contact.lastContactAt,
      });
      return {
        id: `lead-${lead.id}`,
        label: `${tLeads("title")}: ${tLeads(`stages.${lead.stage}`)}`,
        meta: `${tLeads(`temperature.${leadTemperature(score)}`)} · ${score}`,
        timestamp: lead.updatedAt,
        href: lead.conversationId ? `/dashboard/inbox/${lead.conversationId}` : null,
      };
    }),
    orders.map(
      ({ order, items }): TimelineItem => ({
        id: `order-${order.id}`,
        label: `${tOrders("title")}: ${tOrders(`statuses.${order.status}`)}`,
        meta: orderGrandTotal(items, order).toFixed(2),
        timestamp: order.updatedAt,
        href: `/dashboard/orders/${order.id}`,
      }),
    ),
    appointmentList.map(
      ({ appointment }): TimelineItem => ({
        id: `appointment-${appointment.id}`,
        label: appointment.serviceName
          ? `${tAppointments("title")}: ${appointment.serviceName}`
          : tAppointments("title"),
        meta: `${formatter.format(appointment.scheduledAt)} · ${tAppointments(`statuses.${appointment.status}`)}`,
        timestamp: appointment.updatedAt,
        href: null,
      }),
    ),
    activities.map(
      (activity): TimelineItem => ({
        id: `activity-${activity.id}`,
        label: activity.summary,
        timestamp: activity.createdAt,
        href: activity.link,
      }),
    ),
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/dashboard/contacts" className="text-sm text-muted-foreground hover:text-foreground">
        {t("backLink")}
      </Link>

      <PageHeader
        title={contact.fullName}
        description={
          [
            contact.phone,
            contact.email,
            contact.instagramId ? `@${contact.instagramId}` : null,
            contact.country,
            contact.city,
            contact.language ? t(`languages.${contact.language}`) : null,
          ]
            .filter(Boolean)
            .join(" · ") || t("noContactInfo")
        }
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/appointments/new?contactId=${contact.id}`}>{tAppointments("newAppointment")}</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/orders/new?contactId=${contact.id}`}>{tOrders("newOrder")}</Link>
            </Button>
          </>
        }
      />

      <div>
        <div className="flex flex-wrap items-center gap-1">
          <LifecycleStageSelect contactId={contact.id} initialStage={contact.lifecycleStage} />
          {contact.source && <Badge variant="secondary">{contact.source}</Badge>}
        </div>
        <div className="mt-1">
          <TagManager contactId={contact.id} initialTags={contact.tags} />
        </div>
        {(contact.address || contact.budget || contact.preferredContactMethod || contact.timezone || contact.birthDate || contact.gender) && (
          <p className="mt-1 text-xs text-muted-foreground">
            {[
              contact.address ? t("fields.address", { value: contact.address }) : null,
              contact.budget ? t("fields.budget", { value: contact.budget }) : null,
              contact.preferredContactMethod
                ? t("fields.preferredContactMethod", { value: t(`preferredContactMethods.${contact.preferredContactMethod}`) })
                : null,
              contact.timezone ? t("fields.timezone", { value: contact.timezone }) : null,
              contact.birthDate ? t("fields.birthDate", { value: contact.birthDate }) : null,
              contact.gender ? t("fields.gender", { value: contact.gender }) : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
        {contact.aiSummary && (
          <p className="mt-2 max-w-md rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">{contact.aiSummary}</p>
        )}
      </div>

      {nextAction && (
        <div className="rounded-lg border border-dashed p-3 text-sm">
          <p className="text-xs font-medium text-muted-foreground">{t("nextAction.heading")}</p>
          <p>
            {nextAction.detail
              ? t(`nextAction.${nextAction.type}`, { detail: nextAction.detail })
              : t(`nextAction.${nextAction.type}`)}
          </p>
        </div>
      )}

      {(completedOrders.length > 0 || favoriteProducts.length > 0) && (
        <div className="flex flex-wrap gap-4 rounded-lg border p-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">{t("lifetimeValue")}</p>
            <p className="font-medium">{lifetimeValue.toFixed(2)}</p>
          </div>
          {favoriteProducts.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground">{t("favoriteProducts")}</p>
              <p className="font-medium">{favoriteProducts.join(", ")}</p>
            </div>
          )}
        </div>
      )}

      <TaskPanel contactId={contact.id} initialTasks={tasks} />

      <NotePanel contactId={contact.id} initialNotes={notes} />

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">{t("timelineHeading")}</h2>
        {timeline.length === 0 ? (
          <p className="text-sm text-muted-foreground">{tActivity("empty")}</p>
        ) : (
          <div className="divide-y overflow-hidden rounded-xl border bg-card shadow-sm">
            {timeline.map((item) => {
              const row = (
                <div className="flex items-center justify-between gap-3 p-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate">{item.label}</p>
                    {item.meta && <p className="truncate text-xs text-muted-foreground">{item.meta}</p>}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatter.format(item.timestamp)}</span>
                </div>
              );
              return item.href ? (
                <Link key={item.id} href={item.href} className="block hover:bg-muted">
                  {row}
                </Link>
              ) : (
                <div key={item.id}>{row}</div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
