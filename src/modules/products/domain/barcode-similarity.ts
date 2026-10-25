/**
 * Keys under which two barcodes count as "the same code, written differently".
 * Two barcodes sharing any key are flagged as a duplicate -- a similarity
 * signal, deliberately broader than equality (equal codes are already refused
 * by the database).
 *
 *  - Leading zeros do not matter: UPC-A "012345678905" is EAN-13
 *    "0012345678905", and scanners disagree about which to emit.
 *  - A 12/13-digit code also matches the same code without its last digit, so
 *    a code typed without (or with a mistyped) check digit still meets the
 *    real one.
 *  - Anything non-numeric (a Code 128 text code) compares case-insensitively.
 *
 * Short numeric codes (the shop's own internal barcodes) get only the exact
 * key, so two neighbouring internal numbers are never mistaken for each other.
 */
export function barcodeKeys(raw: string): string[] {
  const text = raw.trim();
  if (!text) return [];
  if (!/^\d+$/.test(text.replace(/[\s-]/g, ""))) return [`t:${text.toLowerCase()}`];

  const digits = text.replace(/\D/g, "");
  const strip = (d: string) => d.replace(/^0+/, "") || "0";
  const keys = [`n:${strip(digits)}`];
  if (digits.length === 12 || digits.length === 13) keys.push(`n:${strip(digits.slice(0, -1))}`);
  return keys;
}

/** The first key two barcode lists share, or null. */
export function sharedBarcodeKey(a: string[], b: string[]): string | null {
  const keys = new Set(a.flatMap(barcodeKeys));
  for (const code of b) {
    for (const key of barcodeKeys(code)) if (keys.has(key)) return key;
  }
  return null;
}
