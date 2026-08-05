import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CreateLeadButton } from "@/features/crm/components/create-lead-button";
import { leadRepository } from "@/features/crm/repository/lead.repository";
import { ConversationThread } from "@/features/inbox/components/conversation-thread";
import { inboxService } from "@/features/inbox/services/inbox.service";
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

  const existingLead = await leadRepository.findByConversationId(conversationId, workspace.id);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/dashboard/inbox" className="text-sm text-muted-foreground hover:text-foreground">
          {t("backLink")}
        </Link>
        <CreateLeadButton conversationId={conversationId} initialLeadId={existingLead?.id ?? null} />
      </div>
      <ConversationThread
        conversation={data.conversation}
        contact={data.contact}
        channel={data.channel}
        initialMessages={data.messages}
      />
    </div>
  );
}
