"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { X } from "lucide-react";
import { useTour } from "./tour-provider";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 6;
const CARD_WIDTH = 320;
const GAP = 12;

/**
 * Draws the tour: a dimmed page with a hole cut around the step's target,
 * and a card explaining it.
 *
 * The hole is one element with a very large spread box-shadow rather than
 * four dimming panels or an SVG mask — it stays a single rectangle to
 * position, so it cannot drift out of alignment with itself on a resize.
 */
export function TourOverlay() {
  const { running, steps, index, next, back, stop } = useTour();
  const step = running ? steps[index] : undefined;
  const [rect, setRect] = useState<Rect | null>(null);

  // Measure before paint so the spotlight never appears in the wrong place
  // for a frame, and keep measuring while the step is open: the page can
  // reflow underneath it (an image loads, a toast pushes content down).
  useLayoutEffect(() => {
    if (!step) {
      setRect(null);
      return;
    }
    if (!step.target) {
      setRect(null);
      return;
    }

    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    if (!el) {
      setRect(null);
      return;
    }

    el.scrollIntoView({ block: "center", behavior: "smooth" });

    function measure() {
      const r = el!.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    }
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    const settle = setInterval(measure, 250);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
      clearInterval(settle);
    };
  }, [step]);

  // A step whose element is not on this page is skipped rather than shown
  // with nothing highlighted — these pages change shape with their state.
  useEffect(() => {
    if (!step?.target) return;
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (!el) next();
  }, [step, next]);

  if (!running || !step) return null;

  const isLast = index === steps.length - 1;
  const position = cardPosition(rect);

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Panduan">
      {/* The cut-out. Clicking the dim area does nothing on purpose: the way
          out is Lewati or Escape, so a mis-click never loses someone's place. */}
      {rect ? (
        <div
          className="pointer-events-none absolute rounded-lg ring-2 ring-primary transition-all duration-200"
          style={{
            top: rect.top - PADDING,
            left: rect.left - PADDING,
            width: rect.width + PADDING * 2,
            height: rect.height + PADDING * 2,
            boxShadow: "0 0 0 9999px rgba(11, 23, 57, 0.55)",
          }}
        />
      ) : (
        <div className="absolute inset-0" style={{ background: "rgba(11, 23, 57, 0.55)" }} />
      )}

      <div
        className="absolute w-[320px] max-w-[calc(100vw-24px)] rounded-xl border border-border bg-card p-4 shadow-xl"
        style={position}
      >
        <div className="flex items-start gap-2">
          <p className="min-w-0 flex-1 text-sm font-semibold text-foreground">{step.title}</p>
          <button
            onClick={stop}
            aria-label="Tutup panduan"
            className="-mt-1 -mr-1 shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.body}</p>

        <div className="mt-4 flex items-center gap-2">
          <div className="flex flex-1 items-center gap-1" aria-hidden>
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-4 bg-primary" : "w-1.5 bg-border-strong"
                }`}
              />
            ))}
          </div>

          <span className="text-[11px] text-muted-foreground tabular-nums">
            {index + 1}/{steps.length}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={stop}
            className="rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
          >
            Lewati
          </button>
          <div className="ml-auto flex gap-2">
            {index > 0 && (
              <button
                onClick={back}
                className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
              >
                Kembali
              </button>
            )}
            <button
              onClick={next}
              className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
            >
              {isLast ? "Selesai" : "Lanjut"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Below the target when there is room, above when there is not, centred when
 * there is no target at all. Clamped to the viewport so the card is never
 * half off-screen on a phone. */
function cardPosition(rect: Rect | null): React.CSSProperties {
  if (typeof window === "undefined") return {};
  if (!rect) {
    return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  }

  const spaceBelow = window.innerHeight - (rect.top + rect.height);
  const estimatedHeight = 210;
  const below = spaceBelow > estimatedHeight + GAP;

  const top = below
    ? rect.top + rect.height + GAP
    : Math.max(GAP, rect.top - estimatedHeight - GAP);

  const rawLeft = rect.left + rect.width / 2 - CARD_WIDTH / 2;
  const left = Math.min(Math.max(GAP, rawLeft), Math.max(GAP, window.innerWidth - CARD_WIDTH - GAP));

  return { top, left };
}
