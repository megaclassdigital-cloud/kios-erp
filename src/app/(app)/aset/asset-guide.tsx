import Link from "next/link";

/** The three places money and goods can be recorded, and which one a purchase belongs in. The question
 * this page answers before anyone fills in a form. */
export function AssetGuide() {
  return (
    <div data-tour="asset-guide" className="rounded-xl border border-border bg-card p-3 text-sm shadow-sm">
      <p className="mb-2 text-xs font-semibold text-muted-foreground">MAU CATAT APA? PILIH TEMPATNYA</p>
      <ul className="space-y-1.5 text-foreground">
        <li>
          <b>Barang untuk dijual</b> (beras, minyak, sabun) → menu{" "}
          <Link href="/barang-masuk" className="text-primary hover:underline">Barang Masuk</Link>. Menambah stok.
        </li>
        <li>
          <b>Biaya habis pakai</b> (listrik, bensin, plastik, label harga, gaji) → menu{" "}
          <Link href="/keuangan" className="text-primary hover:underline">Keuangan</Link>, bagian Tambah Pengeluaran. Mengurangi untung bulan itu.
        </li>
        <li>
          <b>Peralatan tahan lama</b> (freezer, rak, timbangan, printer) → <b>di halaman ini</b>. Tidak mengubah stok, tidak mengurangi untung.
        </li>
        <li>
          <b>Barang dagangan yang rusak atau kedaluwarsa</b> → menu{" "}
          <Link href="/barang-keluar" className="text-primary hover:underline">Barang Keluar</Link>. <b>Peralatan yang rusak</b> → cukup ubah Kondisi-nya di sini.
        </li>
      </ul>
    </div>
  );
}
