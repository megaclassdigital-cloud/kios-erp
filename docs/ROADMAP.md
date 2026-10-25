# Kios-ERP — rencana jangka panjang (non-MVP)

Dicatat 25 Okt 2026. Isi dokumen ini adalah **rencana**, bukan fitur yang sudah
jalan. Urutan di dalam tiap bagian kira-kira urutan pengerjaan.

## 1. QRIS dinamis di kasir (Midtrans)

Tujuan: pembayaran QRIS terhubung nyata ke kasir (bukan simulasi), status
otomatis lunas lewat webhook, ada notifikasi suara "pembayaran Rp… berhasil",
dan biayanya serendah mungkin untuk warung.

Status: kode sudah ditulis dan lolos tes offline, tetapi **sengaja belum
di-commit dan belum di-deploy** supaya tidak mengganggu operasional toko.
Tersimpan terpisah di sesi kerja; belum ada di GitHub.

Yang masih harus dilakukan, dan perlu pemilik toko:
- Membuat akun Midtrans (sandbox dulu, lalu produksi dengan KYC).
- Mengizinkan akses jaringan ke `api.sandbox.midtrans.com` dan
  `simulator.sandbox.midtrans.com` di lingkungan kerja, lalu mengisi
  `MIDTRANS_SERVER_KEY` di environment (bukan di kode).
- Menguji alur di sandbox: buat QRIS, bayar lewat simulator, webhook masuk,
  transaksi menjadi lunas satu kali saja (idempotent).
- Mengatur URL webhook: `https://<domain>/api/payments/notify/midtrans`.
- Memastikan ke Midtrans biaya yang berlaku (MDR dan biaya lain) sebelum go-live.
- Baru setelah itu migrasi database dan kode dirilis.

## 2. Kategori bertingkat dengan nilai bawaan

Latar: catatan tulisan tangan pemilik membagi barang menjadi jenis (A Bahan
Makanan, B Bahan Minuman, C Perlengkapan RT) dan sub-jenis (A1 Bahan Pokok,
B1 Minuman Sachet, C2 Shampo, dst.). Kategori sekarang berupa daftar datar.

Arah yang dibahas (belum diputuskan, masih brainstorming):
- Dua level: jenis dan sub-jenis. Contoh produk bukan level kategori.
- Kategori membawa nilai bawaan yang bisa ditimpa per produk: persentase
  markup dan pembulatan harga jual, hari pengingat kedaluwarsa, stok minimum,
  satuan dan isi kemasan yang lazim.
- Kelompok belanja ("Minuman Sehat", "Pencuci piring") bukan kategori; kalau
  perlu jadi label atau urutan di layar Barang Masuk.

Pertanyaan terbuka: arti "2x" di catatan (Bumbu, Lain2); apakah markup 15% /
20% aturan tetap per jenis; apakah semua barang renteng dijual per renteng dan
per pcs.

## 3. Satuan beli dan jual (renteng, dus, pcs)

Latar: barang dibeli per renteng atau dus, dijual per pcs, kadang dengan harga
berbeda per satuan (mis. shampo sachet: 11.500 per renteng isi 12, atau 1.000
per pcs eceran).

Arah: satuan beli dengan isi per kemasan, harga beli per kemasan yang dihitung
menjadi harga per pcs, dan lebih dari satu harga jual per produk. Fondasi yang
sudah ada: barcode menyimpan satuan dan faktor konversi. Mengubah cara Barang
Masuk menghitung, jadi perlu desain hati-hati dan tes keseimbangan stok.

## 4. Keluarga produk dan varian ukuran

Latar: "Indomie Goreng 70g" dan "85g" adalah varian, bukan duplikat.

Sudah ada: pengingat kemiripan (nama, ukuran, barcode mirip) yang bisa diabaikan.
Berikutnya: lencana "N varian" per keluarga produk di Master Produk dan daftar
varian. Ukuran dibaca dari nama dulu; isian "Ukuran" terstruktur menyusul kalau
akurasinya kurang.

## 5. Pencarian barang berdasarkan nama

Pencarian sekarang hanya lewat barcode di sebagian besar layar. Rencana: kotak
pencarian nama, SKU, atau barcode dengan daftar hasil yang bisa dipilih, di
semua layar yang berhubungan dengan barang. Detail dibahas terpisah.
