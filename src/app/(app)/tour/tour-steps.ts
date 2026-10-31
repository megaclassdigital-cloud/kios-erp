/**
 * What the guided tour says, per page.
 *
 * Pure data, kept apart from the engine that draws it, so rewording a step
 * never means touching the overlay logic — and so a step can be read and
 * checked without reading any React at all.
 *
 * `target` is matched against `[data-tour="..."]`. A step whose target is not
 * on screen is skipped rather than breaking the tour: several of these pages
 * change shape with their state (Stock Opname before and during counting,
 * Master Produk before a barcode mode is chosen), and a tour that dead-ends
 * on a missing element is worse than one that is briefly shorter.
 */
export interface TourStep {
  /** Value of the data-tour attribute on the element to spotlight. Omit to
   * show the step centred, with no highlight — used for openings. */
  target?: string;
  title: string;
  body: string;
}

export const TOURS: Record<string, TourStep[]> = {
  "/kasir": [
    {
      title: "Melayani satu pembeli",
      body: "Empat langkah: scan barangnya, periksa keranjang, tekan Bayar, selesai. Mari lihat di mana semuanya.",
    },
    {
      target: "scan-input",
      title: "Scan barangnya",
      body: "Tembakkan scanner ke barcode di kemasan. Tidak perlu klik kolom ini dulu — scan tetap tertangkap walau kursor ada di tempat lain.",
    },
    {
      target: "scan-sources",
      title: "Kalau scanner bermasalah",
      body: "Status di sini menjelaskan scanner di perangkat ini, bukan perangkat lain. Kalau belum terdeteksi, colok scanner ke perangkat ini lalu scan sekali. Kamera atau HP juga bisa dipakai sebagai scanner.",
    },
    {
      target: "name-search",
      title: "Barcode error? Cari berdasarkan nama",
      body: "Ketik sebagian nama barang, lalu pilih dari daftar. Barangnya baru masuk keranjang setelah Anda memilih — tidak ada yang masuk sendiri, jadi salah ketik tidak menambah barang yang keliru.",
    },
    {
      target: "cart",
      title: "Periksa sebelum bayar, dan beri promo",
      body: "Barang yang discan masuk ke sini. Ubah jumlahnya dengan − dan +, atau Hapus. Tombol Promo di tiap baris memotong harga dengan persen atau nominal: harga asli tetap terlihat (dicoret), lalu promo, lalu harga akhir. Setelah dibayar, koreksi hanya bisa lewat refund.",
    },
    {
      target: "summary",
      title: "Tekan Bayar",
      body: "Ringkasan menampilkan Harga awal, Promo, dan Total yang harus dibayar. Pilih tunai atau non-tunai; untuk tunai, isi uang yang diterima dan kembaliannya dihitung otomatis.",
    },
    {
      target: "close-shift",
      title: "Di akhir giliran",
      body: "Tekan Tutup Shift dan isi jumlah uang yang benar-benar ada di laci. Selisihnya tercatat untuk pemilik.",
    },
  ],

  "/master/produk": [
    {
      title: "Mendaftarkan barang baru",
      body: "Hal paling penting ada di langkah pertama. Salah di situ baru ketahuan nanti di kasir, saat pembeli sudah menunggu.",
    },
    {
      target: "barcode-step",
      title: "Lihat kemasannya dulu",
      body: "Sudah ada barcode tercetak? Pilih yang kiri lalu scan. Barang curah atau bungkus sendiri? Pilih yang kanan, sistem membuatkan.",
    },
    {
      target: "barcode-step",
      title: "Jangan buat kode untuk barang pabrikan",
      body: "Kalau kemasannya sudah punya barcode tapi Anda membuat kode sendiri, kasir akan menscan kemasan dan muncul “Barcode tidak terdaftar”.",
    },
    {
      target: "product-fields",
      title: "Nama dan SKU",
      body: "Nama muncul di struk. SKU itu kode singkat milik toko untuk pencarian cepat — bebas, asal tidak sama dengan produk lain.",
    },
    {
      target: "similar-reminder",
      title: "Pengingat kalau mirip produk lain",
      body: "Kalau nama atau barcodenya mirip produk yang sudah ada (misalnya sesama Indomie), muncul daftarnya. Kalau memang produk berbeda, centang konfirmasinya dan pengingat menutup sendiri. Barcode atau SKU yang persis sama diblokir — tambah stoknya lewat Barang Masuk.",
    },
    {
      target: "price-fields",
      title: "Harga beli menentukan laporan laba",
      body: "Laba dihitung dari selisih harga beli dan harga jual. Salah di sini membuat semua laporan laba ikut salah.",
    },
    {
      target: "damaged-field",
      title: "Barang rusak saat stok awal",
      body: "Kalau sebagian stok awal rusak, isi jumlahnya (mis. stok 45, rusak 5 → stok masuk 40). Kosongkan kalau tidak ada. Rusaknya tetap tercatat di riwayat.",
    },
    {
      target: "expiry-fields",
      title: "Tanggal kedaluwarsa",
      body: "Lihat tanggal di kemasan. Sistem akan memperingatkan kasir sebelum barang ini terlanjur terjual — dan Anda sendiri yang menentukan berapa hari sebelumnya.",
    },
    {
      target: "product-search",
      title: "Mencari produk",
      body: "Ketik namanya, atau cukup scan barcodenya. Hasilnya langsung tersaring.",
    },
    {
      target: "duplicate-check",
      title: "Cek Duplikat",
      body: "Memeriksa produk yang kemungkinan dimasukkan dua kali — barcode yang mirip dulu, lalu nama dan SKU. Hanya melaporkan; Anda yang memutuskan mana yang dipertahankan.",
    },
    {
      target: "export-buttons",
      title: "Preview sebelum download",
      body: "Preview menampilkan dokumen sebagaimana tercetak di kertas A4, lengkap dengan halaman dan total. Dari situ bisa Download Excel atau Cetak / simpan PDF.",
    },
    {
      target: "product-table",
      title: "Ubah, Riwayat, Hapus",
      body: "Ubah mengoreksi data produk (stok tidak diubah dari sini). Riwayat menampilkan semua barang masuk produk itu, dan di sana jumlah, harga, dan barang rusak bisa dikoreksi — stok ikut menyesuaikan.",
    },
  ],

  "/keuangan": [
    {
      title: "Membaca angka keuangan",
      body: "Ada tujuh angka di halaman ini. Kalau hanya mau melihat satu, ada satu yang paling penting — saya tunjukkan.",
    },
    {
      target: "period",
      title: "Pilih periodenya dulu",
      body: "Semua angka di bawah mengikuti pilihan ini. Bisa hari ini, 7 hari, 30 hari, atau rentang tanggal sendiri.",
    },
    {
      target: "kpi-grid",
      title: "Omzet bukan keuntungan",
      body: "Omzet adalah seluruh uang masuk. Di dalamnya masih ada modal barang, jadi angka besar di sini belum tentu untung besar.",
    },
    {
      target: "kpi-grid",
      title: "Untung Bersih — ini angkanya",
      body: "Omzet dikurangi modal barang, lalu dikurangi pengeluaran toko. Inilah yang benar-benar Anda bawa pulang.",
    },
    {
      target: "asset-note",
      title: "Aset toko dipisah dari angka-angka ini",
      body: "Freezer, rak, dan timbangan dicatat di menu Aset Toko. Nilainya ditampilkan di sini hanya sebagai catatan dan tidak termasuk omzet, pengeluaran, maupun untung.",
    },
    {
      target: "expense-form",
      title: "Pengeluaran: hanya biaya habis pakai",
      body: "Listrik, bensin, plastik, gaji. Belanja stok jangan dicatat di sini — modalnya sudah dihitung saat barang terjual, dan mencatatnya lagi membuat untung tampak kecil. Belanja stok lewat Barang Masuk; peralatan tahan lama lewat Aset Toko.",
    },
    {
      target: "expense-table",
      title: "Salah catat? Bisa diperbaiki",
      body: "Ubah untuk mengoreksi kategori, jumlah, tanggal, atau keterangan. Hapus untuk membuang catatan yang keliru. Kalau ternyata itu pembelian peralatan (freezer, rak), pilih Pindah ke Aset: nilainya keluar dari pengeluaran dan tercatat di Aset Toko. Semua perubahan tercatat di Audit Log.",
    },
  ],

  "/barang-masuk": [
    {
      title: "Menerima kiriman supplier",
      body: "Scan sambil membongkar barangnya. Stok bertambah otomatis setelah disimpan.",
    },
    {
      target: "supplier-invoice",
      title: "Supplier dan nomor nota",
      body: "Isi dari nota yang dibawa supplier, supaya nanti bisa dicocokkan kalau ada selisih.",
    },
    {
      target: "receiving-scan",
      title: "Scan, atau cari berdasarkan nama",
      body: "Scan satu per satu sambil membongkar. Barcode tidak terbaca? Ketik sebagian nama di kolom bawahnya lalu pilih dari daftar. Barang yang belum pernah didaftarkan tidak bisa dipilih — daftarkan dulu di Master Produk. Barang yang sudah ada tidak perlu didaftarkan lagi, cukup ditambah stoknya di sini.",
    },
    {
      target: "receiving-lines",
      title: "Isi jumlah, rusak, dan harga nota ini",
      body: "Qty Diterima adalah yang benar-benar datang. Kalau ada yang rusak, isi kolom Rusak (kosongkan kalau tidak ada): diterima 45, rusak 5 → masuk stok 40. Harga supplier sering berubah, dan laporan laba memakai harga saat barang itu masuk.",
    },
    {
      target: "receiving-history",
      title: "Riwayat, koreksi, dan Preview",
      body: "Semua tambahan stok tercatat di sini, termasuk stok awal dan opname. Ubah atau Hapus untuk mengoreksi (stok ikut menyesuaikan, jumlah rusak juga bisa diubah). Tombol Preview menampilkan dokumen A4 sebelum Anda mengunduhnya.",
    },
  ],

  "/stok-opname": [
    {
      title: "Mencocokkan stok dengan rak",
      body: "Satu aturan sebelum mulai: hitung fisiknya dulu, jangan lihat angka sistem.",
    },
    {
      target: "opname-start",
      title: "Mulai dari sini",
      body: "Begitu ditekan, Anda bisa mulai menghitung. Stok belum berubah sampai hasilnya disetujui.",
    },
    {
      target: "opname-scan",
      title: "Scan barang yang dihitung",
      body: "Scan dulu (atau cari berdasarkan nama kalau barcode tidak terbaca), lalu isi jumlah hasil hitungan Anda — bukan selisihnya. Selisih dihitung sistem.",
    },
    {
      target: "opname-submit",
      title: "Butuh persetujuan",
      body: "Setelah dikirim, pemilik atau admin yang menyetujui. Penyesuaian stok tidak bisa dilakukan sendirian tanpa sepengetahuan siapa pun.",
    },
  ],

  "/barang-keluar": [
    {
      title: "Barang dagangan yang keluar bukan karena dijual",
      body: "Rusak, kedaluwarsa, retur ke supplier, atau dipakai sendiri. Stok langsung berkurang dan tercatat. Peralatan toko yang rusak bukan di sini — ubah kondisinya di Aset Toko.",
    },
    {
      target: "stockout-form",
      title: "Pilih barang, jumlah, dan alasan",
      body: "Cari barangnya berdasarkan nama atau scan, isi jumlah yang keluar, lalu pilih alasan. Alasan Lainnya wajib diberi catatan. Jumlah tidak bisa melebihi stok yang ada.",
    },
    {
      target: "stockout-history",
      title: "Riwayat barang keluar",
      body: "Setiap pengeluaran tercatat dengan alasan dan siapa yang mencatat. Pilih periodenya di pojok kanan atas.",
    },
  ],

  "/aset": [
    {
      title: "Mencatat peralatan toko",
      body: "Halaman ini untuk barang tahan lama milik toko — freezer, rak, timbangan, printer. Bukan stok dagangan, dan bukan pengeluaran harian.",
    },
    {
      target: "asset-guide",
      title: "Pilih tempat yang tepat",
      body: "Barang dagangan lewat Barang Masuk. Biaya habis pakai lewat Keuangan. Peralatan tahan lama di halaman ini. Barang dagangan rusak lewat Barang Keluar.",
    },
    {
      target: "asset-kpi",
      title: "Rekap aset",
      body: "Jumlah unit, nilai perolehan (harga beli × jumlah), dan unit yang rusak atau perlu perbaikan. Aset yang sudah dijual atau hilang tetap tampil di daftar tetapi tidak dihitung.",
    },
    {
      target: "asset-categories",
      title: "Kategori bisa diubah di sini",
      body: "Tambah kategori baru, ubah namanya (semua asetnya ikut), atau hapus yang tidak terpakai. Kategori yang masih dipakai aset tidak bisa dihapus.",
    },
    {
      target: "asset-form",
      title: "Tambah aset",
      body: "Isi nama, kategori, jumlah, harga beli per unit, tanggal beli, dan kondisi. Nilainya dihitung otomatis dan tidak mengubah stok maupun untung.",
    },
    {
      target: "asset-table",
      title: "Ubah, hapus, dan jejaknya",
      body: "Ubah kondisi saat aset rusak, dijual, atau hilang — itu lebih baik daripada menghapus, karena riwayatnya tetap terlihat. Kolom Terakhir diubah menunjukkan siapa dan kapan.",
    },
    {
      target: "asset-export",
      title: "Preview dan Excel",
      body: "Cari atau saring daftar, lalu Preview untuk melihat dokumen A4 sebelum mengunduh Excel.",
    },
  ],
};

/** Longest matching path wins, so /master/produk is not shadowed by /master. */
export function tourFor(pathname: string): TourStep[] | null {
  const key = Object.keys(TOURS)
    .filter((k) => pathname === k || pathname.startsWith(k + "/"))
    .sort((a, b) => b.length - a.length)[0];
  return key ? TOURS[key] : null;
}
