"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitInquiryAction } from "../actions/submit-inquiry.action";

export function InquiryForm({ slug, initialMessage = "" }: { slug: string; initialMessage?: string }) {
  const t = useTranslations("website.public");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState(initialMessage);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  async function handleSubmit() {
    if (!fullName.trim() || !phone.trim() || !message.trim()) {
      toast.error(t("requiredHint"));
      return;
    }

    setIsSubmitting(true);
    const result = await submitInquiryAction({ slug, fullName, phone, message });
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setIsSent(true);
  }

  if (isSent) {
    return <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{t("thankYou")}</p>;
  }

  return (
    <div className="space-y-3">
      <Input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder={t("namePlaceholder")} />
      <Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder={t("phonePlaceholder")} />
      <Textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={3} placeholder={t("messagePlaceholder")} />
      <Button type="button" disabled={isSubmitting} onClick={handleSubmit} className="w-full">
        {isSubmitting ? t("submitting") : t("submit")}
      </Button>
    </div>
  );
}
