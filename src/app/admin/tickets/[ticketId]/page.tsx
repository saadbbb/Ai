import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { AdminTicketReplyForm } from "@/features/support/components/admin-ticket-reply-form";
import { TicketAssigneeSelect } from "@/features/support/components/ticket-assignee-select";
import { TicketCategorySelect } from "@/features/support/components/ticket-category-select";
import { TicketStatusSelect } from "@/features/support/components/ticket-status-select";
import { TicketThread } from "@/features/support/components/ticket-thread";
import { ticketAdminService } from "@/features/support/services/ticket-admin.service";
import { platformAdminService } from "@/features/platform-admin/services/platform-admin.service";
import { requirePlatformAdmin } from "@/lib/auth/auth-guard";
import { AppError } from "@/lib/errors/app-error";

interface PageProps {
  params: Promise<{ ticketId: string }>;
}

export default async function AdminTicketDetailPage({ params }: PageProps) {
  const { ticketId } = await params;
  await requirePlatformAdmin();
  const t = await getTranslations("platformAdmin.tickets");

  let data;
  try {
    data = await ticketAdminService.getTicketWithMessages(ticketId);
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
  const { ticket, workspaceName, messages } = data;
  const admins = await platformAdminService.listAssignableAdmins();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/admin/tickets" className="text-sm text-muted-foreground hover:underline">
          {t("backLink")}
        </Link>
        <div className="mt-1">
          <PageHeader
            title={ticket.subject}
            description={workspaceName}
            actions={<TicketStatusSelect ticketId={ticket.id} initialStatus={ticket.status} />}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <TicketCategorySelect ticketId={ticket.id} initialCategory={ticket.category} />
          <TicketAssigneeSelect ticketId={ticket.id} initialAssigneeUserId={ticket.assignedAdminUserId} admins={admins} />
        </div>
      </div>

      <TicketThread
        messages={messages}
        tenantLabel={workspaceName}
        adminLabel={t("thread.supportTeam")}
        internalNoteLabel={t("thread.internalNote")}
      />
      <AdminTicketReplyForm ticketId={ticket.id} />
    </div>
  );
}
