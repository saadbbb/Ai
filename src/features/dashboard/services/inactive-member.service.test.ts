import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Workspace } from "@/db/schema";

vi.mock("@/features/platform-admin/repository/workspace-admin.repository", () => ({
  workspaceAdminRepository: { findAllInGoodStanding: vi.fn() },
}));

vi.mock("@/features/workspace/repository/membership.repository", () => ({
  membershipRepository: { findMembersByWorkspaceId: vi.fn() },
}));

vi.mock("@/features/analytics/repository/analytics.repository", () => ({
  analyticsRepository: { conversationsByAgent: vi.fn(), tasksCompletedByAgent: vi.fn() },
}));

vi.mock("@/features/notifications/services/notify-owner.service", () => ({
  notifyWorkspaceOwner: vi.fn(),
}));

const { workspaceAdminRepository } = await import("@/features/platform-admin/repository/workspace-admin.repository");
const { membershipRepository } = await import("@/features/workspace/repository/membership.repository");
const { analyticsRepository } = await import("@/features/analytics/repository/analytics.repository");
const { notifyWorkspaceOwner } = await import("@/features/notifications/services/notify-owner.service");
const { inactiveMemberService } = await import("./inactive-member.service");

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

function member(userId: string, email: string, roleKey: string, joinedAt: Date) {
  return {
    member: { id: `member-${userId}`, workspaceId: "workspace-1", userId, roleId: "role-1", joinedAt } as never,
    user: { id: userId, email } as never,
    role: { key: roleKey } as never,
  };
}

const LONG_AGO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(workspaceAdminRepository.findAllInGoodStanding).mockResolvedValue([makeWorkspace()]);
  vi.mocked(analyticsRepository.conversationsByAgent).mockResolvedValue([]);
  vi.mocked(analyticsRepository.tasksCompletedByAgent).mockResolvedValue([]);
});

describe("inactiveMemberService.runDailyCheck", () => {
  it("notifies for a non-owner member with zero activity in the window", async () => {
    vi.mocked(membershipRepository.findMembersByWorkspaceId).mockResolvedValue([
      member("user-1", "agent@example.com", "agent", LONG_AGO),
    ]);

    const result = await inactiveMemberService.runDailyCheck();

    expect(result.notified).toBe(1);
    expect(notifyWorkspaceOwner).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: "workspace-1", type: "dashboard" }),
    );
  });

  it("skips a member with a handled conversation in the window", async () => {
    vi.mocked(membershipRepository.findMembersByWorkspaceId).mockResolvedValue([
      member("user-1", "agent@example.com", "agent", LONG_AGO),
    ]);
    vi.mocked(analyticsRepository.conversationsByAgent).mockResolvedValue([{ userId: "user-1", count: 2 }]);

    const result = await inactiveMemberService.runDailyCheck();

    expect(result.notified).toBe(0);
    expect(notifyWorkspaceOwner).not.toHaveBeenCalled();
  });

  it("skips a member with a completed task in the window", async () => {
    vi.mocked(membershipRepository.findMembersByWorkspaceId).mockResolvedValue([
      member("user-1", "agent@example.com", "agent", LONG_AGO),
    ]);
    vi.mocked(analyticsRepository.tasksCompletedByAgent).mockResolvedValue([{ userId: "user-1", count: 1 }]);

    const result = await inactiveMemberService.runDailyCheck();

    expect(result.notified).toBe(0);
  });

  it("never flags the owner", async () => {
    vi.mocked(membershipRepository.findMembersByWorkspaceId).mockResolvedValue([
      member("user-1", "owner@example.com", "owner", LONG_AGO),
    ]);

    const result = await inactiveMemberService.runDailyCheck();

    expect(result.notified).toBe(0);
  });

  it("skips a member who joined too recently to judge", async () => {
    vi.mocked(membershipRepository.findMembersByWorkspaceId).mockResolvedValue([
      member("user-1", "agent@example.com", "agent", new Date()),
    ]);

    const result = await inactiveMemberService.runDailyCheck();

    expect(result.notified).toBe(0);
  });

  it("continues past a single workspace's failure without throwing", async () => {
    vi.mocked(workspaceAdminRepository.findAllInGoodStanding).mockResolvedValue([
      makeWorkspace({ id: "workspace-bad" }),
      makeWorkspace({ id: "workspace-good" }),
    ]);
    vi.mocked(membershipRepository.findMembersByWorkspaceId)
      .mockRejectedValueOnce(new Error("db down"))
      .mockResolvedValueOnce([member("user-1", "agent@example.com", "agent", LONG_AGO)]);

    const result = await inactiveMemberService.runDailyCheck();

    expect(result.notified).toBe(1);
  });
});
