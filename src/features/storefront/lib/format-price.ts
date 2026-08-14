const CURRENCY_SUFFIX: Record<string, string> = {
  ar: "د.ع",
  ku: "د.ع",
  en: "IQD",
};

/**
 * Postgres `numeric(12,2)` always comes back from Drizzle as a string formatted to 2 decimals
 * (`"15000.00"`), which read badly as a raw price. Groups with thousands separators, drops the
 * fractional part when it's exactly zero (the common case), and appends the Iraqi Dinar suffix —
 * always Latin-numeral grouping (`Intl.NumberFormat("en-US", ...)`) regardless of `locale`, since
 * `next-intl`'s Arabic number formatting would otherwise render Arabic-Indic digit glyphs, which
 * read wrong in a commerce context. Only the currency suffix itself is locale-dependent.
 */
export function formatPrice(value: string | number, locale: string): string {
  const numeric = typeof value === "number" ? value : Number.parseFloat(value);
  if (!Number.isFinite(numeric)) return String(value);

  const formatted = new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(numeric);
  const suffix = CURRENCY_SUFFIX[locale] ?? CURRENCY_SUFFIX.en;
  return `${formatted} ${suffix}`;
}
