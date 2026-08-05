import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { notificationService } from "@/features/notifications/services/notification.service";
import type { FeatureKey } from "@/features/platform-admin/lib/features";
import { platformSettingsRepository } from "@/features/platform-admin/repository/platform-settings.repository";
import { featureAccessService } from "@/features/platform-admin/services/feature-access.service";
import { platformAdminService } from "@/features/platform-admin/services/platform-admin.service";
import { WorkspaceSwitcher } from "@/features/workspace/components/workspace-switcher";
import { membershipRepository } from "@/features/workspace/repository/membership.repository";
import { permissionService } from "@/features/workspace/services/permission.service";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);

  if (!workspace.onboardingCompletedAt) {
    redirect("/onboarding/business");
  }

  const [t, isPlatformAdmin, { notifications, unreadCount }, memberships, canViewTeam] = await Promise.all([
    getTranslations("dashboard"),
    platformAdminService.isPlatformAdmin(user.email),
    notificationService.getForWorkspace(workspace.id),
    membershipRepository.findWorkspacesForUser(user.id),
    permissionService.hasPermission(user.id, workspace.id, "workspace.members.view"),
  ]);
  const isSuspended = workspace.subscriptionStatus === "suspended";
  const [settings, enabledFeatures] = await Promise.all([
    isSuspended ? platformSettingsRepository.get() : Promise.resolve(null),
    isSuspended ? Promise.resolve([]) : featureAccessService.getEnabledFeatures(workspace),
  ]);
  const allNavLinks: { href: string; label: string; feature?: FeatureKey }[] = [
    { href: "/dashboard", label: t("homeLink") },
    { href: "/dashboard/inbox", label: t("inboxLink"), feature: "inbox" },
    { href: "/dashboard/contacts", label: t("contactsLink"), feature: "contacts" },
    { href: "/dashboard/leads", label: t("leadsLink"), feature: "leads" },
    { href: "/dashboard/orders", label: t("ordersLink"), feature: "orders" },
    { href: "/dashboard/appointments", label: t("appointmentsLink"), feature: "appointments" },
    { href: "/dashboard/automations", label: t("automationsLink"), feature: "automations" },
    { href: "/dashboard/billing", label: t("billingLink") },
    { href: "/dashboard/test-ai", label: t("testAiLink") },
    { href: "/dashboard/settings", label: t("settingsLink") },
    { href: "/dashboard/knowledge-base", label: t("knowledgeBaseLink"), feature: "knowledge_base" },
    ...(canViewTeam ? [{ href: "/dashboard/team", label: t("teamLink") }] : []),
  ];
  const navLinks = allNavLinks.filter((link) => !link.feature || enabledFeatures.includes(link.feature));

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="font-medium">{user.email}</span>
          {memberships.length > 1 && (
            <WorkspaceSwitcher workspaces={memberships.map((m) => m.workspace)} currentWorkspaceId={workspace.id} />
          )}
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell initialNotifications={notifications} initialUnreadCount={unreadCount} />
          {isPlatformAdmin && (
            <Link
              href="/admin/settings"
              className="rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background hover:opacity-90"
            >
              {t("platformAdminLink")}
            </Link>
          )}
          <LocaleSwitcher />
          <LogoutButton />
        </div>
      </header>
      {isSuspended ? (
        <main className="flex flex-1 items-center justify-center p-6">
          <div className="max-w-sm space-y-3 rounded-lg border p-6 text-center">
            <h1 className="font-medium">{t("suspended.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("suspended.description")}</p>
            {settings?.whatsappNumber && (
              <a
                href={`https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-sm font-medium text-primary hover:underline"
              >
                {t("suspended.whatsappCta")}
              </a>
            )}
          </div>
        </main>
      ) : (
        <>
          <nav className="flex items-center gap-4 overflow-x-auto border-b px-6 py-2 text-sm">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="shrink-0 text-muted-foreground hover:text-foreground">
                {link.label}
              </Link>
            ))}
          </nav>
          <main className="flex-1 p-6">{children}</main>
        </>
      )}
    </div>
  );
}
