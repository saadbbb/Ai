import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User, Workspace } from "@/db/schema";

vi.mock("@/lib/auth/auth-guard", () => ({
  requirePrimaryPlatformAdmin: vi.fn(),
}));

vi.mock("../repository/audit-log.repository", () => ({
  auditLogRepository: { log: vi.fn() },
}));

vi.mock("../repository/workspace-admin.repository", () => ({
  workspaceAdminRepository: { findById: vi.fn(), delete: vi.fn() },
}));

const { requirePrimaryPlatformAdmin } = await import("@/lib/auth/auth-guard");
const { auditLogRepository } = await import("../repository/audit-log.repository");
const { workspaceAdminRepository } = await import("../repository/workspace-admin.repository");
const { deleteWorkspaceAction } = await import("./delete-workspace.action");

const ADMIN = { id: "11111111-1111-4111-8111-111111111111", email: "admin@example.com" } as User;
const WORKSPACE = { id: "22222222-2222-4222-8222-222222222222", name: "Acme", slug: "acme" } as Workspace;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requirePrimaryPlatformAdmin).mockResolvedValue(ADMIN);
});

describe("deleteWorkspaceAction", () => {
  it("deletes the workspace when the confirmation slug matches", async () => {
    vi.mocked(workspaceAdminRepository.findById).mockResolvedValue(WORKSPACE);

    const result = await deleteWorkspaceAction({ workspaceId: WORKSPACE.id, confirmSlug: "acme" });

    expect(result.success).toBe(true);
    expect(workspaceAdminRepository.delete).toHaveBeenCalledWith(WORKSPACE.id);
    expect(auditLogRepository.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "workspace_deleted", targetId: WORKSPACE.id }),
    );
  });

  it("rejects a mismatched confirmation slug without deleting anything", async () => {
    vi.mocked(workspaceAdminRepository.findById).mockResolvedValue(WORKSPACE);

    const result = await deleteWorkspaceAction({ workspaceId: WORKSPACE.id, confirmSlug: "wrong-slug" });

    expect(result.success).toBe(false);
    expect(workspaceAdminRepository.delete).not.toHaveBeenCalled();
    expect(auditLogRepository.log).not.toHaveBeenCalled();
  });

  it("does nothing when the workspace doesn't exist", async () => {
    vi.mocked(workspaceAdminRepository.findById).mockResolvedValue(null);

    const result = await deleteWorkspaceAction({ workspaceId: WORKSPACE.id, confirmSlug: "acme" });

    expect(result.success).toBe(false);
    expect(workspaceAdminRepository.delete).not.toHaveBeenCalled();
  });
});
