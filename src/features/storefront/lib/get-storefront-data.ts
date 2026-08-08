import "server-only";
import { notFound } from "next/navigation";
import { storefrontRepository } from "../repository/storefront.repository";

/** Shared by every /store/[slug]/* page — 404s by construction for an unpublished or nonexistent store. */
export async function getStorefrontData(slug: string) {
  const row = await storefrontRepository.findPublishedByWorkspaceSlug(slug);
  if (!row) notFound();
  return row;
}
