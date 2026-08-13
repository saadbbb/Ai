import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
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
 *
 * Every protected route already goes through middleware.ts, which calls
 * supabase.auth.getUser() (a real network round-trip to Supabase's Auth
 * server) to decide whether to redirect. It forwards that already-verified
 * identity via x-supabase-user-* request headers, so this reads those first
 * instead of paying for a second, redundant getUser() network call on every
 * single page load — a real, measurable duplicate-latency fix (2026-08-13).
 * The full getUser() path below only runs as a fallback for routes that,
 * for whatever reason, weren't covered by middleware's matcher.
 */
export const requireUser = cache(async (): Promise<User> => {
  const headerStore = await headers();
  const forwardedUserId = headerStore.get("x-supabase-user-id");

  if (forwardedUserId) {
    const existing = await userRepository.findById(forwardedUserId);
    if (existing) return existing;

    return profileSyncService.ensureLocalUser(forwardedUserId, {
      email: headerStore.get("x-supabase-user-email"),
      phone: headerStore.get("x-supabase-user-phone"),
    });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();
  if (!supabaseUser || (!supabaseUser.email && !supabaseUser.phone)) redirect("/login");

  const user =
    (await userRepository.findById(supabaseUser.id)) ??
    (await profileSyncService.ensureLocalUser(supabaseUser.id, { email: supabaseUser.email, phone: supabaseUser.phone }));

  return user;
});

export const CURRENT_WORKSPACE_COOKIE = "current_workspace_id";

/**
 * Every user gets a workspace at registration (see workspaceService.createWorkspaceForNewUser),
 * so a missing one here normally means corrupted state — except a platform admin can now hard-delete
 * a workspace out from under an already-logged-in member (see admin/workspaces' delete action). That
 * user is still authenticated, so redirecting to /login would loop forever: middleware bounces any
 * authenticated request away from the auth pages straight back to /dashboard, which lands here again.
 * /no-workspace is outside both the AUTH_PAGES list and the protected-route matcher, so middleware
 * leaves it alone and the loop can't happen. If the user belongs to more than one workspace (accepted
 * a team invitation elsewhere), the CURRENT_WORKSPACE_COOKIE — set by switchWorkspaceAction — picks
 * which one; otherwise falls back to the first-joined.
 */
export const requireWorkspaceForUser = cache(async (userId: string): Promise<Workspace> => {
  const cookieStore = await cookies();
  const preferredWorkspaceId = cookieStore.get(CURRENT_WORKSPACE_COOKIE)?.value;
  const workspace = await workspaceService.getPrimaryWorkspaceForUser(userId, preferredWorkspaceId);
  if (!workspace) redirect("/no-workspace");

  return workspace;
});

/**
 * Gates the Super Admin Platform (/admin/*) — completely separate from
 * workspace membership/roles, which only govern access within a tenant.
 * See platformAdminService for the two-layer (env var + database) check.
 */
export const requirePlatformAdmin = cache(async (): Promise<User> => {
  const user = await requireUser();
  // Platform admins are always email-identified (Yaqiz staff) — a phone-only user
  // (empty string here) can never match and is correctly always rejected.
  const isAdmin = await platformAdminService.isPlatformAdmin(user.email ?? "");
  if (!isAdmin) redirect("/dashboard");

  return user;
});

/**
 * Gates every platform-admin mutation (server actions) — a database-managed
 * admin with the "read_only" role can view every /admin page but can't
 * submit any of them. Bootstrap (env var) admins are always write-capable
 * (see platformAdminService.isReadOnly). Redirects to /admin rather than
 * /dashboard since a read-only admin still has legitimate access to the
 * platform, just not to this one action.
 */
export const requireWritePlatformAdmin = cache(async (): Promise<User> => {
  const user = await requirePlatformAdmin();
  if (await platformAdminService.isReadOnly(user.email ?? "")) redirect("/admin");
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
  if (!platformAdminService.isBootstrapAdmin(user.email ?? "")) redirect("/admin/workspaces");

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
