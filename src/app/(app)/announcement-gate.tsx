"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Megaphone } from "lucide-react";
import { nextToShow, type Announcement } from "@/modules/announcements/announcements";
import { useAutoRefresh } from "@/shared/ui/use-auto-refresh";
import { markTourPending, pendingTourKey } from "./announcement-state";

/** **bold** in a slide's text, nothing else: the copy is ours, so this is all the markup it needs. */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
        part.startsWith("**") ? <b key={i} className="text-foreground">{part.slice(2, -2)}</b> : <span key={i}>{part}</span>
      )}
    </>
  );
}

/**
 * The "what's new" box: a centred card over a dimmed screen, big icon, title,
 * text and a button, in the style of a confirmation dialog.
 *
 *  - It appears by itself, on every open screen, within a few seconds of an
 *    announcement being published: the app asks the server every 5 seconds
 *    (and the moment a tab regains focus), so nobody has to reload.
 *  - It cannot be dismissed. Reading the slides leads to the tutorial, and only
 *    finishing the tutorial records it as done for that person. Quit the
 *    tutorial early and the box returns on the next reload.
 */
export function AnnouncementGate() {
  const router = useRouter();
  const [current, setCurrent] = useState<Announcement | null>(null);
  const [slide, setSlide] = useState(0);
  // Announcements whose tutorial was started in this page session and not finished yet.
  const inProgress = useRef<Set<string>>(new Set());

  const check = useCallback(async () => {
    try {
      const res = await fetch("/api/announcements", { cache: "no-store" });
      if (!res.ok) return; // a failed check must never lock anyone out of the app
      const data = await res.json();
      const wanted = pendingTourKey();
      if (wanted) inProgress.current.add(wanted);
      const next = nextToShow<Announcement>(data.announcements ?? [], inProgress.current);
      // Keep the one on screen (and the slide being read) as it is; only open a new one.
      setCurrent((shown) => shown ?? next);
    } catch {
      // Offline for a moment: the next check will catch up.
    }
  }, []);

  useAutoRefresh(check, 5_000);
  // The first check should not wait five seconds.
  useEffect(() => {
    void check();
  }, [check]);

  if (!current) return null;

  const last = slide === current.slides.length - 1;
  const s = current.slides[slide];

  function startTutorial() {
    if (!current) return;
    markTourPending(current.key);
    inProgress.current.add(current.key);
    const href = current.href;
    setCurrent(null);
    setSlide(0);
    router.push(`${href}${current.startTour ? "?tour=1" : ""}`);
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={current.title} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 print:hidden">
      <div className="w-full max-w-md rounded-lg bg-card px-6 pt-8 pb-6 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border-4 border-primary/25">
          <Megaphone className="h-9 w-9 text-primary" />
        </div>

        <p className="text-xs font-semibold tracking-wide text-primary uppercase">{current.title}</p>
        <h2 className="mt-2 text-2xl font-semibold text-foreground">{s.title}</h2>
        <div className="mt-3 min-h-24 space-y-2">
          {s.body.map((line, i) => (
            <p key={i} className="text-sm leading-relaxed text-muted-foreground"><Rich text={line} /></p>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5" aria-label={`Langkah ${slide + 1} dari ${current.slides.length}`}>
          {current.slides.map((_, i) => (
            <span key={i} className={`h-2 w-2 rounded-full ${i === slide ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        <div className="mt-5 flex items-center justify-center gap-3">
          {slide > 0 && (
            <button onClick={() => setSlide((n) => n - 1)} className="rounded-md border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted">
              Kembali
            </button>
          )}
          {!last ? (
            <button onClick={() => setSlide((n) => n + 1)} className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow hover:bg-primary-hover">
              Lanjut
            </button>
          ) : (
            <button onClick={startTutorial} className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow hover:bg-primary-hover">
              Lihat tutorial
            </button>
          )}
        </div>
        <p className="mt-4 text-[11px] text-muted-foreground">Wajib dibaca sampai tutorial selesai.</p>
      </div>
    </div>
  );
}
