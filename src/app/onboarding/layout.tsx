import { redirect } from "next/navigation";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);

  if (workspace.onboardingCompletedAt) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-1 flex-col bg-muted/40 px-4 py-12">
      <div className="mb-6 flex items-center justify-end gap-3">
        <span className="text-sm text-muted-foreground">{user.email}</span>
        <LogoutButton />
      </div>
      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-lg">{children}</div>
      </div>
    </div>
  );
}
