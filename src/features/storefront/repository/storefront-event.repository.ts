import { and, count, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db/client";
import { type NewStorefrontEvent, products, type StorefrontEventType, storefrontEvents } from "@/db/schema";

export interface FormSubmissionCount {
  formType: string;
  count: number;
}

export interface ProductViewCount {
  productId: string;
  productName: string;
  count: number;
}

export const storefrontEventRepository = {
  async create(data: NewStorefrontEvent): Promise<void> {
    await db.insert(storefrontEvents).values(data);
  },

  async countByType(workspaceId: string, type: StorefrontEventType, from: Date, to: Date): Promise<number> {
    const [row] = await db
      .select({ total: count() })
      .from(storefrontEvents)
      .where(
        and(
          eq(storefrontEvents.workspaceId, workspaceId),
          eq(storefrontEvents.type, type),
          gte(storefrontEvents.createdAt, from),
          lte(storefrontEvents.createdAt, to),
        ),
      );
    return row?.total ?? 0;
  },

  async formSubmissionsByType(workspaceId: string, from: Date, to: Date): Promise<FormSubmissionCount[]> {
    const rows = await db
      .select({ formType: storefrontEvents.formType, count: count() })
      .from(storefrontEvents)
      .where(
        and(
          eq(storefrontEvents.workspaceId, workspaceId),
          eq(storefrontEvents.type, "form_submission"),
          gte(storefrontEvents.createdAt, from),
          lte(storefrontEvents.createdAt, to),
        ),
      )
      .groupBy(storefrontEvents.formType)
      .orderBy(desc(count()));
    return rows.map((row) => ({ formType: row.formType ?? "unknown", count: row.count }));
  },

  async topProductViews(workspaceId: string, from: Date, to: Date, limit = 5): Promise<ProductViewCount[]> {
    const rows = await db
      .select({ productId: storefrontEvents.productId, productName: products.name, count: count() })
      .from(storefrontEvents)
      .innerJoin(products, eq(products.id, storefrontEvents.productId))
      .where(
        and(
          eq(storefrontEvents.workspaceId, workspaceId),
          eq(storefrontEvents.type, "product_view"),
          gte(storefrontEvents.createdAt, from),
          lte(storefrontEvents.createdAt, to),
        ),
      )
      .groupBy(storefrontEvents.productId, products.name)
      .orderBy(desc(count()))
      .limit(limit);
    return rows.map((row) => ({ productId: row.productId as string, productName: row.productName, count: row.count }));
  },
};
