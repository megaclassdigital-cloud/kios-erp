import { redirect } from "next/navigation";
import { auth } from "@/shared/security/auth";
import { hasPermission } from "@/shared/security/permissions";
import { PageHeader } from "@/components/kios/page-header";
import { ConsignmentManager } from "./consignment-manager";

/** Barang Titipan: goods a sales rep leaves to be sold for them. */
export default async function TitipanPage() {
  const session = await auth();
  if (!session || !hasPermission(session.user.role, "consignment.manage")) redirect("/dashboard");

  return (
    <div className="space-y-4">
      <PageHeader
        title="Barang Titipan"
        description="Barang yang dititipkan sales untuk dijual di toko. Toko berutang hanya untuk yang terjual, sebesar harga titip; sisanya diretur."
      />
      <ConsignmentManager />
    </div>
  );
}
