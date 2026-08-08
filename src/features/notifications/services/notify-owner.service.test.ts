import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../repository/notification.repository", () => ({
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

const { notificationRepository } = await import("../repository/notification.repository");
const { membershipRepository } = await import("@/features/workspace/repository/membership.repository");
const { userRepository } = await import("@/features/auth/repository/user.repository");
const { emailService } = await import("@/lib/email");
const { notifyWorkspaceOwner } = await import("./notify-owner.service");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("notifyWorkspaceOwner", () => {
  it("always creates the in-app notification", async () => {
    vi.mocked(membershipRepository.findOwnerUserId).mockResolvedValue(null);

    await notifyWorkspaceOwner({ workspaceId: "workspace-1", type: "billing", title: "Title", message: "Message" });

    expect(notificationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: "workspace-1", type: "billing", title: "Title", message: "Message" }),
    );
  });

  it("emails the owner when one can be resolved", async () => {
    vi.mocked(membershipRepository.findOwnerUserId).mockResolvedValue("user-1");
    vi.mocked(userRepository.findById).mockResolvedValue({ id: "user-1", email: "owner@example.com" } as never);

    await notifyWorkspaceOwner({ workspaceId: "workspace-1", type: "billing", title: "Title", message: "Message" });

    expect(emailService.sendNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "owner@example.com", subject: "Title" }),
    );
  });

  it("still creates the notification even if resolving/emailing the owner throws", async () => {
    vi.mocked(membershipRepository.findOwnerUserId).mockRejectedValue(new Error("db down"));

    await expect(
      notifyWorkspaceOwner({ workspaceId: "workspace-1", type: "billing", title: "Title", message: "Message" }),
    ).resolves.toBeUndefined();
    expect(notificationRepository.create).toHaveBeenCalled();
  });

  it("does not email when no owner can be resolved", async () => {
    vi.mocked(membershipRepository.findOwnerUserId).mockResolvedValue(null);

    await notifyWorkspaceOwner({ workspaceId: "workspace-1", type: "billing", title: "Title", message: "Message" });

    expect(emailService.sendNotificationEmail).not.toHaveBeenCalled();
  });
});
