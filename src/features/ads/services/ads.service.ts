import "server-only";
import type { AdAccount, AdCampaign, AdCampaignStatus } from "@/db/schema";
import { aiUsageRepository } from "@/features/ai/repository/ai-usage.repository";
import { DEFAULT_MODEL, selectProvider } from "@/features/ai/router/ai-router";
import { workspaceAuditLogRepository } from "@/features/workspace/repository/workspace-audit-log.repository";
import { AppError } from "@/lib/errors/app-error";
import { adAccountRepository } from "../repository/ad-account.repository";
import { adCampaignRepository, type AttributionStat } from "../repository/ad-campaign.repository";

interface CreateCampaignInput {
  name: string;
  utmCampaign: string;
  budget?: number;
  startDate?: Date;
  endDate?: Date;
}

interface AdsActor {
  userId: string;
  name: string | null;
  email: string | null;
}

/** Check-then-create, same pattern as ai_agents/storefronts — one row per workspace. */
async function getOrCreateAdAccount(workspaceId: string): Promise<AdAccount> {
  const existing = await adAccountRepository.findByWorkspaceId(workspaceId);
  if (existing) return existing;
  return adAccountRepository.create({ workspaceId, provider: "meta", status: "not_connected" });
}

async function listCampaigns(workspaceId: string): Promise<AdCampaign[]> {
  return adCampaignRepository.findByWorkspaceId(workspaceId);
}

async function createCampaign(workspaceId: string, input: CreateCampaignInput, actor: AdsActor): Promise<AdCampaign> {
  const campaign = await adCampaignRepository.create({
    workspaceId,
    name: input.name,
    utmCampaign: input.utmCampaign,
    budget: input.budget?.toString(),
    startDate: input.startDate ?? null,
    endDate: input.endDate ?? null,
  });

  await workspaceAuditLogRepository.log({
    workspaceId,
    actorUserId: actor.userId,
    actorEmail: actor.name ?? actor.email ?? "Unknown",
    action: "ad_campaign_created",
    targetType: "ad_campaign",
    targetId: campaign.id,
    summary: `Logged ad campaign "${campaign.name}".`,
  });

  return campaign;
}

async function updateCampaignStatus(workspaceId: string, campaignId: string, status: AdCampaignStatus): Promise<AdCampaign> {
  const updated = await adCampaignRepository.updateStatus(campaignId, workspaceId, status);
  if (!updated) throw new AppError("NOT_FOUND", "Ad campaign not found.");
  return updated;
}

async function updateCampaignSpend(workspaceId: string, campaignId: string, actualSpend: number): Promise<AdCampaign> {
  const updated = await adCampaignRepository.updateSpend(campaignId, workspaceId, actualSpend);
  if (!updated) throw new AppError("NOT_FOUND", "Ad campaign not found.");
  return updated;
}

async function getAttributionReport(workspaceId: string): Promise<AttributionStat[]> {
  return adCampaignRepository.getAttributionStats(workspaceId);
}

const INSIGHTS_SYSTEM_PROMPT = `You are a small-business ad performance analyst. You'll be given a JSON list of ad
campaigns with contact count, revenue, spend, CPL (cost per lead), and ROAS (return on ad spend) — any of these may
be null if not available. Write 2-4 short, plain-English sentences (no markdown, no headers) pointing out which
campaign(s) are performing best/worst and one concrete, specific suggestion (e.g. "pause X and reallocate budget to
Y", "Z has no spend logged yet so ROAS can't be judged"). If there isn't enough data to say anything useful, say so
plainly instead of inventing a conclusion.`;
const INSIGHTS_MAX_TOKENS = 400;

/** AI Ads Intelligence Engine depth (PART 13 gap #187) — a staff-triggered textual read of the existing attribution data, not an automated optimizer. */
async function generateAdInsights(workspaceId: string): Promise<string> {
  const stats = await getAttributionReport(workspaceId);
  if (stats.length === 0) {
    throw new AppError("VALIDATION_ERROR", "Log at least one ad campaign before requesting insights.");
  }

  const provider = selectProvider();
  const startedAt = Date.now();
  const summary = stats.map((stat) => ({
    name: stat.campaign.name,
    contactCount: stat.contactCount,
    revenue: stat.revenue,
    spend: stat.spend,
    cpl: stat.cpl,
    roas: stat.roas,
  }));

  try {
    const result = await provider.generateReply({
      systemPrompt: INSIGHTS_SYSTEM_PROMPT,
      history: [{ role: "user", content: JSON.stringify(summary) }],
      maxTokens: INSIGHTS_MAX_TOKENS,
    });
    await aiUsageRepository.create({
      workspaceId,
      provider: "claude",
      model: DEFAULT_MODEL,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      latencyMs: Date.now() - startedAt,
      success: true,
    });
    return result.text.trim();
  } catch (error) {
    await aiUsageRepository.create({
      workspaceId,
      provider: "claude",
      model: DEFAULT_MODEL,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: Date.now() - startedAt,
      success: false,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

export const adsService = {
  getOrCreateAdAccount,
  listCampaigns,
  createCampaign,
  updateCampaignStatus,
  updateCampaignSpend,
  getAttributionReport,
  generateAdInsights,
};
