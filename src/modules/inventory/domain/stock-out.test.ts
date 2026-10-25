import { describe, expect, it } from "vitest";
import { InvalidStockOutError, planStockOut } from "./stock-out";

describe("planStockOut", () => {
  it("maps each reason to its own movement type", () => {
    expect(planStockOut({ quantity: "5", reason: "RUSAK" }).movementType).toBe("DAMAGE");
    expect(planStockOut({ quantity: "5", reason: "KEDALUWARSA" }).movementType).toBe("EXPIRED");
    expect(planStockOut({ quantity: "5", reason: "RETUR_SUPPLIER" }).movementType).toBe("RETURN_OUT");
    expect(planStockOut({ quantity: "5", reason: "LAINNYA", note: "dipakai sendiri" }).movementType).toBe("ADJUSTMENT");
  });

  it("keeps the note next to the reason", () => {
    expect(planStockOut({ quantity: "2", reason: "RUSAK", note: " kemasan sobek " }).note).toBe("Rusak: kemasan sobek");
    expect(planStockOut({ quantity: "2", reason: "RUSAK" }).note).toBe("Rusak");
  });

  it("requires a note for 'lainnya'", () => {
    expect(() => planStockOut({ quantity: "1", reason: "LAINNYA" })).toThrow(/wajib dijelaskan/);
  });

  it("rejects zero, negative, non-numeric and over-precise quantities", () => {
    for (const quantity of ["0", "-3", "abc", "1.2345"]) {
      expect(() => planStockOut({ quantity, reason: "RUSAK" })).toThrow(InvalidStockOutError);
    }
  });
});
