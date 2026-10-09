"use client";

import { useState } from "react";
import { HelpCircle, Laptop, ShieldCheck, Users } from "lucide-react";

/**
 * Asked right after every successful login: is this a device only the user
 * (or their team) uses? "Ya" keeps the login; "Tidak" signs out when the tab
 * or browser is closed. The "?" explains why, because the safe answer on a
 * shared computer is not obvious to someone in a hurry at the counter.
 */
export function DevicePrompt({
  busy,
  error,
  onChoose,
}: {
  busy: boolean;
  error: string | null;
  onChoose: (permanent: boolean) => void;
}) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="device-prompt-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-xl bg-white p-6 shadow-xl">
        {/* Watermark: faint, diagonal, behind the content, never in the way
            of a click. */}
        <span
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 text-center text-3xl font-bold leading-tight whitespace-nowrap text-gray-900/[0.04] select-none"
        >
          Asisten Pribadi
          <br />
          Farrel
        </span>

        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <Laptop className="h-5 w-5 text-blue-600" />
              <h2 id="device-prompt-title" className="text-base font-semibold text-gray-900">
                Apakah ini perangkat permanen Anda?
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowHelp((v) => !v)}
              aria-expanded={showHelp}
              aria-label="Penjelasan pilihan perangkat"
              title="Apa bedanya?"
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                showHelp ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              <HelpCircle className="h-5 w-5" />
            </button>
          </div>

          <p className="mt-2 text-sm text-gray-600">
            Pilih <b>Ya</b> hanya bila HP, tablet, atau komputer ini milik Anda atau toko dan tidak dipakai orang lain.
          </p>

          {showHelp && (
            <div className="mt-3 space-y-3 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs leading-relaxed text-gray-700">
              <div className="flex gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                <p>
                  <b>Ya, perangkat permanen:</b> Anda tetap masuk sampai 30 hari atau sampai menekan Keluar, jadi tidak perlu
                  login berulang di perangkat ini.
                </p>
              </div>
              <div className="flex gap-2">
                <Users className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                <p>
                  <b>Tidak, perangkat bersama atau pinjaman:</b> Anda otomatis keluar begitu tab atau browser ditutup, sehingga
                  orang berikutnya tidak bisa membuka akun Anda.
                </p>
              </div>
              <p>
                <b>Mengapa penting:</b> akun ini memuat omzet, stok, harga modal, dan data keuangan toko. Bila perangkat
                bersama tetap masuk, siapa pun yang memakainya setelah Anda bisa melihat bahkan mengubah data itu atas nama
                Anda. <b>Bila ragu, pilih Tidak.</b>
              </p>
            </div>
          )}

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => onChoose(false)}
              className="rounded-md border border-gray-300 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
            >
              Tidak
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onChoose(true)}
              className="rounded-md bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {busy ? "Memproses..." : "Ya"}
            </button>
          </div>

          <p className="mt-5 border-t border-gray-100 pt-3 text-center text-[11px] italic text-gray-400">
            Catatan dari Asisten Pribadi Farrel: menjaga akun berarti menjaga data toko.
          </p>
        </div>
      </div>
    </div>
  );
}
