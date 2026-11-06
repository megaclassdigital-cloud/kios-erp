"use client";

import { useCallback, useEffect, useState } from "react";
import { HandCoins, Package, Users } from "lucide-react";
import { KpiCard } from "@/components/kios/kpi-card";
import { ConsignorCards } from "./consignor-cards";
import { CatchUpForm } from "./catch-up-form";
import { DropForm } from "./drop-form";
import { DropsList } from "./drops-list";
import { qty, rupiah, type Overview } from "./types";

/** The whole Titipan screen. Sales at the till are recorded as they happen; this page shows them when it is opened or reloaded. */
export function ConsignmentManager() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/consignment", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Data titipan belum bisa dimuat.");
      setData(json);
      setUpdatedAt(new Date());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const owed = data?.consignors.reduce((sum, c) => sum + Math.max(0, Number(c.balance)), 0) ?? 0;
  const onHand = data?.consignors.reduce((sum, c) => sum + Number(c.onHandUnits), 0) ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {updatedAt ? `Diperbarui ${updatedAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : "Memuat..."}
        </span>
        <button onClick={() => void load()} className="text-primary hover:underline">Muat ulang sekarang</button>
      </div>
      {error && <p className="rounded-md border border-destructive/30 bg-destructive-soft px-3 py-2 text-sm text-destructive">{error}</p>}

      <div data-tour="titipan-kpi" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard label="Total utang ke penitip" value={data ? rupiah(owed) : "-"} icon={HandCoins} tone={owed > 0 ? "warning" : "default"} />
        <KpiCard label="Barang titipan di toko (unit)" value={data ? qty(onHand) : "-"} icon={Package} />
        <KpiCard label="Jumlah penitip" value={data ? String(data.consignors.length) : "-"} icon={Users} />
      </div>

      {data && <ConsignorCards consignors={data.consignors} onChanged={load} />}
      {data && <DropForm suppliers={data.suppliers} onSaved={load} />}
      {data && <CatchUpForm suppliers={data.suppliers} onSaved={load} />}
      {data && <DropsList drops={data.drops} payments={data.payments} onChanged={load} />}
    </div>
  );
}
