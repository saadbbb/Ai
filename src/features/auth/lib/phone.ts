/**
 * Iraq-only for now (see PART 3 spec) — validates/normalizes a mobile number to
 * E.164 (+9647XXXXXXXX). Accepts the local format merchants actually type
 * (07XXXXXXXXX) as well as an already-international one, so paste-from-contacts
 * still works. Returns null for anything that doesn't fit.
 */
export function normalizeIraqiPhone(input: string): string | null {
  const digits = input.replace(/[\s-]/g, "");

  let national: string | null = null;
  if (/^07\d{9}$/.test(digits)) {
    national = digits.slice(1);
  } else if (/^\+9647\d{8}$/.test(digits)) {
    national = digits.slice(4);
  } else if (/^009647\d{8}$/.test(digits)) {
    national = digits.slice(5);
  } else if (/^9647\d{8}$/.test(digits)) {
    national = digits.slice(3);
  }

  if (!national || !/^7\d{9}$/.test(national)) return null;
  return `+964${national}`;
}

/** Local display format (07XX XXX XXXX) for an already-normalized +9647XXXXXXXX number. */
export function formatIraqiPhoneLocal(e164: string): string {
  const national = e164.replace("+964", "");
  return `0${national}`;
}
