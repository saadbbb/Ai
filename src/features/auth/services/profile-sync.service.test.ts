import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User, Workspace } from "@/db/schema";

vi.mock("../repository/user.repository", () => ({
  userRepository: { findByEmail: vi.fn(), createFromSupabase: vi.fn() },
}));

vi.mock("@/features/workspace/services/workspace.service", () => ({
  workspaceService: { createWorkspaceForNewUser: vi.fn() },
}));

vi.mock("@/features/platform-admin/services/platform-admin.service", () => ({
  platformAdminService: { listAssignableAdmins: vi.fn() },
}));

vi.mock("@/lib/email", () => ({
  emailService: { sendNotificationEmail: vi.fn() },
}));

const { userRepository } = await import("../repository/user.repository");
const { workspaceService } = await import("@/features/workspace/services/workspace.service");
const { platformAdminService } = await import("@/features/platform-admin/services/platform-admin.service");
const { emailService } = await import("@/lib/email");
const { profileSyncService } = await import("./profile-sync.service");

const NEW_USER = { id: "user-1", email: "new@example.com" } as User;
const WORKSPACE = { id: "workspace-1", name: "New Co" } as Workspace;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(emailService.sendNotificationEmail).mockResolvedValue(undefined);
});

describe("profileSyncService.ensureLocalUser — new signup admin notification", () => {
  it("emails every assignable admin when a brand-new user creates a workspace", async () => {
    vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(userRepository.createFromSupabase).mockResolvedValue(NEW_USER);
    vi.mocked(workspaceService.createWorkspaceForNewUser).mockResolvedValue(WORKSPACE);
    vi.mocked(platformAdminService.listAssignableAdmins).mockResolvedValue([
      { userId: "admin-1", email: "admin1@example.com" },
      { userId: "admin-2", email: "admin2@example.com" },
    ]);

    await profileSyncService.ensureLocalUser("supabase-1", { email: "new@example.com" });

    expect(emailService.sendNotificationEmail).toHaveBeenCalledTimes(2);
    expect(emailService.sendNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "admin1@example.com", subject: expect.stringContaining("New Co") }),
    );
  });

  it("does not throw when there are no admins to notify", async () => {
    vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(userRepository.createFromSupabase).mockResolvedValue(NEW_USER);
    vi.mocked(workspaceService.createWorkspaceForNewUser).mockResolvedValue(WORKSPACE);
    vi.mocked(platformAdminService.listAssignableAdmins).mockResolvedValue([]);

    await expect(profileSyncService.ensureLocalUser("supabase-1", { email: "new@example.com" })).resolves.toBe(NEW_USER);
    expect(emailService.sendNotificationEmail).not.toHaveBeenCalled();
  });

  it("still returns the new user even if the admin lookup itself throws", async () => {
    vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(userRepository.createFromSupabase).mockResolvedValue(NEW_USER);
    vi.mocked(workspaceService.createWorkspaceForNewUser).mockResolvedValue(WORKSPACE);
    vi.mocked(platformAdminService.listAssignableAdmins).mockRejectedValue(new Error("db down"));

    await expect(profileSyncService.ensureLocalUser("supabase-1", { email: "new@example.com" })).resolves.toBe(NEW_USER);
  });

  it("does not notify anyone when the user already exists (returning early)", async () => {
    vi.mocked(userRepository.findByEmail).mockResolvedValue({ ...NEW_USER, id: "supabase-1" });

    await profileSyncService.ensureLocalUser("supabase-1", { email: "new@example.com" });

    expect(workspaceService.createWorkspaceForNewUser).not.toHaveBeenCalled();
    expect(platformAdminService.listAssignableAdmins).not.toHaveBeenCalled();
  });
});
