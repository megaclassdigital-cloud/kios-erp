"use client";

import { useState } from "react";
import type { CartLine } from "./types";
import { lineGross } from "./cart-math";

const rupiah = (v: number) => `Rp${v.toLocaleString("id-ID")}`;

/** Inline promo for one cart line: Rupiah or percent off, with the effect
 * shown before it is applied. The product's own price is never touched. */
export function PromoEditor({
  line,
  onApply,
  onClose,
}: {
  line: CartLine;
  onApply: (promo: CartLine["promo"]) => void;
  onClose: () => void;
}) {
  const [type, setType] = useState<"NOMINAL" | "PERCENT">(line.promo?.type ?? "PERCENT");
  const [value, setValue] = useState(line.promo?.value ?? "");
  const gross = lineGross(line);
  const n = Number(value);
  const amount = type === "PERCENT" ? Math.round((gross * n) / 100) : Math.round(n);
  const invalid = !(n > 0) || (type === "PERCENT" ? n > 100 : amount > gross);

  return (
    <div className="mt-2 space-y-2 rounded-md border border-border bg-muted p-2 text-xs">
      <div className="flex gap-1">
        {(["PERCENT", "NOMINAL"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`flex-1 rounded border py-1 font-medium ${type === t ? "border-primary bg-primary-soft text-primary" : "border-border text-muted-foreground"}`}
          >
            {t === "PERCENT" ? "Persen (%)" : "Nominal (Rp)"}
          </button>
        ))}
      </div>
      <input
        type="number"
        min="0"
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={type === "PERCENT" ? "mis. 10" : "mis. 1000"}
        aria-label="Nilai promo"
        className="w-full rounded border border-input px-2 py-1 text-sm"
      />
      {n > 0 && (
        <p className={invalid ? "text-destructive" : "text-muted-foreground"}>
          {invalid
            ? type === "PERCENT" ? "Maksimal 100%." : "Promo melebihi harga barang."
            : `Harga awal ${rupiah(gross)} − promo ${rupiah(amount)} = ${rupiah(gross - amount)}`}
        </p>
      )}
      <div className="flex justify-end gap-2">
        {line.promo && (
          <button type="button" onClick={() => onApply(undefined)} className="mr-auto text-destructive hover:underline">
            Hapus promo
          </button>
        )}
        <button type="button" onClick={onClose} className="text-muted-foreground hover:underline">Batal</button>
        <button
          type="button"
          disabled={invalid}
          onClick={() => onApply({ type, value: String(n) })}
          className="rounded bg-primary px-2.5 py-1 font-medium text-primary-foreground disabled:opacity-50"
        >
          Terapkan
        </button>
      </div>
    </div>
  );
}
