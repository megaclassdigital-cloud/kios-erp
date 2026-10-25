import { describe, expect, it } from "vitest";
import { findDuplicateGroups, type AuditProduct } from "./duplicate-groups";

const p = (over: Partial<AuditProduct> & { id: string }): AuditProduct => ({
  name: over.id,
  sku: `SKU-${over.id}`,
  activeBarcodes: [],
  stock: "0",
  createdAt: new Date("2026-10-01"),
  saleLines: 0,
  receivingLines: 0,
  ...over,
});

describe("findDuplicateGroups", () => {
  it("groups the same name despite case, spacing and punctuation", () => {
    const groups = findDuplicateGroups([
      p({ id: "a", name: "ABC Kopi Susu 200 mL" }),
      p({ id: "b", name: "abc kopisusu 200ml" }),
      p({ id: "c", name: "Teh Botol" }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].reason).toBe("NAMA");
    expect(groups[0].products.map((x) => x.id)).toEqual(["a", "b"]);
  });

  it("groups SKUs that differ only in case or dashes", () => {
    const groups = findDuplicateGroups([p({ id: "a", sku: "GULA-1" }), p({ id: "b", sku: "gula1" })]);
    expect(groups.map((g) => g.reason)).toEqual(["SKU"]);
  });

  it("suggests keeping the record with the most history, then the oldest", () => {
    const groups = findDuplicateGroups([
      p({ id: "new", name: "Gula", saleLines: 0, createdAt: new Date("2026-10-20") }),
      p({ id: "busy", name: "gula", saleLines: 5, receivingLines: 2 }),
    ]);
    expect(groups[0].keepId).toBe("busy");
    const tie = findDuplicateGroups([
      p({ id: "later", name: "Gula", createdAt: new Date("2026-10-20") }),
      p({ id: "first", name: "gula", createdAt: new Date("2026-10-01") }),
    ]);
    expect(tie[0].keepId).toBe("first");
  });

  it("reports a pair once even if it matches by name and SKU", () => {
    const groups = findDuplicateGroups([p({ id: "a", name: "Gula", sku: "G1" }), p({ id: "b", name: "gula", sku: "g1" })]);
    expect(groups).toHaveLength(1);
  });

  it("finds nothing when everything is distinct", () => {
    expect(findDuplicateGroups([p({ id: "a" }), p({ id: "b" })])).toEqual([]);
  });
});
