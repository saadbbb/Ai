import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { profileSyncService } from "@/features/auth/services/profile-sync.service";
import { userRepository } from "@/features/auth/repository/user.repository";
import type { FeatureKey } from "@/features/platform-admin/lib/features";
import { featureAccessService } from "@/features/platform-admin/services/feature-access.service";
import { platformAdminService } from "@/features/platform-admin/services/platform-admin.service";
import { permissionService } from "@/features/workspace/services/permission.service";
import { workspaceService } from "@/features/workspace/services/workspace.service";
import type { User, Workspace } from "@/db/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Wrapped in React's request-scoped cache so the layout and page calling this for the
 * same request share one session/user lookup instead of hitting Supabase/Postgres twice.
 * Supabase owns the session/JWT; this only maps that identity onto our own
 * public.users row (creating or re-keying it on first sight — see
 * profileSyncService for why a lazy, centralized sync here is simpler than
 * having every sign-in path — password, OAuth, email confirmation — do it
 * separately).
 */
export const requireUser = cache(async (): Promise<User> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();
  if (!supabaseUser || !supabaseUser.email) redirect("/login");

  const user = (await userRepository.findById(supabaseUser.id)) ?? (await profileSyncService.ensureLocalUser(supabaseUser.id, supabaseUser.email));

  return user;
});

export const CURRENT_WORKSPACE_COOKIE = "current_workspace_id";

/**
 * Every user gets a workspace at registration (see workspaceService.createWorkspaceForNewUser),
 * so a missing one here means corrupted state, not an unauthenticated request — send them
 * back through login rather than surfacing a raw error. If the user belongs to more than one
 * workspace (accepted a team invitation elsewhere), the CURRENT_WORKSPACE_COOKIE — set by
 * switchWorkspaceAction — picks which one; otherwise falls back to the first-joined.
 */
export const requireWorkspaceForUser = cache(async (userId: string): Promise<Workspace> => {
  const cookieStore = await cookies();
  const preferredWorkspaceId = cookieStore.get(CURRENT_WORKSPACE_COOKIE)?.value;
  const workspace = await workspaceService.getPrimaryWorkspaceForUser(userId, preferredWorkspaceId);
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

/**
 * Gates workspace impersonation — bootstrap (PLATFORM_ADMIN_EMAILS) admins
 * only, never a self-service database-managed admin. Redirects a regular
 * platform admin back to the workspace list rather than /dashboard, since
 * they do have access to /admin, just not to this one operation.
 */
export const requirePrimaryPlatformAdmin = cache(async (): Promise<User> => {
  const user = await requirePlatformAdmin();
  if (!platformAdminService.isBootstrapAdmin(user.email)) redirect("/admin/workspaces");

  return user;
});

/**
 * Server-side enforcement of a module's plan gate, for the module's entry
 * page — the dashboard nav already hides links a workspace's plan doesn't
 * include, but a stale bookmark or direct URL shouldn't still work.
 */
export async function requireFeature(workspace: Workspace, feature: FeatureKey): Promise<void> {
  const allowed = await featureAccessService.hasFeature(workspace, feature);
  if (!allowed) redirect("/dashboard/billing");
}

/** RBAC enforcement for a workspace action/page — see permissionService. */
export async function requireWorkspacePermission(
  userId: string,
  workspaceId: string,
  permissionKey: string,
): Promise<void> {
  const allowed = await permissionService.hasPermission(userId, workspaceId, permissionKey);
  if (!allowed) redirect("/dashboard");
}
