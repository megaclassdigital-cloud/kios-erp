import Decimal from "decimal.js";

export class InvalidConsignmentError extends Error {}

export interface DropLineInput {
  productId: string;
  quantity: string;
  /** The consignor's price per unit. */
  unitCost: string;
  /** The shop's selling price; when given and different, it replaces the product's. */
  sellingPrice?: string;
}

export interface CleanDropLine {
  productId: string;
  quantity: string;
  unitCost: string;
  sellingPrice?: string;
}

function dec(value: string, label: string): Decimal {
  try {
    const d = new Decimal(value);
    if (!d.isFinite()) throw new Error();
    return d;
  } catch {
    throw new InvalidConsignmentError(`${label} harus berupa angka.`);
  }
}

/**
 * The lines of one drop-off, checked: a positive quantity, a price that is not
 * negative, and no product twice (two lines of one item would hide which price
 * applies). Pure, so every rule is tested without a database.
 */
export function cleanDropLines(lines: DropLineInput[]): CleanDropLine[] {
  if (lines.length === 0) throw new InvalidConsignmentError("Tambahkan minimal satu barang titipan.");
  const seen = new Set<string>();
  return lines.map((line) => {
    if (seen.has(line.productId)) throw new InvalidConsignmentError("Barang yang sama muncul dua kali. Gabungkan jumlahnya dalam satu baris.");
    seen.add(line.productId);

    const quantity = dec(line.quantity, "Jumlah");
    if (quantity.lte(0)) throw new InvalidConsignmentError("Jumlah titipan harus lebih dari 0.");
    if (quantity.decimalPlaces() > 3) throw new InvalidConsignmentError("Jumlah maksimal 3 angka di belakang koma.");

    const cost = dec(line.unitCost, "Harga titip");
    if (cost.lt(0)) throw new InvalidConsignmentError("Harga titip tidak boleh negatif.");
    if (cost.decimalPlaces() > 2) throw new InvalidConsignmentError("Harga titip maksimal 2 angka di belakang koma.");

    let sellingPrice: string | undefined;
    if (line.sellingPrice !== undefined && line.sellingPrice !== "") {
      const selling = dec(line.sellingPrice, "Harga jual");
      if (selling.lt(0)) throw new InvalidConsignmentError("Harga jual tidak boleh negatif.");
      if (selling.decimalPlaces() > 2) throw new InvalidConsignmentError("Harga jual maksimal 2 angka di belakang koma.");
      sellingPrice = selling.toFixed(2);
    }
    return { productId: line.productId, quantity: quantity.toString(), unitCost: cost.toFixed(2), sellingPrice };
  });
}

/** How many units of a drop line can still go back to the consignor. */
export function returnableUnits(line: { quantity: string; quantityReturned: string }, onHand: string): Decimal {
  const notReturned = new Decimal(line.quantity).minus(line.quantityReturned);
  const stock = new Decimal(onHand);
  return Decimal.max(0, Decimal.min(notReturned, stock));
}

export function cleanReturnQuantity(raw: string, available: Decimal): string {
  const qty = dec(raw, "Jumlah retur");
  if (qty.lte(0)) throw new InvalidConsignmentError("Jumlah retur harus lebih dari 0.");
  if (qty.decimalPlaces() > 3) throw new InvalidConsignmentError("Jumlah maksimal 3 angka di belakang koma.");
  if (qty.gt(available)) {
    throw new InvalidConsignmentError(`Hanya ${available.toString()} unit yang bisa diretur (sisa stok titipan ini). Yang sudah terjual tidak bisa diretur.`);
  }
  return qty.toString();
}

/** A payment to a consignor: positive, whole cents, and not more than what is owed. */
/** A catch-up quantity: a positive number with at most 3 decimals. */
export function cleanCatchUpQuantity(raw: string): string {
  let q: Decimal;
  try {
    q = new Decimal((raw ?? "").trim());
  } catch {
    throw new InvalidConsignmentError("Jumlah terjual harus berupa angka.");
  }
  if (q.lte(0)) throw new InvalidConsignmentError("Jumlah terjual harus lebih dari 0.");
  if (q.decimalPlaces() > 3) throw new InvalidConsignmentError("Jumlah terjual maksimal 3 angka di belakang koma.");
  return q.toString();
}

export function cleanPayment(rawAmount: string, owed: string): string {
  const amount = dec(rawAmount, "Jumlah bayar");
  if (amount.lte(0)) throw new InvalidConsignmentError("Jumlah bayar harus lebih dari 0.");
  if (amount.decimalPlaces() > 2) throw new InvalidConsignmentError("Jumlah bayar maksimal 2 angka di belakang koma.");
  if (amount.gt(owed)) throw new InvalidConsignmentError(`Jumlah bayar melebihi utang ke penitip (Rp${Math.round(Number(owed)).toLocaleString("id-ID")}).`);
  return amount.toFixed(2);
}

