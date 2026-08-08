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
      role: "administrator",
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

describe("platformAdminService.isReadOnly", () => {
  it("is true for a database-managed admin with the read_only role", async () => {
    vi.mocked(platformAdminRepository.findByEmail).mockResolvedValue({
      id: "pa-1",
      email: "viewer@example.com",
      role: "read_only",
      addedByEmail: "owner@example.com",
      createdAt: new Date(),
    });

    expect(await platformAdminService.isReadOnly("viewer@example.com")).toBe(true);
  });

  it("is false for a database-managed admin with a write role", async () => {
    vi.mocked(platformAdminRepository.findByEmail).mockResolvedValue({
      id: "pa-1",
      email: "admin@example.com",
      role: "administrator",
      addedByEmail: "owner@example.com",
      createdAt: new Date(),
    });

    expect(await platformAdminService.isReadOnly("admin@example.com")).toBe(false);
  });

  it("is never true for a bootstrap admin, even without checking the database", async () => {
    expect(await platformAdminService.isReadOnly("owner@example.com")).toBe(false);
    expect(platformAdminRepository.findByEmail).not.toHaveBeenCalled();
  });
});
