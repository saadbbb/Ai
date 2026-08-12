import { BusinessInfoForm } from "@/features/onboarding/components/business-info-form";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";

export default async function BusinessInfoPage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);

  return <BusinessInfoForm defaultValues={{ name: workspace.name }} />;
}
