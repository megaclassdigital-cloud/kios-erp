"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { tourFor, type TourStep } from "./tour-steps";

interface TourContextValue {
  /** Whether this page has a tour at all — the "?" button hides otherwise,
   * rather than offering help that turns out to be empty. */
  available: boolean;
  running: boolean;
  steps: TourStep[];
  index: number;
  start: () => void;
  stop: () => void;
  next: () => void;
  back: () => void;
}

const TourContext = createContext<TourContextValue | null>(null);

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used inside <TourProvider>");
  return ctx;
}

/**
 * Holds the tour state for the current page.
 *
 * Opt-in on purpose: it only runs when someone presses the "?" in the header.
 * The previous approach — a panel of text permanently at the top of five
 * pages — meant everyone paid for the explanation every day, including the
 * cashier who has used the till for a month.
 */
export function TourProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const steps = useMemo(() => tourFor(pathname ?? "") ?? [], [pathname]);
  const [running, setRunning] = useState(false);
  const [index, setIndex] = useState(0);

  // Leaving the page ends the tour. Its steps point at elements that no
  // longer exist, so carrying it across a navigation would spotlight nothing.
  useEffect(() => {
    setRunning(false);
    setIndex(0);
  }, [pathname]);

  const stop = useCallback(() => setRunning(false), []);

  const start = useCallback(() => {
    if (steps.length === 0) return;
    setIndex(0);
    setRunning(true);
  }, [steps.length]);

  const next = useCallback(() => {
    setIndex((i) => {
      if (i + 1 >= steps.length) {
        setRunning(false);
        return 0;
      }
      return i + 1;
    });
  }, [steps.length]);

  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  // Escape is the universal "let me out", and a tour that traps someone is
  // worse than no tour.
  useEffect(() => {
    if (!running) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setRunning(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running]);

  const value = useMemo(
    () => ({ available: steps.length > 0, running, steps, index, start, stop, next, back }),
    [steps, running, index, start, stop, next, back]
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}
