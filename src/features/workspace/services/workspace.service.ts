import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import type { Workspace } from "@/db/schema";
import { workspaceMembers, workspaces } from "@/db/schema";
import { AppError } from "@/lib/errors/app-error";
import { membershipRepository } from "../repository/membership.repository";
import { roleRepository } from "../repository/role.repository";

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
      .values({ name: defaultWorkspaceName(email), slug })
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
 * MVP: a user belongs to exactly one workspace (the one created at registration),
 * so "primary" just means "first joined". Revisit once workspace switching exists.
 */
async function getPrimaryWorkspaceForUser(userId: string): Promise<Workspace | null> {
  const memberships = await membershipRepository.findWorkspacesForUser(userId);
  return memberships[0]?.workspace ?? null;
}

export const workspaceService = {
  createWorkspaceForNewUser,
  getPrimaryWorkspaceForUser,
};
