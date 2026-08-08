"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { addTagAction } from "../actions/add-tag.action";
import { removeTagAction } from "../actions/remove-tag.action";

export function TagManager({ contactId, initialTags }: { contactId: string; initialTags: string[] }) {
  const t = useTranslations("contacts");
  const [tags, setTags] = useState(initialTags);
  const [draft, setDraft] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleAdd() {
    const tag = draft.trim();
    if (!tag || tags.includes(tag)) return;

    setIsSubmitting(true);
    const result = await addTagAction({ contactId, tag });
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setTags((current) => [...current, tag]);
    setDraft("");
  }

  async function handleRemove(tag: string) {
    const previous = tags;
    setTags((current) => current.filter((existing) => existing !== tag));

    const result = await removeTagAction({ contactId, tag });
    if (!result.success) {
      toast.error(result.error.message);
      setTags(previous);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {tags.map((tag) => (
        <span
          key={tag}
          className="group flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
        >
          {tag}
          <button
            type="button"
            onClick={() => handleRemove(tag)}
            aria-label={t("removeTag", { tag })}
            className="text-muted-foreground/60 group-hover:text-destructive"
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            handleAdd();
          }
        }}
        placeholder={t("addTagPlaceholder")}
        disabled={isSubmitting}
        className="h-6 w-24 rounded-full border border-dashed bg-transparent px-2 text-xs outline-none focus:border-solid focus:border-foreground"
      />
    </div>
  );
}
