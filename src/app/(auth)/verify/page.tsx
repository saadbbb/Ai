import { CheckEmailNotice } from "@/features/auth/components/check-email-notice";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  return <CheckEmailNotice email={email ?? ""} />;
}
