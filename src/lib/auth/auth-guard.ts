import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { userRepository } from "@/features/auth/repository/user.repository";
import { platformAdminService } from "@/features/platform-admin/services/platform-admin.service";
import { workspaceService } from "@/features/workspace/services/workspace.service";
import type { User, Workspace } from "@/db/schema";
import { getCurrentSession } from "./session";

/**
 * Wrapped in React's request-scoped cache so the layout and page calling this for the
 * same request share one session/user lookup instead of hitting Redis/Postgres twice.
 */
export const requireUser = cache(async (): Promise<User> => {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const user = await userRepository.findById(session.userId);
  if (!user) redirect("/login");

  return user;
});

/**
 * Every user gets a workspace at registration (see workspaceService.createWorkspaceForNewUser),
 * so a missing one here means corrupted state, not an unauthenticated request — send them
 * back through login rather than surfacing a raw error.
 */
export const requireWorkspaceForUser = cache(async (userId: string): Promise<Workspace> => {
  const workspace = await workspaceService.getPrimaryWorkspaceForUser(userId);
  if (!workspace) redirect("/login");

  return workspace;
});

/**
 * Gates the Super Admin Platform (/admin/*) — completely separate from
 * workspace membership/roles, which only govern access within a tenant.
 * See platformAdminService for the two-layer (env var + database) check.
 */
export const requirePlatformAdmin = cache(async (): Promise<User> => {
  const user = await requireUser();
  const isAdmin = await platformAdminService.isPlatformAdmin(user.email);
  if (!isAdmin) redirect("/dashboard");

  return user;
});
