import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Appointment, Contact } from "@/db/schema";

vi.mock("../repository/appointment.repository", () => ({
  appointmentRepository: { findDueForReminder: vi.fn(), markReminderSent: vi.fn() },
}));

vi.mock("@/features/notifications/repository/notification.repository", () => ({
  notificationRepository: { create: vi.fn() },
}));

vi.mock("@/lib/email", () => ({
  emailService: { sendNotificationEmail: vi.fn() },
}));

const { appointmentRepository } = await import("../repository/appointment.repository");
const { notificationRepository } = await import("@/features/notifications/repository/notification.repository");
const { emailService } = await import("@/lib/email");
const { appointmentReminderService } = await import("./appointment-reminder.service");

function makeAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: "appointment-1",
    workspaceId: "workspace-1",
    contactId: "contact-1",
    serviceId: null,
    serviceName: "Haircut",
    conversationId: null,
    scheduledAt: new Date(),
    durationMinutes: 30,
    status: "scheduled",
    assignedToUserId: null,
    reminderSentAt: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: "contact-1",
    workspaceId: "workspace-1",
    fullName: "Ahmed",
    phone: null,
    whatsappId: null,
    instagramId: null,
    email: null,
    language: "en",
    tags: [],
    notes: null,
    aiSummary: null,
    avatarUrl: null,
    country: null,
    city: null,
    source: null,
    lifecycleStage: "lead",
    assignedAgentId: null,
    lastContactAt: null,
    address: null,
    budget: null,
    preferredContactMethod: null,
    preferredProducts: [],
    birthDate: null,
    gender: null,
    timezone: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("appointmentReminderService.runDailyCheck", () => {
  it("emails the contact when an address is on file, notifies in-app, and marks the reminder sent", async () => {
    vi.mocked(appointmentRepository.findDueForReminder).mockResolvedValue([
      { appointment: makeAppointment(), contact: makeContact({ email: "ahmed@example.com" }) },
    ]);

    const result = await appointmentReminderService.runDailyCheck();

    expect(result.reminded).toBe(1);
    expect(emailService.sendNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "ahmed@example.com" }),
    );
    expect(notificationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: "workspace-1", type: "appointment_reminder" }),
    );
    expect(appointmentRepository.markReminderSent).toHaveBeenCalledWith("appointment-1");
  });

  it("skips the email but still notifies in-app when the contact has no email on file", async () => {
    vi.mocked(appointmentRepository.findDueForReminder).mockResolvedValue([
      { appointment: makeAppointment(), contact: makeContact({ email: null }) },
    ]);

    const result = await appointmentReminderService.runDailyCheck();

    expect(result.reminded).toBe(1);
    expect(emailService.sendNotificationEmail).not.toHaveBeenCalled();
    expect(notificationRepository.create).toHaveBeenCalled();
    expect(appointmentRepository.markReminderSent).toHaveBeenCalledWith("appointment-1");
  });

  it("continues past a single appointment's failure without throwing", async () => {
    vi.mocked(appointmentRepository.findDueForReminder).mockResolvedValue([
      { appointment: makeAppointment({ id: "appointment-1" }), contact: makeContact() },
      { appointment: makeAppointment({ id: "appointment-2" }), contact: makeContact({ id: "contact-2", fullName: "Sara" }) },
    ]);
    vi.mocked(notificationRepository.create)
      .mockRejectedValueOnce(new Error("db down"))
      // @ts-expect-error only the call succeeding matters for this test, not the return shape
      .mockResolvedValueOnce(undefined);

    const result = await appointmentReminderService.runDailyCheck();

    expect(result.reminded).toBe(1);
    expect(appointmentRepository.markReminderSent).toHaveBeenCalledTimes(1);
    expect(appointmentRepository.markReminderSent).toHaveBeenCalledWith("appointment-2");
  });

  it("returns zero reminded when nothing is due", async () => {
    vi.mocked(appointmentRepository.findDueForReminder).mockResolvedValue([]);

    const result = await appointmentReminderService.runDailyCheck();

    expect(result.reminded).toBe(0);
    expect(notificationRepository.create).not.toHaveBeenCalled();
  });
});
