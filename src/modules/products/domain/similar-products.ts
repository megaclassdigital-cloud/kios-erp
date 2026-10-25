import { sharedBarcodeKey } from "./barcode-similarity";
import { coreSimilarity, parseName } from "./product-name";
import type { KnownProductRef } from "./duplicate-product";

/**
 * Reminders when a product is added (or renamed) that resembles one already in
 * Master Produk. They inform, they do not decide: the person may have a
 * different product on purpose, and a size or flavour variant looks very
 * similar by design. Every kind asks for one conscious "yes, this is
 * different"; once confirmed the notice goes away.
 */
export type ReminderKind = "BARCODE_MIRIP" | "NAMA_SAMA" | "NAMA_MIRIP" | "VARIAN";

export interface Reminder {
  kind: ReminderKind;
  product: KnownProductRef;
  text: string;
}

const SIMILAR_THRESHOLD = 0.75;
/** Words that say nothing about which product it is. */
const GENERIC = new Set(["isi", "pcs", "pack", "botol", "sachet", "renteng", "dus", "box", "refill", "besar", "kecil"]);
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
    if (similarity < SIMILAR_THRESHOLD) {
      // Same brand / same kind of item with a different flavour or type
      // ("Indomie Goreng" next to "Indomie Soto"): not a retype, but exactly
      // the neighbours someone adding a product should be shown.
      if (sharesKeyword(mine.core, theirs.core)) {
        reminders.push({ kind: "NAMA_MIRIP", product, text: `Nama sejenis dengan "${product.name}".` });
      }
      continue;
    }

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
  return reminders.sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind)).slice(0, 20);
}

function sharesKeyword(a: string[], b: string[]): boolean {
  const usable = (w: string) => w.length >= 4 && !/^\d/.test(w) && !GENERIC.has(w);
  return a.filter(usable).some((w) => b.filter(usable).some((v) => coreSimilarity([w], [v]) === 1));
}

/** Whether the user has to say "ya, ini produk berbeda" before saving. Any
 * resemblance asks once; a confirmed set stays quiet. */
export const needsAcknowledgement = (reminders: Reminder[]) => reminders.length > 0;

/** One sentence for the server to return when a reminder was not acknowledged. */
export function reminderMessage(reminders: Reminder[]): string {
  const lines = reminders.map((r) => r.text);
  return `${lines.join(" ")} Pastikan ini memang produk berbeda, lalu konfirmasi untuk melanjutkan.`;
}
