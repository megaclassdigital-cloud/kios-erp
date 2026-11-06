"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Megaphone } from "lucide-react";
import { nextToShow, type Announcement } from "@/modules/announcements/announcements";
import { markSeenOnDevice, seenOnDevice } from "./announcement-state";

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
 *  - It appears when a page is loaded or refreshed, once per device. A device
 *    that has already shown it never shows it again.
 *  - It cannot be dismissed: the slides lead to the guided tutorial, which opens
 *    on the new page by itself.
 *  - Nothing polls: it does not appear under someone in the middle of a sale.
 */
export function AnnouncementGate() {
  const router = useRouter();
  const [current, setCurrent] = useState<Announcement | null>(null);
  const [slide, setSlide] = useState(0);

  // Once per page load. The layout stays mounted while moving between pages,
  // so this does not run again until the page is reloaded.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/announcements", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { announcements: [] }))
      .then((d) => {
        if (!cancelled) setCurrent(nextToShow<Announcement>(d.announcements ?? [], seenOnDevice()));
      })
      .catch(() => undefined); // a failed check must never lock anyone out of the app
    return () => {
      cancelled = true;
    };
  }, []);

  if (!current) return null;

  const last = slide === current.slides.length - 1;
  const s = current.slides[slide];

  /** Read to the end: remember it on this device (and on the server, as a record), then open the tutorial. */
  function startTutorial() {
    if (!current) return;
    markSeenOnDevice(current.key);
    void fetch("/api/announcements/ack", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: current.key }) }).catch(() => undefined);
    const { href, startTour } = current;
    setCurrent(null);
    setSlide(0);
    router.push(`${href}${startTour ? "?tour=1" : ""}`);
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
        <p className="mt-4 text-[11px] text-muted-foreground">Pengumuman ini hanya muncul sekali di perangkat ini.</p>
      </div>
    </div>
  );
}
