"use client";

import { useCallback, useEffect, useState } from "react";
import { OpenShiftForm } from "./open-shift-form";
import { PosTerminal } from "./pos-terminal";
import type { OpenShift } from "./types";

export default function KasirPage() {
  const [shift, setShift] = useState<OpenShift | null | undefined>(undefined);

  const loadShift = useCallback(async () => {
    const res = await fetch("/api/pos/shifts/current");
    const data = await res.json().catch(() => ({}));
    setShift(data.shift ?? null);
  }, []);

  useEffect(() => {
    loadShift();
  }, [loadShift]);

  if (shift === undefined) {
    return <p className="text-sm text-muted-foreground">Memuat...</p>;
  }

  if (shift === null) {
    return <OpenShiftForm onOpened={loadShift} />;
  }

  return <PosTerminal shift={shift} onShiftClosed={() => setShift(null)} />;
}
