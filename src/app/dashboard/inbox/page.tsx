import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { InboxList } from "@/features/inbox/components/inbox-list";
import { inboxService } from "@/features/inbox/services/inbox.service";
import { requireFeature, requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";

export default async function InboxPage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "inbox");
  const t = await getTranslations("inbox.list");
  const tCommon = await getTranslations("common");

  const conversations = await inboxService.listConversations(workspace.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <a href="/api/reports/conversations">{tCommon("exportCsv")}</a>
          </Button>
          <Button asChild>
            <Link href="/dashboard/inbox/new">{t("newConversation")}</Link>
          </Button>
        </div>
      </div>

      <InboxList initialConversations={conversations} />
    </div>
  );
}
