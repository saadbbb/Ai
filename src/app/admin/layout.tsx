import { LayoutDashboard } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { AccountMenu, type AccountMenuItem } from "@/components/app-shell/account-menu";
import { MobileNav } from "@/components/app-shell/mobile-nav";
import type { NavGroupItem } from "@/components/app-shell/sidebar-nav";
import { SidebarNav } from "@/components/app-shell/sidebar-nav";
import { TopbarTitle } from "@/components/app-shell/topbar-title";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Logo } from "@/components/logo";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { requirePlatformAdmin } from "@/lib/auth/auth-guard";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requirePlatformAdmin();
  const [t, tApp] = await Promise.all([getTranslations("platformAdmin"), getTranslations("app")]);

  const groups: NavGroupItem[] = [
    { links: [{ href: "/admin", label: t("homeLink") }] },
    { links: [{ href: "/admin/workspaces", label: t("workspacesLink") }] },
    {
      heading: t("billingSection"),
      links: [
        { href: "/admin/plans", label: t("plansLink") },
        { href: "/admin/coupons", label: t("couponsLink") },
        { href: "/admin/refunds", label: t("refundsLink") },
        { href: "/admin/revenue", label: t("revenueLink") },
      ],
    },
    {
      heading: t("analyticsSection"),
      links: [
        { href: "/admin/platform-analytics", label: t("platformAnalyticsLink") },
        { href: "/admin/ai-usage", label: t("aiUsageLink") },
        { href: "/admin/ai-operations", label: t("aiOperationsLink") },
      ],
    },
    { links: [{ href: "/admin/tickets", label: t("ticketsLink") }] },
    {
      heading: t("platformSection"),
      links: [
        { href: "/admin/feature-flags", label: t("featureFlagsLink") },
        { href: "/admin/system-health", label: t("systemHealthLink") },
        { href: "/admin/settings", label: t("settingsLink") },
        { href: "/admin/admins", label: t("adminsLink") },
        { href: "/admin/audit-log", label: t("auditLogLink") },
      ],
    },
  ];

  const accountItems: AccountMenuItem[] = [
    { href: "/dashboard", label: t("backToDashboard"), icon: <LayoutDashboard className="size-4 shrink-0" /> },
  ];
  const productName = tApp("name");

  return (
    <div className="flex min-h-full flex-1">
      <aside className="sticky top-0 hidden h-dvh w-[17rem] shrink-0 flex-col border-e bg-sidebar md:flex">
        <Link href="/admin" className="flex items-center gap-2.5 border-b px-5 py-4">
          <Logo className="h-8" />
          <div className="min-w-0">
            <div className="truncate font-heading text-base font-extrabold text-sidebar-foreground">{productName}</div>
            <div className="truncate text-[11px] font-medium text-text-muted">{t("badge")}</div>
          </div>
        </Link>
        <div className="flex-1 overflow-y-auto px-3 py-5">
          <SidebarNav groups={groups} />
        </div>
        <div className="border-t p-2">
          <AccountMenu email={admin.email} items={accountItems} logoutSlot={<LogoutButton />} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b bg-surface px-4 md:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="md:hidden">
              <MobileNav
                groups={groups}
                productName={productName}
                accountItems={accountItems}
                navLabel={t("menuLabel")}
                logoutSlot={<LogoutButton />}
              />
            </div>
            <Link href="/admin" className="flex items-center gap-2 md:hidden">
              <Logo className="h-6" />
              <span className="truncate text-sm font-semibold">{productName}</span>
            </Link>
            <div className="hidden md:block">
              <TopbarTitle groups={groups} />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Link
              href="/dashboard"
              className="hidden items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background hover:opacity-90 sm:flex"
            >
              <LayoutDashboard className="size-3.5" />
              {t("backToDashboard")}
            </Link>
            <LocaleSwitcher />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
