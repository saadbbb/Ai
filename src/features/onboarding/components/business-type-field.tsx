"use client";

import { useTranslations } from "next-intl";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BUSINESS_TYPE_KEYS } from "../constants";

/**
 * The business-type picker shared by the onboarding wizard's Business Type step and the
 * Business Info settings card — same field (workspaces.businessType), same option list.
 */
export function BusinessTypeField({
  id = "businessType",
  value,
  onChange,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useTranslations("onboarding.businessType");

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={t("placeholder")} />
      </SelectTrigger>
      <SelectContent>
        {BUSINESS_TYPE_KEYS.map((key) => (
          <SelectItem key={key} value={key}>
            {t(`options.${key}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
