"use client";

import { useEffect, useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

const STORAGE_PREFIX = "kios-erp.help.";

/**
 * Collapsible "Panduan" box for the top of a page.
 *
 * Open the first time someone lands on a page and collapsed once they close
 * it — a shopkeeper who already knows the screen should not have to scroll
 * past an explanation every day, and someone who has never seen it should
 * not have to go looking for one.
 *
 * The dismissal is a per-browser convenience, so localStorage is the right
 * home for it: losing it just means the panel opens once more. Every access
 * is guarded because storage throws in a private window.
 */
export function HelpPanel({
  id,
  title = "Panduan",
  children,
}: {
  id: string;
  title?: string;
  children: React.ReactNode;
}) {
  // Starts closed and opens after mount when it has not been dismissed:
  // server and client agree on the first render, and a first-time visitor
  // sees the panel appear rather than a long one vanishing under them.
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_PREFIX + id) !== "dismissed") setOpen(true);
    } catch {
      setOpen(true);
    }
  }, [id]);

  function toggle() {
    const next = !open;
    setOpen(next);
    try {
      if (next) window.localStorage.removeItem(STORAGE_PREFIX + id);
      else window.localStorage.setItem(STORAGE_PREFIX + id, "dismissed");
    } catch {
      // Remembering the choice is optional; collapsing it now is not.
    }
  }

  return (
    <section className="rounded-xl border border-info/30 bg-info-soft/50">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
      >
        <HelpCircle className="h-4 w-4 shrink-0 text-info" />
        <span className="flex-1 text-sm font-semibold text-foreground">{title}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="space-y-2 px-4 pb-4 text-sm text-muted-foreground">{children}</div>}
    </section>
  );
}

/** A numbered step inside a HelpPanel — keeps the counter, spacing and
 * emphasis identical across every page's guide. */
export function HelpStep({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-info text-[11px] font-semibold text-info-foreground">
        {n}
      </span>
      <p className="min-w-0 flex-1 leading-relaxed">{children}</p>
    </div>
  );
}
