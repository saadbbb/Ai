import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AiStatusBadge } from "@/features/inbox/components/ai-status-badge";
import { inboxService } from "@/features/inbox/services/inbox.service";
import { requireFeature, requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";

const CHANNEL_LABEL_KEY = {
  manual: "channelManual",
  whatsapp: "channelWhatsapp",
  instagram: "channelInstagram",
} as const;

export default async function InboxPage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "inbox");
  const t = await getTranslations("inbox.list");

  const conversations = await inboxService.listConversations(workspace.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/inbox/new">{t("newConversation")}</Link>
        </Button>
      </div>

      {conversations.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {t("emptyState")}
        </p>
      ) : (
        <div className="divide-y rounded-lg border">
          {conversations.map(({ conversation, contact, channel }) => (
            <Link
              key={conversation.id}
              href={`/dashboard/inbox/${conversation.id}`}
              className="flex items-center justify-between gap-4 p-4 hover:bg-muted"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium">{contact.fullName}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {t(CHANNEL_LABEL_KEY[channel.type])}
                  </span>
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {conversation.lastMessagePreview ?? t("noMessages")}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {conversation.status === "closed" && (
                  <span className="text-xs text-muted-foreground">{t("closedBadge")}</span>
                )}
                <AiStatusBadge status={conversation.aiStatus} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
