# Daftar API (`src/app/api`)

Dijaga oleh tes `src/docs-consistency.test.ts`: setiap route di kode harus ada di tabel ini dengan metode dan izin yang sama. Tambah/ubah/hapus route → perbarui baris ini di commit yang sama.

Izin kosong = tidak memanggil `requireSession` langsung (publik, atau diperiksa lewat sesi lain/NextAuth). Nama izin: `src/shared/security/permissions.ts`. Parameter `format=` pada endpoint ekspor: `preview|xlsx|pdf|csv` (`src/shared/export/export-response.ts`).

| Route | Metode | Izin | Fungsi |
|---|---|---|---|
| `/api/admin/reset-transactions` | GET,POST | data.reset | Hapus data kasir/transaksi (pratinjau GET, eksekusi POST). Hanya OWNER. |
| `/api/announcements/ack` | POST | - | Tandai pengumuman sudah dilihat di perangkat ini |
| `/api/announcements` | GET | - | Daftar pengumuman aktif |
| `/api/assets/[id]` | PATCH,DELETE | assets.manage | Ubah/hapus aset |
| `/api/assets/categories/[id]` | PATCH,DELETE | assets.manage | Ubah/hapus kategori aset |
| `/api/assets/categories` | POST | assets.manage | Tambah kategori aset |
| `/api/assets/export` | GET | assets.manage | Ekspor aset (format=preview|xlsx|pdf|csv) |
| `/api/assets` | GET,POST | assets.manage | Daftar/tambah aset |
| `/api/auth/[...nextauth]` | - | - | NextAuth (login) |
| `/api/auth/device` | POST,DELETE | - | Tautkan/lepas perangkat (cookie perangkat) |
| `/api/barcodes/[id]/retire` | POST | barcode.manage | Pensiunkan barcode (tidak pernah dihapus) |
| `/api/barcodes/resolve` | POST | - | Cari produk dari barcode |
| `/api/categories/[id]` | PATCH | products.manage | Ubah kategori produk |
| `/api/categories` | GET,POST | products.manage | Daftar/tambah kategori produk |
| `/api/consignment/catchup` | POST | consignment.manage | Catat penjualan susulan titipan |
| `/api/consignment/items/[id]/return` | POST | consignment.manage | Retur barang titipan ke penitip |
| `/api/consignment/payments` | POST | consignment.manage | Bayar penitip |
| `/api/consignment` | GET,POST | consignment.manage | Posisi titipan / terima titipan baru |
| `/api/expenses/[id]/move-to-asset` | POST | finance.manage | Pindahkan pengeluaran menjadi aset |
| `/api/expenses/[id]` | PATCH,DELETE | finance.manage | Ubah/hapus pengeluaran |
| `/api/expenses` | GET,POST | finance.manage | Daftar/tambah pengeluaran |
| `/api/inventory/audit` | GET | inventory.view | Audit mutasi barcode/stok |
| `/api/pos/catalog` | GET | pos.operate | Katalog produk untuk kasir |
| `/api/pos/checkout/confirm-cashless` | POST | pos.operate | Konfirmasi pembayaran cashless (idempoten) |
| `/api/pos/checkout` | POST | pos.operate | Checkout atomik (Sale+item+stok+payment+ledger titipan) |
| `/api/pos/shifts/[shiftId]/sales` | GET | pos.operate | Penjualan pada shift |
| `/api/pos/shifts/close` | POST | pos.shift | Tutup shift; mengembalikan {shift, summary} omzet/untung shift & hari |
| `/api/pos/shifts/open` | POST | pos.shift | Buka shift |
| `/api/products/[id]/barcodes` | POST | barcode.manage | Tambah barcode produk |
| `/api/products/[id]` | GET,PATCH,DELETE | products.manage | Ambil/ubah/hapus produk |
| `/api/products/duplicates` | GET | products.manage | Audit produk duplikat |
| `/api/products/export` | GET | products.manage | Ekspor master produk (format=...) |
| `/api/products` | GET,POST | products.manage | Daftar/tambah produk |
| `/api/products/search` | GET | - | Cari produk (picker) |
| `/api/receiving/items/[id]` | PATCH,DELETE | receiving.edit | Koreksi/hapus baris penerimaan |
| `/api/receiving/movements/[id]` | PATCH,DELETE | receiving.edit | Koreksi/hapus mutasi stok awal/penyesuaian |
| `/api/receiving/report` | GET | receiving.manage | Riwayat barang masuk per periode (format=...) |
| `/api/receiving` | GET,POST | receiving.manage | Daftar/terima barang masuk |
| `/api/reports/export` | GET | reports.view | Ekspor Keuangan & Laporan: tab=keuangan|produk|inventaris|kasir, period, format=... |
| `/api/scan-session/[code]/events` | POST,GET | - | Kirim/ambil event scan |
| `/api/scan-session/[code]/heartbeat` | POST | - | Detak sesi scan |
| `/api/scan-session/[code]` | GET,DELETE | - | Ambil/tutup sesi scan |
| `/api/scan-session` | POST | - | Buat sesi scan (pairing scanner HP) |
| `/api/stock-opname/approve` | POST | stockopname.approve | Setujui opname |
| `/api/stock-opname` | POST | stockopname.manage | Buat opname |
| `/api/stock-opname/submit` | POST | stockopname.manage | Ajukan opname |
| `/api/stock-out` | GET,POST | stockout.manage | Barang keluar (rusak/kedaluwarsa/retur supplier) |
| `/api/suppliers/[id]` | PATCH | suppliers.manage | Ubah supplier |
| `/api/suppliers` | GET,POST | suppliers.manage | Daftar/tambah supplier |
| `/api/terminals/devices` | POST | pos.operate | Daftar perangkat terminal |
| `/api/terminals/register` | POST | pos.operate | Daftarkan terminal kasir |
| `/api/terminals/scanner` | POST | pos.operate | Laporkan scanner terminal |
| `/api/transactions/[id]/refund` | POST | refund.manage | Refund transaksi |
| `/api/transactions/[id]` | GET | transactions.view | Detail transaksi + mutasi stok |
| `/api/transactions/export` | GET | transactions.view | Ekspor Riwayat Transaksi (period, format=...) |
| `/api/users/[id]` | PATCH | users.manage | Ubah pengguna |
| `/api/users` | GET,POST | users.manage | Daftar/tambah pengguna |
