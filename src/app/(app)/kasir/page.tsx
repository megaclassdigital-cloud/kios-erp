"use client";

import { useCallback, useEffect, useState } from "react";
import { OpenShiftForm } from "./open-shift-form";
import { PosTerminal } from "./pos-terminal";

export default function KasirPage() {
  const [shiftId, setShiftId] = useState<string | null | undefined>(undefined);

  const loadShift = useCallback(async () => {
    const res = await fetch("/api/pos/shifts/current");
    const data = await res.json().catch(() => ({}));
    setShiftId(data.shift?.id ?? null);
  }, []);

  useEffect(() => {
    loadShift();
  }, [loadShift]);

  if (shiftId === undefined) {
    return <p className="text-sm text-gray-500">Memuat...</p>;
  }

  if (shiftId === null) {
    return <OpenShiftForm onOpened={loadShift} />;
  }

  return <PosTerminal shiftId={shiftId} onShiftClosed={() => setShiftId(null)} />;
}
