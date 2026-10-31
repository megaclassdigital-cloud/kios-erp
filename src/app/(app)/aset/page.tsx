import { redirect } from "next/navigation";
import { auth } from "@/shared/security/auth";
import { hasPermission } from "@/shared/security/permissions";
import { PageHeader } from "@/components/kios/page-header";
import { AssetManager } from "./asset-manager";

/** Aset Toko: the register of the shop's long-lived equipment. */
export default async function AsetPage() {
  const session = await auth();
  if (!session || !hasPermission(session.user.role, "assets.manage")) redirect("/dashboard");

  return (
    <div className="space-y-4">
      <PageHeader
        title="Aset Toko"
        description="Catatan peralatan tahan lama milik toko: freezer, rak, timbangan, printer, dan sejenisnya."
      />
      <AssetManager />
    </div>
  );
}
