import { index, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const otpPurposeEnum = pgEnum("otp_purpose", ["registration", "password_reset"]);

export const otpCodes = pgTable(
  "otp_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    purpose: otpPurposeEnum("purpose").notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("otp_codes_email_purpose_idx").on(table.email, table.purpose)],
);

export type OtpCode = typeof otpCodes.$inferSelect;
export type NewOtpCode = typeof otpCodes.$inferInsert;
