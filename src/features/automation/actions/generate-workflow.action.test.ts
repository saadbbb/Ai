import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User, Workspace } from "@/db/schema";

vi.mock("@/lib/auth/auth-guard", () => ({
  requireUser: vi.fn(),
  requireWorkspaceForUser: vi.fn(),
  requireWorkspacePermission: vi.fn(),
}));

vi.mock("@/features/ai/services/ai.service", () => ({
  aiService: { generateWorkflowFromDescription: vi.fn() },
}));

vi.mock("@/features/platform-admin/repository/feature-flag.repository", () => ({
  featureFlagRepository: { isEnabled: vi.fn() },
}));

vi.mock("@/features/workspace/repository/workspace-audit-log.repository", () => ({
  workspaceAuditLogRepository: { log: vi.fn() },
}));

const { requireUser, requireWorkspaceForUser, requireWorkspacePermission } = await import("@/lib/auth/auth-guard");
const { aiService } = await import("@/features/ai/services/ai.service");
const { featureFlagRepository } = await import("@/features/platform-admin/repository/feature-flag.repository");
const { workspaceAuditLogRepository } = await import("@/features/workspace/repository/workspace-audit-log.repository");
const { generateWorkflowAction } = await import("./generate-workflow.action");

const USER = { id: "user-1", email: "user@example.com" } as User;
const WORKSPACE = { id: "workspace-1" } as Workspace;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireUser).mockResolvedValue(USER);
  vi.mocked(requireWorkspaceForUser).mockResolvedValue(WORKSPACE);
  vi.mocked(requireWorkspacePermission).mockResolvedValue(undefined);
});

describe("generateWorkflowAction — feature flag gate", () => {
  it("fails without calling the AI when the flag is disabled", async () => {
    vi.mocked(featureFlagRepository.isEnabled).mockResolvedValue(false);

    const result = await generateWorkflowAction({ description: "notify me on every new order" });

    expect(result.success).toBe(false);
    expect(aiService.generateWorkflowFromDescription).not.toHaveBeenCalled();
    expect(workspaceAuditLogRepository.log).not.toHaveBeenCalled();
  });

  it("proceeds normally when the flag is enabled (or has no row yet)", async () => {
    vi.mocked(featureFlagRepository.isEnabled).mockResolvedValue(true);
    vi.mocked(aiService.generateWorkflowFromDescription).mockResolvedValue({
      triggerType: "order_created",
      actionType: "notify_owner_email",
    });

    const result = await generateWorkflowAction({ description: "notify me on every new order" });

    expect(result.success).toBe(true);
    expect(workspaceAuditLogRepository.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "workflow_ai_generated" }),
    );
  });
});
