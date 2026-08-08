import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { type AdCampaign, adCampaigns, type AdCampaignStatus, contacts, type NewAdCampaign, orderItems, orders } from "@/db/schema";

export interface AttributionStat {
  campaign: AdCampaign;
  contactCount: number;
  revenue: number;
  /** null when actualSpend hasn't been entered yet — spend-derived metrics can't be computed without it. */
  spend: number | null;
  /** Cost per lead — spend / contactCount. */
  cpl: number | null;
  /** Return on ad spend — revenue / spend. */
  roas: number | null;
}

const REVENUE_ORDER_STATUSES = ["delivered", "completed"] as const;

export const adCampaignRepository = {
  async findByWorkspaceId(workspaceId: string): Promise<AdCampaign[]> {
    return db.select().from(adCampaigns).where(eq(adCampaigns.workspaceId, workspaceId)).orderBy(desc(adCampaigns.createdAt));
  },

  async findById(id: string, workspaceId: string): Promise<AdCampaign | null> {
    const [row] = await db
      .select()
      .from(adCampaigns)
      .where(and(eq(adCampaigns.id, id), eq(adCampaigns.workspaceId, workspaceId)))
      .limit(1);
    return row ?? null;
  },

  async create(data: NewAdCampaign): Promise<AdCampaign> {
    const [row] = await db.insert(adCampaigns).values(data).returning();
    return row;
  },

  async updateStatus(id: string, workspaceId: string, status: AdCampaignStatus): Promise<AdCampaign | null> {
    const [row] = await db
      .update(adCampaigns)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(adCampaigns.id, id), eq(adCampaigns.workspaceId, workspaceId)))
      .returning();
    return row ?? null;
  },

  async updateSpend(id: string, workspaceId: string, actualSpend: number): Promise<AdCampaign | null> {
    const [row] = await db
      .update(adCampaigns)
      .set({ actualSpend: actualSpend.toString(), updatedAt: new Date() })
      .where(and(eq(adCampaigns.id, id), eq(adCampaigns.workspaceId, workspaceId)))
      .returning();
    return row ?? null;
  },

  /**
   * Attribution: a contact is credited to a campaign when contacts.source
   * exactly matches that campaign's utmCampaign tag — the same free-text
   * `source` field storefront inquiries/the public API/manual entry already
   * populate, not a new tracking mechanism. Revenue only counts
   * delivered/completed orders, same convention analyticsRepository uses.
   */
  async getAttributionStats(workspaceId: string): Promise<AttributionStat[]> {
    const campaigns = await adCampaignRepository.findByWorkspaceId(workspaceId);
    if (campaigns.length === 0) return [];

    const utmTags = campaigns.map((campaign) => campaign.utmCampaign);
    const rows = await db
      .select({
        source: contacts.source,
        contactCount: sql<number>`count(distinct ${contacts.id})`,
        revenue: sql<number>`coalesce(sum(${orderItems.unitPrice} * ${orderItems.quantity}), 0)`,
      })
      .from(contacts)
      .leftJoin(orders, and(eq(orders.contactId, contacts.id), inArray(orders.status, REVENUE_ORDER_STATUSES)))
      .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
      .where(and(eq(contacts.workspaceId, workspaceId), inArray(contacts.source, utmTags)))
      .groupBy(contacts.source);

    const bySource = new Map(rows.map((row) => [row.source, { contactCount: Number(row.contactCount), revenue: Number(row.revenue) }]));

    return campaigns.map((campaign) => {
      const contactCount = bySource.get(campaign.utmCampaign)?.contactCount ?? 0;
      const revenue = bySource.get(campaign.utmCampaign)?.revenue ?? 0;
      const spend = campaign.actualSpend === null ? null : Number(campaign.actualSpend);
      return {
        campaign,
        contactCount,
        revenue,
        spend,
        cpl: spend !== null && contactCount > 0 ? spend / contactCount : null,
        roas: spend !== null && spend > 0 ? revenue / spend : null,
      };
    });
  },
};
