import "server-only";
import { z } from "zod";
import { appointmentService } from "@/features/appointments/services/appointment.service";
import { serviceRepository } from "@/features/knowledge-base/repository/service.repository";
import { AppError } from "@/lib/errors/app-error";
import type { AiTool, ToolContext } from "./types";

const DEFAULT_DURATION_MINUTES = 30;

const schema = z.object({
  serviceName: z.string().trim().min(1).max(200).optional(),
  scheduledAt: z.coerce.date(),
  durationMinutes: z.coerce.number().int().positive().max(24 * 60).optional(),
  notes: z.string().trim().max(2000).optional(),
});

async function execute(context: ToolContext, input: z.infer<typeof schema>): Promise<string> {
  if (input.scheduledAt.getTime() < Date.now()) {
    throw new AppError("VALIDATION_ERROR", "That time has already passed — ask the customer for a future date and time.");
  }

  const services = await serviceRepository.findByWorkspaceId(context.workspaceId);
  const matched = input.serviceName
    ? services.find((service) => service.name.toLowerCase() === input.serviceName!.toLowerCase())
    : undefined;

  const appointment = await appointmentService.createAppointment(
    context.workspaceId,
    {
      contactId: context.contactId,
      conversationId: context.conversationId,
      serviceId: matched?.id,
      serviceName: input.serviceName ?? matched?.name,
      scheduledAt: input.scheduledAt,
      durationMinutes: input.durationMinutes ?? matched?.durationMinutes ?? DEFAULT_DURATION_MINUTES,
      notes: input.notes,
    },
    { type: "ai" },
  );

  return `Booked "${appointment.serviceName ?? "an appointment"}" for ${appointment.scheduledAt.toISOString()}.`;
}

export const bookAppointmentTool: AiTool<z.infer<typeof schema>> = {
  name: "book_appointment",
  description:
    "Book an appointment or consultation for the customer. Match serviceName exactly to one of the business's " +
    "listed services when possible. scheduledAt must be an ISO 8601 date-time in the future.",
  schema,
  jsonSchema: {
    type: "object",
    properties: {
      serviceName: { type: "string", description: "The exact name of the service being booked, if known." },
      scheduledAt: { type: "string", format: "date-time", description: "ISO 8601 date-time of the appointment." },
      durationMinutes: { type: "integer", description: "Duration in minutes, if different from the service default." },
      notes: { type: "string", description: "Anything else useful for the team about this booking." },
    },
    required: ["scheduledAt"],
    additionalProperties: false,
  },
  execute,
};
