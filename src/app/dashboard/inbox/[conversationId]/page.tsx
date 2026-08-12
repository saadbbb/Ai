import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { appointmentRepository } from "@/features/appointments/repository/appointment.repository";
import { CreateLeadButton } from "@/features/crm/components/create-lead-button";
import { activityRepository } from "@/features/crm/repository/activity.repository";
import { leadRepository } from "@/features/crm/repository/lead.repository";
import { noteRepository } from "@/features/crm/repository/note.repository";
import { ContextPanelSheetTrigger } from "@/features/inbox/components/context-panel-responsive";
import { ConversationContextPanel } from "@/features/inbox/components/conversation-context-panel";
import { ConversationThread } from "@/features/inbox/components/conversation-thread";
import { messageTemplateRepository } from "@/features/inbox/repository/message-template.repository";
import { inboxService } from "@/features/inbox/services/inbox.service";
import { orderRepository } from "@/features/orders/repository/order.repository";
import { membershipRepository } from "@/features/workspace/repository/membership.repository";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";

interface PageProps {
  params: Promise<{ conversationId: string }>;
}

export default async function ConversationPage({ params }: PageProps) {
  const { conversationId } = await params;
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  const t = await getTranslations("inbox.thread");

  const data = await inboxService.getConversation(workspace.id, conversationId);
  if (!data) notFound();

  const contactId = data.contact.id;
  const [existingLead, orders, appointments, notes, activities, members, templates] = await Promise.all([
    leadRepository.findByConversationId(conversationId, workspace.id),
    orderRepository.findByContactId(contactId, workspace.id),
    appointmentRepository.findByContactId(contactId, workspace.id),
    noteRepository.findByContactId(contactId, workspace.id, user.id),
    activityRepository.findByContactId(contactId, workspace.id),
    membershipRepository.findMembersByWorkspaceId(workspace.id),
    messageTemplateRepository.findByWorkspaceId(workspace.id),
  ]);

  const contextPanel = (
    <ConversationContextPanel
      contactId={contactId}
      lead={existingLead}
      orders={orders}
      appointments={appointments}
      notes={notes}
      activitySummaries={activities.map((activity) => activity.summary)}
    />
  );

  return (
    <div className="flex h-full items-start gap-4">
      <div className="flex h-full min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <Link href="/dashboard/inbox" className="text-sm text-muted-foreground hover:text-foreground md:hidden">
            {t("backLink")}
          </Link>
          <CreateLeadButton conversationId={conversationId} initialLeadId={existingLead?.id ?? null} />
          <div className="lg:hidden">
            <ContextPanelSheetTrigger triggerLabel={t("customerInfo")}>{contextPanel}</ContextPanelSheetTrigger>
          </div>
        </div>
        <div className="min-h-0 flex-1">
          <ConversationThread
            conversation={data.conversation}
            contact={data.contact}
            channel={data.channel}
            initialMessages={data.messages}
            members={members.map(({ user: member }) => ({ id: member.id, email: member.name ?? member.email ?? member.phone ?? "" }))}
            initialTemplates={templates}
          />
        </div>
      </div>
      <div className="hidden h-full lg:block">{contextPanel}</div>
    </div>
  );
}
