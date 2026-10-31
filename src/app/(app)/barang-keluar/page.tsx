import { redirect } from "next/navigation";
import { auth } from "@/shared/security/auth";
import { hasPermission } from "@/shared/security/permissions";
import { PageHeader } from "@/components/kios/page-header";
import { StockOutForm } from "./stock-out-form";

/** Pengeluaran Barang: goods that leave the shelf without a sale. */
export default async function BarangKeluarPage() {
  const session = await auth();
  if (!session || !hasPermission(session.user.role, "stockout.manage")) redirect("/dashboard");

  return (
    <div className="space-y-4">
      <PageHeader
        title="Barang Keluar"
        description="Catat barang dagangan yang keluar bukan karena dijual: rusak, kedaluwarsa, retur ke supplier, atau dipakai sendiri. Stok langsung berkurang dan tercatat di riwayat. Untuk peralatan toko yang rusak, ubah kondisinya di Aset Toko."
      />
      <StockOutForm />
    </div>
  );
}
