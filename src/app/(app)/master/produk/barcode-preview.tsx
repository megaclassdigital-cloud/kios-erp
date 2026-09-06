"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

/** Renders a scannable CODE128/EAN13 label client-side (no server-side
 * canvas dependency needed) for preview/print (PRD 42). */
export function BarcodePreview({ value, format }: { value: string; format: "CODE128" | "EAN13" }) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current || !value) return;
    try {
      JsBarcode(ref.current, value, {
        format: format === "EAN13" ? "EAN13" : "CODE128",
        width: 2,
        height: 60,
        displayValue: true,
        fontSize: 14,
      });
    } catch {
      // invalid value for the chosen symbology (e.g. non-EAN13 digits) — leave blank
    }
  }, [value, format]);

  return <svg ref={ref} />;
}
