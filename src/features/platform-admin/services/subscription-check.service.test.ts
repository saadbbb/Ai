import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Workspace } from "@/db/schema";

vi.mock("../repository/workspace-admin.repository", () => ({
  workspaceAdminRepository: {
    findActiveWithExpiry: vi.fn(),
    updateSubscriptionStatus: vi.fn(),
    setReminderSent: vi.fn(),
  },
}));

vi.mock("../repository/platform-settings.repository", () => ({
  platformSettingsRepository: { get: vi.fn() },
}));

vi.mock("@/features/notifications/repository/notification.repository", () => ({
  notificationRepository: { create: vi.fn() },
}));

vi.mock("@/features/workspace/repository/membership.repository", () => ({
  membershipRepository: { findOwnerUserId: vi.fn() },
}));

vi.mock("@/features/auth/repository/user.repository", () => ({
  userRepository: { findById: vi.fn() },
}));

vi.mock("@/lib/email", () => ({
  emailService: { sendNotificationEmail: vi.fn() },
}));

const { workspaceAdminRepository } = await import("../repository/workspace-admin.repository");
const { notificationRepository } = await import("@/features/notifications/repository/notification.repository");
const { membershipRepository } = await import("@/features/workspace/repository/membership.repository");
const { userRepository } = await import("@/features/auth/repository/user.repository");
const { emailService } = await import("@/lib/email");
const { subscriptionCheckService } = await import("./subscription-check.service");

function makeWorkspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: "workspace-1",
    name: "Acme",
    slug: "acme",
    businessType: null,
    country: null,
    timezone: "UTC",
    language: "en",
    logoUrl: null,
    onboardingStep: 0,
    onboardingCompletedAt: null,
    subscriptionStatus: "active",
    planId: null,
    subscriptionExpiresAt: new Date(),
    lastReminderDaysSent: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(membershipRepository.findOwnerUserId).mockResolvedValue(null);
});

