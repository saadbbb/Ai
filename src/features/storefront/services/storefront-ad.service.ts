import "server-only";
import type { StorefrontAd } from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import { storefrontAdRepository } from "../repository/storefront-ad.repository";

interface StorefrontAdInput {
  imageUrl: string;
  linkUrl?: string;
  title?: string;
  altText?: string;
  isPublished: boolean;
}

async function listAds(workspaceId: string): Promise<StorefrontAd[]> {
  return storefrontAdRepository.findByWorkspaceId(workspaceId);
}

async function createAd(workspaceId: string, input: StorefrontAdInput): Promise<StorefrontAd> {
  const existing = await storefrontAdRepository.findByWorkspaceId(workspaceId);
  const sortOrder = existing.length === 0 ? 0 : Math.max(...existing.map((ad) => ad.sortOrder)) + 1;
  return storefrontAdRepository.create({ workspaceId, ...input, sortOrder });
}

async function updateAd(workspaceId: string, adId: string, input: StorefrontAdInput): Promise<StorefrontAd> {
  const updated = await storefrontAdRepository.update(adId, workspaceId, input);
  if (!updated) throw new AppError("NOT_FOUND", "Ad not found.");
  return updated;
}

async function deleteAd(workspaceId: string, adId: string): Promise<void> {
  const existing = await storefrontAdRepository.findById(adId, workspaceId);
  if (!existing) throw new AppError("NOT_FOUND", "Ad not found.");
  await storefrontAdRepository.delete(adId, workspaceId);
}

async function reorderAd(workspaceId: string, adId: string, direction: -1 | 1): Promise<StorefrontAd[]> {
  const ads = await storefrontAdRepository.findByWorkspaceId(workspaceId);
  const index = ads.findIndex((ad) => ad.id === adId);
  if (index === -1) throw new AppError("NOT_FOUND", "Ad not found.");

  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= ads.length) return ads;

  const current = ads[index];
  const target = ads[targetIndex];
  await Promise.all([
    storefrontAdRepository.update(current.id, workspaceId, { sortOrder: target.sortOrder }),
    storefrontAdRepository.update(target.id, workspaceId, { sortOrder: current.sortOrder }),
  ]);

  return storefrontAdRepository.findByWorkspaceId(workspaceId);
}

export const storefrontAdService = {
  listAds,
  createAd,
  updateAd,
  deleteAd,
  reorderAd,
};
