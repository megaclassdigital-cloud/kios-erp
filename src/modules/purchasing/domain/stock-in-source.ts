/** How stock came in, in the words the history shows. Shared by the screen and
 * the Excel file so both name each source the same way. */
export const STOCK_IN_LABEL = {
  PURCHASE: "Penerimaan supplier",
  INITIAL_STOCK: "Stok awal",
  STOCK_OPNAME: "Stok opname",
  RETURN_IN: "Retur masuk",
  ADJUSTMENT: "Penyesuaian",
} as const;

export type StockInKind = keyof typeof STOCK_IN_LABEL;

export function stockInLabel(source: string): string {
  return STOCK_IN_LABEL[source as StockInKind] ?? source;
}
