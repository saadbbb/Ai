import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  type BillingCycle,
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

  /** Active workspaces with a real expiry date — what the daily cron checks. */
  /**
   * "active" (a paid plan, admin-activated) and "trial" (the automatic 14-day
   * clock — see workspaceService.createWorkspaceForNewUser) both count down
   * toward the same subscriptionExpiresAt column and share one reminder/
   * auto-suspend pipeline (subscriptionCheckService.runDailyCheck) — a trial
   * expiring is handled identically to a paid subscription lapsing.
   */
  async findActiveWithExpiry(): Promise<Workspace[]> {
    const rows = await db
      .select()
      .from(workspaces)
      .where(inArray(workspaces.subscriptionStatus, ["active", "trial"]));
    return rows.filter((workspace) => workspace.subscriptionExpiresAt !== null);
  },

  async setReminderSent(id: string, days: number): Promise<void> {
    await db.update(workspaces).set({ lastReminderDaysSent: days }).where(eq(workspaces.id, id));
  },

  /** Feeds calculateRevenue() (see lib/revenue.ts) — only active subscriptions count toward MRR/ARR. */
  async findActiveWithPlan(): Promise<{ planName: string; price: string | null; billingCycle: BillingCycle }[]> {
    return db
      .select({ planName: plans.name, price: plans.price, billingCycle: plans.billingCycle })
      .from(workspaces)
      .innerJoin(plans, eq(plans.id, workspaces.planId))
      .where(eq(workspaces.subscriptionStatus, "active"));
  },
};
