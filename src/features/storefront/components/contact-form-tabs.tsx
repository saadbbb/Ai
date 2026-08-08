"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { InquiryForm } from "./inquiry-form";

const FORM_TYPES = ["contact", "quote", "support"] as const;
type FormType = (typeof FORM_TYPES)[number];

export function ContactFormTabs({ slug }: { slug: string }) {
  const t = useTranslations("website.public.formTabs");
  const [formType, setFormType] = useState<FormType>("contact");

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b">
        {FORM_TYPES.map((type) => (
          <Button
            key={type}
            type="button"
            variant="ghost"
            onClick={() => setFormType(type)}
            className={cn(
              "rounded-none border-b-2 border-transparent px-3 pb-2 text-sm",
              formType === type && "border-primary font-medium text-primary",
            )}
          >
            {t(type)}
          </Button>
        ))}
      </div>
      <InquiryForm key={formType} slug={slug} formType={formType} />
    </div>
  );
}
