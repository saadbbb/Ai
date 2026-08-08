import { and, count, desc, eq, gte, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  aiUsage,
  type BillingCycle,
  channels,
  type ChannelType,
  type Currency,
  IN_GOOD_STANDING_STATUSES,
  type Plan,
  plans,
  roles,
  type SubscriptionStatus,
  users,
  type Workspace,
  workspaceMembers,
  workspaces,
} from "@/db/schema";

export interface WorkspaceAdminListItem {
  workspace: Workspace;
  ownerEmail: string | null;
  plan: Plan | null;
}

export interface DayCount {
  day: string;
  count: number;
}

const listSelection = { workspace: workspaces, ownerEmail: users.email, plan: plans };

/**
 * Deliberately separate from the tenant-scoped workspaceRepository — every
 * other repository in the app filters by workspaceId to enforce tenant
 * isolation, but the Super Admin Platform is the one place that's allowed
 * to see across all workspaces. Only ever called from requirePlatformAdmin()
 * -gated actions/pages, or from the cron endpoint's own secret check.
 */
export const workspaceAdminRepository = {
  async findAllWithOwner(): Promise<WorkspaceAdminListItem[]> {
    return db
      .select(listSelection)
      .from(workspaces)
      .leftJoin(workspaceMembers, eq(workspaceMembers.workspaceId, workspaces.id))
      .leftJoin(roles, eq(roles.id, workspaceMembers.roleId))
      .leftJoin(users, eq(users.id, workspaceMembers.userId))
      .leftJoin(plans, eq(plans.id, workspaces.planId))
      .where(eq(roles.key, "owner"))
      .orderBy(desc(workspaces.createdAt));
  },

  async updateSubscriptionStatus(id: string, status: SubscriptionStatus): Promise<Workspace | null> {
    const [workspace] = await db
      .update(workspaces)
      .set({ subscriptionStatus: status, updatedAt: new Date() })
      .where(eq(workspaces.id, id))
      .returning();
    return workspace ?? null;
  },

  /** Cascades everything the workspace owns — every FK to workspaces.id in the schema is ON DELETE CASCADE. Irreversible. */
  async delete(id: string): Promise<void> {
    await db.delete(workspaces).where(eq(workspaces.id, id));
  },

  async findById(id: string): Promise<Workspace | null> {
    const [row] = await db.select().from(workspaces).where(eq(workspaces.id, id)).limit(1);
    return row ?? null;
  },

  async activateSubscription(id: string, planId: string, days: number): Promise<Workspace | null> {
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const [workspace] = await db
      .update(workspaces)
      .set({
        subscriptionStatus: "active",
        planId,
        subscriptionExpiresAt: expiresAt,
        lastReminderDaysSent: null,
        updatedAt: new Date(),
      })
      .where(eq(workspaces.id, id))
      .returning();
    return workspace ?? null;
  },

  /**
   * Every workspace the daily cron still needs to walk through the lifecycle
   * for (see subscription-check.service.ts): "active"/"trial" (still
   * counting down to expiry), "past_due"/"grace" (already past expiry, not
   * yet blocked), and "suspended" (so it can eventually auto-transition to
   * "expired"). Deliberately excludes "cancelled" and "expired" — both are
   * terminal states the cron never overrides once reached.
   */
  async findActiveWithExpiry(): Promise<Workspace[]> {
    const rows = await db
      .select()
      .from(workspaces)
      .where(inArray(workspaces.subscriptionStatus, ["active", "trial", "past_due", "grace", "suspended"]));
    return rows.filter((workspace) => workspace.subscriptionExpiresAt !== null);
  },

  async setReminderSent(id: string, days: number): Promise<void> {
    await db.update(workspaces).set({ lastReminderDaysSent: days }).where(eq(workspaces.id, id));
  },

  /** Feeds calculateRevenue() (see lib/revenue.ts) — only active subscriptions count toward MRR/ARR. */
  async findActiveWithPlan(): Promise<
    { planName: string; price: string | null; billingCycle: BillingCycle; currency: Currency }[]
  > {
    return db
      .select({ planName: plans.name, price: plans.price, billingCycle: plans.billingCycle, currency: plans.currency })
      .from(workspaces)
      .innerJoin(plans, eq(plans.id, workspaces.planId))
      .where(eq(workspaces.subscriptionStatus, "active"));
  },

  /** Feeds usageWarningService's daily cron — the full workspace+plan pair, not just the summary fields above. */
  async findActiveWorkspacesWithPlan(): Promise<{ workspace: Workspace; plan: Plan }[]> {
    const rows = await db
      .select({ workspace: workspaces, plan: plans })
      .from(workspaces)
      .innerJoin(plans, eq(plans.id, workspaces.planId))
      .where(eq(workspaces.subscriptionStatus, "active"));
    return rows;
  },

  /** Feeds the revenue dashboard's cancellation/churn figures. Cancelling is a
   * deliberate admin action (see the enum comment above) that always touches
   * updatedAt, so this is an accurate "cancelled since" count, not a proxy. */
  async countCancelledSince(since: Date): Promise<number> {
    const [row] = await db
      .select({ value: count() })
      .from(workspaces)
      .where(and(eq(workspaces.subscriptionStatus, "cancelled"), gte(workspaces.updatedAt, since)));
    return row?.value ?? 0;
  },

  async countAll(): Promise<number> {
    const [row] = await db.select({ value: count() }).from(workspaces);
    return row?.value ?? 0;
  },

  /** planId is set once a workspace's trial ever converts and is never cleared afterward — a stable proxy for "ever paid." */
  async countEverActivated(): Promise<number> {
    const [row] = await db.select({ value: count() }).from(workspaces).where(isNotNull(workspaces.planId));
    return row?.value ?? 0;
  },

  /** Workspaces any tenant-facing daily cron should still bother running for — excludes cancelled/expired (terminal, blocked, no one's watching). */
  async findAllInGoodStanding(): Promise<Workspace[]> {
    return db.select().from(workspaces).where(inArray(workspaces.subscriptionStatus, ["trial", "active", "past_due", "grace"]));
  },

  /** Feeds the Super Admin home dashboard's daily-signups trend chart. */
  async signupsByDay(since: Date): Promise<DayCount[]> {
    const day = sql<string>`to_char(${workspaces.createdAt} at time zone 'utc', 'YYYY-MM-DD')`;
    const rows = await db
      .select({ day, count: sql<number>`count(*)` })
      .from(workspaces)
      .where(gte(workspaces.createdAt, since))
      .groupBy(day);
    return rows.map((row) => ({ day: row.day, count: Number(row.count) }));
  },

  /**
   * "Active" here means at least one AI reply was generated for that
   * workspace that day — there's no login/session tracking to measure
   * against (see DEFERRED_TASKS.md), and AI usage is the platform's own
   * activity signal already recorded for every workspace on every plan.
   */
  async activeWorkspacesByDay(since: Date): Promise<DayCount[]> {
    const day = sql<string>`to_char(${aiUsage.createdAt} at time zone 'utc', 'YYYY-MM-DD')`;
    const rows = await db
      .select({ day, count: sql<number>`count(distinct ${aiUsage.workspaceId})` })
      .from(aiUsage)
      .where(gte(aiUsage.createdAt, since))
      .groupBy(day);
    return rows.map((row) => ({ day: row.day, count: Number(row.count) }));
  },

  /** Top self-reported business types from onboarding — feeds the Platform Analytics "top industries" chart. */
  async countByBusinessType(limit = 10): Promise<{ businessType: string; count: number }[]> {
    const countExpr = sql<number>`count(*)`;
    const rows = await db
      .select({ businessType: workspaces.businessType, count: countExpr })
      .from(workspaces)
      .where(isNotNull(workspaces.businessType))
      .groupBy(workspaces.businessType)
      .orderBy(desc(countExpr))
      .limit(limit);
    return rows.map((row) => ({ businessType: row.businessType as string, count: Number(row.count) }));
  },

  /** Top self-reported countries from onboarding — feeds the Platform Analytics geographic-distribution chart. */
  async countByCountry(limit = 10): Promise<{ country: string; count: number }[]> {
    const countExpr = sql<number>`count(*)`;
    const rows = await db
      .select({ country: workspaces.country, count: countExpr })
      .from(workspaces)
      .where(isNotNull(workspaces.country))
      .groupBy(workspaces.country)
      .orderBy(desc(countExpr))
      .limit(limit);
    return rows.map((row) => ({ country: row.country as string, count: Number(row.count) }));
  },

  /** Connected channels (not just created — every workspace gets a "manual" row by default) across every workspace, grouped by type — feeds the Platform Analytics "channel usage" chart. */
  async countConnectedChannelsByType(): Promise<{ channelType: ChannelType; count: number }[]> {
    const rows = await db
      .select({ channelType: channels.type, count: sql<number>`count(*)` })
      .from(channels)
      .where(eq(channels.status, "connected"))
      .groupBy(channels.type);
    return rows.map((row) => ({ channelType: row.channelType, count: Number(row.count) }));
  },

  /**
   * Retention proxy: of the workspaces that had already been created as of
   * `since`, how many are still in good standing (or still trialing) today,
   * vs how many have since been suspended/cancelled/expired. Not a cohort
   * curve — a single point-in-time snapshot, which is the honest amount of
   * signal the schema supports without a dedicated event-history table.
   */
  async retentionStats(since: Date): Promise<{ cohortSize: number; stillActiveCount: number }> {
    const [row] = await db
      .select({
        cohortSize: sql<number>`count(*)`,
        stillActiveCount: sql<number>`count(*) filter (where ${workspaces.subscriptionStatus} in ('trial', ${sql.join(
          IN_GOOD_STANDING_STATUSES.map((status) => sql`${status}`),
          sql`, `,
        )}))`,
      })
      .from(workspaces)
      .where(lte(workspaces.createdAt, since));
    return { cohortSize: Number(row?.cohortSize ?? 0), stillActiveCount: Number(row?.stillActiveCount ?? 0) };
  },
};
