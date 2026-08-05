import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Plan, PlatformAdmin, User, Workspace } from "@/db/schema";

vi.mock("@/lib/auth/auth-guard", () => ({
  requirePlatformAdmin: vi.fn(),
}));

vi.mock("../repository/audit-log.repository", () => ({
  auditLogRepository: { log: vi.fn() },
}));

vi.mock("../repository/workspace-admin.repository", () => ({
  workspaceAdminRepository: { activateSubscription: vi.fn() },
}));

vi.mock("../repository/platform-admin.repository", () => ({
  platformAdminRepository: { findById: vi.fn(), delete: vi.fn() },
}));

vi.mock("../repository/plan.repository", () => ({
  planRepository: { findById: vi.fn(), delete: vi.fn() },
}));

const { requirePlatformAdmin } = await import("@/lib/auth/auth-guard");
const { auditLogRepository } = await import("../repository/audit-log.repository");
const { workspaceAdminRepository } = await import("../repository/workspace-admin.repository");
const { platformAdminRepository } = await import("../repository/platform-admin.repository");
const { planRepository } = await import("../repository/plan.repository");
const { activateSubscriptionAction } = await import("./activate-subscription.action");
const { removePlatformAdminAction } = await import("./remove-platform-admin.action");
const { deletePlanAction } = await import("./delete-plan.action");

const ADMIN = { id: "11111111-1111-4111-8111-111111111111", email: "admin@example.com" } as User;
const WORKSPACE_ID = "22222222-2222-4222-8222-222222222222";
const PLAN_ID = "33333333-3333-4333-8333-333333333333";
const PLATFORM_ADMIN_ID = "44444444-4444-4444-8444-444444444444";
const MISSING_ID = "99999999-9999-4999-8999-999999999999";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requirePlatformAdmin).mockResolvedValue(ADMIN);
});

describe("activateSubscriptionAction", () => {
  it("logs a subscription_activated audit event naming the real acting admin", async () => {
    vi.mocked(workspaceAdminRepository.activateSubscription).mockResolvedValue({
      id: WORKSPACE_ID,
      name: "Acme",
    } as Workspace);

    const result = await activateSubscriptionAction({ workspaceId: WORKSPACE_ID, planId: PLAN_ID, days: 30 });

    expect(result.success).toBe(true);
    expect(auditLogRepository.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: ADMIN.id,
        actorEmail: ADMIN.email,
        action: "subscription_activated",
        targetType: "workspace",
        targetId: WORKSPACE_ID,
      }),
    );
  });

  it("does not log anything when the workspace doesn't exist", async () => {
    vi.mocked(workspaceAdminRepository.activateSubscription).mockResolvedValue(null);

    const result = await activateSubscriptionAction({ workspaceId: MISSING_ID, planId: PLAN_ID, days: 30 });

    expect(result.success).toBe(false);
    expect(auditLogRepository.log).not.toHaveBeenCalled();
  });
});

describe("removePlatformAdminAction", () => {
  it("logs the removed admin's email, not just their id", async () => {
    vi.mocked(platformAdminRepository.findById).mockResolvedValue({
      id: PLATFORM_ADMIN_ID,
      email: "old-admin@example.com",
    } as PlatformAdmin);

    const result = await removePlatformAdminAction({ id: PLATFORM_ADMIN_ID });

    expect(result.success).toBe(true);
    expect(platformAdminRepository.delete).toHaveBeenCalledWith(PLATFORM_ADMIN_ID);
    expect(auditLogRepository.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "platform_admin_removed", summary: expect.stringContaining("old-admin@example.com") }),
    );
  });

  it("never deletes or logs when the target admin record is already gone", async () => {
    vi.mocked(platformAdminRepository.findById).mockResolvedValue(null);

    const result = await removePlatformAdminAction({ id: MISSING_ID });

    expect(result.success).toBe(false);
    expect(platformAdminRepository.delete).not.toHaveBeenCalled();
    expect(auditLogRepository.log).not.toHaveBeenCalled();
  });
});

describe("deletePlanAction", () => {
  it("logs the plan's name before it's gone, not just its id", async () => {
    vi.mocked(planRepository.findById).mockResolvedValue({ id: PLAN_ID, name: "Pro" } as Plan);

    const result = await deletePlanAction({ id: PLAN_ID });

    expect(result.success).toBe(true);
    expect(planRepository.delete).toHaveBeenCalledWith(PLAN_ID);
    expect(auditLogRepository.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "plan_deleted", summary: expect.stringContaining("Pro") }),
    );
  });

  it("never deletes or logs a plan that's already gone", async () => {
    vi.mocked(planRepository.findById).mockResolvedValue(null);

    const result = await deletePlanAction({ id: MISSING_ID });

    expect(result.success).toBe(false);
    expect(planRepository.delete).not.toHaveBeenCalled();
    expect(auditLogRepository.log).not.toHaveBeenCalled();
  });
});
