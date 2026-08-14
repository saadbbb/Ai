import type { CSSProperties } from "react";

/** Same validation/fallback every storefront page used to duplicate inline — now the one place it lives. */
const FALLBACK_HEX = "#2563eb";

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function hexToRgb(hex: string): Rgb {
  const int = Number.parseInt(hex.slice(1), 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

function rgbToHex({ r, g, b }: Rgb): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[r, g, b]
    .map(clamp)
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")}`;
}

function darken(rgb: Rgb, amount: number): Rgb {
  return { r: rgb.r * (1 - amount), g: rgb.g * (1 - amount), b: rgb.b * (1 - amount) };
}

function rgba(rgb: Rgb, alpha: number): string {
  return `rgba(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}, ${alpha})`;
}

/** WCAG relative luminance, used only to pick a readable black/white foreground — not a general color-science need. */
function relativeLuminance({ r, g, b }: Rgb): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(a: number, b: number): number {
  const [light, dark] = a > b ? [a, b] : [b, a];
  return (light + 0.05) / (dark + 0.05);
}

/**
 * Turns the merchant's one chosen hex color into the full set of CSS custom properties this
 * app's own design system already reads from (`globals.css`'s `--primary`/`--primary-hover`/etc,
 * consumed by `bg-primary`/`text-primary`/`Button`'s default variant via Tailwind's `@theme
 * inline`). Meant to be spread onto a `style={}` prop on the storefront's root wrapper — CSS
 * custom properties cascade to every descendant for free, so every existing `bg-primary`/
 * `text-primary` consumer picks up the merchant's color with zero changes on its own.
 *
 * `--elevation-glow` is easy to miss: `Button`'s default-variant `shadow-glow` class resolves to
 * `var(--elevation-glow)`, not `var(--primary-glow)` — a separate two-shadow value hardcoded to
 * the app's own violet in `globals.css`. Skipping it would leave Add-to-Cart's shadow purple even
 * after everything else re-colors correctly.
 */
export function resolveAccentTokens(primaryColor: string | null | undefined): CSSProperties {
  const hex = primaryColor && /^#[0-9a-fA-F]{6}$/.test(primaryColor) ? primaryColor : FALLBACK_HEX;
  const rgb = hexToRgb(hex);
  const luminance = relativeLuminance(rgb);
  const foreground = contrastRatio(luminance, 1) >= contrastRatio(luminance, 0) ? "#ffffff" : "#0a0c11";

  return {
    "--primary": hex,
    "--primary-hover": rgbToHex(darken(rgb, 0.12)),
    "--primary-active": rgbToHex(darken(rgb, 0.22)),
    "--primary-foreground": foreground,
    "--primary-soft": rgba(rgb, 0.14),
    "--primary-glow": rgba(rgb, 0.32),
    "--ring": rgba(rgb, 0.5),
    "--elevation-glow": `0 0 0 1px ${rgba(rgb, 0.25)}, 0 8px 30px ${rgba(rgb, 0.18)}`,
  } as CSSProperties;
}
