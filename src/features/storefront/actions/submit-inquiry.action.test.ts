import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Storefront, Workspace } from "@/db/schema";

vi.mock("@/features/workspace/repository/workspace.repository", () => ({
  workspaceRepository: { findBySlug: vi.fn() },
}));

vi.mock("@/features/storefront/repository/storefront.repository", () => ({
  storefrontRepository: { findByWorkspaceId: vi.fn() },
}));

vi.mock("@/lib/rate-limit/rate-limit", () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock("../services/storefront.service", () => ({
  storefrontService: { submitInquiry: vi.fn() },
}));

const { workspaceRepository } = await import("@/features/workspace/repository/workspace.repository");
const { storefrontRepository } = await import("@/features/storefront/repository/storefront.repository");
const { checkRateLimit } = await import("@/lib/rate-limit/rate-limit");
const { storefrontService } = await import("../services/storefront.service");
const { submitInquiryAction } = await import("./submit-inquiry.action");

const VALID_INPUT = { slug: "acme", fullName: "Jane", phone: "+9647701234567", message: "Interested in your products" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(checkRateLimit).mockResolvedValue(true);
  vi.mocked(workspaceRepository.findBySlug).mockResolvedValue({ id: "workspace-1" } as Workspace);
  vi.mocked(storefrontRepository.findByWorkspaceId).mockResolvedValue({ isPublished: true } as Storefront);
});

describe("submitInquiryAction", () => {
  it("submits the inquiry when everything checks out", async () => {
    const result = await submitInquiryAction(VALID_INPUT);

    expect(result.success).toBe(true);
    expect(storefrontService.submitInquiry).toHaveBeenCalledWith("workspace-1", {
      fullName: "Jane",
      phone: "+9647701234567",
      message: "Interested in your products",
    });
  });

  it("fails without submitting when rate-limited", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue(false);

    const result = await submitInquiryAction(VALID_INPUT);

    expect(result.success).toBe(false);
    expect(storefrontService.submitInquiry).not.toHaveBeenCalled();
  });

  it("fails when the store slug doesn't exist", async () => {
    vi.mocked(workspaceRepository.findBySlug).mockResolvedValue(null);

    const result = await submitInquiryAction(VALID_INPUT);

    expect(result.success).toBe(false);
    expect(storefrontService.submitInquiry).not.toHaveBeenCalled();
  });

  it("fails when the storefront exists but isn't published", async () => {
    vi.mocked(storefrontRepository.findByWorkspaceId).mockResolvedValue({ isPublished: false } as Storefront);

    const result = await submitInquiryAction(VALID_INPUT);

    expect(result.success).toBe(false);
    expect(storefrontService.submitInquiry).not.toHaveBeenCalled();
  });

  it("fails when no storefront row exists at all", async () => {
    vi.mocked(storefrontRepository.findByWorkspaceId).mockResolvedValue(null);

    const result = await submitInquiryAction(VALID_INPUT);

    expect(result.success).toBe(false);
  });
});
