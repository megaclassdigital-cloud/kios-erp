"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

interface AuditProduct {
  id: string;
  name: string;
  sku: string;
  activeBarcodes: string[];
  stock: string;
  saleLines: number;
  receivingLines: number;
}
interface Group {
  reason: "BARCODE" | "NAMA" | "SKU";
  key: string;
  products: AuditProduct[];
  keepId: string;
}

/** Shows items that look entered twice, with what each record has behind it,
 * so the one to keep is obvious. Nothing is changed here: removing a record
 * goes through the normal delete, which keeps history intact. */
export function DuplicateAuditModal({
  onClose,
  onDelete,
}: {
  onClose: () => void;
  onDelete: (product: { id: string; name: string; stock: number }) => void;
}) {
  const [data, setData] = useState<{ scanned: number; groups: Group[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/products/duplicates")
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error ?? "Gagal memeriksa duplikat.");
        setData(d);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-card p-5 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">Cek Duplikat Produk</h2>
            <p className="text-xs text-muted-foreground">
              Dicek per barcode dulu: kode yang sama atau hanya beda penulisan (nol di depan, digit cek, spasi) langsung dianggap duplikat. Lalu nama dan SKU yang sama atau hampir sama.
            </p>
          </div>
          <button onClick={onClose} aria-label="Tutup" className="rounded-full p-1 text-muted-foreground hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {!data && !error && <p className="text-sm text-muted-foreground">Memeriksa...</p>}
        {data && data.groups.length === 0 && (
          <p className="rounded-md border border-success/30 bg-success-soft px-3 py-2 text-sm text-success">
            Tidak ada duplikat. {data.scanned} produk diperiksa.
          </p>
        )}
        {data?.groups.map((g) => (
          <div key={`${g.reason}-${g.products.map((p) => p.id).join()}`} className="mb-3 rounded-lg border border-border">
            <p className="border-b border-border bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
              {g.reason === "BARCODE" ? "BARCODE SAMA / MIRIP" : `${g.reason} SAMA`}: {g.key}
            </p>
            {g.products.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2 text-sm first:border-t-0">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">
                    {p.name} {p.id === g.keepId && <span className="ml-1 rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-medium text-success">disarankan dipertahankan</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.sku} · barcode {p.activeBarcodes.join(", ") || "-"} · stok {Number(p.stock).toLocaleString("id-ID")} ·{" "}
                    {p.saleLines} baris penjualan · {p.receivingLines} baris barang masuk
                  </p>
                </div>
                {p.id !== g.keepId && (
                  <button
                    onClick={() => onDelete({ id: p.id, name: p.name, stock: Number(p.stock) })}
                    className="text-xs text-destructive hover:underline"
                  >
                    Hapus
                  </button>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
