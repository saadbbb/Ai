import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Workspace } from "@/db/schema";

vi.mock("../repository/workspace.repository", () => ({
  workspaceRepository: { findBySlug: vi.fn(), update: vi.fn() },
}));

vi.mock("../repository/membership.repository", () => ({
  membershipRepository: { findWorkspacesForUser: vi.fn() },
}));

vi.mock("../repository/role.repository", () => ({
  roleRepository: { findByKey: vi.fn() },
}));

const { workspaceRepository } = await import("../repository/workspace.repository");
const { workspaceService } = await import("./workspace.service");

const WORKSPACE_ID = "workspace-1";

function makeWorkspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: WORKSPACE_ID,
    name: "Acme",
    slug: "acme",
    businessType: null,
    country: null,
    timezone: "UTC",
    language: "en",
    logoUrl: null,
    onboardingStep: 0,
    onboardingCompletedAt: null,
    subscriptionStatus: "trial",
    planId: null,
    subscriptionExpiresAt: null,
    lastReminderDaysSent: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("workspaceService.updateSlug", () => {
  it("updates the slug when it's available", async () => {
    vi.mocked(workspaceRepository.findBySlug).mockResolvedValue(null);
    vi.mocked(workspaceRepository.update).mockResolvedValue(makeWorkspace({ slug: "new-name" }));

    const result = await workspaceService.updateSlug(WORKSPACE_ID, "new-name");

    expect(result.slug).toBe("new-name");
    expect(workspaceRepository.update).toHaveBeenCalledWith(WORKSPACE_ID, { slug: "new-name" });
  });

  it("allows re-saving the workspace's own current slug unchanged", async () => {
    vi.mocked(workspaceRepository.findBySlug).mockResolvedValue(makeWorkspace({ id: WORKSPACE_ID, slug: "acme" }));
    vi.mocked(workspaceRepository.update).mockResolvedValue(makeWorkspace({ slug: "acme" }));

    await expect(workspaceService.updateSlug(WORKSPACE_ID, "acme")).resolves.toMatchObject({ slug: "acme" });
  });

  it("rejects a slug already taken by a different workspace", async () => {
    vi.mocked(workspaceRepository.findBySlug).mockResolvedValue(makeWorkspace({ id: "workspace-2", slug: "taken" }));

    await expect(workspaceService.updateSlug(WORKSPACE_ID, "taken")).rejects.toThrow("That URL is already taken.");
    expect(workspaceRepository.update).not.toHaveBeenCalled();
  });

  it("rejects a slug with invalid characters", async () => {
    await expect(workspaceService.updateSlug(WORKSPACE_ID, "Not Valid!")).rejects.toThrow(
      "URL can only contain lowercase letters, numbers, and hyphens.",
    );
    expect(workspaceRepository.findBySlug).not.toHaveBeenCalled();
  });
});
