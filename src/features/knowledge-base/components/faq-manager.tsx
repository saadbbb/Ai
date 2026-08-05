"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Faq } from "@/db/schema";
import { deleteFaqAction } from "../actions/delete-faq.action";
import { saveFaqAction } from "../actions/save-faq.action";

interface FaqManagerProps {
  initialFaqs: Faq[];
}

export function FaqManager({ initialFaqs }: FaqManagerProps) {
  const t = useTranslations("onboarding.knowledgeBase");
  const tCommon = useTranslations("common");
  const tPage = useTranslations("knowledgeBasePage");
  const [faqs, setFaqs] = useState(initialFaqs);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuestion, setEditQuestion] = useState("");
  const [editAnswer, setEditAnswer] = useState("");
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function startEdit(faq: Faq) {
    setEditingId(faq.id);
    setEditQuestion(faq.question);
    setEditAnswer(faq.answer);
  }

  async function saveEdit(id: string) {
    setIsSaving(true);
    const result = await saveFaqAction({ id, question: editQuestion, answer: editAnswer });
    setIsSaving(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setFaqs((current) => current.map((faq) => (faq.id === id ? result.data : faq)));
    setEditingId(null);
    toast.success(tCommon("saved"));
  }

  async function handleDelete(id: string) {
    if (!window.confirm(tCommon("confirmDelete"))) return;

    const result = await deleteFaqAction({ id });
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setFaqs((current) => current.filter((faq) => faq.id !== id));
  }

  async function handleAdd() {
    if (!newQuestion.trim() || !newAnswer.trim()) return;

    setIsSaving(true);
    const result = await saveFaqAction({ question: newQuestion, answer: newAnswer });
    setIsSaving(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setFaqs((current) => [...current, result.data]);
    setNewQuestion("");
    setNewAnswer("");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("faqsHeading")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {faqs.length === 0 && <p className="text-sm text-muted-foreground">{tPage("noItems")}</p>}
        {faqs.map((faq) =>
          editingId === faq.id ? (
            <div key={faq.id} className="space-y-2 rounded-lg border border-input p-2">
              <Input
                value={editQuestion}
                onChange={(event) => setEditQuestion(event.target.value)}
                placeholder={t("questionPlaceholder")}
              />
              <Textarea
                value={editAnswer}
                onChange={(event) => setEditAnswer(event.target.value)}
                placeholder={t("answerPlaceholder")}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                  {tCommon("cancel")}
                </Button>
                <Button type="button" size="sm" disabled={isSaving} onClick={() => saveEdit(faq.id)}>
                  {tCommon("save")}
                </Button>
              </div>
            </div>
          ) : (
            <div key={faq.id} className="flex items-start justify-between gap-2 rounded-lg border border-input p-2">
              <div>
                <p className="text-sm font-medium">{faq.question}</p>
                <p className="text-sm text-muted-foreground">{faq.answer}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => startEdit(faq)}>
                  {tCommon("edit")}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(faq.id)}>
                  {tCommon("delete")}
                </Button>
              </div>
            </div>
          ),
        )}

        <div className="space-y-2 rounded-lg border border-dashed border-input p-2">
          <Input
            value={newQuestion}
            onChange={(event) => setNewQuestion(event.target.value)}
            placeholder={t("questionPlaceholder")}
          />
          <Textarea
            value={newAnswer}
            onChange={(event) => setNewAnswer(event.target.value)}
            placeholder={t("answerPlaceholder")}
          />
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" disabled={isSaving} onClick={handleAdd}>
              {t("addFaq")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
