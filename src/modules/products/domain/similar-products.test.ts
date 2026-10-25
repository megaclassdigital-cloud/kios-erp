import { describe, expect, it } from "vitest";
import { findReminders, needsAcknowledgement, reminderMessage } from "./similar-products";
import type { KnownProductRef } from "./duplicate-product";

const known: KnownProductRef[] = [
  { id: "1", name: "Indomie Goreng 70g", sku: "I70", activeBarcodes: ["8998866200301"] },
  { id: "2", name: "Kecap Manis ABC 275 ml", sku: "K1", activeBarcodes: [] },
  { id: "3", name: "Teh Botol", sku: "T1", activeBarcodes: [] },
];

describe("findReminders", () => {
  it("names the product behind a look-alike barcode", () => {
    const r = findReminders(known, { barcode: "899886620030", name: "Apa saja" });
    expect(r[0].kind).toBe("BARCODE_MIRIP");
    expect(r[0].text).toContain("Indomie Goreng 70g");
    expect(needsAcknowledgement(r)).toBe(true);
  });

  it("calls the same name and size a retype", () => {
    const r = findReminders(known, { name: "indomie goreng 70 gr" });
    expect(r.map((x) => x.kind)).toEqual(["NAMA_SAMA"]);
  });

  it("treats a different size of the same name as a variant, not a duplicate", () => {
    const r = findReminders(known, { name: "Indomie Goreng 85g" });
    expect(r.map((x) => x.kind)).toEqual(["VARIAN"]);
    expect(needsAcknowledgement(r)).toBe(true); // still asks once, then stays quiet
    expect(r[0].text).toContain("70g");
  });

  it("catches a typo'd name at the same size as similar", () => {
    const r = findReminders(known, { name: "Kecap Manis ABC 275ml" });
    expect(r[0].kind).toBe("NAMA_SAMA");
    const typo = findReminders(known, { name: "Kecap Maniss ABC 275ml" });
    expect(typo[0].kind).toBe("NAMA_SAMA"); // one-letter typo still same word
  });

  it("flags a longer variant of the name as similar", () => {
    const r = findReminders(known, { name: "Teh Botol Sosro" });
    expect(r[0].kind).toBe("NAMA_MIRIP");
  });

  it("says nothing about an unrelated product or an identical barcode (hard block elsewhere)", () => {
    expect(findReminders(known, { name: "Sabun Lifebuoy", barcode: "123456789012" })).toEqual([]);
    expect(findReminders(known, { barcode: "8998866200301" })).toEqual([]);
  });

  it("lists every reminder in the server message", () => {
    const r = findReminders(known, { name: "Teh Botol Sosro" });
    expect(reminderMessage(r)).toContain("Teh Botol");
    expect(reminderMessage(r)).toContain("konfirmasi");
  });

  it("shows same-brand neighbours: three Indomie varieties are each other's reminders", () => {
    const indomie: KnownProductRef[] = [
      { id: "a", name: "Indomie Goreng", sku: "A", activeBarcodes: [] },
      { id: "b", name: "Indomie Soto", sku: "B", activeBarcodes: [] },
      { id: "c", name: "Indomie Ayam Bawang", sku: "C", activeBarcodes: [] },
      { id: "d", name: "Sabun Lifebuoy", sku: "D", activeBarcodes: [] },
    ];
    const r = findReminders(indomie, { name: "Indomie Rendang" });
    expect(r.map((x) => x.product.id).sort()).toEqual(["a", "b", "c"]);
    expect(r.every((x) => x.kind === "NAMA_MIRIP")).toBe(true);
  });

  it("does not match on generic words, numbers or short words", () => {
    const list: KnownProductRef[] = [{ id: "a", name: "Teh Celup Sachet 25", sku: "A", activeBarcodes: [] }];
    expect(findReminders(list, { name: "Kopi Sachet 25" })).toEqual([]);
    expect(findReminders(list, { name: "Gula 25" })).toEqual([]);
  });
});
