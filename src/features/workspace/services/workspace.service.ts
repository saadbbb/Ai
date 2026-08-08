import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import type { Workspace } from "@/db/schema";
import { workspaceMembers, workspaces } from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import { membershipRepository } from "../repository/membership.repository";
import { roleRepository } from "../repository/role.repository";
import { workspaceRepository } from "../repository/workspace.repository";

/** Spec's FREE TRIAL section: "14-day trial... Automatic expiration." */
const TRIAL_DURATION_DAYS = 14;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

async function generateUniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || "workspace";
  let candidate = root;
  let suffix = 0;

  for (;;) {
    const [existing] = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.slug, candidate))
      .limit(1);
    if (!existing) return candidate;
    suffix += 1;
    candidate = `${root}-${suffix}`;
  }
}

const SLUG_PATTERN = /^[a-z0-9-]+$/;

/**
 * The manual counterpart to generateUniqueSlug — lets an owner pick their own
 * /store/[slug] URL after signup (PART 13 gap: slug was previously permanent
 * once auto-generated). Same format constraint as the generator's own output,
 * checked case-sensitively against the DB's unique constraint on `slug`.
 */
async function updateSlug(workspaceId: string, slug: string): Promise<Workspace> {
  if (!SLUG_PATTERN.test(slug)) {
    throw new AppError("VALIDATION_ERROR", "URL can only contain lowercase letters, numbers, and hyphens.");
  }

  const existing = await workspaceRepository.findBySlug(slug);
  if (existing && existing.id !== workspaceId) {
    throw new AppError("VALIDATION_ERROR", "That URL is already taken.");
  }

  return workspaceRepository.update(workspaceId, { slug });
}

function defaultWorkspaceName(email: string): string {
  const localPart = email.split("@")[0] || "My";
  const capitalized = localPart.charAt(0).toUpperCase() + localPart.slice(1);
  return `${capitalized}'s Workspace`;
}

/**
 * Creates the user's first workspace and makes them its Owner, in a single transaction.
 * Called right after registration completes — every user always has at least one workspace,
 * with a placeholder name refined later during onboarding step 1 (Business Name).
 */
async function createWorkspaceForNewUser(userId: string, email: string): Promise<Workspace> {
  const ownerRole = await roleRepository.findByKey("owner");
  if (!ownerRole) {
    throw new AppError("INTERNAL_ERROR", "Default roles are not seeded. Run the database seed script.");
  }

  const slug = await generateUniqueSlug(defaultWorkspaceName(email));

  return db.transaction(async (tx) => {
    const [workspace] = await tx
      .insert(workspaces)
      .values({
        name: defaultWorkspaceName(email),
        slug,
        subscriptionExpiresAt: new Date(Date.now() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000),
      })
      .returning();

    await tx.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId,
      roleId: ownerRole.id,
    });

    return workspace;
  });
}

/**
 * Every user gets a workspace automatically at registration, so accepting a
 * team invitation always adds a *second* membership — "primary" defaults to
 * the first-joined workspace, but the "current workspace" cookie (see
 * switchWorkspaceAction) lets a multi-workspace user pick which one they're
 * actually looking at.
 */
async function getPrimaryWorkspaceForUser(userId: string, preferredWorkspaceId?: string): Promise<Workspace | null> {
  const memberships = await membershipRepository.findWorkspacesForUser(userId);
  if (preferredWorkspaceId) {
    const preferred = memberships.find((membership) => membership.workspace.id === preferredWorkspaceId);
    if (preferred) return preferred.workspace;
  }
  return memberships[0]?.workspace ?? null;
}

export const workspaceService = {
  createWorkspaceForNewUser,
  getPrimaryWorkspaceForUser,
  updateSlug,
};
