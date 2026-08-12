import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Logo } from "@/components/logo";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("app");

  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <div
        className="relative flex w-full shrink-0 flex-col items-start justify-between overflow-hidden p-6 text-white md:max-w-md md:p-12 lg:max-w-lg"
        style={{
          backgroundImage:
            "radial-gradient(700px 500px at 20% 0%, rgba(255,255,255,.12), transparent 60%), linear-gradient(160deg, #221bb8 0%, #6d63f6 55%, #2ad9a8 130%)",
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: "radial-gradient(currentColor 1.5px, transparent 1.5px)",
            backgroundSize: "22px 22px",
          }}
        />
        <Link href="/login" className="relative flex items-center gap-2.5">
          <Logo className="h-9 shrink-0" />
          <span className="font-heading text-lg font-extrabold">{t("name")}</span>
        </Link>
        <p className="relative mt-6 font-heading text-2xl leading-tight font-extrabold text-balance md:mt-0 md:text-4xl">
          {t("tagline")}
        </p>
        <p className="relative hidden text-xs text-white/70 md:block">
          © {new Date().getFullYear()} {t("name")}
        </p>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex justify-end p-4">
          <LocaleSwitcher />
        </div>
        <div className="flex flex-1 flex-col items-center justify-center px-4 pb-16">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
