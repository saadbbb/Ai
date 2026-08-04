import { pgTable, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { roles } from "./roles";
import { users } from "./users";
import { workspaces } from "./workspaces";

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "restrict" }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("workspace_members_workspace_user_unique").on(table.workspaceId, table.userId)],
);

export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type NewWorkspaceMember = typeof workspaceMembers.$inferInsert;
