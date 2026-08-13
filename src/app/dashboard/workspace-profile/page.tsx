import { History, LifeBuoy } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { RowList } from "@/components/data-table";
import { PageContainer } from "@/components/page-container";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IN_GOOD_STANDING_STATUSES, WORKSPACE_TIMEZONE } from "@/db/schema";
import { BusinessInfoSettingsForm } from "@/features/ai/components/business-info-settings-form";
import { activityRepository } from "@/features/crm/repository/activity.repository";
import { planRepository } from "@/features/platform-admin/repository/plan.repository";
import { platformSettingsRepository } from "@/features/platform-admin/repository/platform-settings.repository";
import { invoiceService } from "@/features/platform-admin/services/invoice.service";
import { usageService, type UsageDimension } from "@/features/platform-admin/services/usage.service";
import { ticketService } from "@/features/support/services/ticket.service";
import { TeamManager } from "@/features/workspace/components/team-manager";
import { buildUnifiedActivityFeed } from "@/features/workspace/lib/unified-activity";
import { workspaceAuditLogRepository } from "@/features/workspace/repository/workspace-audit-log.repository";
import { permissionService } from "@/features/workspace/services/permission.service";
import { teamService } from "@/features/workspace/services/team.service";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { cn } from "@/lib/utils";

const USAGE_DIMENSIONS: UsageDimension[] = [
  "users",
  "aiAgents",
  "channels",
  "conversationsPerMonth",
  "knowledgeFiles",
  "automationWorkflows",
  "integrations",
];

function toWhatsappDigits(number: string): string {
  return number.replace(/[^0-9]/g, "");
}

/**
 * Repurposes the old single-purpose "Workspace Profile" page (PART 3 follow-up,
 * 2026-08-12) into a consolidated hub — Profile / Billing / Team / Audit Log /
 * Support as tabs, reached from the topbar Profile menu's "إدارة نشاطك" link
 * instead of four separate sidebar entries. Nothing was removed: /dashboard/team,
 * /dashboard/billing, /dashboard/audit-log, and /dashboard/support still work as
 * direct URLs (invitation emails, support-ticket-detail links, etc. still point
 * there) — this page just fetches the same data and reuses the same components.
 */
