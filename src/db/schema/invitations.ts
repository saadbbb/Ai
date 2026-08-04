import { index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { roles } from "./roles";
import { users } from "./users";
import { workspaces } from "./workspaces";

export const invitationStatusEnum = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "revoked",
  "expired",
]);

export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "restrict" }),
    invitedByUserId: uuid("invited_by_user_id").references(() => users.id, { onDelete: "set null" }),
    tokenHash: text("token_hash").notNull().unique(),
    status: invitationStatusEnum("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("invitations_workspace_id_idx").on(table.workspaceId)],
);

export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
