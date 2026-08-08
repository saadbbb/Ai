"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { subscribeNewsletterAction } from "../actions/subscribe-newsletter.action";

export function NewsletterSignupForm({ slug }: { slug: string }) {
  const t = useTranslations("website.public.newsletter");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  async function handleSubmit() {
    if (!email.trim()) return;

    setIsSubmitting(true);
    const result = await subscribeNewsletterAction({ slug, email });
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setIsSent(true);
  }

  if (isSent) {
    return <p className="text-sm text-muted-foreground">{t("thankYou")}</p>;
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-2 sm:flex-row">
      <Input
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder={t("emailPlaceholder")}
      />
      <Button type="button" disabled={isSubmitting} onClick={handleSubmit}>
        {isSubmitting ? t("submitting") : t("subscribe")}
      </Button>
    </div>
  );
}
