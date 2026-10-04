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
      body: "Lampu hijau berarti scanner terbaca. Kalau mati, Anda masih bisa pakai kamera atau menjadikan HP sebagai scanner.",
    },
    {
      target: "cart",
      title: "Periksa sebelum bayar",
      body: "Barang yang discan masuk ke sini. Ubah jumlahnya dengan − dan +, atau tekan Hapus. Setelah dibayar, koreksi hanya bisa lewat refund.",
    },
    {
      target: "summary",
      title: "Tekan Bayar",
      body: "Pilih tunai atau non-tunai. Untuk tunai, isi uang yang diterima dan kembaliannya dihitung otomatis.",
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
      target: "price-fields",
      title: "Harga beli menentukan laporan laba",
      body: "Laba dihitung dari selisih harga beli dan harga jual. Salah di sini membuat semua laporan laba ikut salah.",
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
      target: "expense-form",
      title: "Jangan catat belanja stok di sini",
      body: "Modal barang sudah dihitung otomatis saat barangnya terjual. Mencatatnya lagi di sini membuat untung terlihat jauh lebih kecil — bahkan bisa tampak rugi padahal untung. Belanja stok masuk lewat Barang Masuk.",
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
      title: "Scan barang yang datang",
      body: "Satu per satu sambil membongkar. Barang yang belum pernah didaftarkan tidak bisa discan — daftarkan dulu di Master Produk.",
    },
    {
      target: "receiving-lines",
      title: "Isi jumlah dan harga nota ini",
      body: "Jumlah yang benar-benar diterima, bukan yang dipesan. Harga supplier sering berubah, dan laporan laba memakai harga saat barang itu masuk.",
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
      body: "Scan dulu, lalu isi jumlah hasil hitungan Anda — bukan selisihnya. Selisih dihitung sistem.",
    },
    {
      target: "opname-submit",
      title: "Butuh persetujuan",
      body: "Setelah dikirim, pemilik atau admin yang menyetujui. Penyesuaian stok tidak bisa dilakukan sendirian tanpa sepengetahuan siapa pun.",
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
