import "server-only";
import type { AnalyticsRange } from "@/features/analytics/lib/date-range";
import {
  type FormSubmissionCount,
  type ProductViewCount,
  storefrontEventRepository,
} from "../repository/storefront-event.repository";

/**
 * Best-effort, fire-and-forget from every public storefront path — a tracking
 * failure must never break a customer's page view, product view, or form
 * submission. Errors are swallowed (not even logged loudly) since this is
 * purely for the dashboard's own reporting, not user-facing behavior.
 */
async function trackPageView(workspaceId: string, path: string): Promise<void> {
  try {
    await storefrontEventRepository.create({ workspaceId, type: "page_view", path });
  } catch {
    // best-effort
  }
}

async function trackProductView(workspaceId: string, productId: string): Promise<void> {
  try {
    await storefrontEventRepository.create({ workspaceId, type: "product_view", productId });
  } catch {
    // best-effort
  }
}

async function trackFormSubmission(workspaceId: string, formType: string): Promise<void> {
  try {
    await storefrontEventRepository.create({ workspaceId, type: "form_submission", formType });
  } catch {
    // best-effort
  }
}

export interface WebsiteAnalyticsSummary {
  pageViews: number;
  productViews: number;
  formSubmissions: number;
  topProducts: ProductViewCount[];
  formBreakdown: FormSubmissionCount[];
}

async function getWebsiteSummary(workspaceId: string, range: AnalyticsRange): Promise<WebsiteAnalyticsSummary> {
  const [pageViews, productViews, formSubmissions, topProducts, formBreakdown] = await Promise.all([
    storefrontEventRepository.countByType(workspaceId, "page_view", range.from, range.to),
    storefrontEventRepository.countByType(workspaceId, "product_view", range.from, range.to),
    storefrontEventRepository.countByType(workspaceId, "form_submission", range.from, range.to),
    storefrontEventRepository.topProductViews(workspaceId, range.from, range.to),
    storefrontEventRepository.formSubmissionsByType(workspaceId, range.from, range.to),
  ]);

  return { pageViews, productViews, formSubmissions, topProducts, formBreakdown };
}

export const storefrontAnalyticsService = {
  trackPageView,
  trackProductView,
  trackFormSubmission,
  getWebsiteSummary,
};
