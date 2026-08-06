import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupportTicket } from "@/db/schema";

vi.mock("../repository/ticket.repository", () => ({
  ticketRepository: {
    findByWorkspaceId: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
    findMessagesByTicketId: vi.fn(),
    createMessage: vi.fn(),
  },
}));

vi.mock("@/features/workspace/repository/workspace-audit-log.repository", () => ({
  workspaceAuditLogRepository: {
    log: vi.fn(),
  },
}));

const { ticketRepository } = await import("../repository/ticket.repository");
const { workspaceAuditLogRepository } = await import("@/features/workspace/repository/workspace-audit-log.repository");
const { ticketService } = await import("./ticket.service");

const WORKSPACE_ID = "workspace-1";
const USER_ID = "user-1";
const USER_EMAIL = "user@example.com";

function makeTicket(overrides: Partial<SupportTicket> = {}): SupportTicket {
  return {
    id: "ticket-1",
    workspaceId: WORKSPACE_ID,
    subject: "Help please",
    status: "open",
    priority: "medium",
    createdByUserId: USER_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ticketService.createTicket", () => {
  it("creates the ticket and its first message, then logs a workspace audit event", async () => {
    const ticket = makeTicket();
    vi.mocked(ticketRepository.create).mockResolvedValue(ticket);
    vi.mocked(ticketRepository.createMessage).mockResolvedValue({ id: "message-1" } as never);

    const result = await ticketService.createTicket(WORKSPACE_ID, USER_ID, USER_EMAIL, {
      subject: "Help please",
      message: "It's broken",
      priority: "medium",
    });

    expect(result).toBe(ticket);
    expect(ticketRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: WORKSPACE_ID, subject: "Help please", priority: "medium", createdByUserId: USER_ID }),
    );
    expect(ticketRepository.createMessage).toHaveBeenCalledWith(
      expect.objectContaining({ ticketId: ticket.id, authorType: "tenant", authorUserId: USER_ID, content: "It's broken" }),
    );
    expect(workspaceAuditLogRepository.log).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: WORKSPACE_ID, action: "support_ticket_created", targetId: ticket.id }),
    );
  });
});

describe("ticketService.replyToTicket", () => {
  it("throws when the ticket doesn't belong to this workspace", async () => {
    vi.mocked(ticketRepository.findById).mockResolvedValue(null);

    await expect(ticketService.replyToTicket(WORKSPACE_ID, USER_ID, USER_EMAIL, "ticket-1", "hi")).rejects.toThrow(
      /not found/,
    );
    expect(ticketRepository.createMessage).not.toHaveBeenCalled();
  });

  it("posts the reply and reopens a resolved ticket", async () => {
    vi.mocked(ticketRepository.findById).mockResolvedValue(makeTicket({ status: "resolved" }));
    vi.mocked(ticketRepository.createMessage).mockResolvedValue({ id: "message-2" } as never);

    await ticketService.replyToTicket(WORKSPACE_ID, USER_ID, USER_EMAIL, "ticket-1", "still broken");

    expect(ticketRepository.createMessage).toHaveBeenCalledWith(
      expect.objectContaining({ ticketId: "ticket-1", authorType: "tenant", content: "still broken" }),
    );
    expect(ticketRepository.updateStatus).toHaveBeenCalledWith("ticket-1", WORKSPACE_ID, "open");
  });

  it("does not touch the status of an already-open ticket", async () => {
    vi.mocked(ticketRepository.findById).mockResolvedValue(makeTicket({ status: "open" }));
    vi.mocked(ticketRepository.createMessage).mockResolvedValue({ id: "message-3" } as never);

    await ticketService.replyToTicket(WORKSPACE_ID, USER_ID, USER_EMAIL, "ticket-1", "any update?");

    expect(ticketRepository.updateStatus).not.toHaveBeenCalled();
  });
});

describe("ticketService.getTicketWithMessages", () => {
  it("throws NOT_FOUND when the ticket doesn't exist in this workspace", async () => {
    vi.mocked(ticketRepository.findById).mockResolvedValue(null);

    await expect(ticketService.getTicketWithMessages(WORKSPACE_ID, "ticket-1")).rejects.toThrow(/not found/);
  });

  it("returns the ticket with its messages", async () => {
    const ticket = makeTicket();
    vi.mocked(ticketRepository.findById).mockResolvedValue(ticket);
    vi.mocked(ticketRepository.findMessagesByTicketId).mockResolvedValue([{ id: "message-1" } as never]);

    const result = await ticketService.getTicketWithMessages(WORKSPACE_ID, ticket.id);

    expect(result).toEqual({ ticket, messages: [{ id: "message-1" }] });
  });
});
