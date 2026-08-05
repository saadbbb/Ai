import "server-only";
import type { Appointment, AppointmentStatus } from "@/db/schema";
import { activityRepository, type ActivityActor } from "@/features/crm/repository/activity.repository";
import { automationService } from "@/features/automation/services/automation.service";
import { AppError } from "@/lib/errors/app-error";
import { appointmentRepository, type AppointmentListItem } from "../repository/appointment.repository";

interface CreateAppointmentInput {
  contactId: string;
  serviceId?: string;
  serviceName?: string;
  conversationId?: string;
  scheduledAt: Date;
  durationMinutes: number;
  notes?: string;
}

async function listAppointments(workspaceId: string): Promise<AppointmentListItem[]> {
  return appointmentRepository.findByWorkspaceId(workspaceId);
}

async function getAppointment(workspaceId: string, appointmentId: string): Promise<AppointmentListItem> {
  const appointment = await appointmentRepository.findById(appointmentId, workspaceId);
  if (!appointment) {
    throw new AppError("NOT_FOUND", "Appointment not found.");
  }
  return appointment;
}

async function createAppointment(
  workspaceId: string,
  input: CreateAppointmentInput,
  actor: ActivityActor,
): Promise<Appointment> {
  const appointment = await appointmentRepository.create({
    workspaceId,
    contactId: input.contactId,
    serviceId: input.serviceId ?? null,
    serviceName: input.serviceName ?? null,
    conversationId: input.conversationId ?? null,
    scheduledAt: input.scheduledAt,
    durationMinutes: input.durationMinutes,
    notes: input.notes ?? null,
  });

  await automationService.dispatch(workspaceId, { type: "appointment_created", contactId: appointment.contactId });
  await activityRepository.log({
    workspaceId,
    contactId: appointment.contactId,
    type: "appointment_created",
    actor,
    summary: `Appointment booked${appointment.serviceName ? `: ${appointment.serviceName}` : ""}.`,
  });

  return appointment;
}

async function updateAppointmentStatus(
  workspaceId: string,
  appointmentId: string,
  status: AppointmentStatus,
  actor: ActivityActor,
): Promise<Appointment> {
  const appointment = await appointmentRepository.updateStatus(appointmentId, workspaceId, status);
  if (!appointment) {
    throw new AppError("NOT_FOUND", "Appointment not found.");
  }

  await automationService.dispatch(workspaceId, {
    type: "appointment_status_changed",
    contactId: appointment.contactId,
    status,
  });
  await activityRepository.log({
    workspaceId,
    contactId: appointment.contactId,
    type: "appointment_status_changed",
    actor,
    summary: `Appointment status changed to "${status}".`,
  });

  return appointment;
}

export const appointmentService = {
  listAppointments,
  getAppointment,
  createAppointment,
  updateAppointmentStatus,
};
