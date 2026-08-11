import { Building2, CreditCard, History, LifeBuoy, ShieldCheck, Users2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountMenu, type AccountMenuItem } from "@/components/app-shell/account-menu";
import { MobileNav } from "@/components/app-shell/mobile-nav";
import { SidebarNav } from "@/components/app-shell/sidebar-nav";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Logo } from "@/components/logo";
import { BLOCKED_SUBSCRIPTION_STATUSES } from "@/db/schema";
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

interface NavLink {
  href: string;
  label: string;
  feature?: FeatureKey;
}

interface NavGroup {
  heading?: string;
  links: NavLink[];
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);

  if (!workspace.onboardingCompletedAt) {
    redirect("/onboarding/business");
  }

  const [
    t,
    tApp,
    isPlatformAdmin,
    { notifications, unreadCount },
    memberships,
    canViewTeam,
    canViewAnalytics,
    canViewAutomations,
    canViewSupport,
    canManageIntegrations,
    canManageCampaigns,
    canManageAds,
  ] = await Promise.all([
    getTranslations("dashboard"),
    getTranslations("app"),
    platformAdminService.isPlatformAdmin(user.email),
    notificationService.getForWorkspace(workspace.id),
    membershipRepository.findWorkspacesForUser(user.id),
    permissionService.hasPermission(user.id, workspace.id, "workspace.members.view"),
    permissionService.hasPermission(user.id, workspace.id, "analytics.view"),
    permissionService.hasPermission(user.id, workspace.id, "automation.workflows.view"),
    permissionService.hasPermission(user.id, workspace.id, "support.tickets.view"),
    permissionService.hasPermission(user.id, workspace.id, "integrations.manage"),
    permissionService.hasPermission(user.id, workspace.id, "campaigns.manage"),
    permissionService.hasPermission(user.id, workspace.id, "ads.manage"),
  ]);
  const isBlocked = (BLOCKED_SUBSCRIPTION_STATUSES as readonly string[]).includes(workspace.subscriptionStatus);
  const isOverdue = workspace.subscriptionStatus === "past_due" || workspace.subscriptionStatus === "grace";
  const [settings, enabledFeatures] = await Promise.all([
    isBlocked ? platformSettingsRepository.get() : Promise.resolve(null),
    isBlocked ? Promise.resolve([]) : featureAccessService.getEnabledFeatures(workspace),
  ]);

  // PART 13B's 5-section IA: HOME and INBOX stand alone; CUSTOMERS, AI EMPLOYEE, and GROWTH
  // are groups. Team/Billing/Workspace Profile/Audit Log move to the account menu below,
  // not the main sidebar — that's WORKSPACE SETTINGS, reached less often than daily work.
  const rawGroups: NavGroup[] = [
    { links: [{ href: "/dashboard", label: t("homeLink") }] },
    { links: [{ href: "/dashboard/inbox", label: t("inboxLink"), feature: "inbox" }] },
    {
      heading: t("customersSection"),
      links: [
        { href: "/dashboard/contacts", label: t("contactsLink"), feature: "contacts" },
        { href: "/dashboard/leads", label: t("leadsLink"), feature: "leads" },
        { href: "/dashboard/orders", label: t("ordersLink"), feature: "orders" },
        { href: "/dashboard/appointments", label: t("appointmentsLink"), feature: "appointments" },
      ],
    },
    {
      heading: t("aiEmployeeSection"),
      links: [
        { href: "/dashboard/ai-employee", label: t("settingsLink") },
        { href: "/dashboard/knowledge-base", label: t("knowledgeBaseLink"), feature: "knowledge_base" },
        { href: "/dashboard/test-ai", label: t("testAiLink") },
      ],
    },
    {
      heading: t("growthSection"),
      links: [
        ...(canViewAutomations ? [{ href: "/dashboard/automations", label: t("automationsLink"), feature: "automations" as const }] : []),
        ...(canViewAnalytics ? [{ href: "/dashboard/analytics", label: t("analyticsLink"), feature: "analytics" as const }] : []),
        { href: "/dashboard/website", label: t("websiteLink"), feature: "website" as const },
        ...(canManageIntegrations ? [{ href: "/dashboard/integrations", label: t("integrationsLink"), feature: "integrations" as const }] : []),
        ...(canManageCampaigns ? [{ href: "/dashboard/campaigns", label: t("campaignsLink"), feature: "campaigns" as const }] : []),
        ...(canManageAds ? [{ href: "/dashboard/ads", label: t("adsLink"), feature: "ads" as const }] : []),
      ],
    },
  ];

  const groups = rawGroups
    .map((group) => ({ ...group, links: group.links.filter((link) => !link.feature || enabledFeatures.includes(link.feature)) }))
    .filter((group) => group.links.length > 0);

  const accountItems: AccountMenuItem[] = [
    { href: "/dashboard/workspace-profile", label: t("workspaceProfileLink"), icon: <Building2 className="size-4 shrink-0" /> },
    ...(canViewTeam ? [{ href: "/dashboard/team", label: t("teamLink"), icon: <Users2 className="size-4 shrink-0" /> }] : []),
    { href: "/dashboard/billing", label: t("billingLink"), icon: <CreditCard className="size-4 shrink-0" /> },
    ...(canViewTeam ? [{ href: "/dashboard/audit-log", label: t("auditLogLink"), icon: <History className="size-4 shrink-0" /> }] : []),
    ...(canViewSupport ? [{ href: "/dashboard/support", label: t("supportLink"), icon: <LifeBuoy className="size-4 shrink-0" /> }] : []),
  ];

  const productName = tApp("name");

  const topBar = (
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
        <Link href="/dashboard" className="flex items-center gap-2 md:hidden">
          <Logo className="h-6" />
          <span className="truncate text-sm font-semibold">{productName}</span>
        </Link>
        {memberships.length > 1 && (
          <div className="hidden md:block">
            <WorkspaceSwitcher workspaces={memberships.map((m) => m.workspace)} currentWorkspaceId={workspace.id} />
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <NotificationBell initialNotifications={notifications} initialUnreadCount={unreadCount} />
        {isPlatformAdmin && (
          <Link
            href="/admin/settings"
            className="hidden items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background hover:opacity-90 sm:flex"
          >
            <ShieldCheck className="size-3.5" />
            {t("platformAdminLink")}
          </Link>
        )}
        <LocaleSwitcher />
      </div>
    </header>
  );

  if (isBlocked) {
    return (
      <div className="flex min-h-full flex-1 flex-col">
        {topBar}
        <main className="flex flex-1 items-center justify-center p-6">
          <div className="max-w-sm space-y-4 rounded-xl border bg-card shadow-sm p-8 text-center">
            <Logo variant="tile" className="mx-auto h-12" />
            <div className="space-y-1.5">
              <h1 className="font-heading text-base font-semibold">{t("suspended.title")}</h1>
              <p className="text-sm text-text-secondary">{t("suspended.description")}</p>
            </div>
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
            <div className="pt-2">
              <LogoutButton />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-e bg-sidebar md:flex">
        <Link href="/dashboard" className="flex h-16 items-center gap-2.5 border-b px-5">
          <Logo className="h-7" />
          <span className="truncate font-heading text-base font-semibold text-sidebar-foreground">{productName}</span>
        </Link>
        <div className="flex-1 overflow-y-auto px-3 py-5">
          <SidebarNav groups={groups} />
        </div>
        <div className="border-t p-2">
          <AccountMenu email={user.email} items={accountItems} logoutSlot={<LogoutButton />} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {topBar}

        {isOverdue && (
          <div className="border-b bg-warning-soft px-4 py-2 text-sm text-warning-foreground md:px-6 lg:px-8">
            {t(`overdue.${workspace.subscriptionStatus}`)}{" "}
            <Link href="/dashboard/billing" className="font-medium underline underline-offset-2">
              {t("overdue.cta")}
            </Link>
          </div>
        )}

        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
