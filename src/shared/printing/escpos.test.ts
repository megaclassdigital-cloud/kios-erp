import { describe, expect, it } from "vitest";
import { EscPosBuilder, toPrinterText, twoColumns, wrap } from "./escpos";
import { buildReceiptBytes, buildTestPage, type PrintableSale } from "./receipt-escpos";

const ascii = (bytes: Uint8Array) => Array.from(bytes).map((b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : b === 0x0a ? "\n" : "")).join("");
/** The printable lines, with the 3-byte feed commands (ESC d n) dropped. */
function lines(bytes: Uint8Array): string[] {
  const out: string[] = [];
  let cur = "";
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b === 0x1b) {
      const cmd = bytes[i + 1];
      if (cmd === 0x64) {
        out.push(cur);
        cur = "";
      }
      i += cmd === 0x70 ? 4 : 2; // ESC p takes 3 params, the rest 1
      if (cmd === 0x40) i -= 1;
    } else if (b === 0x1d) i += bytes[i + 1] === 0x56 ? 3 : 2;
    else if (b >= 0x20 && b < 0x7f) cur += String.fromCharCode(b);
  }
  if (cur) out.push(cur);
  return out;
}

describe("ESC/POS encoder", () => {
  it("starts with the reset command and writes the standard commands", () => {
    const b = new EscPosBuilder().init().align("center").bold(true).big(true).build();
    expect(Array.from(b)).toEqual([0x1b, 0x40, 0x1b, 0x61, 1, 0x1b, 0x45, 1, 0x1d, 0x21, 0x11]);
    expect(Array.from(new EscPosBuilder().openDrawer().build())).toEqual([0x1b, 0x70, 0, 0x19, 0xfa]);
    expect(Array.from(new EscPosBuilder().cut().build())).toEqual([0x1d, 0x56, 0x42, 0x00]);
  });

  it("transliterates text the printer cannot show", () => {
    expect(toPrinterText("Café × 2 · Rp1.000 – “ok”")).toBe('Cafe x 2 - Rp1.000 - "ok"');
    expect(toPrinterText("日本")).toBe("??");
  });

  it("wraps at word boundaries and splits words longer than a line", () => {
    expect(wrap("Indomie Goreng Spesial Ayam Bawang", 16)).toEqual(["Indomie Goreng", "Spesial Ayam", "Bawang"]);
    expect(wrap("A".repeat(40), 32)).toEqual(["A".repeat(32), "A".repeat(8)]);
  });

  it("right-aligns the amount and never overflows the line", () => {
    const [one] = twoColumns("Total", "Rp10.000", 32);
    expect(one).toHaveLength(32);
    expect(one.endsWith("Rp10.000")).toBe(true);
    const long = twoColumns("Nama produk yang sangat panjang sekali", "Rp10.000", 32);
    expect(long.every((l) => l.length <= 32)).toBe(true);
    expect(long.join("")).toContain("Rp10.000");
  });
});

const sale: PrintableSale = {
  transactionNumber: "TRX-20261031-000001",
  createdAt: "2026-10-31T02:30:00Z",
  cashier: { name: "Owner Toko" },
  items: [
    { productNameSnapshot: "Indomie Goreng 70g", quantity: "2", unitPriceAtSale: "3500", subtotal: "7000" },
    { productNameSnapshot: "Beras Premium 5kg", quantity: "1", unitPriceAtSale: "70000", subtotal: "63000", promoType: "PERCENT", promoValue: "10", discountAmount: "7000" },
  ],
  subtotal: "77000",
  discount: "7000",
  grandTotal: "70000",
  paymentMethod: "CASH",
  cashReceived: "100000",
  changeAmount: "30000",
};

describe("receipt for a 58 mm roll", () => {
  const rows = lines(buildReceiptBytes(sale, { columns: 32 }));

  it("never has a line wider than the paper", () => {
    expect(Math.max(...rows.map((r) => r.length))).toBeLessThanOrEqual(32);
  });

  it("shows the items, the promo with the original price, and the totals", () => {
    const text = rows.join("\n");
    expect(text).toContain("No: TRX-20261031-000001");
    expect(text).toContain("Kasir: Owner Toko");
    expect(text).toContain("2 x Rp3.500");
    expect(text).toMatch(/1 x Rp70\.000\s+Rp70\.000/); // harga awal
    expect(text).toMatch(/Promo 10%\s+-Rp7\.000/);
    expect(text).toMatch(/Harga awal\s+Rp77\.000/);
    expect(text).toMatch(/TOTAL\s+Rp70\.000/);
    expect(text).toMatch(/Kembali\s+Rp30\.000/);
    expect(text).toContain("Terima kasih");
  });

  it("uses the shop's clock (WIB) for the time", () => {
    expect(rows.join("\n")).toContain("31/10/2026 09.30"); // 02:30 UTC
  });

  it("adds the drawer kick only for cash, and a cut only when asked", () => {
    const withDrawer = buildReceiptBytes(sale, { columns: 32, openDrawer: true });
    expect(Array.from(withDrawer.slice(2, 7))).toEqual([0x1b, 0x70, 0, 0x19, 0xfa]);
    const cashless = buildReceiptBytes({ ...sale, paymentMethod: "CASHLESS" }, { columns: 32, openDrawer: true });
    expect(Array.from(cashless.slice(2, 4))).not.toEqual([0x1b, 0x70]);
    const cut = buildReceiptBytes(sale, { columns: 32, cut: true });
    expect(Array.from(cut.slice(-4))).toEqual([0x1d, 0x56, 0x42, 0x00]);
    expect(Array.from(buildReceiptBytes(sale, { columns: 32 }).slice(-3))).toEqual([0x1b, 0x64, 4]);
  });

  it("lays out an 80 mm roll at 48 columns", () => {
    const wide = lines(buildReceiptBytes(sale, { columns: 48 }));
    expect(Math.max(...wide.map((r) => r.length))).toBeLessThanOrEqual(48);
    expect(wide.some((r) => r.length === 48)).toBe(true);
  });

  it("prints a test page of the right width", () => {
    const page = lines(buildTestPage({ columns: 32 }));
    expect(page.join("\n")).toContain("TES PRINTER");
    expect(Math.max(...page.map((r) => r.length))).toBeLessThanOrEqual(32);
    expect(ascii(buildTestPage({ columns: 32 }))).toContain("Printer siap dipakai");
  });
});
