import { z } from "zod";
import { appointmentStatusEnum } from "@/db/schema";

export const createAppointmentSchema = z.object({
  contactId: z.string().uuid(),
  serviceId: z.string().uuid().optional(),
  serviceName: z.string().trim().max(200).optional(),
  scheduledAt: z.coerce.date(),
  durationMinutes: z.coerce.number().int().positive().max(24 * 60),
  notes: z.string().trim().max(2000).optional(),
  assignedToUserId: z.string().uuid().optional(),
});

export const updateAppointmentStatusSchema = z.object({
  appointmentId: z.string().uuid(),
  status: z.enum(appointmentStatusEnum.enumValues),
});
