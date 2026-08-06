import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { requirePlatformAdmin } from "@/lib/auth/auth-guard";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requirePlatformAdmin();
  const t = await getTranslations("platformAdmin");

  const navLinks = [
    { href: "/admin", label: t("homeLink") },
    { href: "/admin/workspaces", label: t("workspacesLink") },
    { href: "/admin/plans", label: t("plansLink") },
    { href: "/admin/revenue", label: t("revenueLink") },
    { href: "/admin/ai-usage", label: t("aiUsageLink") },
    { href: "/admin/settings", label: t("settingsLink") },
    { href: "/admin/admins", label: t("adminsLink") },
    { href: "/admin/audit-log", label: t("auditLogLink") },
  ];

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex items-center justify-between border-b bg-foreground px-6 py-4 text-background">
        <div className="flex items-center gap-2">
          <span className="rounded bg-background/20 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide">
            {t("badge")}
          </span>
          <span className="font-medium">{admin.email}</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-background/70 hover:text-background">
            {t("backToDashboard")}
          </Link>
          <LocaleSwitcher />
          <LogoutButton />
        </div>
      </header>
      <nav className="flex items-center gap-4 border-b px-6 py-2 text-sm">
        {navLinks.map((link) => (
          <Link key={link.href} href={link.href} className="text-muted-foreground hover:text-foreground">
            {link.label}
          </Link>
        ))}
      </nav>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
