"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Note, NoteType } from "@/db/schema";
import { createNoteAction } from "../actions/create-note.action";
import { deleteNoteAction } from "../actions/delete-note.action";

const COMPOSABLE_TYPES: Exclude<NoteType, "ai">[] = ["team", "private"];

export function NotePanel({ contactId, initialNotes }: { contactId: string; initialNotes: Note[] }) {
  const t = useTranslations("notes");
  const [notes, setNotes] = useState(initialNotes);
  const [content, setContent] = useState("");
  const [type, setType] = useState<Exclude<NoteType, "ai">>("team");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCreate() {
    if (!content.trim()) return;
    setIsSubmitting(true);
    const result = await createNoteAction({ contactId, content, pinned: false, type });
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
        <div className="flex items-center justify-between gap-2">
          <Select value={type} onValueChange={(value) => setType(value as Exclude<NoteType, "ai">)}>
            <SelectTrigger size="sm" className="h-7 w-auto text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMPOSABLE_TYPES.map((option) => (
                <SelectItem key={option} value={option}>
                  {t(`types.${option}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                <div className="flex items-center gap-2">
                  {note.type !== "team" && (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {t(`types.${note.type}`)}
                    </span>
                  )}
                </div>
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
