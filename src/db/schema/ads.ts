import { numeric, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

export const adAccountProviderEnum = pgEnum("ad_account_provider", ["meta"]);
export const adAccountStatusEnum = pgEnum("ad_account_status", ["not_connected", "connected"]);
export const adCampaignStatusEnum = pgEnum("ad_campaign_status", ["active", "paused", "ended"]);

/**
 * One row per workspace per provider, same "not_connected until Meta OAuth
 * lands" pattern channels.ts already established for WhatsApp/Instagram
 * (Phase 3/7) — real schema, ready to flip to "connected" the moment a Meta
 * Developer App exists (see DEFERRED_TASKS.md item 6), with zero redesign.
 * No OAuth tokens are stored here yet because there's nothing to store.
 */
export const adAccounts = pgTable("ad_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  provider: adAccountProviderEnum("provider").notNull().default("meta"),
  status: adAccountStatusEnum("status").notNull().default("not_connected"),
  externalAccountId: text("external_account_id"),
  connectedAt: timestamp("connected_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Self-logged today (name, budget, dates) rather than pulled live from the
 * Meta Marketing API, which doesn't exist yet — a business already tracking
 * an Instagram/Meta ad campaign can log it here and set `utmCampaign` to
 * whatever value they tell customers to mention or that flows into
 * `contacts.source` (already a free-text field, populated by the storefront
 * inquiry form, the public API, or set by hand) — that match is the
 * attribution engine (see adCampaignRepository.getAttributionStats). Once
 * live Meta campaign sync exists, `externalCampaignId` is what it would key
 * off; the attribution logic doesn't change.
 */
export const adCampaigns = pgTable("ad_campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  utmCampaign: text("utm_campaign").notNull(),
  status: adCampaignStatusEnum("status").notNull().default("active"),
  budget: numeric("budget", { precision: 12, scale: 2 }),
  /** Ad Performance Analytics depth (PART 13 gap #186) — actual spend to date, entered manually since there's no live Meta spend feed yet; drives CPL/ROAS in the attribution report. Distinct from `budget` (the planned ceiling, set once) — this is updated as spend accrues. */
  actualSpend: numeric("actual_spend", { precision: 12, scale: 2 }),
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
  externalCampaignId: text("external_campaign_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AdAccount = typeof adAccounts.$inferSelect;
export type NewAdAccount = typeof adAccounts.$inferInsert;
export type AdCampaign = typeof adCampaigns.$inferSelect;
export type NewAdCampaign = typeof adCampaigns.$inferInsert;
export type AdCampaignStatus = (typeof adCampaignStatusEnum.enumValues)[number];
