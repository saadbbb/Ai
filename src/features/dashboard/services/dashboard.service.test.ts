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

const { conversationRepository } = await import("@/features/inbox/repository/conversation.repository");
const { taskRepository } = await import("@/features/crm/repository/task.repository");
const { appointmentRepository } = await import("@/features/appointments/repository/appointment.repository");
const { dashboardService } = await import("./dashboard.service");

const WORKSPACE_ID = "workspace-1";
const USER_ID = "user-1";

beforeEach(() => {
  vi.clearAllMocks();
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
