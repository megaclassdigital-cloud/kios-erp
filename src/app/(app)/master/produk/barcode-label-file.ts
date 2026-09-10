import JsBarcode from "jsbarcode";

const mmToPx = (mm: number, dpi: number) => Math.round((mm / 25.4) * dpi);

/** Renders the barcode itself onto a canvas (jsbarcode supports a canvas
 * target directly, giving a raster bitmap with no SVG-to-image step) —
 * same EAN13-then-CODE128 fallback as the on-screen preview, since a
 * downloaded label must never come out blank for the same reason the
 * preview can't (PRD 42). */
function renderBarcodeBitmap(value: string, format: "CODE128" | "EAN13"): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const options = { width: 2, height: 120, displayValue: true, fontSize: 28, margin: 4 };
  try {
    JsBarcode(canvas, value, { ...options, format });
  } catch {
    JsBarcode(canvas, value, { ...options, format: "CODE128" });
  }
  return canvas;
}

export interface LabelFileOptions {
  productName: string;
  barcodeValue: string;
  barcodeType: "CODE128" | "EAN13";
  widthMm: number;
  heightMm: number;
  /** Present for the A4 "many labels" paper option — tiles the same label
   * across a grid instead of rendering one centered label. */
  sheet?: { quantity: number; columns: number; marginMm: number };
}

/** Builds a print-ready PNG at 300dpi for the chosen physical paper size —
 * a real file the user can save, send to a print shop, or hand off to
 * software the in-browser print dialog doesn't reach (some thermal label
 * printers). Returns a Blob; caller wires it to a download. */
export function buildLabelPng(opts: LabelFileOptions): Promise<Blob> {
  const dpi = 300;
  const barcodeBitmap = renderBarcodeBitmap(opts.barcodeValue, opts.barcodeType);
  const barcodeAspect = barcodeBitmap.height / barcodeBitmap.width;

  const widthPx = mmToPx(opts.widthMm, dpi);
  const heightPx = mmToPx(opts.heightMm, dpi);
  const canvas = document.createElement("canvas");
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Canvas tidak didukung."));

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, widthPx, heightPx);
  ctx.fillStyle = "#111111";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  // renderBarcodeBitmap rendered the source bitmap at 2px per module (its
  // jsbarcode `width` option) — general-purpose 1D scanners need each bar
  // to be at least ~0.4mm wide to resolve reliably at normal distance/
  // lighting, so the print scale must never shrink below that no matter
  // how small the chosen label size is (PRD 71: printed/downloaded
  // barcodes must actually scan, not just look right).
  const nativeModulePx = 2;
  const minModulePx = mmToPx(0.4, dpi);
  const minBcDrawW = barcodeBitmap.width * (minModulePx / nativeModulePx);

  function drawLabel(x: number, y: number, w: number, h: number) {
    const nameFontPx = Math.max(10, Math.round(h * 0.09));
    ctx!.font = `${nameFontPx}px Arial, sans-serif`;

    const bcW = w * 0.92;
    const fittedBcH = Math.min(bcW * barcodeAspect, h - nameFontPx - 12);
    const fittedBcDrawW = fittedBcH / barcodeAspect;
    // Prefer scannability over a tidy fit: if the cell is too small to hit
    // the minimum module width, grow past the cell (capped at the full
    // canvas) rather than rendering bars too thin to scan.
    const bcDrawW = Math.min(Math.max(fittedBcDrawW, minBcDrawW), widthPx * 0.98);
    const bcH = bcDrawW * barcodeAspect;

    // Center the name+barcode block vertically in the cell rather than
    // pinning it to the top — the barcode's own aspect ratio means it
    // rarely fills a tall cell (esp. the A4 sheet grid), so anchoring top
    // left a large dead gap at the bottom of every label.
    const contentH = nameFontPx + 6 + bcH;
    const startY = y + Math.max(0, (h - contentH) / 2);

    ctx!.fillText(truncateToWidth(ctx!, opts.productName, w - 8), x + w / 2, startY, w - 8);
    ctx!.drawImage(barcodeBitmap, x + (w - bcDrawW) / 2, startY + nameFontPx + 6, bcDrawW, bcH);
  }

  if (opts.sheet) {
    const marginPx = mmToPx(opts.sheet.marginMm, dpi);
    const cols = opts.sheet.columns;
    const rows = Math.ceil(opts.sheet.quantity / cols);
    const cellW = (widthPx - marginPx * 2) / cols;
    const cellH = (heightPx - marginPx * 2) / rows;
    for (let i = 0; i < opts.sheet.quantity; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      drawLabel(marginPx + col * cellW, marginPx + row * cellH, cellW, cellH);
    }
  } else {
    drawLabel(0, heightPx * 0.06, widthPx, heightPx * 0.88);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Gagal membuat file gambar."))), "image/png");
  });
}

function truncateToWidth(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 1 && ctx.measureText(truncated + "…").width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + "…";
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
