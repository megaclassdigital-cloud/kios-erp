"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RefundButton({ saleId }: { saleId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRefund() {
    if (!window.confirm("Refund transaksi ini? Stok akan dikembalikan.")) return;
    setLoading(true);
    const res = await fetch(`/api/transactions/${saleId}/refund`, { method: "POST" });
    setLoading(false);
    if (res.ok) router.refresh();
    else {
      const data = await res.json().catch(() => ({}));
      window.alert(data.error ?? "Gagal melakukan refund.");
    }
  }

  return (
    <button onClick={handleRefund} disabled={loading} className="text-xs text-red-600 hover:underline disabled:opacity-50">
      {loading ? "..." : "Refund"}
    </button>
  );
}