// ------------------------------------------------------------------ position

export interface PositionInput {
  consignors: { id: string; name: string }[];
  products: { id: string; name: string; consignorId: string; currentStock: string; sellingPrice: string; purchasePrice: string }[];
  items: { productId: string; consignorId: string; quantity: string; quantityReturned: string; unitCost: string; droppedAt: Date }[];
  /** Consigned units sold on PAID sales, as recorded at the till when they sold. */
  saleLines: { productId: string; consignorId: string; quantity: string; costPriceAtSale: string; /** What the shop took for these units (after any promo). */ revenue: string; paidAt: Date }[];
  payments: { consignorId: string; amount: string }[];
}

export interface ProductPosition {
  productId: string;
  name: string;
  received: string;
  returned: string;
  sold: string;
  onHand: string;
  /** What the shop owes for this product's sold units. */
  owed: string;
  /** The shop's current selling price and the consignor's current price. */
  sellingPrice: string;
  unitCost: string;
  /** Shop's take on the sold units, and what is left after paying the consignor. */
  revenue: string;
  margin: string;
}

export interface ConsignorPosition {
  consignorId: string;
  name: string;
  receivedUnits: string;
  returnedUnits: string;
  soldUnits: string;
  onHandUnits: string;
  /** Sold units x the consignor's price at the time of each sale. */
  soldCost: string;
  /** What the shop took for the sold units and its margin (revenue - soldCost). */
  revenue: string;
  margin: string;
  paid: string;
  /** soldCost - paid. Negative means the shop paid ahead (e.g. after a refund). */
  balance: string;
  products: ProductPosition[];
}

/**
 * Where each consignor stands. Only units that sold are owed, at the consignor's
 * price recorded on each sale as it happened. Sales are written to the ledger by
 * the till itself, so a sale of the shop's own earlier stock is never in it, and a
 * refunded or unpaid sale is not PAID so it never reaches `saleLines`.
 */
export function buildConsignorPositions(input: PositionInput): ConsignorPosition[] {
  return input.consignors.map((c) => {
    const products = input.products.filter((p) => p.consignorId === c.id);
    const rows: ProductPosition[] = products.map((p) => {
      const items = input.items.filter((i) => i.productId === p.id && i.consignorId === c.id);
      const sales = input.saleLines.filter((s) => s.productId === p.id && s.consignorId === c.id);
      const owed = sales.reduce((a, s) => a.plus(new Decimal(s.quantity).times(s.costPriceAtSale)), new Decimal(0));
      const revenue = sales.reduce((a, s) => a.plus(s.revenue), new Decimal(0));
      const sum = (values: string[]) => values.reduce((a, v) => a.plus(v), new Decimal(0));
      return {
        productId: p.id,
        name: p.name,
        received: sum(items.map((i) => i.quantity)).toString(),
        returned: sum(items.map((i) => i.quantityReturned)).toString(),
        sold: sum(sales.map((s) => s.quantity)).toString(),
        onHand: new Decimal(p.currentStock).toString(),
        owed: owed.toFixed(2),
        sellingPrice: new Decimal(p.sellingPrice).toFixed(2),
        unitCost: new Decimal(p.purchasePrice).toFixed(2),
        revenue: revenue.toFixed(2),
        margin: revenue.minus(owed).toFixed(2),
      };
    });

    const total = (pick: (r: ProductPosition) => string) => rows.reduce((a, r) => a.plus(pick(r)), new Decimal(0));
    const soldCost = total((r) => r.owed);
    const paid = input.payments.filter((p) => p.consignorId === c.id).reduce((a, p) => a.plus(p.amount), new Decimal(0));
    return {
      consignorId: c.id,
      name: c.name,
      receivedUnits: total((r) => r.received).toString(),
      returnedUnits: total((r) => r.returned).toString(),
      soldUnits: total((r) => r.sold).toString(),
      onHandUnits: total((r) => r.onHand).toString(),
      soldCost: soldCost.toFixed(2),
      revenue: total((r) => r.revenue).toFixed(2),
      margin: total((r) => r.margin).toFixed(2),
      paid: paid.toFixed(2),
      balance: soldCost.minus(paid).toFixed(2),
      products: rows.sort((a, b) => Number(b.owed) - Number(a.owed) || a.name.localeCompare(b.name)),
    };
  });
}
