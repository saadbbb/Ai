import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnalyticsRange } from "@/features/analytics/lib/date-range";

vi.mock("../repository/storefront-event.repository", () => ({
  storefrontEventRepository: {
    create: vi.fn(),
    countByType: vi.fn(),
    formSubmissionsByType: vi.fn(),
    topProductViews: vi.fn(),
  },
}));

const { storefrontEventRepository } = await import("../repository/storefront-event.repository");
const { storefrontAnalyticsService } = await import("./storefront-analytics.service");

const WORKSPACE_ID = "workspace-1";
const RANGE: AnalyticsRange = { key: "30d", from: new Date("2026-01-01"), to: new Date("2026-01-31"), days: [] };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("storefrontAnalyticsService tracking — best-effort", () => {
  it("swallows a page-view tracking failure instead of throwing", async () => {
    vi.mocked(storefrontEventRepository.create).mockRejectedValue(new Error("db down"));

    await expect(storefrontAnalyticsService.trackPageView(WORKSPACE_ID, "/store/acme")).resolves.toBeUndefined();
  });

  it("swallows a product-view tracking failure instead of throwing", async () => {
    vi.mocked(storefrontEventRepository.create).mockRejectedValue(new Error("db down"));

    await expect(storefrontAnalyticsService.trackProductView(WORKSPACE_ID, "product-1")).resolves.toBeUndefined();
  });

  it("swallows a form-submission tracking failure instead of throwing", async () => {
    vi.mocked(storefrontEventRepository.create).mockRejectedValue(new Error("db down"));

    await expect(storefrontAnalyticsService.trackFormSubmission(WORKSPACE_ID, "contact")).resolves.toBeUndefined();
  });

  it("records a page view with its path", async () => {
    vi.mocked(storefrontEventRepository.create).mockResolvedValue(undefined);

    await storefrontAnalyticsService.trackPageView(WORKSPACE_ID, "/store/acme/products");

    expect(storefrontEventRepository.create).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_ID,
      type: "page_view",
      path: "/store/acme/products",
    });
  });
});

describe("storefrontAnalyticsService.getWebsiteSummary", () => {
  it("combines counts, top products, and form breakdown for the range", async () => {
    vi.mocked(storefrontEventRepository.countByType).mockImplementation(async (_workspaceId, type) => {
      if (type === "page_view") return 120;
      if (type === "product_view") return 45;
      return 8;
    });
    vi.mocked(storefrontEventRepository.topProductViews).mockResolvedValue([
      { productId: "p1", productName: "Widget", count: 20 },
    ]);
    vi.mocked(storefrontEventRepository.formSubmissionsByType).mockResolvedValue([{ formType: "contact", count: 5 }]);

    const summary = await storefrontAnalyticsService.getWebsiteSummary(WORKSPACE_ID, RANGE);

    expect(summary).toEqual({
      pageViews: 120,
      productViews: 45,
      formSubmissions: 8,
      topProducts: [{ productId: "p1", productName: "Widget", count: 20 }],
      formBreakdown: [{ formType: "contact", count: 5 }],
    });
  });
});
