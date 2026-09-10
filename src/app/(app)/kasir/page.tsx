import { auth } from "@/shared/security/auth";
import { GetCurrentShiftUseCase } from "@/modules/pos/application/get-current-shift-use-case";
import { KasirClient } from "./kasir-client";
import type { OpenShift } from "./types";

/** Fetches the open shift server-side so the page arrives with it already
 * known — no client mount -> useEffect -> fetch waterfall before the POS
 * terminal (or the open-shift form) can render. */
export default async function KasirPage() {
  const session = await auth();
  const shift = session ? await new GetCurrentShiftUseCase().execute(session.user.id) : null;

  const initialShift: OpenShift | null = shift
    ? {
        id: shift.id,
        openingCash: shift.openingCash.toString(),
        openedAt: shift.openedAt.toISOString(),
      }
    : null;

  return <KasirClient initialShift={initialShift} />;
}
