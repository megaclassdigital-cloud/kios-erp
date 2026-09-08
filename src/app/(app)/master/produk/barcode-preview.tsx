"use client";

import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";

/** Renders a scannable barcode label client-side (no server-side canvas
 * dependency needed) for preview/print (PRD 42). EAN13 requires a valid
 * 13-digit checksum — most real manufacturer barcodes don't qualify, so a
 * failed EAN13 render falls back to CODE128 (which encodes any value)
 * instead of silently leaving a blank label. */
export function BarcodePreview({ value, format }: { value: string; format: "CODE128" | "EAN13" }) {
  const ref = useRef<SVGSVGElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!ref.current || !value) return;
    setFailed(false);

    const options = { width: 2, height: 60, displayValue: true, fontSize: 14 };
    try {
      JsBarcode(ref.current, value, { ...options, format: format === "EAN13" ? "EAN13" : "CODE128" });
    } catch {
      try {
        JsBarcode(ref.current, value, { ...options, format: "CODE128" });
      } catch {
        setFailed(true);
      }
    }
  }, [value, format]);

  if (failed) {
    return <p className="text-sm text-red-600">Barcode tidak dapat ditampilkan (nilai tidak valid).</p>;
  }
  return <svg ref={ref} />;
}
