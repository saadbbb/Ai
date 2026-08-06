import { VerifySignupOtpForm } from "@/features/auth/components/verify-signup-otp-form";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  return <VerifySignupOtpForm email={email ?? ""} />;
}
