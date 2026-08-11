import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { CoachMark } from "@/components/coach-mark";
import { Button } from "@/components/ui/button";
import { ExportButtons } from "@/components/export-buttons";
import { PageHeader } from "@/components/page-header";
import { InboxList } from "@/features/inbox/components/inbox-list";
import { inboxService } from "@/features/inbox/services/inbox.service";
import { requireFeature, requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";

export default async function InboxPage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "inbox");
  const t = await getTranslations("inbox.list");
  const tCommon = await getTranslations("common");
  const tCoach = await getTranslations("coachMarks.inbox");
  const exportLabels = { csv: tCommon("exportCsv"), excel: tCommon("exportExcel"), pdf: tCommon("exportPdf") };

  const conversations = await inboxService.listConversations(workspace.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <>
            <ExportButtons reportPath="/api/reports/conversations" labels={exportLabels} />
            <Button asChild>
              <Link href="/dashboard/inbox/new">{t("newConversation")}</Link>
            </Button>
          </>
        }
      />

      <CoachMark id="inbox-list" title={tCoach("title")} description={tCoach("description")} />
      <InboxList initialConversations={conversations} />
    </div>
  );
}
