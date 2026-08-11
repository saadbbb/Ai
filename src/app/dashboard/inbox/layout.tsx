import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CoachMark } from "@/components/coach-mark";
import { InboxShell } from "@/features/inbox/components/inbox-shell";
import { inboxService } from "@/features/inbox/services/inbox.service";
import { requireFeature, requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";

export default async function InboxLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "inbox");
  const t = await getTranslations("inbox.list");
  const tCoach = await getTranslations("coachMarks.inbox");

  const conversations = await inboxService.listConversations(workspace.id);

  return (
    <InboxShell
      initialConversations={conversations}
      listHeader={
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="truncate font-heading text-lg font-semibold text-foreground">{t("title")}</h1>
              <p className="truncate text-xs text-muted-foreground">{t("description")}</p>
            </div>
            <Button asChild size="sm">
              <Link href="/dashboard/inbox/new">{t("newConversation")}</Link>
            </Button>
          </div>
          <CoachMark id="inbox-list" title={tCoach("title")} description={tCoach("description")} />
        </div>
      }
    >
      {children}
    </InboxShell>
  );
}
