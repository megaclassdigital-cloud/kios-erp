import { formatWibDate, formatWibDateTime } from "@/shared/format/wib";

const MOVEMENT_LABEL: Record<string, string> = {
  PURCHASE: "barang masuk",
  SALE: "penjualan",
  RETURN_IN: "retur masuk",
  RETURN_OUT: "retur keluar",
  DAMAGE: "rusak",
  EXPIRED: "kedaluwarsa",
  ADJUSTMENT: "penyesuaian",
  STOCK_OPNAME: "stok opname",
  INITIAL_STOCK: "stok awal",
};

interface Activity {
  lastStockChange: { at: string; type: string } | null;
  lastEdit: { at: string; by: string; created: boolean; changed: string[] } | null;
}

/**
 * The small per-product log: the date it was last updated (any change, stock
 * or data), and underneath what that was. Both lines come from records that
 * already exist -- the stock ledger and the audit trail -- so nothing here is
 * stored twice.
 */
export function LastChanged({
  updatedAt,
  activity,
  isService,
}: {
  updatedAt: string;
  activity: Activity;
  isService: boolean;
}) {
  const { lastStockChange, lastEdit } = activity;
  const title = [
    `Terakhir diubah ${formatWibDateTime(new Date(updatedAt))}`,
    lastStockChange && `Stok: ${formatWibDateTime(new Date(lastStockChange.at))} (${MOVEMENT_LABEL[lastStockChange.type] ?? lastStockChange.type.toLowerCase()})`,
    lastEdit && `Data: ${formatWibDateTime(new Date(lastEdit.at))} oleh ${lastEdit.by}`,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="whitespace-nowrap" title={title}>
      <p className="text-xs font-medium text-foreground tabular-nums">{formatWibDate(new Date(updatedAt))}</p>
      {!isService && lastStockChange && (
        <p className="text-[11px] text-muted-foreground">
          Stok {formatWibDate(new Date(lastStockChange.at))} · {MOVEMENT_LABEL[lastStockChange.type] ?? lastStockChange.type.toLowerCase()}
        </p>
      )}
      {lastEdit && (
        <p className="text-[11px] text-muted-foreground">
          {lastEdit.created ? "Dibuat" : lastEdit.changed.length > 0 ? lastEdit.changed.join(", ") : "Diubah"}{" "}
          {formatWibDate(new Date(lastEdit.at))} · {lastEdit.by}
        </p>
      )}
    </div>
  );
}
