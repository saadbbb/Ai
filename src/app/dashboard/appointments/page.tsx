import { CalendarDays } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { AppointmentStatusSelect } from "@/features/appointments/components/appointment-status-select";
import { appointmentService } from "@/features/appointments/services/appointment.service";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { ExportButtons } from "@/components/export-buttons";
import { PageHeader } from "@/components/page-header";
import { membershipRepository } from "@/features/workspace/repository/membership.repository";
import { requireFeature, requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";

export default async function AppointmentsPage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "appointments");
  const t = await getTranslations("appointments");
  const tCommon = await getTranslations("common");

  const [appointments, members] = await Promise.all([
    appointmentService.listAppointments(workspace.id),
    membershipRepository.findMembersByWorkspaceId(workspace.id),
  ]);
  const memberNameById = new Map(members.map((item) => [item.user.id, item.user.email]));
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: workspace.timezone,
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <>
            <ExportButtons
              reportPath="/api/reports/appointments"
              labels={{ csv: tCommon("exportCsv"), excel: tCommon("exportExcel"), pdf: tCommon("exportPdf") }}
            />
            <Button asChild>
              <Link href="/dashboard/appointments/new">{t("newAppointment")}</Link>
            </Button>
          </>
        }
      />

      {appointments.length === 0 ? (
        <EmptyState icon={CalendarDays} title={t("emptyState")} />
      ) : (
        <div className="divide-y overflow-hidden rounded-xl border bg-card">
          {appointments.map(({ appointment, contact }) => {
            const assignedToName = appointment.assignedToUserId ? memberNameById.get(appointment.assignedToUserId) : undefined;
            return (
            <div key={appointment.id} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="truncate font-medium">{contact.fullName}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {formatter.format(appointment.scheduledAt)}
                  {appointment.serviceName ? ` · ${appointment.serviceName}` : ""}
                  {assignedToName ? ` · ${t("assignedTo", { name: assignedToName })}` : ""}
                </p>
              </div>
              <div className="w-40 shrink-0">
                <AppointmentStatusSelect appointmentId={appointment.id} initialStatus={appointment.status} />
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
