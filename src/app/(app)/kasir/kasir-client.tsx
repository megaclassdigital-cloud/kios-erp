"use client";

import { useState } from "react";
import { OpenShiftForm } from "./open-shift-form";
import { PosTerminal } from "./pos-terminal";
import type { OpenShift } from "./types";

/** Holds the open/no-shift state client-side, seeded from the server so
 * there's no fetch before first paint — opening/closing a shift updates
 * this state directly from that action's own response, never a
 * redundant re-fetch of "current shift". */
export function KasirClient({ initialShift }: { initialShift: OpenShift | null }) {
  const [shift, setShift] = useState<OpenShift | null>(initialShift);

  if (!shift) {
    return <OpenShiftForm onOpened={setShift} />;
  }

  return <PosTerminal shift={shift} onShiftClosed={() => setShift(null)} />;
}
