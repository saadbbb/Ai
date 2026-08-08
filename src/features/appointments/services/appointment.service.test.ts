import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Appointment, Contact } from "@/db/schema";

vi.mock("@/features/crm/repository/activity.repository", () => ({
  activityRepository: { log: vi.fn() },
}));

vi.mock("@/features/automation/services/automation.service", () => ({
  automationService: { dispatch: vi.fn() },
}));

vi.mock("@/features/inbox/repository/contact.repository", () => ({
  contactRepository: { findById: vi.fn() },
}));

vi.mock("../repository/appointment.repository", () => ({
  appointmentRepository: {
    findByWorkspaceId: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
  },
}));

const { activityRepository } = await import("@/features/crm/repository/activity.repository");
const { automationService } = await import("@/features/automation/services/automation.service");
const { contactRepository } = await import("@/features/inbox/repository/contact.repository");
const { appointmentRepository } = await import("../repository/appointment.repository");
const { appointmentService } = await import("./appointment.service");

const WORKSPACE_ID = "workspace-1";
const CONTACT_ID = "contact-1";
const ACTOR = { type: "human" as const, userId: "user-1" };

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: CONTACT_ID,
    workspaceId: WORKSPACE_ID,
    fullName: "Jane Customer",
    phone: null,
    whatsappId: null,
    instagramId: null,
    email: null,
    language: null,
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

function makeAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: "appointment-1",
    workspaceId: WORKSPACE_ID,
    contactId: CONTACT_ID,
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

function makeAppointmentListItem(overrides: { appointment?: Partial<Appointment>; contact?: Partial<Contact> } = {}) {
  return { appointment: makeAppointment(overrides.appointment), contact: makeContact(overrides.contact) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("appointmentService.createAppointment", () => {
  it("books an appointment once the contact is confirmed to belong to this workspace", async () => {
    vi.mocked(contactRepository.findById).mockResolvedValue(makeContact());
    vi.mocked(appointmentRepository.create).mockResolvedValue(makeAppointment());

    const appointment = await appointmentService.createAppointment(
      WORKSPACE_ID,
      { contactId: CONTACT_ID, scheduledAt: new Date(), durationMinutes: 30 },
      ACTOR,
    );

    expect(appointment.id).toBe("appointment-1");
    expect(contactRepository.findById).toHaveBeenCalledWith(CONTACT_ID, WORKSPACE_ID);
    expect(appointmentRepository.create).toHaveBeenCalled();
    expect(automationService.dispatch).toHaveBeenCalledWith(WORKSPACE_ID, {
      type: "appointment_created",
      contactId: CONTACT_ID,
    });
    expect(activityRepository.log).toHaveBeenCalled();
  });

  it("rejects a contactId that doesn't belong to this workspace (cross-tenant IDOR guard)", async () => {
    vi.mocked(contactRepository.findById).mockResolvedValue(null);

    await expect(
      appointmentService.createAppointment(
        WORKSPACE_ID,
        { contactId: "someone-elses-contact", scheduledAt: new Date(), durationMinutes: 30 },
        ACTOR,
      ),
    ).rejects.toThrow("Contact not found.");

    expect(appointmentRepository.create).not.toHaveBeenCalled();
    expect(automationService.dispatch).not.toHaveBeenCalled();
    expect(activityRepository.log).not.toHaveBeenCalled();
  });
});

describe("appointmentService.updateAppointmentStatus", () => {
  it("throws NOT_FOUND when the appointment doesn't exist in this workspace", async () => {
    vi.mocked(appointmentRepository.findById).mockResolvedValue(null);

    await expect(
      appointmentService.updateAppointmentStatus(WORKSPACE_ID, "missing-appointment", "confirmed", ACTOR),
    ).rejects.toThrow("Appointment not found.");
    expect(appointmentRepository.updateStatus).not.toHaveBeenCalled();
  });

  it("rejects an illegal status transition (state machine guard)", async () => {
    vi.mocked(appointmentRepository.findById).mockResolvedValue(makeAppointmentListItem({ appointment: { status: "completed" } }));

    await expect(
      appointmentService.updateAppointmentStatus(WORKSPACE_ID, "appointment-1", "scheduled", ACTOR),
    ).rejects.toThrow('An appointment can\'t move from "completed" to "scheduled".');
    expect(appointmentRepository.updateStatus).not.toHaveBeenCalled();
  });

  it("dispatches an appointment_status_changed automation event", async () => {
    vi.mocked(appointmentRepository.findById).mockResolvedValue(makeAppointmentListItem({ appointment: { status: "confirmed" } }));
    vi.mocked(appointmentRepository.updateStatus).mockResolvedValue(makeAppointment({ status: "completed" }));

    await appointmentService.updateAppointmentStatus(WORKSPACE_ID, "appointment-1", "completed", ACTOR);

    expect(automationService.dispatch).toHaveBeenCalledWith(WORKSPACE_ID, {
      type: "appointment_status_changed",
      contactId: CONTACT_ID,
      status: "completed",
    });
  });
});
