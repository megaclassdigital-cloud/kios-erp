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
    expect(needsAcknowledgement(r)).toBe(false);
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

  it("mentions only the ones that need a yes in the server message", () => {
    const r = findReminders(known, { name: "Teh Botol Sosro" });
    expect(reminderMessage(r)).toContain("Teh Botol");
    expect(reminderMessage(r)).toContain("konfirmasi");
  });
});
