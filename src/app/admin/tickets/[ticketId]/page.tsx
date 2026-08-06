import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminTicketReplyForm } from "@/features/support/components/admin-ticket-reply-form";
import { TicketStatusSelect } from "@/features/support/components/ticket-status-select";
import { TicketThread } from "@/features/support/components/ticket-thread";
import { ticketAdminService } from "@/features/support/services/ticket-admin.service";
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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/admin/tickets" className="text-sm text-muted-foreground hover:underline">
          {t("backLink")}
        </Link>
        <div className="mt-1 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">{ticket.subject}</h1>
            <p className="text-sm text-muted-foreground">{workspaceName}</p>
          </div>
          <TicketStatusSelect ticketId={ticket.id} initialStatus={ticket.status} />
        </div>
      </div>

      <TicketThread messages={messages} tenantLabel={workspaceName} adminLabel={t("thread.supportTeam")} />
      <AdminTicketReplyForm ticketId={ticket.id} />
    </div>
  );
}
