import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/inbox/repository/conversation.repository", () => ({
  conversationRepository: {
    findOpenByAssignedUser: vi.fn(),
    findByWorkspaceId: vi.fn(),
  },
}));

vi.mock("@/features/crm/repository/task.repository", () => ({
  taskRepository: {
    findOpenByAssignedUser: vi.fn(),
  },
}));

vi.mock("@/features/appointments/repository/appointment.repository", () => ({
  appointmentRepository: {
    findByWorkspaceId: vi.fn(),
  },
}));

vi.mock("@/features/crm/repository/lead.repository", () => ({
  leadRepository: { findByWorkspaceId: vi.fn() },
}));

vi.mock("@/features/inbox/repository/contact.repository", () => ({
  contactRepository: { findByWorkspaceId: vi.fn() },
}));

vi.mock("@/features/orders/repository/order.repository", () => ({
  orderRepository: { findByWorkspaceId: vi.fn() },
}));

vi.mock("@/features/ai/repository/ai-usage.repository", () => ({
  aiUsageRepository: { countTodayByWorkspace: vi.fn() },
}));

vi.mock("@/features/crm/services/crm.service", () => ({
  crmService: { listLeads: vi.fn() },
}));

const { conversationRepository } = await import("@/features/inbox/repository/conversation.repository");
const { taskRepository } = await import("@/features/crm/repository/task.repository");
const { appointmentRepository } = await import("@/features/appointments/repository/appointment.repository");
const { leadRepository } = await import("@/features/crm/repository/lead.repository");
const { orderRepository } = await import("@/features/orders/repository/order.repository");
const { crmService } = await import("@/features/crm/services/crm.service");
const { dashboardService } = await import("./dashboard.service");

const WORKSPACE_ID = "workspace-1";
const USER_ID = "user-1";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(conversationRepository.findByWorkspaceId).mockResolvedValue([]);
  vi.mocked(leadRepository.findByWorkspaceId).mockResolvedValue([]);
  vi.mocked(orderRepository.findByWorkspaceId).mockResolvedValue([]);
  vi.mocked(appointmentRepository.findByWorkspaceId).mockResolvedValue([]);
  vi.mocked(crmService.listLeads).mockResolvedValue([]);
});

describe("dashboardService.getMyWorkBand", () => {
  it("counts assigned open conversations/tasks and today's appointments", async () => {
    vi.mocked(conversationRepository.findOpenByAssignedUser).mockResolvedValue([
      { conversation: { id: "conv-1" }, contact: { fullName: "Ahmed" } } as never,
      { conversation: { id: "conv-2" }, contact: { fullName: "Sara" } } as never,
    ]);
    vi.mocked(taskRepository.findOpenByAssignedUser).mockResolvedValue([{ id: "task-1" } as never]);
    vi.mocked(appointmentRepository.findByWorkspaceId).mockResolvedValue([
      { appointment: { scheduledAt: new Date() } } as never,
      { appointment: { scheduledAt: new Date("2000-01-01") } } as never,
    ]);

    const result = await dashboardService.getMyWorkBand(WORKSPACE_ID, USER_ID);

    expect(result.assignedConversationsCount).toBe(2);
    expect(result.assignedOpenTasksCount).toBe(1);
    expect(result.appointmentsToday).toBe(1);
    expect(conversationRepository.findOpenByAssignedUser).toHaveBeenCalledWith(WORKSPACE_ID, USER_ID);
    expect(taskRepository.findOpenByAssignedUser).toHaveBeenCalledWith(WORKSPACE_ID, USER_ID);
  });

  it("returns a linkable list capped at 5 assigned conversations", async () => {
    vi.mocked(conversationRepository.findOpenByAssignedUser).mockResolvedValue(
      Array.from({ length: 8 }, (_, i) => ({
        conversation: { id: `conv-${i}` },
        contact: { fullName: `Customer ${i}` },
      })) as never,
    );
    vi.mocked(taskRepository.findOpenByAssignedUser).mockResolvedValue([]);
    vi.mocked(appointmentRepository.findByWorkspaceId).mockResolvedValue([]);

    const result = await dashboardService.getMyWorkBand(WORKSPACE_ID, USER_ID);

    expect(result.assignedConversations).toHaveLength(5);
    expect(result.assignedConversations[0]).toEqual({ id: "conv-0", label: "Customer 0", href: "/dashboard/inbox/conv-0" });
  });

  it("returns zeros when nothing is assigned", async () => {
    vi.mocked(conversationRepository.findOpenByAssignedUser).mockResolvedValue([]);
    vi.mocked(taskRepository.findOpenByAssignedUser).mockResolvedValue([]);
    vi.mocked(appointmentRepository.findByWorkspaceId).mockResolvedValue([]);

    const result = await dashboardService.getMyWorkBand(WORKSPACE_ID, USER_ID);

    expect(result).toEqual({
      assignedConversationsCount: 0,
      assignedOpenTasksCount: 0,
      appointmentsToday: 0,
      assignedConversations: [],
    });
  });
});

describe("dashboardService.getTodayAndAttentionBands — hot lead recommendations", () => {
  it("surfaces hot/priority-scored open leads as hot_lead attention items, sorted by score", async () => {
    vi.mocked(crmService.listLeads).mockResolvedValue([
      { lead: { id: "lead-warm", stage: "new" }, contact: { id: "c1", fullName: "Warm Customer" }, score: 50 },
      { lead: { id: "lead-hot", stage: "negotiation" }, contact: { id: "c2", fullName: "Hot Customer" }, score: 75 },
      { lead: { id: "lead-priority", stage: "proposal_sent" }, contact: { id: "c3", fullName: "Priority Customer" }, score: 95 },
    ] as never);

    const { attention } = await dashboardService.getTodayAndAttentionBands("workspace-1");
    const hotLeadItems = attention.items.filter((item) => item.type === "hot_lead");

    expect(hotLeadItems).toEqual([
      { type: "hot_lead", id: "lead-priority", label: "Priority Customer", href: "/dashboard/contacts/c3" },
      { type: "hot_lead", id: "lead-hot", label: "Hot Customer", href: "/dashboard/contacts/c2" },
    ]);
  });

  it("excludes leads in a closed/terminal stage even if their score is high", async () => {
    vi.mocked(crmService.listLeads).mockResolvedValue([
      { lead: { id: "lead-won", stage: "won" }, contact: { id: "c1", fullName: "Won Customer" }, score: 100 },
    ] as never);

    const { attention } = await dashboardService.getTodayAndAttentionBands("workspace-1");

    expect(attention.items.filter((item) => item.type === "hot_lead")).toHaveLength(0);
  });

  it("caps hot lead recommendations at 5", async () => {
    vi.mocked(crmService.listLeads).mockResolvedValue(
      Array.from({ length: 8 }, (_, i) => ({
        lead: { id: `lead-${i}`, stage: "negotiation" },
        contact: { id: `c${i}`, fullName: `Customer ${i}` },
        score: 80,
      })) as never,
    );

    const { attention } = await dashboardService.getTodayAndAttentionBands("workspace-1");

    expect(attention.items.filter((item) => item.type === "hot_lead")).toHaveLength(5);
  });
});
