import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { type NewProduct, type Product, products } from "@/db/schema";

export const productRepository = {
  async findByWorkspaceId(workspaceId: string): Promise<Product[]> {
    return db.select().from(products).where(eq(products.workspaceId, workspaceId));
  },

  async createMany(data: NewProduct[]): Promise<Product[]> {
    if (data.length === 0) return [];
    return db.insert(products).values(data).returning();
  },

  async update(
    id: string,
    workspaceId: string,
    data: Partial<Omit<NewProduct, "workspaceId">>,
  ): Promise<Product | null> {
    const [product] = await db
      .update(products)
      .set(data)
      .where(and(eq(products.id, id), eq(products.workspaceId, workspaceId)))
      .returning();
    return product ?? null;
  },

  async delete(id: string, workspaceId: string): Promise<void> {
    await db.delete(products).where(and(eq(products.id, id), eq(products.workspaceId, workspaceId)));
  },
};
