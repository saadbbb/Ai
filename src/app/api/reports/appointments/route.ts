import { appointmentRepository } from "@/features/appointments/repository/appointment.repository";
import { requireFeature, requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { parseReportFormat, reportResponse } from "@/lib/report-response";

export async function GET(request: Request) {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "appointments");

  const format = parseReportFormat(new URL(request.url).searchParams.get("format"));
  const appointments = await appointmentRepository.findByWorkspaceId(workspace.id);

  return reportResponse(
    format,
    "appointments",
    "Appointments",
    ["Customer", "Phone", "Service", "Scheduled At", "Duration (min)", "Status"],
    appointments.map(({ appointment, contact }) => [
      contact.fullName,
      contact.phone ?? "",
      appointment.serviceName ?? "",
      appointment.scheduledAt.toISOString(),
      appointment.durationMinutes,
      appointment.status,
    ]),
  );
}
