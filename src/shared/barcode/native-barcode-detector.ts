const SUPPORTED_FORMATS = ["code_128", "ean_13", "ean_8", "upc_a", "upc_e", "code_39"];

/**
 * Returns a ready-to-use native BarcodeDetector restricted to the retail
 * formats this app scans, or null if the browser doesn't implement the
 * Shape Detection API or doesn't support any of those formats -- callers
 * fall back to the zxing-based path in that case (see barcode-detector.d.ts
 * for why this is worth trying first).
 */
export async function createNativeBarcodeDetector(): Promise<BarcodeDetector | null> {
  if (typeof window === "undefined" || !window.BarcodeDetector) return null;
  try {
    const supported = await window.BarcodeDetector.getSupportedFormats();
    const formats = SUPPORTED_FORMATS.filter((f) => supported.includes(f));
    if (formats.length === 0) return null;
    return new window.BarcodeDetector({ formats });
  } catch {
    return null;
  }
}
