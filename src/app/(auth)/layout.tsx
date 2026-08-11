import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Logo } from "@/components/logo";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("app");

  return (
    <div className="flex min-h-full flex-1">
      <div className="relative hidden w-full max-w-md shrink-0 flex-col items-start justify-between overflow-hidden bg-primary p-10 text-primary-foreground md:flex lg:max-w-lg">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "radial-gradient(currentColor 1.5px, transparent 1.5px)",
            backgroundSize: "22px 22px",
          }}
        />
        <Link href="/login" className="relative flex items-center gap-2.5">
          <Logo variant="tile" className="h-10 shrink-0" />
          <span className="font-heading text-lg font-semibold">{t("name")}</span>
        </Link>
        <p className="relative font-heading text-3xl leading-tight font-semibold text-balance">{t("tagline")}</p>
        <p className="relative text-xs text-primary-foreground/60">
          © {new Date().getFullYear()} {t("name")}
        </p>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex justify-end p-4">
          <LocaleSwitcher />
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 pb-16">
          <Link href="/login" className="flex flex-col items-center gap-2.5 md:hidden">
            <Logo variant="tile" className="h-14" />
            <span className="font-heading text-lg font-semibold text-foreground">{t("name")}</span>
          </Link>
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
