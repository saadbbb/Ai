"use server";

import type { Product } from "@/db/schema";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { parseGalleryImageUrls, parseVariantNames } from "../lib/product-input";
import { generateProductSku, slugifyProductName, uniqueProductSlug } from "../lib/product-slug";
import { productRepository } from "../repository/product.repository";
import { productFormSchema } from "../validation/schemas";

export async function saveProductAction(input: unknown): Promise<ActionResult<Product>> {
  const parsed = productFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  const { id, price, discountedPrice, galleryImageUrlsText, variantNamesText, trackQuantity, quantity, ...rest } =
    parsed.data;

  if (trackQuantity && quantity === undefined) {
    return actionValidationError("Enter how many units are currently available for sale.");
  }

  const data = {
    ...rest,
    price: price?.toString(),
    discountedPrice: discountedPrice?.toString() ?? null,
    galleryImageUrls: parseGalleryImageUrls(galleryImageUrlsText),
    variants: parseVariantNames(variantNamesText),
    trackQuantity,
    quantity: trackQuantity ? (quantity ?? 0) : null,
  };

  try {
    if (id) {
      const updated = await productRepository.update(id, workspace.id, data);
      if (!updated) {
        return actionFail(new Error("Product not found."));
      }
      return actionOk(updated);
    }

    // sku/slug are never asked of the user (spec: don't require what the system can generate)
    // — auto-assigned once here, on creation only, and left untouched on every later edit.
    const existing = await productRepository.findByWorkspaceId(workspace.id);
    const slug = uniqueProductSlug(
      slugifyProductName(rest.name),
      existing.map((p) => p.slug).filter((s): s is string => !!s),
    );
    const sku = generateProductSku(existing.length);

    const [created] = await productRepository.createMany([{ ...data, workspaceId: workspace.id, slug, sku }]);
    return actionOk(created);
  } catch (error) {
    return actionFail(error);
  }
}
