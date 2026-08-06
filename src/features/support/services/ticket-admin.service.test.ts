import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupportTicket } from "@/db/schema";

vi.mock("../repository/ticket-admin.repository", () => ({
  ticketAdminRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    updateStatus: vi.fn(),
    findMessagesByTicketId: vi.fn(),
    createMessage: vi.fn(),
  },
}));

vi.mock("@/features/notifications/repository/notification.repository", () => ({
  notificationRepository: {
    create: vi.fn(),
  },
}));

vi.mock("@/features/platform-admin/repository/audit-log.repository", () => ({
  auditLogRepository: {
    log: vi.fn(),
  },
}));

vi.mock("@/lib/email", () => ({
  emailService: {
    sendNotificationEmail: vi.fn(),
  },
}));

vi.mock("@/features/auth/repository/user.repository", () => ({
  userRepository: {
    findById: vi.fn(),
  },
}));

const { ticketAdminRepository } = await import("../repository/ticket-admin.repository");
const { notificationRepository } = await import("@/features/notifications/repository/notification.repository");
const { auditLogRepository } = await import("@/features/platform-admin/repository/audit-log.repository");
const { emailService } = await import("@/lib/email");
const { userRepository } = await import("@/features/auth/repository/user.repository");
const { ticketAdminService } = await import("./ticket-admin.service");

const WORKSPACE_ID = "workspace-1";
const ADMIN_ID = "admin-1";
const ADMIN_EMAIL = "admin@example.com";

function makeTicket(overrides: Partial<SupportTicket> = {}): SupportTicket {
  return {
    id: "ticket-1",
    workspaceId: WORKSPACE_ID,
    subject: "Help please",
    status: "open",
    priority: "medium",
    createdByUserId: "tenant-user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(userRepository.findById).mockResolvedValue({ id: "tenant-user-1", email: "owner@example.com" } as never);
});

describe("ticketAdminService.replyToTicket", () => {
  it("throws when the ticket doesn't exist", async () => {
    vi.mocked(ticketAdminRepository.findById).mockResolvedValue(null);

    await expect(ticketAdminService.replyToTicket(ADMIN_ID, ADMIN_EMAIL, "ticket-1", "hi")).rejects.toThrow(/not found/);
  });

  it("posts the reply, moves an open ticket to in_progress, notifies in-app, emails the owner, and logs an audit event", async () => {
    vi.mocked(ticketAdminRepository.findById).mockResolvedValue({
      ticket: makeTicket({ status: "open" }),
      workspaceName: "Acme Co",
      workspaceId: WORKSPACE_ID,
    });
    vi.mocked(ticketAdminRepository.createMessage).mockResolvedValue({ id: "message-1" } as never);

    await ticketAdminService.replyToTicket(ADMIN_ID, ADMIN_EMAIL, "ticket-1", "We're on it");

    expect(ticketAdminRepository.createMessage).toHaveBeenCalledWith(
      expect.objectContaining({ ticketId: "ticket-1", workspaceId: WORKSPACE_ID, authorType: "admin", authorUserId: ADMIN_ID }),
    );
    expect(ticketAdminRepository.updateStatus).toHaveBeenCalledWith("ticket-1", "in_progress");
    expect(notificationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: WORKSPACE_ID, type: "support_ticket_reply" }),
    );
    expect(emailService.sendNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "owner@example.com" }),
    );
    expect(auditLogRepository.log).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: ADMIN_ID, action: "support_ticket_replied", targetId: "ticket-1" }),
    );
  });

  it("does not change the status of a ticket that isn't open", async () => {
    vi.mocked(ticketAdminRepository.findById).mockResolvedValue({
      ticket: makeTicket({ status: "in_progress" }),
      workspaceName: "Acme Co",
      workspaceId: WORKSPACE_ID,
    });
    vi.mocked(ticketAdminRepository.createMessage).mockResolvedValue({ id: "message-1" } as never);

    await ticketAdminService.replyToTicket(ADMIN_ID, ADMIN_EMAIL, "ticket-1", "Update");

    expect(ticketAdminRepository.updateStatus).not.toHaveBeenCalled();
  });

  it("still creates the in-app notification even when the email send throws", async () => {
    vi.mocked(ticketAdminRepository.findById).mockResolvedValue({
      ticket: makeTicket({ status: "open" }),
      workspaceName: "Acme Co",
      workspaceId: WORKSPACE_ID,
    });
    vi.mocked(ticketAdminRepository.createMessage).mockResolvedValue({ id: "message-1" } as never);
    vi.mocked(emailService.sendNotificationEmail).mockRejectedValue(new Error("Resend sandboxed"));

    await ticketAdminService.replyToTicket(ADMIN_ID, ADMIN_EMAIL, "ticket-1", "Update");

    expect(notificationRepository.create).toHaveBeenCalledTimes(1);
  });
});

describe("ticketAdminService.updateStatus", () => {
  it("throws when the ticket doesn't exist", async () => {
    vi.mocked(ticketAdminRepository.updateStatus).mockResolvedValue(null);

    await expect(ticketAdminService.updateStatus(ADMIN_ID, ADMIN_EMAIL, "ticket-1", "closed")).rejects.toThrow(/not found/);
  });

  it("updates the status and logs an audit event", async () => {
    const ticket = makeTicket({ status: "closed" });
    vi.mocked(ticketAdminRepository.updateStatus).mockResolvedValue(ticket);

    const result = await ticketAdminService.updateStatus(ADMIN_ID, ADMIN_EMAIL, "ticket-1", "closed");

    expect(result).toBe(ticket);
    expect(auditLogRepository.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "support_ticket_status_changed", targetId: "ticket-1" }),
    );
  });
});
