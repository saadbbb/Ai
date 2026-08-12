import { OwnerNameForm } from "@/features/onboarding/components/owner-name-form";
import { requireUser } from "@/lib/auth/auth-guard";

export default async function OwnerNamePage() {
  const user = await requireUser();

  return <OwnerNameForm defaultValues={{ name: user.name ?? "" }} />;
}
