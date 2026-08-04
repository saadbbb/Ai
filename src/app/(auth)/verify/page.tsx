import { VerifyRegistrationForm } from "@/features/auth/components/verify-registration-form";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  return <VerifyRegistrationForm email={email ?? ""} />;
}
