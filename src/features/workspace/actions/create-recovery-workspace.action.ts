"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/auth-guard";
import { workspaceService } from "../services/workspace.service";

/**
 * Self-service recovery for the /no-workspace dead end (e.g. a platform admin
 * hard-deleted the user's workspace — see requireWorkspaceForUser). Reuses the
 * same creation path as a brand-new signup; the old workspace's data is not
 * recoverable, so this always starts a fresh trial workspace through onboarding.
 */
export async function createRecoveryWorkspaceAction(): Promise<void> {
  const user = await requireUser();
  const existing = await workspaceService.getPrimaryWorkspaceForUser(user.id);
  if (existing) redirect("/dashboard");

  await workspaceService.createWorkspaceForNewUser(user.id, user.email ?? user.phone ?? user.id);
  redirect("/onboarding/owner-name");
}
