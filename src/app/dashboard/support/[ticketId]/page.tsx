import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { TicketReplyForm } from "@/features/support/components/ticket-reply-form";
import { TicketThread } from "@/features/support/components/ticket-thread";
import { ticketService } from "@/features/support/services/ticket.service";
import { requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";
import { AppError } from "@/lib/errors/app-error";

interface PageProps {
  params: Promise<{ ticketId: string }>;
}

export default async function SupportTicketDetailPage({ params }: PageProps) {
  const { ticketId } = await params;
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireWorkspacePermission(user.id, workspace.id, "support.tickets.view");
  const t = await getTranslations("support");

  let data;
  try {
    data = await ticketService.getTicketWithMessages(workspace.id, ticketId);
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
  const { ticket, messages } = data;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/dashboard/support" className="text-sm text-muted-foreground hover:underline">
          {t("backLink")}
        </Link>
        <PageHeader
          className="mt-1"
          title={ticket.subject}
          actions={<span className="shrink-0 text-sm text-muted-foreground">{t(`statuses.${ticket.status}`)}</span>}
        />
      </div>

      <TicketThread messages={messages} tenantLabel={t("thread.you")} adminLabel={t("thread.supportTeam")} />
      <TicketReplyForm ticketId={ticket.id} />
    </div>
  );
}