export default async function BusinessSettingsHubPage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);

  const [t, tTeam, tBilling, tFeatures, tAuditLog, tSupport] = await Promise.all([
    getTranslations("workspaceProfile"),
    getTranslations("team"),
    getTranslations("billing"),
    getTranslations("platformAdmin.plans"),
    getTranslations("auditLog"),
    getTranslations("support"),
  ]);

  const [canViewTeam, canViewSupport] = await Promise.all([
    permissionService.hasPermission(user.id, workspace.id, "workspace.members.view"),
    permissionService.hasPermission(user.id, workspace.id, "support.tickets.view"),
  ]);

  const isInGoodStanding = (IN_GOOD_STANDING_STATUSES as readonly string[]).includes(workspace.subscriptionStatus);
  const isOverdue = workspace.subscriptionStatus === "past_due" || workspace.subscriptionStatus === "grace";

  const [settings, plan, invoices, teamData, canInviteTeam, canManageTeam, auditData, tickets] = await Promise.all([
    platformSettingsRepository.getCached(),
    workspace.planId ? planRepository.findById(workspace.planId) : Promise.resolve(null),
    invoiceService.listForWorkspace(workspace.id),
    canViewTeam ? teamService.getTeam(workspace.id) : Promise.resolve({ members: [], invitations: [], roles: [] }),
    canViewTeam ? permissionService.hasPermission(user.id, workspace.id, "workspace.members.invite") : Promise.resolve(false),
    canViewTeam ? permissionService.hasPermission(user.id, workspace.id, "workspace.members.manage") : Promise.resolve(false),
    canViewTeam
      ? Promise.all([activityRepository.findByWorkspaceId(workspace.id), workspaceAuditLogRepository.findRecentForWorkspace(workspace.id)])
      : Promise.resolve([[], []] as [Awaited<ReturnType<typeof activityRepository.findByWorkspaceId>>, Awaited<ReturnType<typeof workspaceAuditLogRepository.findRecentForWorkspace>>]),
    canViewSupport ? ticketService.listTickets(workspace.id) : Promise.resolve([]),
  ]);
  const usage = isInGoodStanding ? await usageService.getUsageSnapshot(workspace.id, plan) : null;
  const whatsappDigits = settings?.whatsappNumber ? toWhatsappDigits(settings.whatsappNumber) : null;
  const message = (settings?.whatsappMessageTemplate || tBilling("defaultMessage")).replaceAll("{{workspaceName}}", workspace.name);
  const whatsappHref = whatsappDigits ? `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(message)}` : null;

  const [activities, auditLogs] = auditData;
  const events = buildUnifiedActivityFeed(activities, auditLogs);
  const dateFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: WORKSPACE_TIMEZONE, dateStyle: "medium", timeStyle: "short" });

  return (
    <PageContainer>
      <PageHeader title={t("pageTitle")} description={t("pageDescription")} />

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">{t("profileTabLabel")}</TabsTrigger>
          <TabsTrigger value="billing">{tBilling("title")}</TabsTrigger>
          {canViewTeam && <TabsTrigger value="team">{tTeam("title")}</TabsTrigger>}
          {canViewTeam && <TabsTrigger value="auditLog">{tAuditLog("pageTitle")}</TabsTrigger>}
          {canViewSupport && <TabsTrigger value="support">{tSupport("title")}</TabsTrigger>}
        </TabsList>

        <TabsContent value="profile" className="pt-4">
          <BusinessInfoSettingsForm
            defaultValues={{
              name: workspace.name,
              businessType: workspace.businessType ?? "",
              logoUrl: workspace.logoUrl ?? "",
            }}
          />
        </TabsContent>

        <TabsContent value="billing" className="pt-4">
          <div className="mx-auto max-w-lg space-y-6">
            <Card>
              <CardContent className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">{tBilling("currentPlan")}</p>
                <p className="text-lg font-semibold">{tBilling(`statuses.${workspace.subscriptionStatus}`)}</p>

                {isInGoodStanding ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      {isOverdue ? tBilling(`overdue.${workspace.subscriptionStatus}`) : tBilling("activeDescription")}
                    </p>
                    {plan && (
                      <div className="space-y-1 rounded-lg border p-3 text-start text-sm">
                        <p className="font-medium">{plan.name}</p>
                        {workspace.subscriptionExpiresAt && (
                          <p className="text-muted-foreground">
                            {tBilling("expiresOn", {
                              date: new Intl.DateTimeFormat("en-GB", { timeZone: WORKSPACE_TIMEZONE, dateStyle: "medium" }).format(
                                new Date(workspace.subscriptionExpiresAt),
                              ),
                            })}
                          </p>
                        )}
                        <p className="text-muted-foreground">{plan.enabledFeatures.map((key) => tFeatures(`features.${key}`)).join(", ")}</p>
                      </div>
                    )}

                    {usage && (
                      <div className="space-y-3 rounded-lg border p-3 text-start text-sm">
                        <p className="font-medium">{tBilling("usageHeading")}</p>
                        {USAGE_DIMENSIONS.filter((dimension) => usage[dimension].limit != null).map((dimension) => {
                          const metric = usage[dimension];
                          return (
                            <div key={dimension} className="space-y-1">
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{tBilling(`usage.${dimension}`)}</span>
                                <span>
                                  {metric.used}/{metric.limit}
                                </span>
                              </div>
                              <Progress
                                value={Math.min(metric.percentUsed ?? 0, 100)}
                                className="h-1.5"
                                indicatorClassName={cn(
                                  (metric.percentUsed ?? 0) >= 100
                                    ? "bg-destructive"
                                    : (metric.percentUsed ?? 0) >= 80
                                      ? "bg-warning"
                                      : "bg-primary",
                                )}
                              />
                            </div>
                          );
                        })}
                        {USAGE_DIMENSIONS.every((dimension) => usage[dimension].limit == null) && (
                          <p className="text-xs text-muted-foreground">{tBilling("usageUnlimited")}</p>
                        )}
                      </div>
                    )}
                  </>
                ) : whatsappHref ? (
                  <>
                    <p className="text-sm text-muted-foreground">{tBilling("ctaDescription")}</p>
                    <Button asChild size="lg">
                      <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                        {tBilling("whatsappCta")}
                      </a>
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {settings?.supportEmail ? tBilling("fallbackWithEmail", { email: settings.supportEmail }) : tBilling("fallbackNoContact")}
                  </p>
                )}
              </CardContent>
            </Card>

            {invoices.length > 0 && (
              <Card>
                <CardContent className="space-y-3">
                  <p className="text-sm font-medium">{tBilling("historyHeading")}</p>
                  <div className="divide-y">
                    {invoices.map((invoice) => (
                      <div key={invoice.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                        <div>
                          <p className="font-medium">{invoice.invoiceNumber}</p>
                          <p className="text-xs text-muted-foreground">
                            {invoice.planName} · {invoice.amount} {invoice.currency} · {invoice.issuedAt.toISOString().slice(0, 10)}
                          </p>
                        </div>
                        <a href={`/api/invoices/${invoice.id}/pdf`} className="shrink-0 text-xs font-medium text-primary hover:underline">
                          {tBilling("downloadPdf")}
                        </a>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {canViewTeam && (
          <TabsContent value="team" className="pt-4">
            <div className="mx-auto max-w-2xl">
              <TeamManager
                initialMembers={teamData.members}
                initialInvitations={teamData.invitations}
                roles={teamData.roles}
                canInvite={canInviteTeam}
                canManage={canManageTeam}
                currentUserId={user.id}
              />
            </div>
          </TabsContent>
        )}

        {canViewTeam && (
          <TabsContent value="auditLog" className="pt-4">
            <div className="mx-auto max-w-2xl">
              <RowList
                items={events}
                getRowKey={(event) => event.id}
                getRowHref={(event) => event.link}
                emptyState={{ icon: History, title: tAuditLog("emptyState") }}
                renderRow={(event) => (
                  <>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{tAuditLog(`source.${event.source}`)}</Badge>
                        <p className="truncate">{event.summary}</p>
                      </div>
                      {event.actorLabel && <p className="truncate text-xs text-muted-foreground">{event.actorLabel}</p>}
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">{dateFormatter.format(event.createdAt)}</span>
                  </>
                )}
              />
            </div>
          </TabsContent>
        )}

        {canViewSupport && (
          <TabsContent value="support" className="pt-4">
            <div className="mx-auto max-w-2xl space-y-4">
              <div className="flex justify-end">
                <Button asChild>
                  <Link href="/dashboard/support/new">{tSupport("newTicket")}</Link>
                </Button>
              </div>
              <RowList
                items={tickets}
                getRowKey={(ticket) => ticket.id}
                getRowHref={(ticket) => `/dashboard/support/${ticket.id}`}
                emptyState={{ icon: LifeBuoy, title: tSupport("emptyState") }}
                renderRow={(ticket) => (
                  <>
                    <span className="min-w-0 flex-1 truncate font-medium">{ticket.subject}</span>
                    <span className="shrink-0 text-muted-foreground">{tSupport(`statuses.${ticket.status}`)}</span>
                  </>
                )}
              />
            </div>
          </TabsContent>
        )}
      </Tabs>
    </PageContainer>
  );
}
