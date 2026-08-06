import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { appointmentRepository } from "@/features/appointments/repository/appointment.repository";
import { NotePanel } from "@/features/crm/components/note-panel";
import { TaskPanel } from "@/features/crm/components/task-panel";
import { activityRepository } from "@/features/crm/repository/activity.repository";
import { calculateLeadScore, leadTemperature } from "@/features/crm/lib/lead-score";
import { mergeTimeline, type TimelineItem } from "@/features/crm/lib/timeline";
import { leadRepository } from "@/features/crm/repository/lead.repository";
import { noteRepository } from "@/features/crm/repository/note.repository";
import { taskRepository } from "@/features/crm/repository/task.repository";
import { conversationRepository } from "@/features/inbox/repository/conversation.repository";
import { contactRepository } from "@/features/inbox/repository/contact.repository";
import { messageRepository } from "@/features/inbox/repository/message.repository";
import { orderTotal } from "@/features/orders/lib/order-total";
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
    noteRepository.findByContactId(contactId, workspace.id),
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
        meta: orderTotal(items).toFixed(2),
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

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{contact.fullName}</h1>
          <p className="text-sm text-muted-foreground">
            {[contact.phone, contact.email, contact.country, contact.city].filter(Boolean).join(" · ") ||
              t("noContactInfo")}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {t(`lifecycle.${contact.lifecycleStage}`)}
            </span>
            {contact.source && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{contact.source}</span>
            )}
            {contact.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
          {contact.aiSummary && (
            <p className="mt-2 max-w-md rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">{contact.aiSummary}</p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/appointments/new?contactId=${contact.id}`}>{tAppointments("newAppointment")}</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/orders/new?contactId=${contact.id}`}>{tOrders("newOrder")}</Link>
          </Button>
        </div>
      </div>

      <TaskPanel contactId={contact.id} initialTasks={tasks} />

      <NotePanel contactId={contact.id} initialNotes={notes} />

      <div className="space-y-3">
        <h2 className="text-sm font-medium">{t("timelineHeading")}</h2>
        {timeline.length === 0 ? (
          <p className="text-sm text-muted-foreground">{tActivity("empty")}</p>
        ) : (
          <div className="divide-y rounded-lg border">
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
