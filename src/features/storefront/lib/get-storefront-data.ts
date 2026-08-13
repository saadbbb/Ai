import "server-only";
import { notFound } from "next/navigation";
import { getOptionalUser } from "@/lib/auth/auth-guard";
import { membershipRepository } from "@/features/workspace/repository/membership.repository";
import { storefrontRepository } from "../repository/storefront.repository";

/**
 * Shared by every /store/[slug]/* page — 404s by construction for an unpublished or
 * nonexistent store. `preview: true` (only the home page passes this, from `?preview=1`)
 * additionally lets the storefront's own workspace owner see their unpublished draft —
 * checked via real membership, never a redirect, so an anonymous visitor is never affected.
 */
export async function getStorefrontData(slug: string, options?: { preview?: boolean }) {
  if (options?.preview) {
    const draft = await storefrontRepository.findByWorkspaceSlugAnyStatus(slug);
    if (draft) {
      const user = await getOptionalUser();
      if (user) {
        const memberships = await membershipRepository.findWorkspacesForUser(user.id);
        if (memberships.some((membership) => membership.workspace.id === draft.workspaceId)) {
          return draft;
        }
      }
    }
  }

  const row = await storefrontRepository.findPublishedByWorkspaceSlug(slug);
  if (!row) notFound();
  return row;
}
