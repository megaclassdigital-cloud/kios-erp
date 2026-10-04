import { HelpPanel, HelpStep } from "@/components/kios/help-panel";

/** Kept out of pos-terminal.tsx, which is already the largest file in the
 * app — the POS screen gains one import and one line instead of another
 * screenful of copy. */
export function KasirHelp() {
  return (
    <HelpPanel id="kasir" title="Panduan kasir">
      <HelpStep n={1}>
        <strong className="text-foreground">Langsung scan saja.</strong> Tidak perlu mengklik kolom
        barcode dulu — selama Anda berada di halaman ini, tembakan scanner akan tertangkap walau
        kursor sedang di tombol lain.
      </HelpStep>
      <HelpStep n={2}>
        <strong className="text-foreground">Barcode tidak terbaca?</strong> Ketik angkanya di kolom
        SCAN BARCODE lalu tekan Enter. Bisa juga pakai kamera, atau pasangkan HP lewat DEVICE
        SCANNER.
      </HelpStep>
      <HelpStep n={3}>
        Kalau muncul <em>&ldquo;Barcode tidak terdaftar&rdquo;</em>, berarti produknya belum
        didaftarkan. Daftarkan dulu di <strong className="text-foreground">Master Produk</strong> —
        jangan diakali dengan produk lain yang harganya mirip, karena stok dan laporan laba akan
        ikut salah.
      </HelpStep>
      <HelpStep n={4}>
        <strong className="text-foreground">Peringatan stok menipis muncul saat scan</strong>, bukan
        saat bayar. Jadi Anda masih sempat mengecek rak sebelum transaksi selesai.
      </HelpStep>
      <HelpStep n={5}>
        Periksa jumlah di keranjang sebelum menekan <strong className="text-foreground">Bayar</strong>.
        Setelah dibayar, koreksi hanya bisa lewat refund di halaman Transaksi.
      </HelpStep>
      <HelpStep n={6}>
        Di akhir giliran, tekan <strong className="text-foreground">Tutup Shift</strong> dan isi
        jumlah uang kas yang benar-benar ada di laci. Selisihnya tercatat untuk pemilik.
      </HelpStep>
    </HelpPanel>
  );
}
