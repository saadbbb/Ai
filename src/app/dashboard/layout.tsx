import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);

  if (!workspace.onboardingCompletedAt) {
    redirect("/onboarding/business");
  }

  const t = await getTranslations("dashboard");
  const navLinks = [
    { href: "/dashboard", label: t("homeLink") },
    { href: "/dashboard/inbox", label: t("inboxLink") },
    { href: "/dashboard/contacts", label: t("contactsLink") },
    { href: "/dashboard/leads", label: t("leadsLink") },
    { href: "/dashboard/orders", label: t("ordersLink") },
    { href: "/dashboard/appointments", label: t("appointmentsLink") },
    { href: "/dashboard/automations", label: t("automationsLink") },
    { href: "/dashboard/test-ai", label: t("testAiLink") },
    { href: "/dashboard/settings", label: t("settingsLink") },
    { href: "/dashboard/knowledge-base", label: t("knowledgeBaseLink") },
  ];

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <span className="font-medium">{user.email}</span>
        <div className="flex items-center gap-3">
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
