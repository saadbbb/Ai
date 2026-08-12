"use client";

import { ImagePlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { type ChangeEvent, type FormEvent, useRef, useState } from "react";
import { toast } from "sonner";
import { skipLogoAction } from "../actions/skip-logo.action";
import { uploadLogoAction } from "../actions/upload-logo.action";
import { StepFooter } from "./step-footer";
import { StepShell } from "./step-shell";

export function LogoForm({ defaultLogoUrl }: { defaultLogoUrl: string | null }) {
  const router = useRouter();
  const t = useTranslations("onboarding.logo");
  const [preview, setPreview] = useState<string | null>(defaultLogoUrl);
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);

    if (!file) {
      const result = await skipLogoAction();
      setIsSubmitting(false);
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      router.push("/onboarding/agent-name");
      return;
    }

    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadLogoAction(formData);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    router.push("/onboarding/agent-name");
  }

  return (
    <StepShell step={4} title={t("title")} description={t("description")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-input p-8 text-center transition-colors hover:border-primary/50 hover:bg-primary/5"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="size-24 rounded-xl object-cover" />
          ) : (
            <span className="flex size-24 items-center justify-center rounded-xl bg-surface-elevated text-muted-foreground">
              <ImagePlus className="size-8" />
            </span>
          )}
          <span className="text-sm font-medium text-foreground">
            {preview ? t("changeLabel") : t("uploadLabel")}
          </span>
          <span className="text-xs text-muted-foreground">{t("uploadHint")}</span>
        </button>

        <StepFooter backHref="/onboarding/business-type" isSubmitting={isSubmitting} />
      </form>
    </StepShell>
  );
}
