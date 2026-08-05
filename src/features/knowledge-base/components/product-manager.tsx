"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
}

const emptyDraft: DraftProduct = { name: "", description: "", price: "" };

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
    setEditDraft({
      name: product.name,
      description: product.description ?? "",
      price: product.price ?? "",
    });
  }

  async function saveEdit(id: string) {
    setIsSaving(true);
    const result = await saveProductAction({
      id,
      name: editDraft.name,
      description: editDraft.description || undefined,
      price: editDraft.price === "" ? undefined : editDraft.price,
    });
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
    const result = await saveProductAction({
      name: newDraft.name,
      description: newDraft.description || undefined,
      price: newDraft.price === "" ? undefined : newDraft.price,
    });
    setIsSaving(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setProducts((current) => [...current, result.data]);
    setNewDraft(emptyDraft);
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
              <Input
                value={editDraft.name}
                onChange={(event) => setEditDraft({ ...editDraft, name: event.target.value })}
                placeholder={t("productNamePlaceholder")}
              />
              <Textarea
                value={editDraft.description}
                onChange={(event) => setEditDraft({ ...editDraft, description: event.target.value })}
                placeholder={t("descriptionPlaceholder")}
              />
              <Input
                type="number"
                step="0.01"
                value={editDraft.price}
                onChange={(event) => setEditDraft({ ...editDraft, price: event.target.value })}
                placeholder={t("pricePlaceholder")}
              />
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
                  {product.price && <span className="text-muted-foreground"> — {product.price}</span>}
                </p>
                {product.description && <p className="text-sm text-muted-foreground">{product.description}</p>}
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
          <Input
            value={newDraft.name}
            onChange={(event) => setNewDraft({ ...newDraft, name: event.target.value })}
            placeholder={t("productNamePlaceholder")}
          />
          <Textarea
            value={newDraft.description}
            onChange={(event) => setNewDraft({ ...newDraft, description: event.target.value })}
            placeholder={t("descriptionPlaceholder")}
          />
          <Input
            type="number"
            step="0.01"
            value={newDraft.price}
            onChange={(event) => setNewDraft({ ...newDraft, price: event.target.value })}
            placeholder={t("pricePlaceholder")}
          />
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
