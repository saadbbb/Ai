import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Plan, Workspace } from "@/db/schema";

vi.mock("../repository/workspace-admin.repository", () => ({
  workspaceAdminRepository: { findActiveWorkspacesWithPlan: vi.fn() },
}));

vi.mock("@/features/notifications/repository/notification.repository", () => ({
  notificationRepository: { create: vi.fn() },
}));

vi.mock("./usage.service", () => ({
  usageService: { getUsageSnapshot: vi.fn() },
}));

const { workspaceAdminRepository } = await import("../repository/workspace-admin.repository");
const { notificationRepository } = await import("@/features/notifications/repository/notification.repository");
const { usageService } = await import("./usage.service");
const { usageWarningService } = await import("./usage-warning.service");

function makeWorkspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: "workspace-1",
    name: "Acme",
    slug: "acme",
    businessType: null,
    language: "ar",
    logoUrl: null,
    onboardingStep: 10,
    onboardingCompletedAt: new Date(),
    subscriptionStatus: "active",
    planId: "plan-1",
    subscriptionExpiresAt: new Date(),
    lastReminderDaysSent: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const PLAN = { id: "plan-1" } as Plan;

function emptySnapshot(overrides: Partial<Record<string, { used: number; limit: number | null; percentUsed: number | null }>> = {}) {
  const base = {
    used: 0,
    limit: null,
    percentUsed: null,
  };
  return {
    users: { ...base },
    aiAgents: { ...base },
    channels: { ...base },
    conversationsPerMonth: { ...base },
    knowledgeFiles: { ...base },
    automationWorkflows: { ...base },
    integrations: { ...base },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("usageWarningService.runDailyCheck", () => {
  it("does not notify a workspace with no dimension near its limit", async () => {
    vi.mocked(workspaceAdminRepository.findActiveWorkspacesWithPlan).mockResolvedValue([{ workspace: makeWorkspace(), plan: PLAN }]);
    vi.mocked(usageService.getUsageSnapshot).mockResolvedValue(emptySnapshot({ users: { used: 2, limit: 10, percentUsed: 20 } }) as never);

    const result = await usageWarningService.runDailyCheck();

    expect(result).toEqual({ checked: 1, warned: 0 });
    expect(notificationRepository.create).not.toHaveBeenCalled();
  });

  it("notifies once, combining every dimension at or above 80%", async () => {
    vi.mocked(workspaceAdminRepository.findActiveWorkspacesWithPlan).mockResolvedValue([{ workspace: makeWorkspace(), plan: PLAN }]);
    vi.mocked(usageService.getUsageSnapshot).mockResolvedValue(
      emptySnapshot({
        users: { used: 9, limit: 10, percentUsed: 90 },
        channels: { used: 2, limit: 2, percentUsed: 100 },
      }) as never,
    );

    const result = await usageWarningService.runDailyCheck();

    expect(result).toEqual({ checked: 1, warned: 1 });
    expect(notificationRepository.create).toHaveBeenCalledTimes(1);
    expect(notificationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "workspace-1",
        type: "usage_warning",
        message: expect.stringContaining("90%"),
      }),
    );
    expect(notificationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("100%") }),
    );
  });

  it("continues past a single workspace's failure without throwing", async () => {
    vi.mocked(workspaceAdminRepository.findActiveWorkspacesWithPlan).mockResolvedValue([
      { workspace: makeWorkspace({ id: "workspace-1" }), plan: PLAN },
      { workspace: makeWorkspace({ id: "workspace-2" }), plan: PLAN },
    ]);
    vi.mocked(usageService.getUsageSnapshot)
      .mockRejectedValueOnce(new Error("db down"))
      .mockResolvedValueOnce(emptySnapshot({ users: { used: 9, limit: 10, percentUsed: 90 } }) as never);

    const result = await usageWarningService.runDailyCheck();

    expect(result).toEqual({ checked: 2, warned: 1 });
    expect(notificationRepository.create).toHaveBeenCalledWith(expect.objectContaining({ workspaceId: "workspace-2" }));
  });
});
