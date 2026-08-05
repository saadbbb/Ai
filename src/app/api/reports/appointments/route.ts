import { appointmentRepository } from "@/features/appointments/repository/appointment.repository";
import { requireFeature, requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { csvResponse, toCsv } from "@/lib/csv";

export async function GET() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "appointments");

  const appointments = await appointmentRepository.findByWorkspaceId(workspace.id);
  const csv = toCsv(
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

  return csvResponse("appointments", csv);
}
