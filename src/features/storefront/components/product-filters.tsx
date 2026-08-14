"use client";

import { ChevronDown, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CATEGORY_PILL_THRESHOLD, SORT_OPTIONS, type ProductSort } from "../lib/product-catalog";

interface ProductFiltersProps {
  slug: string;
  q?: string;
  category?: string;
  sort: ProductSort;
  categories: string[];
  showSearch: boolean;
}

export function ProductFilters({ slug, q, category, sort, categories, showSearch }: ProductFiltersProps) {
  const t = useTranslations("website.public");
  const [pickerOpen, setPickerOpen] = useState(false);
  const base = `/store/${slug}/products`;

  function categoryHref(value?: string) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (value) params.set("category", value);
    if (sort !== "newest") params.set("sort", sort);
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  }

  const hasActiveFilters = !!q || !!category || sort !== "newest";
  const usePills = categories.length > 0 && categories.length <= CATEGORY_PILL_THRESHOLD;
  const usePicker = categories.length > CATEGORY_PILL_THRESHOLD;

  return (
    <form className="flex flex-wrap items-center gap-2" method="get">
      {showSearch && (
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder={t("searchPlaceholder")}
            className="h-10 w-full rounded-full border bg-transparent ps-9 pe-3 text-sm outline-none focus:border-primary"
          />
        </div>
      )}

      {usePills && (
        <div className="flex flex-wrap gap-1.5">
          <Link
            href={categoryHref(undefined)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              !category ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {t("allCategories")}
          </Link>
          {categories.map((option) => (
            <Link
              key={option}
              href={categoryHref(option)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                category === option ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
              )}
            >
              {option}
            </Link>
          ))}
        </div>
      )}

      {usePicker && (
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-medium hover:bg-muted"
            >
              {category || t("allCategories")}
              <ChevronDown className="size-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="max-h-72 w-56 overflow-y-auto p-1">
            <Link
              href={categoryHref(undefined)}
              onClick={() => setPickerOpen(false)}
              className={cn("block rounded-md px-3 py-2 text-sm", !category ? "bg-primary-soft font-medium text-primary" : "hover:bg-muted")}
            >
              {t("allCategories")}
            </Link>
            {categories.map((option) => (
              <Link
                key={option}
                href={categoryHref(option)}
                onClick={() => setPickerOpen(false)}
                className={cn(
                  "block rounded-md px-3 py-2 text-sm",
                  category === option ? "bg-primary-soft font-medium text-primary" : "hover:bg-muted",
                )}
              >
                {option}
              </Link>
            ))}
          </PopoverContent>
        </Popover>
      )}

      <select name="sort" defaultValue={sort} className="h-10 rounded-full border bg-transparent px-3 text-sm">
        {SORT_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {t(`sortOptions.${option}`)}
          </option>
        ))}
      </select>

      <button type="submit" className="h-10 rounded-full border px-4 text-sm font-medium hover:bg-muted">
        {t("applyFilters")}
      </button>

      {hasActiveFilters && (
        <Link href={base} className="text-sm text-muted-foreground hover:text-foreground hover:underline">
          {t("resetFilters")}
        </Link>
      )}
    </form>
  );
}
