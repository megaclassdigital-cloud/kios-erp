import type { Permission } from "@/shared/security/permissions";

export interface AnnouncementSlide {
  title: string;
  body: string[];
}

export interface Announcement {
  /** Never reused: what a device has shown is remembered under this key. */
  key: string;
  title: string;
  /** Who needs to know. Undefined: everyone signed in. */
  permission?: Permission;
  slides: AnnouncementSlide[];
  /** Where "Buka halaman" leads once every slide has been read. */
  href: string;
  /** Starts the page's guided tour on arrival. */
  startTour?: boolean;
}

/** New features worth stopping everyone for. Newest last; each shows once per device. */
export const ANNOUNCEMENTS: Announcement[] = [
  {
    key: "titipan-v2",
    title: "Fitur baru: Barang Titipan",
    permission: "consignment.manage",
    href: "/titipan",
    startTour: true,
    slides: [
      {
        title: "Barang titipan sekarang tercatat rapi",
        body: [
          "Kalau ada sales yang menitipkan barang di toko dengan jumlah dan harga patokan dia, sekarang catat lewat menu **Titipan**.",
          "Stoknya masuk seperti barang lain dan bisa langsung dijual di kasir. Bedanya, toko hanya berutang untuk **barang yang terjual**, sebesar harga titip.",
        ],
      },
      {
        title: "Langkah 1 — tandai barangnya di Master Produk",
        body: [
          "Di form produk ada pilihan **Barang titipan** dan **Penitip**. Isi harga beli dengan harga patokan sales.",
          "Barang titipan tidak diisi stok awal dan tidak lewat **Barang Masuk**. Stoknya hanya bertambah lewat menu Titipan, supaya utang ke sales tidak tercampur.",
        ],
      },
      {
        title: "Langkah 2 — catat saat sales menitipkan",
        body: [
          "Di menu **Titipan**, pilih penitip, cari barangnya, isi jumlah dan harga titip, lalu simpan.",
          "Stok bertambah, riwayatnya muncul juga di Barang Masuk dengan label **Titipan**, dan harga titip menjadi modal barang itu saat terjual.",
        ],
      },
      {
        title: "Langkah 3 — retur sisa, dan bayar yang terjual",
        body: [
          "Barang yang tidak laku dikembalikan lewat tombol **Retur**. Stok berkurang dan tercatat.",
          "Kartu tiap penitip menampilkan **utang** (terjual × harga titip − yang sudah dibayar). Bayar lewat **Bayar penitip**. Ini bukan pengeluaran: modalnya sudah dihitung saat barang terjual, jadi untung tidak terhitung dua kali.",
        ],
      },
      {
        title: "Angkanya selalu terbaru",
        body: [
          "Halaman Titipan menyegarkan diri otomatis (sekitar tiap 15 detik dan saat Anda kembali ke tab ini), jadi penjualan di kasir langsung terlihat sebagai penambahan utang.",
          "Tekan **Lihat tutorial**: halaman Titipan terbuka dengan panduan langkah demi langkah. Tombol **?** di pojok kanan atas bisa dipakai kapan saja.",
        ],
      },
    ],
  },
];

/** The announcements this role should see, minus the keys already completed. */
export function pendingAnnouncements(opts: { has: (p: Permission) => boolean; done: Set<string> }): Announcement[] {
  return ANNOUNCEMENTS.filter((a) => !opts.done.has(a.key) && (!a.permission || opts.has(a.permission)));
}

/** The first announcement this device has not shown yet, or none. */
export function nextToShow<T extends { key: string }>(fromServer: T[], seenOnDevice: ReadonlySet<string>): T | null {
  return fromServer.find((a) => !seenOnDevice.has(a.key)) ?? null;
}
