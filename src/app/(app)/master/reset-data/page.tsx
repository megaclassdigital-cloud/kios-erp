import { redirect } from "next/navigation";
import { auth } from "@/shared/security/auth";
import { hasPermission } from "@/shared/security/permissions";
import { PageHeader } from "@/components/kios/page-header";
import { ResetForm } from "./reset-form";

/** Owner-only. The server decides who gets here; the form only asks. */
export default async function ResetDataPage() {
  const session = await auth();
  if (!session || !hasPermission(session.user.role, "data.reset")) redirect("/dashboard");

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reset Data Transaksi"
        description="Hapus data kasir dan transaksi hasil simulasi sebelum toko mulai berjualan sungguhan."
      />
      <ResetForm />
    </div>
  );
}
