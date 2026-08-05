import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../repository/platform-admin.repository", () => ({
  platformAdminRepository: { findByEmail: vi.fn() },
}));

const { platformAdminRepository } = await import("../repository/platform-admin.repository");
const { platformAdminService } = await import("./platform-admin.service");

const ORIGINAL_ENV = process.env.PLATFORM_ADMIN_EMAILS;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.PLATFORM_ADMIN_EMAILS = "owner@example.com, Second@Example.com";
});

afterEach(() => {
  process.env.PLATFORM_ADMIN_EMAILS = ORIGINAL_ENV;
});

describe("platformAdminService.isBootstrapAdmin", () => {
  it("is true for an email in PLATFORM_ADMIN_EMAILS, case-insensitively", () => {
    expect(platformAdminService.isBootstrapAdmin("owner@example.com")).toBe(true);
    expect(platformAdminService.isBootstrapAdmin("OWNER@EXAMPLE.COM")).toBe(true);
    expect(platformAdminService.isBootstrapAdmin("second@example.com")).toBe(true);
  });

  it("is false for a database-managed admin that isn't in the env var — impersonation is never delegable", async () => {
    vi.mocked(platformAdminRepository.findByEmail).mockResolvedValue({
      id: "pa-1",
      email: "delegated@example.com",
      addedByEmail: "owner@example.com",
      createdAt: new Date(),
    });

    // isPlatformAdmin (the broader check) says yes...
    expect(await platformAdminService.isPlatformAdmin("delegated@example.com")).toBe(true);
    vi.mocked(platformAdminRepository.findByEmail).mockClear();

    // ...but isBootstrapAdmin (impersonation's check) must say no, and never even touches the DB.
    expect(platformAdminService.isBootstrapAdmin("delegated@example.com")).toBe(false);
    expect(platformAdminRepository.findByEmail).not.toHaveBeenCalled();
  });

  it("is false for an email not configured anywhere", () => {
    expect(platformAdminService.isBootstrapAdmin("nobody@example.com")).toBe(false);
  });
});
