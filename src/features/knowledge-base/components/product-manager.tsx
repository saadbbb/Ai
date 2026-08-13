"use client";

import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Product } from "@/db/schema";
import { deleteProductAction } from "../actions/delete-product.action";
import { saveProductAction } from "../actions/save-product.action";
import { uploadProductImageAction } from "../actions/upload-product-image.action";

interface ProductManagerProps {
  initialProducts: Product[];
}

interface DraftProduct {
  name: string;
  description: string;
  price: string;
  discountedPrice: string;
  availability: "always" | "limited";
  quantity: string;
  images: string[];
  hasVariants: boolean;
  variantNamesText: string;
  category: string;
  isActive: boolean;
  aiVisible: boolean;
  featured: boolean;
  promotionEndsAt: string;
}

const emptyDraft: DraftProduct = {
  name: "",
  description: "",
  price: "",
  discountedPrice: "",
  availability: "always",
  quantity: "",
  images: [],
  hasVariants: false,
  variantNamesText: "",
  category: "",
  isActive: true,
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
    availability: product.trackQuantity ? "limited" : "always",
    quantity: product.quantity != null ? String(product.quantity) : "",
    images: [product.imageUrl, ...product.galleryImageUrls].filter((url): url is string => !!url),
    hasVariants: product.variants.length > 0,
    variantNamesText: product.variants.map((v) => v.name).join(", "),
    category: product.category ?? "",
    isActive: product.isActive,
    aiVisible: product.aiVisible,
    featured: product.featured,
    promotionEndsAt: product.promotionEndsAt ? product.promotionEndsAt.toISOString().slice(0, 10) : "",
  };
}

/** منشور/مخفي/متوفر/مخزون منخفض/غير متوفر — derived from isActive+trackQuantity+quantity, never a stored field of its own. */
function statusBadge(product: Product, t: ReturnType<typeof useTranslations>): string {
  if (!product.isActive) return t("statusHidden");
  if (product.trackQuantity) {
    const qty = product.quantity ?? 0;
    if (qty <= 0) return t("statusOutOfStock");
    if (qty <= product.lowStockThreshold) return t("statusLowStock");
    return t("statusInStock");
  }
  return t("statusPublished");
}

