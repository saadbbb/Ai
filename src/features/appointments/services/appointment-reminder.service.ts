import "server-only";
import { notificationRepository } from "@/features/notifications/repository/notification.repository";
import { emailService } from "@/lib/email";
import { appointmentRepository } from "../repository/appointment.repository";

const REMINDER_WINDOW_HOURS = 24;
const HOUR_MS = 60 * 60 * 1000;

export interface AppointmentReminderResult {
  reminded: number;
}

/**
 * Runs once a day via /api/cron/appointment-reminders (see vercel.json) — PART 5's
 * "Appointment tomorrow -> Reminder" follow-up example. Emails the customer directly
 * when they have an address on file, and always leaves an in-app notification for the
 * workspace regardless, since not every contact has an email. Never throws for a single
 * appointment's failure, same pattern as crmFollowupsService/subscriptionCheckService.
 */
async function runDailyCheck(): Promise<AppointmentReminderResult> {
  const from = new Date();
  const to = new Date(Date.now() + REMINDER_WINDOW_HOURS * HOUR_MS);
  const due = await appointmentRepository.findDueForReminder(from, to);

  let reminded = 0;
  for (const { appointment, contact } of due) {
    try {
      const formattedTime = appointment.scheduledAt.toISOString();

      if (contact.email) {
        await emailService.sendNotificationEmail({
          to: contact.email,
          subject: "Appointment reminder",
          text: `Hi ${contact.fullName},\n\nThis is a reminder about your upcoming appointment${
            appointment.serviceName ? ` for ${appointment.serviceName}` : ""
          } at ${formattedTime}.\n\nSee you then!`,
        });
      }

      await notificationRepository.create({
        workspaceId: appointment.workspaceId,
        type: "appointment_reminder",
        title: `Upcoming appointment: ${contact.fullName}`,
        message: `${contact.fullName} has an appointment${appointment.serviceName ? ` (${appointment.serviceName})` : ""} at ${formattedTime}.`,
        link: `/dashboard/appointments`,
      });
      await appointmentRepository.markReminderSent(appointment.id);
      reminded += 1;
    } catch (error) {
      console.error(`[appointment-reminders] failed for appointment ${appointment.id}:`, error);
    }
  }

  return { reminded };
}

export const appointmentReminderService = {
  runDailyCheck,
};
