import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  const t = await getTranslations("app");

  if (workspace.onboardingCompletedAt) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-1 flex-col px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Logo className="h-6" />
          <span className="font-heading text-sm font-semibold">{t("name")}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {user.name ?? user.email ?? user.phone}
          </span>
          <LogoutButton />
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center py-8">
        <div className="w-full max-w-lg">{children}</div>
      </div>
    </div>
  );
}