function ImagesEditor({ images, onChange }: { images: string[]; onChange: (images: string[]) => void }) {
  const t = useTranslations("onboarding.knowledgeBase");
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.set("file", file);
      const result = await uploadProductImageAction(formData);
      if (!result.success) {
        toast.error(result.error.message);
        continue;
      }
      uploaded.push(result.data.url);
    }
    setIsUploading(false);
    if (uploaded.length > 0) onChange([...images, ...uploaded]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function remove(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{t("imagesLabel")}</p>
      <div className="flex flex-wrap gap-2">
        {images.map((url, index) => (
          <div key={url} className="group relative size-20 shrink-0 overflow-hidden rounded-lg border border-input">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="size-full object-cover" />
            {index === 0 && (
              <span className="absolute bottom-0 left-0 right-0 bg-foreground/70 px-1 py-0.5 text-center text-[10px] font-medium text-background">
                {t("primaryBadge")}
              </span>
            )}
            <button
              type="button"
              onClick={() => remove(index)}
              className="absolute right-0.5 top-0.5 rounded-full bg-foreground/70 p-0.5 text-background opacity-0 transition-opacity group-hover:opacity-100"
              aria-label={t("remove")}
            >
              <X className="size-3" />
            </button>
            {index > 0 && (
              <button
                type="button"
                onClick={() => move(index, -1)}
                className="absolute bottom-0.5 left-0.5 rounded-full bg-foreground/70 px-1 text-[10px] text-background opacity-0 transition-opacity group-hover:opacity-100"
              >
                ←
              </button>
            )}
            {index < images.length - 1 && (
              <button
                type="button"
                onClick={() => move(index, 1)}
                className="absolute bottom-0.5 right-0.5 rounded-full bg-foreground/70 px-1 text-[10px] text-background opacity-0 transition-opacity group-hover:opacity-100"
              >
                →
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="flex size-20 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-input text-muted-foreground hover:border-primary/50 hover:bg-primary/5"
        >
          <Plus className="size-4" />
          <span className="text-[10px]">{isUploading ? t("uploading") : t("addImage")}</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(event) => handleFiles(event.target.files)}
        />
      </div>
    </div>
  );
}

export function ProductManager({ initialProducts }: ProductManagerProps) {
  const t = useTranslations("onboarding.knowledgeBase");
  const tCommon = useTranslations("common");
  const tPage = useTranslations("knowledgeBasePage");
  const [products, setProducts] = useState(initialProducts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftProduct>(emptyDraft);
  const [newDraft, setNewDraft] = useState<DraftProduct>(emptyDraft);
  const [showMoreNew, setShowMoreNew] = useState(false);
  const [showMoreEdit, setShowMoreEdit] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  function startEdit(product: Product) {
    setEditingId(product.id);
    setEditDraft(toDraft(product));
    setShowMoreEdit(false);
  }

  function draftToPayload(draft: DraftProduct) {
    return {
      name: draft.name,
      description: draft.description || undefined,
      price: draft.price === "" ? undefined : draft.price,
      discountedPrice: draft.discountedPrice === "" ? undefined : draft.discountedPrice,
      category: draft.category || undefined,
      imageUrl: draft.images[0] || undefined,
      galleryImageUrlsText: draft.images.slice(1).join("\n") || undefined,
      variantNamesText: draft.hasVariants ? draft.variantNamesText : undefined,
      trackQuantity: draft.availability === "limited",
      quantity: draft.availability === "limited" ? Number(draft.quantity || 0) : undefined,
      isActive: draft.isActive,
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
    setShowMoreNew(false);
  }

  function renderForm(draft: DraftProduct, setDraft: (draft: DraftProduct) => void, showMore: boolean, setShowMore: (value: boolean) => void) {
    return (
      <>
        <ImagesEditor images={draft.images} onChange={(images) => setDraft({ ...draft, images })} />
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

        <div className="space-y-2 rounded-lg bg-surface-elevated p-3">
          <p className="text-sm font-medium">{t("availabilityQuestion")}</p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={draft.availability === "always"}
              onChange={() => setDraft({ ...draft, availability: "always" })}
            />
            {t("availabilityAlways")}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={draft.availability === "limited"}
              onChange={() => setDraft({ ...draft, availability: "limited" })}
            />
            {t("availabilityLimited")}
          </label>
          {draft.availability === "limited" && (
            <div className="space-y-1 ps-6">
              <Input
                type="number"
                min={0}
                step="1"
                value={draft.quantity}
                onChange={(event) => setDraft({ ...draft, quantity: event.target.value })}
                placeholder={t("quantityLabel")}
              />
              <p className="text-xs text-muted-foreground">{t("quantityHint")}</p>
            </div>
          )}
        </div>

        <div className="space-y-2 rounded-lg bg-surface-elevated p-3">
          <p className="text-sm font-medium">{t("variantsQuestion")}</p>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" checked={!draft.hasVariants} onChange={() => setDraft({ ...draft, hasVariants: false })} />
            {t("variantsNo")}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" checked={draft.hasVariants} onChange={() => setDraft({ ...draft, hasVariants: true })} />
            {t("variantsYes")}
          </label>
          {draft.hasVariants && (
            <Input
              value={draft.variantNamesText}
              onChange={(event) => setDraft({ ...draft, variantNamesText: event.target.value })}
              placeholder={t("variantNamesPlaceholder")}
              className="ms-6"
            />
          )}
        </div>

        <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => setShowMore(!showMore)}>
          {showMore ? t("hideMoreOptions") : t("showMoreOptions")}
        </button>

        {showMore && (
          <div className="space-y-2 rounded-lg border border-dashed border-input p-3">
            <Input value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} placeholder={t("categoryPlaceholder")} />
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Switch checked={draft.isActive} onCheckedChange={(checked) => setDraft({ ...draft, isActive: checked })} size="sm" />
              {t("publishedLabel")}
            </label>
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
          </div>
        )}
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
              {renderForm(editDraft, setEditDraft, showMoreEdit, setShowMoreEdit)}
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
              <div className="flex items-start gap-3">
                {product.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.imageUrl} alt="" className="size-12 shrink-0 rounded-md object-cover" />
                )}
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
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {statusBadge(product, t)}
                    {product.sku && <span> · {product.sku}</span>}
                  </p>
                  {product.description && <p className="text-sm text-muted-foreground">{product.description}</p>}
                  {product.variants.length > 0 && (
                    <p className="text-xs text-muted-foreground">{product.variants.map((v) => v.name).join(", ")}</p>
                  )}
                </div>
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
          {renderForm(newDraft, setNewDraft, showMoreNew, setShowMoreNew)}
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
