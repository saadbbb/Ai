"use client";

import { ChevronDown, ChevronUp, ImageOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { StorefrontAd } from "@/db/schema";
import { deleteStorefrontAdAction } from "../actions/delete-storefront-ad.action";
import { reorderStorefrontAdAction } from "../actions/reorder-storefront-ad.action";
import { saveStorefrontAdAction } from "../actions/save-storefront-ad.action";
import { uploadStorefrontAdImageAction } from "../actions/upload-storefront-ad-image.action";

interface AdFormState {
  imageUrl: string;
  linkUrl: string;
  title: string;
  altText: string;
  isPublished: boolean;
}

const EMPTY_FORM: AdFormState = { imageUrl: "", linkUrl: "", title: "", altText: "", isPublished: false };

function AdPreview({ imageUrl }: { imageUrl: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Desktop</p>
        <div className="flex aspect-[21/9] items-center justify-center overflow-hidden rounded-lg border bg-muted">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="size-full object-cover" />
          ) : (
            <ImageOff className="size-5 text-muted-foreground/40" />
          )}
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Mobile</p>
        <div className="mx-auto flex aspect-[4/5] w-2/3 items-center justify-center overflow-hidden rounded-lg border bg-muted">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="size-full object-cover" />
          ) : (
            <ImageOff className="size-5 text-muted-foreground/40" />
          )}
        </div>
      </div>
    </div>
  );
}

function AdForm({
  form,
  onChange,
  onSave,
  onCancel,
  isSaving,
  saveLabel,
}: {
  form: AdFormState;
  onChange: (form: AdFormState) => void;
  onSave: () => void;
  onCancel?: () => void;
  isSaving: boolean;
  saveLabel: string;
}) {
  const t = useTranslations("website.ads");
  const tCommon = useTranslations("common");
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadStorefrontAdImageAction(formData);
    setIsUploading(false);
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    onChange({ ...form, imageUrl: result.data.url });
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-3 rounded-lg border border-input p-3">
      <AdPreview imageUrl={form.imageUrl} />
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" disabled={isUploading} onClick={() => inputRef.current?.click()}>
          {isUploading ? t("uploading") : t("uploadImage")}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(event) => handleFile(event.target.files)}
        />
      </div>
      <Input value={form.linkUrl} onChange={(event) => onChange({ ...form, linkUrl: event.target.value })} placeholder={t("linkPlaceholder")} />
      <Input value={form.title} onChange={(event) => onChange({ ...form, title: event.target.value })} placeholder={t("titlePlaceholder")} />
      <Input
        value={form.altText}
        onChange={(event) => onChange({ ...form, altText: event.target.value })}
        placeholder={t("altTextPlaceholder")}
      />
      <label className="flex items-center gap-2 text-sm">
        <Switch checked={form.isPublished} onCheckedChange={(checked) => onChange({ ...form, isPublished: checked })} />
        {t("publishedLabel")}
      </label>
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            {tCommon("cancel")}
          </Button>
        )}
        <Button type="button" size="sm" disabled={isSaving || !form.imageUrl} onClick={onSave}>
          {saveLabel}
        </Button>
      </div>
    </div>
  );
}

export function AdsManager({ initialAds }: { initialAds: StorefrontAd[] }) {
  const t = useTranslations("website.ads");
  const tCommon = useTranslations("common");
  const [ads, setAds] = useState(initialAds);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<AdFormState>(EMPTY_FORM);
  const [newForm, setNewForm] = useState<AdFormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  function startEdit(ad: StorefrontAd) {
    setEditingId(ad.id);
    setEditForm({
      imageUrl: ad.imageUrl,
      linkUrl: ad.linkUrl ?? "",
      title: ad.title ?? "",
      altText: ad.altText ?? "",
      isPublished: ad.isPublished,
    });
  }

  async function saveEdit(id: string) {
    setIsSaving(true);
    const result = await saveStorefrontAdAction({ id, ...editForm });
    setIsSaving(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setAds((current) => current.map((ad) => (ad.id === id ? result.data : ad)));
    setEditingId(null);
    toast.success(tCommon("saved"));
  }

  async function handleDelete(id: string) {
    if (!window.confirm(tCommon("confirmDelete"))) return;

    const result = await deleteStorefrontAdAction({ id });
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setAds((current) => current.filter((ad) => ad.id !== id));
  }

  async function handleAdd() {
    if (!newForm.imageUrl) return;

    setIsSaving(true);
    const result = await saveStorefrontAdAction(newForm);
    setIsSaving(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setAds((current) => [...current, result.data]);
    setNewForm(EMPTY_FORM);
  }

  async function handleMove(id: string, direction: -1 | 1) {
    setReorderingId(id);
    const result = await reorderStorefrontAdAction({ id, direction });
    setReorderingId(null);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setAds(result.data);
  }

  async function togglePublish(ad: StorefrontAd) {
    const result = await saveStorefrontAdAction({
      id: ad.id,
      imageUrl: ad.imageUrl,
      linkUrl: ad.linkUrl ?? "",
      title: ad.title ?? "",
      altText: ad.altText ?? "",
      isPublished: !ad.isPublished,
    });
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    setAds((current) => current.map((item) => (item.id === ad.id ? result.data : item)));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("heading")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {ads.length === 0 && <p className="text-sm text-muted-foreground">{t("noAds")}</p>}
        {ads.map((ad, index) =>
          editingId === ad.id ? (
            <AdForm
              key={ad.id}
              form={editForm}
              onChange={setEditForm}
              onSave={() => saveEdit(ad.id)}
              onCancel={() => setEditingId(null)}
              isSaving={isSaving}
              saveLabel={tCommon("save")}
            />
          ) : (
            <div key={ad.id} className="flex items-center gap-3 rounded-lg border border-input p-2">
              <div className="flex shrink-0 flex-col">
                <button
                  type="button"
                  aria-label={t("moveUp")}
                  disabled={index === 0 || reorderingId !== null}
                  onClick={() => handleMove(ad.id, -1)}
                  className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                >
                  <ChevronUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={t("moveDown")}
                  disabled={index === ads.length - 1 || reorderingId !== null}
                  onClick={() => handleMove(ad.id, 1)}
                  className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                >
                  <ChevronDown className="size-3.5" />
                </button>
              </div>
              <div className="relative size-14 shrink-0 overflow-hidden rounded-md border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ad.imageUrl} alt="" className="size-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{ad.title || t("untitled")}</p>
                <p className="text-xs text-muted-foreground">{t("lastEdited", { date: new Date(ad.updatedAt).toLocaleDateString() })}</p>
              </div>
              <label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                <Switch checked={ad.isPublished} onCheckedChange={() => togglePublish(ad)} />
                {ad.isPublished ? t("publishedLabel") : t("draftLabel")}
              </label>
              <div className="flex shrink-0 gap-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => startEdit(ad)}>
                  {tCommon("edit")}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(ad.id)}>
                  {tCommon("delete")}
                </Button>
              </div>
            </div>
          ),
        )}

        <AdForm form={newForm} onChange={setNewForm} onSave={handleAdd} isSaving={isSaving} saveLabel={t("addAd")} />
      </CardContent>
    </Card>
  );
}
