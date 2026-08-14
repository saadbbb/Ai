"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { StorefrontPage } from "@/db/schema";
import { deleteStorefrontPageAction } from "../actions/delete-storefront-page.action";
import { reorderStorefrontPageAction } from "../actions/reorder-storefront-page.action";
import { saveStorefrontPageAction } from "../actions/save-storefront-page.action";

interface PageFormState {
  title: string;
  slug: string;
  content: string;
  isPublished: boolean;
}

const EMPTY_FORM: PageFormState = { title: "", slug: "", content: "", isPublished: false };

export function PagesManager({ initialPages }: { initialPages: StorefrontPage[] }) {
  const t = useTranslations("website.pages");
  const tCommon = useTranslations("common");
  const [pages, setPages] = useState(initialPages);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<PageFormState>(EMPTY_FORM);
  const [newForm, setNewForm] = useState<PageFormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  function startEdit(page: StorefrontPage) {
    setEditingId(page.id);
    setEditForm({ title: page.title, slug: page.slug, content: page.content, isPublished: page.isPublished });
  }

  async function saveEdit(id: string) {
    setIsSaving(true);
    const result = await saveStorefrontPageAction({ id, ...editForm });
    setIsSaving(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setPages((current) => current.map((page) => (page.id === id ? result.data : page)));
    setEditingId(null);
    toast.success(tCommon("saved"));
  }

  async function handleDelete(id: string) {
    if (!window.confirm(tCommon("confirmDelete"))) return;

    const result = await deleteStorefrontPageAction({ id });
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setPages((current) => current.filter((page) => page.id !== id));
  }

  async function handleAdd() {
    if (!newForm.title.trim() || !newForm.content.trim()) return;

    setIsSaving(true);
    const result = await saveStorefrontPageAction(newForm);
    setIsSaving(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setPages((current) => [...current, result.data]);
    setNewForm(EMPTY_FORM);
  }

  async function handleMove(id: string, direction: -1 | 1) {
    setReorderingId(id);
    const result = await reorderStorefrontPageAction({ id, direction });
    setReorderingId(null);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setPages(result.data);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("heading")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {pages.length === 0 && <p className="text-sm text-muted-foreground">{t("noPages")}</p>}
        {pages.map((page, index) =>
          editingId === page.id ? (
            <div key={page.id} className="space-y-2 rounded-lg border border-input p-2">
              <Input
                value={editForm.title}
                onChange={(event) => setEditForm((form) => ({ ...form, title: event.target.value }))}
                placeholder={t("titlePlaceholder")}
              />
              <Input
                value={editForm.slug}
                onChange={(event) => setEditForm((form) => ({ ...form, slug: event.target.value }))}
                placeholder={t("slugPlaceholder")}
              />
              <Textarea
                value={editForm.content}
                onChange={(event) => setEditForm((form) => ({ ...form, content: event.target.value }))}
                placeholder={t("contentPlaceholder")}
                rows={6}
              />
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={editForm.isPublished}
                  onCheckedChange={(checked) => setEditForm((form) => ({ ...form, isPublished: checked }))}
                />
                {t("publishedLabel")}
              </label>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                  {tCommon("cancel")}
                </Button>
                <Button type="button" size="sm" disabled={isSaving} onClick={() => saveEdit(page.id)}>
                  {tCommon("save")}
                </Button>
              </div>
            </div>
          ) : (
            <div key={page.id} className="flex items-start justify-between gap-2 rounded-lg border border-input p-2">
              <div className="flex shrink-0 flex-col">
                <button
                  type="button"
                  aria-label={t("moveUp")}
                  disabled={index === 0 || reorderingId !== null}
                  onClick={() => handleMove(page.id, -1)}
                  className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                >
                  <ChevronUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={t("moveDown")}
                  disabled={index === pages.length - 1 || reorderingId !== null}
                  onClick={() => handleMove(page.id, 1)}
                  className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                >
                  <ChevronDown className="size-3.5" />
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{page.title}</p>
                  {page.isPublished ? (
                    <span className="text-xs text-primary">{t("publishedLabel")}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">{t("draftLabel")}</span>
                  )}
                </div>
                <p className="truncate text-sm text-muted-foreground">/{page.slug}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => startEdit(page)}>
                  {tCommon("edit")}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(page.id)}>
                  {tCommon("delete")}
                </Button>
              </div>
            </div>
          ),
        )}

        <div className="space-y-2 rounded-lg border border-dashed border-input p-2">
          <Input
            value={newForm.title}
            onChange={(event) => setNewForm((form) => ({ ...form, title: event.target.value }))}
            placeholder={t("titlePlaceholder")}
          />
          <Input
            value={newForm.slug}
            onChange={(event) => setNewForm((form) => ({ ...form, slug: event.target.value }))}
            placeholder={t("slugPlaceholder")}
          />
          <Textarea
            value={newForm.content}
            onChange={(event) => setNewForm((form) => ({ ...form, content: event.target.value }))}
            placeholder={t("contentPlaceholder")}
            rows={6}
          />
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={newForm.isPublished}
              onCheckedChange={(checked) => setNewForm((form) => ({ ...form, isPublished: checked }))}
            />
            {t("publishedLabel")}
          </label>
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" disabled={isSaving} onClick={handleAdd}>
              {t("addPage")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
