import { sharedBarcodeKey } from "./barcode-similarity";
import { coreSimilarity, parseName } from "./product-name";
import type { KnownProductRef } from "./duplicate-product";

/**
 * Reminders when a product is added (or renamed) that resembles one already in
 * Master Produk. They inform, they do not decide: the person may have a
 * different product on purpose, and a size or flavour variant looks very
 * similar by design. Only BARCODE_MIRIP, NAMA_SAMA and NAMA_MIRIP ask for a
 * conscious "yes, this is different"; VARIAN is just a heads-up.
 */
export type ReminderKind = "BARCODE_MIRIP" | "NAMA_SAMA" | "NAMA_MIRIP" | "VARIAN";

export interface Reminder {
  kind: ReminderKind;
  product: KnownProductRef;
  text: string;
}

const SIMILAR_THRESHOLD = 0.75;
const ORDER: ReminderKind[] = ["BARCODE_MIRIP", "NAMA_SAMA", "NAMA_MIRIP", "VARIAN"];

export function findReminders(
  existing: KnownProductRef[],
  candidate: { name?: string; barcode?: string }
): Reminder[] {
  const reminders: Reminder[] = [];
  const barcode = candidate.barcode?.trim();
  const mine = candidate.name?.trim() ? parseName(candidate.name) : null;

  for (const product of existing) {
    // Look-alike barcode (leading zeros, check digit...). An identical one is a
    // hard duplicate and never reaches here.
    if (barcode) {
      const identical = product.activeBarcodes.some((b) => b.trim() === barcode);
      if (!identical && sharedBarcodeKey([barcode], product.activeBarcodes) !== null) {
        const code = product.activeBarcodes.find((b) => sharedBarcodeKey([barcode], [b]) !== null);
        reminders.push({ kind: "BARCODE_MIRIP", product, text: `Barcode mirip dengan "${product.name}" (${code}).` });
        continue;
      }
    }
    if (!mine || mine.core.length === 0) continue;

    const theirs = parseName(product.name);
    const similarity = coreSimilarity(mine.core, theirs.core);
    if (similarity < SIMILAR_THRESHOLD) continue;

    const bothSized = mine.sizes.length > 0 && theirs.sizes.length > 0;
    const sameSize = mine.sizes.join() === theirs.sizes.join();
    if (bothSized && !sameSize) {
      reminders.push({
        kind: "VARIAN",
        product,
        text: `Varian lain dari "${product.name}" (ukuran ${theirs.sizes.join(", ")}).`,
      });
    } else if (similarity === 1) {
      reminders.push({
        kind: "NAMA_SAMA",
        product,
        text: sameSize ? `Nama dan ukuran sama dengan "${product.name}".` : `Nama sama dengan "${product.name}" (salah satunya tanpa ukuran).`,
      });
    } else {
      reminders.push({ kind: "NAMA_MIRIP", product, text: `Nama mirip dengan "${product.name}".` });
    }
  }
  return reminders.sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind)).slice(0, 6);
}

/** Whether the user has to say "ya, ini produk berbeda" before saving. */
export const needsAcknowledgement = (reminders: Reminder[]) => reminders.some((r) => r.kind !== "VARIAN");

/** One sentence for the server to return when a reminder was not acknowledged. */
export function reminderMessage(reminders: Reminder[]): string {
  const lines = reminders.filter((r) => r.kind !== "VARIAN").map((r) => r.text);
  return `${lines.join(" ")} Pastikan ini memang produk berbeda, lalu konfirmasi untuk melanjutkan.`;
}
