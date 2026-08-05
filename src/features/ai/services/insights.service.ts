import "server-only";
import { dashboardService, type DashboardSummary } from "@/features/dashboard/services/dashboard.service";
import { insightsRepository } from "../repository/insights.repository";
import { selectProvider } from "../router/ai-router";

const STALE_AFTER_MS = 24 * 60 * 60 * 1000;
const MAX_INSIGHTS = 4;

export interface InsightsResult {
  insights: string[];
  generatedAt: Date | null;
  /** True when generation failed and there was nothing cached to fall back to — the UI should say so, not show an empty box. */
  unavailable: boolean;
}

function buildInsightsPrompt(summary: DashboardSummary): string {
  return [
    "You are a business analyst summarizing today's activity for a small business owner who is not technical.",
    `Write ${MAX_INSIGHTS} short insights at most, one per line, plain sentences only — no markdown, no headers, no bullet characters.`,
    "Each line should say what stands out in the numbers and, if it's useful, one concrete next action.",
    "Only use the numbers given below. Never invent a number that isn't there. If nothing stands out, say business looks steady today.",
    `Stats (JSON): ${JSON.stringify(summary)}`,
  ].join("\n");
}

function parseInsights(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.replace(/^[-•*\d.)\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, MAX_INSIGHTS);
}

/**
 * Cached per workspace for 24h (see ai_insights schema) — never regenerated on
 * a plain page view. `forceRefresh` is only for an explicit user-triggered
 * refresh. Falls back to the last cached insights (not an error) if
 * generation fails after there was already something cached; `unavailable`
 * is only true when there's truly nothing to show yet (e.g. no API key set).
 */
async function getInsights(workspaceId: string, forceRefresh = false): Promise<InsightsResult> {
  const existing = await insightsRepository.findByWorkspaceId(workspaceId);
  const isStale = !existing || Date.now() - existing.generatedAt.getTime() > STALE_AFTER_MS;

  if (existing && !isStale && !forceRefresh) {
    return { insights: existing.insights, generatedAt: existing.generatedAt, unavailable: false };
  }

  try {
    const summary = await dashboardService.getSummary(workspaceId);
    const provider = selectProvider();
    const result = await provider.generateReply({
      systemPrompt: buildInsightsPrompt(summary),
      history: [{ role: "user", content: "Generate today's insights." }],
      maxTokens: 400,
    });

    const insights = parseInsights(result.text);
    const saved = await insightsRepository.upsert(workspaceId, insights);
    return { insights: saved.insights, generatedAt: saved.generatedAt, unavailable: false };
  } catch (error) {
    console.error("[ai] insights generation failed:", error);
    if (existing) {
      return { insights: existing.insights, generatedAt: existing.generatedAt, unavailable: false };
    }
    return { insights: [], generatedAt: null, unavailable: true };
  }
}

export const insightsService = {
  getInsights,
};
