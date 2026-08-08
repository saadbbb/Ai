import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

/**
 * Blog depth (PART 13 gap #143) — basic CRUD plus AI-drafted content (see
 * blog.service.ts's generateDraft), scoped to a single flat list of posts
 * per workspace rather than categories/tags/comments/scheduling.
 */
export const blogPosts = pgTable(
  "blog_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    excerpt: text("excerpt"),
    content: text("content").notNull(),
    coverImageUrl: text("cover_image_url"),
    isPublished: boolean("is_published").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("blog_posts_workspace_id_idx").on(table.workspaceId),
    uniqueIndex("blog_posts_workspace_slug_idx").on(table.workspaceId, table.slug),
  ],
);

export type BlogPost = typeof blogPosts.$inferSelect;
export type NewBlogPost = typeof blogPosts.$inferInsert;
