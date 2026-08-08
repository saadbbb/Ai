"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Product } from "@/db/schema";
import { deleteProductAction } from "../actions/delete-product.action";
import { saveProductAction } from "../actions/save-product.action";

interface ProductManagerProps {
  initialProducts: Product[];
}

interface DraftProduct {
  name: string;
  description: string;
  price: string;
  discountedPrice: string;
  category: string;
  imageUrl: string;
  galleryImageUrlsText: string;
  variantNamesText: string;
  aiVisible: boolean;
  featured: boolean;
  promotionEndsAt: string;
}

const emptyDraft: DraftProduct = {
  name: "",
  description: "",
  price: "",
  discountedPrice: "",
  category: "",
  imageUrl: "",
  galleryImageUrlsText: "",
  variantNamesText: "",
  aiVisible: true,
  featured: false,
  promotionEndsAt: "",
};

function toDraft(product: Product): DraftProduct {
  return {
    name: product.name,
    description: product.description ?? "",
    price: product.price ?? "",
    discountedPrice: product.discountedPrice ?? "",
    category: product.category ?? "",
    imageUrl: product.imageUrl ?? "",
    galleryImageUrlsText: product.galleryImageUrls.join("\n"),
    variantNamesText: product.variants.map((v) => v.name).join(", "),
    aiVisible: product.aiVisible,
    featured: product.featured,
    promotionEndsAt: product.promotionEndsAt ? product.promotionEndsAt.toISOString().slice(0, 10) : "",
  };
}

export function ProductManager({ initialProducts }: ProductManagerProps) {
  const t = useTranslations("onboarding.knowledgeBase");
  const tCommon = useTranslations("common");
  const tPage = useTranslations("knowledgeBasePage");
  const [products, setProducts] = useState(initialProducts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftProduct>(emptyDraft);
  const [newDraft, setNewDraft] = useState<DraftProduct>(emptyDraft);
  const [isSaving, setIsSaving] = useState(false);

  function startEdit(product: Product) {
    setEditingId(product.id);
    setEditDraft(toDraft(product));
  }

  function draftToPayload(draft: DraftProduct) {
    return {
      name: draft.name,
      description: draft.description || undefined,
      price: draft.price === "" ? undefined : draft.price,
      discountedPrice: draft.discountedPrice === "" ? undefined : draft.discountedPrice,
      category: draft.category || undefined,
      imageUrl: draft.imageUrl || undefined,
      galleryImageUrlsText: draft.galleryImageUrlsText || undefined,
      variantNamesText: draft.variantNamesText || undefined,
      aiVisible: draft.aiVisible,
      featured: draft.featured,
      promotionEndsAt: draft.promotionEndsAt || undefined,
    };
  }

  async function saveEdit(id: string) {
    setIsSaving(true);
    const result = await saveProductAction({ id, ...draftToPayload(editDraft) });
    setIsSaving(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setProducts((current) => current.map((product) => (product.id === id ? result.data : product)));
    setEditingId(null);
    toast.success(tCommon("saved"));
  }

  async function handleDelete(id: string) {
    if (!window.confirm(tCommon("confirmDelete"))) return;

    const result = await deleteProductAction({ id });
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setProducts((current) => current.filter((product) => product.id !== id));
  }

  async function handleAdd() {
    if (!newDraft.name.trim()) return;

    setIsSaving(true);
    const result = await saveProductAction(draftToPayload(newDraft));
    setIsSaving(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setProducts((current) => [...current, result.data]);
    setNewDraft(emptyDraft);
  }

  function renderForm(draft: DraftProduct, setDraft: (draft: DraftProduct) => void) {
    return (
      <>
        <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder={t("productNamePlaceholder")} />
        <Textarea
          value={draft.description}
          onChange={(event) => setDraft({ ...draft, description: event.target.value })}
          placeholder={t("descriptionPlaceholder")}
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            step="0.01"
            value={draft.price}
            onChange={(event) => setDraft({ ...draft, price: event.target.value })}
            placeholder={t("pricePlaceholder")}
          />
          <Input
            type="number"
            step="0.01"
            value={draft.discountedPrice}
            onChange={(event) => setDraft({ ...draft, discountedPrice: event.target.value })}
            placeholder={t("discountedPricePlaceholder")}
          />
        </div>
        <Input value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} placeholder={t("categoryPlaceholder")} />
        <Input value={draft.imageUrl} onChange={(event) => setDraft({ ...draft, imageUrl: event.target.value })} placeholder={t("imageUrlPlaceholder")} />
        <Textarea
          value={draft.galleryImageUrlsText}
          onChange={(event) => setDraft({ ...draft, galleryImageUrlsText: event.target.value })}
          placeholder={t("galleryImageUrlsPlaceholder")}
          rows={2}
        />
        <Input
          value={draft.variantNamesText}
          onChange={(event) => setDraft({ ...draft, variantNamesText: event.target.value })}
          placeholder={t("variantNamesPlaceholder")}
        />
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Switch checked={draft.aiVisible} onCheckedChange={(checked) => setDraft({ ...draft, aiVisible: checked })} size="sm" />
          {t("aiVisibleLabel")}
        </label>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Switch checked={draft.featured} onCheckedChange={(checked) => setDraft({ ...draft, featured: checked })} size="sm" />
          {t("featuredLabel")}
        </label>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">{t("promotionEndsAtLabel")}</label>
          <Input
            type="date"
            value={draft.promotionEndsAt}
            onChange={(event) => setDraft({ ...draft, promotionEndsAt: event.target.value })}
          />
        </div>
      </>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("productsHeading")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {products.length === 0 && <p className="text-sm text-muted-foreground">{tPage("noItems")}</p>}
        {products.map((product) =>
          editingId === product.id ? (
            <div key={product.id} className="space-y-2 rounded-lg border border-input p-2">
              {renderForm(editDraft, setEditDraft)}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                  {tCommon("cancel")}
                </Button>
                <Button type="button" size="sm" disabled={isSaving} onClick={() => saveEdit(product.id)}>
                  {tCommon("save")}
                </Button>
              </div>
            </div>
          ) : (
            <div key={product.id} className="flex items-start justify-between gap-2 rounded-lg border border-input p-2">
              <div>
                <p className="text-sm font-medium">
                  {product.name}
                  {product.category && <span className="text-muted-foreground"> [{product.category}]</span>}
                  {product.discountedPrice ? (
                    <span className="text-muted-foreground">
                      {" "}
                      — <s>{product.price}</s> {product.discountedPrice}
                    </span>
                  ) : (
                    product.price && <span className="text-muted-foreground"> — {product.price}</span>
                  )}
                  {!product.aiVisible && <span className="text-muted-foreground"> · {t("aiHiddenBadge")}</span>}
                </p>
                {product.description && <p className="text-sm text-muted-foreground">{product.description}</p>}
                {product.variants.length > 0 && (
                  <p className="text-xs text-muted-foreground">{product.variants.map((v) => v.name).join(", ")}</p>
                )}
                {product.imageUrl && <p className="truncate text-xs text-muted-foreground">{product.imageUrl}</p>}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => startEdit(product)}>
                  {tCommon("edit")}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(product.id)}>
                  {tCommon("delete")}
                </Button>
              </div>
            </div>
          ),
        )}

        <div className="space-y-2 rounded-lg border border-dashed border-input p-2">
          {renderForm(newDraft, setNewDraft)}
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" disabled={isSaving} onClick={handleAdd}>
              {t("addProduct")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
