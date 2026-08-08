import type { Storefront } from "@/db/schema";

const FONT_CLASS: Record<string, string> = {
  inter: "font-sans",
  poppins: "font-sans",
  playfair: "font-serif",
  roboto_mono: "font-mono",
};

const BUTTON_CLASS: Record<string, string> = {
  rounded: "rounded-md",
  square: "rounded-none",
  pill: "rounded-full",
};

const CORNER_CLASS: Record<string, string> = {
  sharp: "rounded-none",
  soft: "rounded-lg",
  round: "rounded-2xl",
};

/** Theme = coordinated defaults for spacing/typography weight — a curated 4-value set, not per-property overrides. */
const THEME_CLASS: Record<string, { heading: string; section: string }> = {
  modern: { heading: "font-semibold tracking-tight", section: "py-12" },
  minimal: { heading: "font-medium", section: "py-8" },
  classic: { heading: "font-bold", section: "py-14" },
  bold: { heading: "font-extrabold uppercase tracking-wide", section: "py-16" },
};

export function storefrontFontClass(storefront: Storefront): string {
  return FONT_CLASS[storefront.font] ?? "font-sans";
}

export function storefrontButtonClass(storefront: Storefront): string {
  return BUTTON_CLASS[storefront.buttonStyle] ?? "rounded-md";
}

export function storefrontCornerClass(storefront: Storefront): string {
  return CORNER_CLASS[storefront.cornerStyle] ?? "rounded-lg";
}

export function storefrontThemeClasses(storefront: Storefront): { heading: string; section: string } {
  return THEME_CLASS[storefront.theme] ?? THEME_CLASS.modern;
}
