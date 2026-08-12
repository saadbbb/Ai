import { BusinessTypeForm } from "@/features/onboarding/components/business-type-form";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";

export default async function BusinessTypePage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);

  return <BusinessTypeForm defaultValues={{ businessType: workspace.businessType ?? "" }} />;
}
