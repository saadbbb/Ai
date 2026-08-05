import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { AppointmentStatusSelect } from "@/features/appointments/components/appointment-status-select";
import { appointmentService } from "@/features/appointments/services/appointment.service";
import { Button } from "@/components/ui/button";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";

export default async function AppointmentsPage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  const t = await getTranslations("appointments");

  const appointments = await appointmentService.listAppointments(workspace.id);
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: workspace.timezone,
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/appointments/new">{t("newAppointment")}</Link>
        </Button>
      </div>

      {appointments.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {t("emptyState")}
        </p>
      ) : (
        <div className="divide-y rounded-lg border">
          {appointments.map(({ appointment, contact }) => (
            <div key={appointment.id} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="truncate font-medium">{contact.fullName}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {formatter.format(appointment.scheduledAt)}
                  {appointment.serviceName ? ` · ${appointment.serviceName}` : ""}
                </p>
              </div>
              <div className="w-40 shrink-0">
                <AppointmentStatusSelect appointmentId={appointment.id} initialStatus={appointment.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
