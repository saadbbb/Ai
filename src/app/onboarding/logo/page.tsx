import { LogoForm } from "@/features/onboarding/components/logo-form";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";

export default async function LogoPage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);

  return <LogoForm defaultLogoUrl={workspace.logoUrl} />;
}
