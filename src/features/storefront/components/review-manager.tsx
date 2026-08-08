"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Review } from "@/db/schema";
import { deleteReviewAction } from "../actions/delete-review.action";
import { saveReviewAction } from "../actions/save-review.action";

interface ReviewFormState {
  authorName: string;
  rating: number;
  text: string;
  isFeatured: boolean;
  isPublished: boolean;
}

const EMPTY_FORM: ReviewFormState = { authorName: "", rating: 5, text: "", isFeatured: false, isPublished: true };

function StarRating({ rating }: { rating: number }) {
  return <span aria-hidden>{"★".repeat(rating)}{"☆".repeat(5 - rating)}</span>;
}

export function ReviewManager({ initialReviews }: { initialReviews: Review[] }) {
  const t = useTranslations("website.reviews");
  const tCommon = useTranslations("common");
  const [reviews, setReviews] = useState(initialReviews);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ReviewFormState>(EMPTY_FORM);
  const [newForm, setNewForm] = useState<ReviewFormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  function startEdit(review: Review) {
    setEditingId(review.id);
    setEditForm({
      authorName: review.authorName,
      rating: review.rating,
      text: review.text,
      isFeatured: review.isFeatured,
      isPublished: review.isPublished,
    });
  }

  async function saveEdit(id: string) {
    setIsSaving(true);
    const result = await saveReviewAction({ id, ...editForm });
    setIsSaving(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setReviews((current) => current.map((review) => (review.id === id ? result.data : review)));
    setEditingId(null);
    toast.success(tCommon("saved"));
  }

  async function handleDelete(id: string) {
    if (!window.confirm(tCommon("confirmDelete"))) return;

    const result = await deleteReviewAction({ id });
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setReviews((current) => current.filter((review) => review.id !== id));
  }

  async function handleAdd() {
    if (!newForm.authorName.trim() || !newForm.text.trim()) return;

    setIsSaving(true);
    const result = await saveReviewAction(newForm);
    setIsSaving(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setReviews((current) => [result.data, ...current]);
    setNewForm(EMPTY_FORM);
  }

  function ratingSelect(value: number, onChange: (value: number) => void) {
    return (
      <Select value={String(value)} onValueChange={(next) => onChange(Number(next))}>
        <SelectTrigger className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {[5, 4, 3, 2, 1].map((n) => (
            <SelectItem key={n} value={String(n)}>
              {n} ★
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("heading")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {reviews.length === 0 && <p className="text-sm text-muted-foreground">{t("noReviews")}</p>}
        {reviews.map((review) =>
          editingId === review.id ? (
            <div key={review.id} className="space-y-2 rounded-lg border border-input p-2">
              <Input
                value={editForm.authorName}
                onChange={(event) => setEditForm((form) => ({ ...form, authorName: event.target.value }))}
                placeholder={t("authorPlaceholder")}
              />
              {ratingSelect(editForm.rating, (rating) => setEditForm((form) => ({ ...form, rating })))}
              <Textarea
                value={editForm.text}
                onChange={(event) => setEditForm((form) => ({ ...form, text: event.target.value }))}
                placeholder={t("textPlaceholder")}
              />
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={editForm.isFeatured}
                    onCheckedChange={(checked) => setEditForm((form) => ({ ...form, isFeatured: checked }))}
                  />
                  {t("featuredLabel")}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={editForm.isPublished}
                    onCheckedChange={(checked) => setEditForm((form) => ({ ...form, isPublished: checked }))}
                  />
                  {t("publishedLabel")}
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                  {tCommon("cancel")}
                </Button>
                <Button type="button" size="sm" disabled={isSaving} onClick={() => saveEdit(review.id)}>
                  {tCommon("save")}
                </Button>
              </div>
            </div>
          ) : (
            <div key={review.id} className="flex items-start justify-between gap-2 rounded-lg border border-input p-2">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{review.authorName}</p>
                  <span className="text-xs text-amber-500">
                    <StarRating rating={review.rating} />
                  </span>
                  {review.isFeatured && <span className="text-xs text-primary">{t("featuredLabel")}</span>}
                  {!review.isPublished && <span className="text-xs text-muted-foreground">{t("draftLabel")}</span>}
                </div>
                <p className="text-sm text-muted-foreground">{review.text}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => startEdit(review)}>
                  {tCommon("edit")}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(review.id)}>
                  {tCommon("delete")}
                </Button>
              </div>
            </div>
          ),
        )}

        <div className="space-y-2 rounded-lg border border-dashed border-input p-2">
          <Input
            value={newForm.authorName}
            onChange={(event) => setNewForm((form) => ({ ...form, authorName: event.target.value }))}
            placeholder={t("authorPlaceholder")}
          />
          {ratingSelect(newForm.rating, (rating) => setNewForm((form) => ({ ...form, rating })))}
          <Textarea
            value={newForm.text}
            onChange={(event) => setNewForm((form) => ({ ...form, text: event.target.value }))}
            placeholder={t("textPlaceholder")}
          />
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={newForm.isFeatured}
                onCheckedChange={(checked) => setNewForm((form) => ({ ...form, isFeatured: checked }))}
              />
              {t("featuredLabel")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={newForm.isPublished}
                onCheckedChange={(checked) => setNewForm((form) => ({ ...form, isPublished: checked }))}
              />
              {t("publishedLabel")}
            </label>
          </div>
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" disabled={isSaving} onClick={handleAdd}>
              {t("addReview")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
