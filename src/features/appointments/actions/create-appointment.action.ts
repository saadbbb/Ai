"use server";

import type { Appointment } from "@/db/schema";
import { requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { appointmentService } from "../services/appointment.service";
import { createAppointmentSchema } from "../validation/schemas";

export async function createAppointmentAction(input: unknown): Promise<ActionResult<Appointment>> {
  const parsed = createAppointmentSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireWorkspacePermission(user.id, workspace.id, "crm.records.manage");

  try {
    const appointment = await appointmentService.createAppointment(workspace.id, parsed.data, {
      type: "human",
      userId: user.id,
    });
    return actionOk(appointment);
  } catch (error) {
    return actionFail(error);
  }
}
