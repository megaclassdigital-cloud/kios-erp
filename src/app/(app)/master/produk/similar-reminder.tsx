"use client";

import { useEffect, useState } from "react";
import { needsAcknowledgement, type Reminder } from "@/modules/products/domain/similar-products";

/**
 * "Mirip dengan ..." notice shown while a product is being added or renamed.
 * It names the products it resembles and lets the user wave it off -- a
 * deliberate near-twin (another flavour, size or pack) is common. One tick
 * confirms the whole set; the notice then collapses to a single line.
 */
export function SimilarReminder({
  reminders,
  onAcknowledgedChange,
}: {
  reminders: Reminder[];
  onAcknowledgedChange: (acknowledged: boolean) => void;
}) {
  const [acknowledged, setAcknowledged] = useState(false);
  const signature = reminders.map((r) => `${r.kind}:${r.product.id}`).join("|");
  const mustConfirm = needsAcknowledgement(reminders);

  // A different set of matches is a different question: ask again.
  useEffect(() => {
    setAcknowledged(false);
  }, [signature]);
  useEffect(() => {
    onAcknowledgedChange(!mustConfirm || acknowledged);
  }, [mustConfirm, acknowledged, onAcknowledgedChange]);

  if (reminders.length === 0) return null;

  const shown = reminders.slice(0, 6);
  const more = reminders.length - shown.length;

  // Confirmed: the notice steps aside and leaves a one-line record, with a way
  // back in case it was ticked by mistake.
  if (mustConfirm && acknowledged) {
    return (
      <p data-tour="similar-reminder" className="flex flex-wrap items-center gap-x-2 rounded-lg border border-success/30 bg-success-soft px-3 py-2 text-xs text-success">
        <span>✓ Dikonfirmasi: produk ini berbeda dari {reminders.length} produk yang mirip.</span>
        <button type="button" onClick={() => setAcknowledged(false)} className="underline">
          Lihat / batalkan
        </button>
      </p>
    );
  }

  return (
    <div
      data-tour="similar-reminder"
      role="status"
      className={`rounded-lg border p-3 text-sm ${mustConfirm ? "border-warning/40 bg-warning-soft" : "border-border bg-muted"}`}
    >
      <p className="mb-1 text-xs font-semibold text-muted-foreground">PENGINGAT — ADA PRODUK YANG MIRIP</p>
      <ul className="list-disc space-y-0.5 pl-5 text-foreground">
        {shown.map((r) => (
          <li key={`${r.kind}-${r.product.id}`}>{r.text}</li>
        ))}
        {more > 0 && <li className="list-none text-xs text-muted-foreground">dan {more} produk lainnya.</li>}
      </ul>
      <label className="mt-2 flex items-start gap-2 text-xs text-foreground">
        <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} className="mt-0.5" />
        <span>Sudah saya cek — ini produk yang berbeda (misalnya varian lain). Lanjutkan.</span>
      </label>
    </div>
  );
}
