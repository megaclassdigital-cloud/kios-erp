"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Announcement } from "@/modules/announcements/announcements";

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
 * The big "what's new" window. It cannot be dismissed: every slide has to be
 * read to the last one before the button that closes it is enabled, and closing
 * it is recorded for this user, so it never comes back once completed. It then
 * opens the new page with the guided tour already running.
 */
export function AnnouncementGate() {
  const router = useRouter();
  const [queue, setQueue] = useState<Announcement[]>([]);
  const [slide, setSlide] = useState(0);
  const [reached, setReached] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/announcements", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { announcements: [] }))
      .then((d) => !cancelled && setQueue(d.announcements ?? []))
      .catch(() => undefined); // a failed check must never lock anyone out of the app
    return () => {
      cancelled = true;
    };
  }, []);

  const current = queue[0];
  if (!current) return null;

  const last = slide === current.slides.length - 1;
  const s = current.slides[slide];

  async function finish() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/announcements/ack", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: current.key }) });
      if (!res.ok) throw new Error();
      setQueue((q) => q.slice(1));
      setSlide(0);
      setReached(0);
      router.push(`${current.href}${current.startTour ? "?tour=1" : ""}`);
    } catch {
      setError("Belum tersimpan. Periksa koneksi lalu tekan lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={current.title} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 print:hidden">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-card shadow-2xl">
        <div className="bg-primary px-6 py-5 text-primary-foreground">
          <p className="text-xs font-semibold tracking-wide uppercase opacity-80">Fitur baru</p>
          <h2 className="mt-1 text-xl font-bold">{current.title}</h2>
        </div>

        <div className="min-h-56 space-y-3 px-6 py-5">
          <h3 className="text-base font-semibold text-foreground">{s.title}</h3>
          {s.body.map((line, i) => (
            <p key={i} className="text-sm leading-relaxed text-muted-foreground"><Rich text={line} /></p>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
          <div className="flex items-center gap-1.5" aria-label={`Langkah ${slide + 1} dari ${current.slides.length}`}>
            {current.slides.map((_, i) => (
              <span key={i} className={`h-2 w-2 rounded-full ${i === slide ? "bg-primary" : i <= reached ? "bg-primary/40" : "bg-muted"}`} />
            ))}
            <span className="ml-2 text-xs text-muted-foreground">{slide + 1}/{current.slides.length}</span>
          </div>
          <div className="flex items-center gap-2">
            {slide > 0 && (
              <button onClick={() => setSlide((n) => n - 1)} className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">Kembali</button>
            )}
            {!last ? (
              <button
                onClick={() => {
                  setSlide((n) => n + 1);
                  setReached((r) => Math.max(r, slide + 1));
                }}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
              >
                Lanjut
              </button>
            ) : (
              <button disabled={busy} onClick={() => void finish()} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50">
                {busy ? "Menyimpan..." : "Mengerti — buka halamannya"}
              </button>
            )}
          </div>
        </div>
        {error && <p className="px-6 pb-3 text-sm text-destructive">{error}</p>}
        <p className="border-t border-border bg-muted/40 px-6 py-2 text-[11px] text-muted-foreground">Baca sampai langkah terakhir untuk melanjutkan. Pengumuman ini hanya muncul sekali.</p>
      </div>
    </div>
  );
}
