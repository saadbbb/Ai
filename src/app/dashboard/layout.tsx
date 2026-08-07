import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
    isPlatformAdmin,
    { notifications, unreadCount },
    memberships,
    canViewTeam,
    canViewAnalytics,
    canViewAutomations,
    canViewSupport,
  ] = await Promise.all([
    getTranslations("dashboard"),
    platformAdminService.isPlatformAdmin(user.email),
    notificationService.getForWorkspace(workspace.id),
    membershipRepository.findWorkspacesForUser(user.id),
    permissionService.hasPermission(user.id, workspace.id, "workspace.members.view"),
    permissionService.hasPermission(user.id, workspace.id, "analytics.view"),
    permissionService.hasPermission(user.id, workspace.id, "automation.workflows.view"),
    permissionService.hasPermission(user.id, workspace.id, "support.tickets.view"),
  ]);
  const isSuspended = workspace.subscriptionStatus === "suspended";
  const [settings, enabledFeatures] = await Promise.all([
    isSuspended ? platformSettingsRepository.get() : Promise.resolve(null),
    isSuspended ? Promise.resolve([]) : featureAccessService.getEnabledFeatures(workspace),
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
      ],
    },
  ];

  const groups = rawGroups
    .map((group) => ({ ...group, links: group.links.filter((link) => !link.feature || enabledFeatures.includes(link.feature)) }))
    .filter((group) => group.links.length > 0);
  const flatLinks = groups.flatMap((group) => group.links);

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm">
                {t("accountMenuLabel")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/workspace-profile">{t("workspaceProfileLink")}</Link>
              </DropdownMenuItem>
              {canViewTeam && (
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/team">{t("teamLink")}</Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <Link href="/dashboard/billing">{t("billingLink")}</Link>
              </DropdownMenuItem>
              {canViewTeam && (
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/audit-log">{t("auditLogLink")}</Link>
                </DropdownMenuItem>
              )}
              {canViewSupport && (
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/support">{t("supportLink")}</Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <div className="px-1 py-1">
                <LogoutButton />
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
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
        <div className="flex flex-1">
          <aside className="hidden w-56 shrink-0 space-y-6 overflow-y-auto border-e px-4 py-6 md:block">
            {groups.map((group) => (
              <div key={group.heading ?? group.links[0]?.href} className="space-y-1">
                {group.heading && (
                  <p className="px-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">{group.heading}</p>
                )}
                {group.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            ))}
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <nav className="flex items-center gap-4 overflow-x-auto border-b px-6 py-2 text-sm md:hidden">
              {flatLinks.map((link) => (
                <Link key={link.href} href={link.href} className="shrink-0 text-muted-foreground hover:text-foreground">
                  {link.label}
                </Link>
              ))}
            </nav>

            <main className="flex-1 p-6">{children}</main>
          </div>
        </div>
      )}
    </div>
  );
}
