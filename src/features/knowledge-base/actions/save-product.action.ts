"use server";

import type { Product } from "@/db/schema";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { parseGalleryImageUrls, parseVariantNames } from "../lib/product-input";
import { productRepository } from "../repository/product.repository";
import { productFormSchema } from "../validation/schemas";

export async function saveProductAction(input: unknown): Promise<ActionResult<Product>> {
  const parsed = productFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  const { id, price, discountedPrice, galleryImageUrlsText, variantNamesText, ...rest } = parsed.data;
  const data = {
    ...rest,
    price: price?.toString(),
    discountedPrice: discountedPrice?.toString() ?? null,
    galleryImageUrls: parseGalleryImageUrls(galleryImageUrlsText),
    variants: parseVariantNames(variantNamesText),
  };

  try {
    if (id) {
      const updated = await productRepository.update(id, workspace.id, data);
      if (!updated) {
        return actionFail(new Error("Product not found."));
      }
      return actionOk(updated);
    }

    const [created] = await productRepository.createMany([{ ...data, workspaceId: workspace.id }]);
    return actionOk(created);
  } catch (error) {
    return actionFail(error);
  }
}
