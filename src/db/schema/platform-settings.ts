import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Singleton table — the application only ever reads/writes a single row (see
 * platformSettingsRepository.get/upsert). Holds what the "Contact us on
 * WhatsApp to subscribe" flow needs until a real payment gateway exists.
 */
export const platformSettings = pgTable("platform_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  whatsappNumber: text("whatsapp_number"),
  whatsappMessageTemplate: text("whatsapp_message_template"),
  supportEmail: text("support_email"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PlatformSettings = typeof platformSettings.$inferSelect;
export type NewPlatformSettings = typeof platformSettings.$inferInsert;
