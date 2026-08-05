import { redirect } from "next/navigation";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);

  if (workspace.onboardingCompletedAt) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-lg">{children}</div>
    </div>
  );
}
