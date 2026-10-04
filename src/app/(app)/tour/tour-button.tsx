"use client";

import { HelpCircle } from "lucide-react";
import { useTour } from "./tour-provider";

/**
 * The "?" in the header. Hidden on pages that have no tour, so it never
 * promises help that turns out to be an empty dialog.
 */
export function TourButton() {
  const { available, running, start, stop } = useTour();

  if (!available) return null;

  return (
    <button
      type="button"
      onClick={running ? stop : start}
      aria-pressed={running}
      title={running ? "Tutup panduan" : "Panduan halaman ini"}
      aria-label={running ? "Tutup panduan" : "Panduan halaman ini"}
      className={`flex h-9 w-9 items-center justify-center rounded-full outline-none transition-colors ${
        running
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      <HelpCircle className="h-5 w-5" />
    </button>
  );
}
