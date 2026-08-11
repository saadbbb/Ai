import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Logo } from "@/components/logo";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("app");

  return (
    <div className="flex flex-1 flex-col bg-muted/40 px-4 py-8">
      <div className="flex justify-end">
        <LocaleSwitcher />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 py-6">
        <Link href="/login" className="flex flex-col items-center gap-2.5">
          <Logo variant="tile" className="h-14" />
          <span className="font-heading text-lg font-semibold text-foreground">{t("name")}</span>
        </Link>
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
