"use client";

import { useEffect, useState } from "react";
import { needsAcknowledgement, type Reminder } from "@/modules/products/domain/similar-products";

/**
 * "Mirip dengan ..." notice shown while a product is being added or renamed.
 * It names the products it resembles and lets the user wave it off -- a
 * deliberate near-twin (another size, another pack) is common. Size variants
 * only inform; anything that looks like a retype asks for a tick first.
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

  return (
    <div
      role="status"
      className={`rounded-lg border p-3 text-sm ${mustConfirm ? "border-warning/40 bg-warning-soft" : "border-border bg-muted"}`}
    >
      <p className="mb-1 text-xs font-semibold text-muted-foreground">
        {mustConfirm ? "PENGINGAT — MIRIP DENGAN PRODUK YANG SUDAH ADA" : "INFO — SUDAH ADA VARIAN LAIN"}
      </p>
      <ul className="list-disc space-y-0.5 pl-5 text-foreground">
        {reminders.map((r) => (
          <li key={`${r.kind}-${r.product.id}`}>{r.text}</li>
        ))}
      </ul>
      {mustConfirm && (
        <label className="mt-2 flex items-start gap-2 text-xs text-foreground">
          <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} className="mt-0.5" />
          <span>Sudah saya cek — ini produk yang berbeda (atau memang sengaja). Lanjutkan.</span>
        </label>
      )}
    </div>
  );
}
