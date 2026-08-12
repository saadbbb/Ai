import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { createRecoveryWorkspaceAction } from "@/features/workspace/actions/create-recovery-workspace.action";
import { workspaceService } from "@/features/workspace/services/workspace.service";
import { requireUser } from "@/lib/auth/auth-guard";

/**
 * Landing point for an authenticated user with zero workspace memberships —
 * e.g. a platform admin hard-deleted their workspace. requireWorkspaceForUser
 * sends users here instead of /login: redirecting to /login would loop
 * forever, since middleware bounces any already-authenticated request away
 * from the auth pages straight back to /dashboard, which immediately redirects
 * here again.
 */
export default async function NoWorkspacePage() {
  const user = await requireUser();
  const workspace = await workspaceService.getPrimaryWorkspaceForUser(user.id);
  if (workspace) redirect("/dashboard");

  const t = await getTranslations("noWorkspace");

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <Logo className="h-9" />
      <div className="max-w-sm space-y-2">
        <h1 className="font-heading text-xl font-extrabold text-foreground">{t("title")}</h1>
        <p className="text-sm text-text-secondary">{t("description")}</p>
      </div>
      <div className="flex items-center gap-3">
        <form action={createRecoveryWorkspaceAction}>
          <Button type="submit">{t("createWorkspace")}</Button>
        </form>
        <LogoutButton />
      </div>
    </div>
  );
}
