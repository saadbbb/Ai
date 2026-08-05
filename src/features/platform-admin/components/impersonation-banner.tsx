import { getTranslations } from "next-intl/server";

/**
 * Server component (no client JS needed) — deliberately impossible to miss
 * or dismiss for the duration of the view. There is no corresponding "act as"
 * mode: this page tree only ever renders, it never accepts a mutation.
 */
export async function ImpersonationBanner({ workspaceName }: { workspaceName: string }) {
  const t = await getTranslations("platformAdmin.impersonation");

  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      {t("banner", { workspace: workspaceName })}
    </div>
  );
}
