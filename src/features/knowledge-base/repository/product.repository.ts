import { eq } from "drizzle-orm";
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
};
