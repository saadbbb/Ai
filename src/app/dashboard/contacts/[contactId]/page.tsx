import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { appointmentRepository } from "@/features/appointments/repository/appointment.repository";
import { NotePanel } from "@/features/crm/components/note-panel";
import { TaskPanel } from "@/features/crm/components/task-panel";
import { activityRepository } from "@/features/crm/repository/activity.repository";
import { calculateLeadScore, leadTemperature } from "@/features/crm/lib/lead-score";
import { leadRepository } from "@/features/crm/repository/lead.repository";
import { noteRepository } from "@/features/crm/repository/note.repository";
import { taskRepository } from "@/features/crm/repository/task.repository";
import { AiStatusBadge } from "@/features/inbox/components/ai-status-badge";
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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/dashboard/contacts" className="text-sm text-muted-foreground hover:text-foreground">
        {t("backLink")}
      </Link>

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{contact.fullName}</h1>
          <p className="text-sm text-muted-foreground">
            {[contact.phone, contact.email].filter(Boolean).join(" · ") || t("noContactInfo")}
          </p>
          {contact.tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {contact.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
          )}
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
        <h2 className="text-sm font-medium">{tAppointments("title")}</h2>
        {appointmentList.length === 0 ? (
          <p className="text-sm text-muted-foreground">{tAppointments("noAppointmentsForContact")}</p>
        ) : (
          <div className="divide-y rounded-lg border">
            {appointmentList.map(({ appointment }) => (
              <div key={appointment.id} className="flex items-center justify-between p-3 text-sm">
                <span>
                  {formatter.format(appointment.scheduledAt)}
                  {appointment.serviceName ? ` · ${appointment.serviceName}` : ""}
                </span>
                <span className="text-xs text-muted-foreground">{tAppointments(`statuses.${appointment.status}`)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium">{tOrders("title")}</h2>
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">{tOrders("noOrdersForContact")}</p>
        ) : (
          <div className="divide-y rounded-lg border">
            {orders.map(({ order, items }) => (
              <Link
                key={order.id}
                href={`/dashboard/orders/${order.id}`}
                className="flex items-center justify-between gap-4 p-3 hover:bg-muted"
              >
                <span className="text-sm">
                  {tOrders(`statuses.${order.status}`)} · {orderTotal(items).toFixed(2)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium">{t("leadsHeading")}</h2>
        {leads.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noLeads")}</p>
        ) : (
          <div className="divide-y rounded-lg border">
            {leads.map((lead) => {
              const score = calculateLeadScore({
                messageCount: lead.conversationId ? (messageCounts.get(lead.conversationId) ?? 0) : 0,
                hasOrder,
                hasAppointment,
                tags: contact.tags,
                stage: lead.stage,
                lastContactAt: contact.lastContactAt,
              });
              return (
                <div key={lead.id} className="flex items-center justify-between p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span>{tLeads(`stages.${lead.stage}`)}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {tLeads(`temperature.${leadTemperature(score)}`)} · {score}
                    </span>
                  </div>
                  {lead.conversationId && (
                    <Link
                      href={`/dashboard/inbox/${lead.conversationId}`}
                      className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                    >
                      {tLeads("viewConversation")}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium">{t("conversationsHeading")}</h2>
        {conversations.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noConversations")}</p>
        ) : (
          <div className="divide-y rounded-lg border">
            {conversations.map(({ conversation }) => (
              <Link
                key={conversation.id}
                href={`/dashboard/inbox/${conversation.id}`}
                className="flex items-center justify-between gap-4 p-3 hover:bg-muted"
              >
                <span className="truncate text-sm">{conversation.lastMessagePreview ?? t("noMessagesYet")}</span>
                <AiStatusBadge status={conversation.aiStatus} />
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium">{tActivity("title")}</h2>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">{tActivity("empty")}</p>
        ) : (
          <div className="divide-y rounded-lg border">
            {activities.map((activity) => {
              const row = (
                <div className="flex items-center justify-between gap-3 p-3 text-sm">
                  <span>{activity.summary}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatter.format(activity.createdAt)}</span>
                </div>
              );
              return activity.link ? (
                <Link key={activity.id} href={activity.link} className="block hover:bg-muted">
                  {row}
                </Link>
              ) : (
                <div key={activity.id}>{row}</div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