describe("subscriptionCheckService.runDailyCheck", () => {
  it("sends a reminder when exactly 3/2/1 days remain and hasn't already been sent", async () => {
    const workspace = makeWorkspace({
      subscriptionExpiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    });
    vi.mocked(workspaceAdminRepository.findActiveWithExpiry).mockResolvedValue([workspace]);

    const result = await subscriptionCheckService.runDailyCheck();

    expect(result.remindersSent).toBe(1);
    expect(notificationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: "workspace-1", type: "subscription_expiring" }),
    );
    expect(workspaceAdminRepository.setReminderSent).toHaveBeenCalledWith("workspace-1", 3);
  });

  it("uses trial-specific wording for a workspace still in its trial", async () => {
    const workspace = makeWorkspace({
      subscriptionStatus: "trial",
      subscriptionExpiresAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    });
    vi.mocked(workspaceAdminRepository.findActiveWithExpiry).mockResolvedValue([workspace]);

    await subscriptionCheckService.runDailyCheck();

    expect(notificationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.stringContaining("free trial") }),
    );
  });

  it("does not re-send the same day's reminder twice", async () => {
    const workspace = makeWorkspace({
      subscriptionExpiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      lastReminderDaysSent: 2,
    });
    vi.mocked(workspaceAdminRepository.findActiveWithExpiry).mockResolvedValue([workspace]);

    const result = await subscriptionCheckService.runDailyCheck();

    expect(result.remindersSent).toBe(0);
    expect(notificationRepository.create).not.toHaveBeenCalled();
  });

  it("moves a freshly-expired workspace to past_due (not suspended) and notifies it", async () => {
    const workspace = makeWorkspace({
      subscriptionExpiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago -> day 0
    });
    vi.mocked(workspaceAdminRepository.findActiveWithExpiry).mockResolvedValue([workspace]);

    const result = await subscriptionCheckService.runDailyCheck();

    expect(result.statusChanges).toBe(1);
    expect(result.suspended).toBe(0);
    expect(workspaceAdminRepository.updateSubscriptionStatus).toHaveBeenCalledWith("workspace-1", "past_due");
    expect(notificationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: "subscription_expiring", title: expect.stringContaining("overdue") }),
    );
  });

  it("moves a workspace 3 days past expiry into grace", async () => {
    const workspace = makeWorkspace({
      subscriptionStatus: "past_due",
      subscriptionExpiresAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    });
    vi.mocked(workspaceAdminRepository.findActiveWithExpiry).mockResolvedValue([workspace]);

    await subscriptionCheckService.runDailyCheck();

    expect(workspaceAdminRepository.updateSubscriptionStatus).toHaveBeenCalledWith("workspace-1", "grace");
    expect(notificationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.stringContaining("Final notice") }),
    );
  });

  it("suspends a workspace 7+ days past expiry, using trial wording when it never had a plan", async () => {
    const trialWorkspace = makeWorkspace({
      id: "workspace-trial",
      subscriptionStatus: "grace",
      planId: null,
      subscriptionExpiresAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    });
    vi.mocked(workspaceAdminRepository.findActiveWithExpiry).mockResolvedValue([trialWorkspace]);

    const result = await subscriptionCheckService.runDailyCheck();

    expect(result.suspended).toBe(1);
    expect(workspaceAdminRepository.updateSubscriptionStatus).toHaveBeenCalledWith("workspace-trial", "suspended");
    expect(notificationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: "subscription_suspended", title: expect.stringContaining("trial") }),
    );
  });

  it("uses paid-subscription wording when suspending a workspace that had a plan", async () => {
    const workspace = makeWorkspace({
      subscriptionStatus: "grace",
      planId: "plan-1",
      subscriptionExpiresAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    });
    vi.mocked(workspaceAdminRepository.findActiveWithExpiry).mockResolvedValue([workspace]);

    await subscriptionCheckService.runDailyCheck();

    expect(notificationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: "subscription_suspended", title: expect.stringContaining("subscription has been suspended") }),
    );
  });

  it("does not re-notify a workspace already in the correct lifecycle stage", async () => {
    const workspace = makeWorkspace({
      subscriptionStatus: "past_due",
      subscriptionExpiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // day 1, already past_due
    });
    vi.mocked(workspaceAdminRepository.findActiveWithExpiry).mockResolvedValue([workspace]);

    const result = await subscriptionCheckService.runDailyCheck();

    expect(result.statusChanges).toBe(0);
    expect(workspaceAdminRepository.updateSubscriptionStatus).not.toHaveBeenCalled();
    expect(notificationRepository.create).not.toHaveBeenCalled();
  });

  it("moves a long-suspended workspace to expired silently (no new notification)", async () => {
    const workspace = makeWorkspace({
      subscriptionStatus: "suspended",
      subscriptionExpiresAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000), // 100 days past expiry
    });
    vi.mocked(workspaceAdminRepository.findActiveWithExpiry).mockResolvedValue([workspace]);

    const result = await subscriptionCheckService.runDailyCheck();

    expect(workspaceAdminRepository.updateSubscriptionStatus).toHaveBeenCalledWith("workspace-1", "expired");
    expect(result.suspended).toBe(0);
    expect(notificationRepository.create).not.toHaveBeenCalled();
  });

  it("continues past a single workspace's failure without throwing", async () => {
    vi.mocked(workspaceAdminRepository.findActiveWithExpiry).mockResolvedValue([
      makeWorkspace({ id: "workspace-bad", subscriptionExpiresAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) }),
      makeWorkspace({ id: "workspace-good", subscriptionExpiresAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) }),
    ]);
    vi.mocked(workspaceAdminRepository.updateSubscriptionStatus)
      .mockRejectedValueOnce(new Error("db down"))
      .mockResolvedValueOnce(undefined as never);

    const result = await subscriptionCheckService.runDailyCheck();

    expect(result.checked).toBe(2);
    expect(result.suspended).toBe(1);
  });

  it("emails the owner when one can be resolved", async () => {
    const workspace = makeWorkspace({ subscriptionExpiresAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000) });
    vi.mocked(workspaceAdminRepository.findActiveWithExpiry).mockResolvedValue([workspace]);
    vi.mocked(membershipRepository.findOwnerUserId).mockResolvedValue("user-1");
    vi.mocked(userRepository.findById).mockResolvedValue({ id: "user-1", email: "owner@example.com" } as never);

    await subscriptionCheckService.runDailyCheck();

    expect(emailService.sendNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "owner@example.com" }),
    );
  });
});
