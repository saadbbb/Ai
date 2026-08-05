"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Note } from "@/db/schema";
import { createNoteAction } from "../actions/create-note.action";
import { deleteNoteAction } from "../actions/delete-note.action";

export function NotePanel({ contactId, initialNotes }: { contactId: string; initialNotes: Note[] }) {
  const t = useTranslations("notes");
  const [notes, setNotes] = useState(initialNotes);
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCreate() {
    if (!content.trim()) return;
    setIsSubmitting(true);
    const result = await createNoteAction({ contactId, content, pinned: false });
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setNotes((current) => [result.data, ...current]);
    setContent("");
  }

  async function handleDelete(noteId: string) {
    const previous = notes;
    setNotes((current) => current.filter((note) => note.id !== noteId));

    const result = await deleteNoteAction({ noteId });
    if (!result.success) {
      toast.error(result.error.message);
      setNotes(previous);
    }
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium">{t("title")}</h2>

      <div className="space-y-2">
        <Textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder={t("placeholder")}
          rows={2}
        />
        <div className="flex justify-end">
          <Button type="button" size="sm" disabled={isSubmitting || !content.trim()} onClick={handleCreate}>
            {t("add")}
          </Button>
        </div>
      </div>

      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="divide-y rounded-lg border">
          {notes.map((note) => (
            <div key={note.id} className="flex items-start justify-between gap-3 p-3 text-sm">
              <div>
                <p className="whitespace-pre-wrap">{note.content}</p>
                <p className="mt-1 text-xs text-muted-foreground">{new Date(note.createdAt).toLocaleString()}</p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(note.id)}
                className="shrink-0 text-xs text-muted-foreground hover:text-destructive"
              >
                {t("delete")}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
