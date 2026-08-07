import "server-only";
import type { AdAccount, AdCampaign, AdCampaignStatus } from "@/db/schema";
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

/** Check-then-create, same pattern as ai_agents/storefronts — one row per workspace. */
async function getOrCreateAdAccount(workspaceId: string): Promise<AdAccount> {
  const existing = await adAccountRepository.findByWorkspaceId(workspaceId);
  if (existing) return existing;
  return adAccountRepository.create({ workspaceId, provider: "meta", status: "not_connected" });
}

async function listCampaigns(workspaceId: string): Promise<AdCampaign[]> {
  return adCampaignRepository.findByWorkspaceId(workspaceId);
}

async function createCampaign(workspaceId: string, input: CreateCampaignInput): Promise<AdCampaign> {
  return adCampaignRepository.create({
    workspaceId,
    name: input.name,
    utmCampaign: input.utmCampaign,
    budget: input.budget?.toString(),
    startDate: input.startDate ?? null,
    endDate: input.endDate ?? null,
  });
}

async function updateCampaignStatus(workspaceId: string, campaignId: string, status: AdCampaignStatus): Promise<AdCampaign> {
  const updated = await adCampaignRepository.updateStatus(campaignId, workspaceId, status);
  if (!updated) throw new AppError("NOT_FOUND", "Ad campaign not found.");
  return updated;
}

async function getAttributionReport(workspaceId: string): Promise<AttributionStat[]> {
  return adCampaignRepository.getAttributionStats(workspaceId);
}

export const adsService = {
  getOrCreateAdAccount,
  listCampaigns,
  createCampaign,
  updateCampaignStatus,
  getAttributionReport,
};
