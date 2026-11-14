# Kios-ERP — konteks proyek untuk agent lain

Dokumen ini satu-satunya ringkasan yang dibutuhkan agent (atau developer) baru
untuk memahami proyek ini. Baca juga `AGENTS.md` (aturan arsitektur, wajib) dan
`docs/ROADMAP.md` (rencana jangka panjang). Terakhir diperbarui 14 Nov 2026.

> **Aturan keamanan dokumen ini:** hanya *nama* variabel dan kunci yang dicatat.
> Nilai rahasia (password, token, API key) **tidak pernah** ditulis di repo,
> di chat, atau di dokumen. Lihat bagian 3.

## 1. Apa ini

POS dan inventori untuk satu toko sembako/kelontong (kasir, stok, barang masuk,
barang titipan, aset, keuangan, laporan). Dipakai pemilik toko dan kasirnya di
tablet/HP/komputer, termasuk printer struk thermal dan scanner barcode.

- Bahasa tampilan (UI): **Indonesia**. Kode, nama variabel, komentar: **Inggris**.
- Berbicara dengan pemilik toko: bahasa Indonesia, sederhana, tanpa istilah teknis.
- Zona waktu toko: **WIB (UTC+7)**, lihat bagian 6.

### Kendala dari pemilik (berlaku untuk semua agent)

1. Jangan pernah meminta pemilik mengetik kode atau membuka terminal. Semua
   perubahan dikerjakan agent; pemilik hanya menekan tombol di aplikasi atau di
   formulir aman.
2. Jangan membebani pemilik dengan adaptasi manual (mis. input ulang data,
   langkah teknis).
3. **QRIS/Midtrans tidak boleh di-commit atau di-push** ke GitHub/Vercel dulu
   (lihat bagian 11).
4. Jangan membuat Postgres lokal sementara. Jangan menempel atau menyimpan
   kunci Supabase di chat atau file.
5. Kasir tidak boleh terlalu "diramaikan" oleh fitur titipan (hanya lencana
   kecil "Titipan" di riwayat shift).
6. Hemat invocation serverless: tidak ada polling. Data dimuat saat halaman
   dibuka atau lewat tombol muat ulang.

## 2. Teknologi dan deploy

| Bagian | Pilihan |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack dev). **Bukan Next.js yang Anda hafal**: baca `node_modules/next/dist/docs/` sebelum menulis kode (lihat `AGENTS.md`). |
| Bahasa | TypeScript |
| Database | PostgreSQL di **Supabase** (via Prisma 5) |
| Auth | NextAuth (Auth.js) + `bcryptjs`, session JWT, RBAC di server |
| UI | Tailwind v4, shadcn/base-ui, lucide-react, sonner (toast), TanStack Query |
| Uang | `decimal.js` / Prisma Decimal (tidak pernah float) |
| Ekspor | `exceljs` (xlsx), `pdf-lib` (pdf), CSV buatan sendiri |
| Scanner | `@zxing/browser` (kamera), scanner perangkat via sesi scan |
| Tes | Vitest (fake in-memory lewat `vi.mock`), Playwright tersedia |
| Hosting | **Vercel**, region `syd1`, auto-deploy dari branch `main` |

Alur kerja git: kerja di branch fitur (`main-lsgtv7` pada sesi terakhir), bila
tes lulus lakukan fast-forward ke `main`:

```bash
git fetch -q origin main && git merge -q --ff-only origin/main
git push -q -u origin <branch>
git push -q origin <branch>:main
```

Akhiri pesan commit dengan trailer atribusi yang diminta sesi. Jangan membuat
PR kecuali diminta.

### Perintah

```bash
npm ci                         # pasang dependensi (postinstall: prisma generate)
npm run dev                    # dev server
npx tsc --noEmit               # typecheck
npx eslint src                 # lint (warning lama boleh, error tidak)
npx vitest run                 # semua tes (357 lulus per 14 Nov 2026)
DATABASE_URL=postgresql://x:x@localhost:5432/x DIRECT_URL=postgresql://x:x@localhost:5432/x \
  AUTH_SECRET=x npm run build  # build produksi penuh tanpa database nyata
```

`npm run build` menjalankan `scripts/migrate-on-deploy.mjs`: **hanya di build
produksi Vercel** (`VERCEL_ENV=production`) migrasi Prisma diterapkan otomatis;
preview dan build lokal melewatinya. Jika migrasi gagal, build gagal dan Vercel
tetap melayani deploy sebelumnya.

## 3. Kunci, variabel lingkungan, dan akses (hanya nama)

### Variabel lingkungan yang dipakai kode

| Nama | Dipakai untuk | Di mana diisi |
|---|---|---|
| `DATABASE_URL` | Koneksi aplikasi ke Supabase. Di Vercel memakai **transaction pooler** (port 6543, `pgbouncer=true`). | Vercel → Project → Environment Variables |
| `DIRECT_URL` | Koneksi **session** (port 5432) untuk `prisma migrate` saat deploy. Jika kosong, diturunkan dari `DATABASE_URL`. | Vercel env vars |
| `AUTH_SECRET` | Penanda tangan session NextAuth. | Vercel env vars |
| `VERCEL_ENV` | Disediakan Vercel; menentukan apakah migrasi dijalankan. | Otomatis |
| `NODE_ENV` | Standar Node/Next. | Otomatis |

Tidak ada `.env` yang di-commit. Untuk lokal, salin `.env.example` bila ada atau
buat `.env` sendiri dengan tiga variabel pertama. Akun seed (`npm run db:seed`)
ada di `README.md` dan `prisma/seed.ts` (hanya untuk pengembangan lokal).

### Akses di luar kode

| Nama | Fungsi | Penyimpanan |
|---|---|---|
| Supabase Personal Access Token | Agent membaca (read-only) database produksi lewat Management API: `POST https://api.supabase.com/v1/projects/<project-ref>/database/query` dengan `{"query": ..., "read_only": true}`. Project ref ada di dashboard Supabase. | Disimpan di **environment cloud sesi "kios-erp"** lewat formulir aman. Proxy yang menyuntikkannya; agent tidak pernah melihat nilainya. Berkuasa penuh atas project, jadi pemilik boleh mencabutnya kapan saja di Supabase → Account → Access Tokens. |
| GitHub | Push ke `main` memicu deploy Vercel. | Integrasi sesi (tidak ada token di repo). |
| `MIDTRANS_SERVER_KEY` | **Rencana saja** (QRIS). Belum dipakai di kode yang di-push. | Belum ada. Harus lewat environment variable, bukan kode. |

Allowed host jaringan lingkungan agent: `api.supabase.com`. Menambah host atau
kunci baru harus lewat alat lingkungan (`request_credential` / `update_environment`),
bukan dengan meminta pemilik menempel kunci di chat.

## 4. Arsitektur (ringkas; detail di `AGENTS.md`)

Modular monolith, tujuh lapis:

```
src/modules/<fitur>/{domain,application,repository,infrastructure}
src/app/api/**        # antarmuka (route handler, validasi zod, requireSession)
src/app/(app)/**      # halaman (server components + komponen klien kecil)
src/shared/**         # uang, kuantitas, RBAC, Prisma, format WIB, ekspor, cetak
```

Aturan yang tidak boleh dilanggar:

- Presentasi tidak query database; domain tidak mengimpor Prisma/Next;
  application lewat interface repository.
- **Stok tidak pernah diubah langsung.** Selalu `StockMovement` + proyeksi
  `Product.currentStock` dalam satu transaksi (`TransactionManager`, `moveStock`).
- Penjualan membekukan `SaleItem.unitPriceAtSale` dan `costPriceAtSale`;
  laporan membaca snapshot itu, bukan harga produk saat ini.
- Checkout dan penerimaan barang atomik (satu `$transaction`).
- RBAC di server: setiap route memanggil `requireSession(permission)`.
- Barcode hanya identitas (tidak menyimpan harga/nama); barcode lama tidak
  dipakai ulang (`ProductBarcode.status`).
- File maksimal sekitar 300 baris; pecah sebelum membesar.

### Modul (`src/modules`)

`admin` (reset data), `announcements` (pengumuman sekali per perangkat),
`assets` (aset toko), `consignment` (barang titipan), `finance` (pengeluaran,
ringkasan untung), `inventory` (stok, mutasi, kedaluwarsa), `pos` (kasir,
shift, checkout, refund), `products`, `purchasing` (barang masuk), `reports`
(spesifikasi lembar laporan, lihat bagian 7), `scanning`, `stockopname`,
`suppliers`, `terminals`, `users`.

### Model data utama (`prisma/schema.prisma`)

User/Role, Category, Product (+ProductBarcode, BarcodeSequence), StockMovement,
Supplier, Purchase/PurchaseItem, CashierShift, Sale/SaleItem/ServiceSaleDetail,
Payment, StockOpname/Item, Expense, Asset/AssetCategory,
Consignment/ConsignmentItem/**ConsignmentSale**/ConsignmentPayment,
AnnouncementAck, AuditLog, DailyCounter, ScanSession/ScanEvent,
PosTerminal/TerminalDevice. Migrasi di `prisma/migrations` (terbaru:
`20261108000000_consignment_catchup`).

## 5. Peran dan hak akses

`src/shared/security/permissions.ts` adalah sumber kebenaran. OWNER = gabungan
semua izin (dijaga oleh assert saat modul dimuat).

| Peran | Gambaran |
|---|---|
| OWNER | Semua, termasuk `data.reset` |
| ADMIN | Hampir semua, kecuali reset data |
| KASIR | `pos.operate`, `pos.shift`, `transactions.view` (hanya transaksi sendiri), `inventory.view`, `receiving.manage`, `dashboard.view` |
| STAFF_STOK | Stok, barang masuk (+koreksi), barang keluar, titipan, opname |

Izin penting: `finance.manage` (halaman Keuangan, kartu untung di Transaksi),
`reports.view` (Laporan), `transactions.view_all` (semua kasir),
`consignment.manage`, `refund.manage`, `shifts.monitor`.

## 6. Waktu: semua WIB

Server Vercel berjalan di **UTC**. Dulu batas "hari ini" dan jam yang
ditampilkan memakai jam server, sehingga "hari ini" baru mulai pukul 07.00 WIB.
Sekarang **semua** logika tanggal lewat `src/shared/format/wib.ts`:

- Penyimpanan: instan UTC di database (`DateTime`), tidak diubah.
- Batas hari/minggu/bulan/tahun: `startOfWibDay`, `endOfWibDay`, `wibStartOf`,
  `wibWeekday`, `addWibDays`. Periode laporan: `resolvePeriod`
  (`src/app/(app)/laporan/resolve-period.ts`, dengan tes).
- Tampilan: `formatWibDate`, `formatWibDateTime`, `formatWibTime`,
  `wibDayKey` (yyyy-MM-dd), `wibDayLabel`.
- Input tanggal dari `<input type="date">`: `parseWibDateInput` (server) atau
  `T12:00:00+07:00` (klien).
- Nomor transaksi `TRX-yyyyMMdd-nnnnnn` memakai tanggal WIB.
- Tanggal kedaluwarsa adalah nilai tanggal saja, disimpan pada 00:00 UTC; dibaca
  dengan getter UTC. "Hari ini" untuk hitung mundur adalah tanggal WIB.

**Aturan:** jangan pernah memakai `toLocaleString`, `getHours`, `getDate`,
`setHours`, `new Date().toISOString().slice(0,10)` untuk tampilan atau batas
periode. Pakai helper di atas. (Pengecualian: format angka `toLocaleString("id-ID")`
untuk rupiah.)

Satu transaksi dihitung pada **hari bayarnya** (`paidAt`); yang belum pernah
dibayar memakai `createdAt`. Aturan ini ada di
`PrismaReportRepository.saleWhere` dan dipakai halaman Transaksi serta
ekspornya, sama dengan Keuangan.

## 7. Laporan, ekspor, dan cetak (terkonsolidasi)

Satu sumber untuk layar, kertas, dan file:

```
data (use case/repository)  →  A4Spec (src/modules/reports/domain/report-specs.ts, dll.)
        ├─ preview di layar + CETAK  (komponen export-preview.tsx, A4)
        ├─ Excel .xlsx               (src/shared/export/a4-workbook.ts, rumus asli Excel)
        ├─ PDF                       (src/shared/export/a4-pdf.ts, pdf-lib)
        └─ CSV                       (specsToCsv di export-response.ts)
```

- Endpoint ekspor semua memakai `respondWithSpecs(specs, format, namaFile)`
  dengan `?format=preview|xlsx|pdf|csv` (`src/shared/export/export-response.ts`).
  Endpoint: `/api/reports/export?tab=keuangan|produk|inventaris|kasir`,
  `/api/transactions/export`, `/api/products/export`, `/api/assets/export`,
  `/api/receiving/report`.
- UI: `ExportToolbar` (`src/app/(app)/laporan/export-toolbar.tsx`) memberi
  tombol Preview & Cetak, Excel, PDF, CSV; dipakai di Laporan, Keuangan,
  Transaksi, Master Produk, Barang Masuk, Aset.
- Menambah laporan baru: buat `A4Spec` di `report-specs.ts` (rumus lewat
  `{kolom}` / `{kolom:range}`), ambil datanya di `PrismaReportRepository`,
  panggil `respondWithSpecs`. Preview, Excel, PDF, dan CSV otomatis ikut.
- Cetak A4 membuka preview dan memakai `window.print()` pada elemen
  `data-print-flow`; CSS di `src/app/globals.css` membuang elemen lain dari hasil
  cetak (bukan sekadar menyembunyikan) agar tidak ada halaman kosong. Elemen
  `data-print-area` (struk, label barcode) diisolasi dengan cara yang sama.
- Struk dan ringkasan thermal: `src/shared/printing/*` (ESC/POS lewat
  WebUSB/WebSerial/Bluetooth, konfigurasi di `printer-config.ts`), tombol
  `ThermalPrintButton`. Browser print hanya cadangan.
- PDF memakai font standar (Latin-1); karakter di luar itu diganti `?`
  (`pdfSafe`).

## 8. Halaman (`src/app/(app)`)

| Rute | Isi |
|---|---|
| `/dashboard` | KPI hari ini (WIB), tren, shift berjalan, stok menipis |
| `/kasir` | POS: scan/cari, keranjang, promo per baris, bayar tunai/cashless, struk, riwayat shift, **tutup shift** |
| `/stok`, `/stok-opname` | Daftar stok, audit barcode, opname + persetujuan |
| `/barang-masuk`, `/barang-keluar` | Penerimaan supplier (koreksi/hapus baris), barang keluar (rusak/kedaluwarsa/retur) |
| `/titipan` | Barang titipan: terima, kartu penitip, utang, bayar, penjualan susulan |
| `/transaksi` | Riwayat per periode (hari/minggu/bulan/tahun/custom), daftar barang+harga per transaksi, detail, refund, ekspor |
| `/keuangan` | Omzet, modal, untung kotor/bersih, pengeluaran (CRUD, pindah ke aset), ekspor |
| `/laporan` | Tab Produk, Inventaris, Kasir, ekspor |
| `/aset` | Aset toko (tidak masuk hitungan untung) |
| `/master/*` | Produk (duplikat, label barcode), kategori, supplier, pengguna, izin, terminal, reset data |
| `/audit`, `/tour` | Log audit, tur interaktif |

## 9. Aturan bisnis yang mudah salah

- **Omzet** = Σ(qty × harga jual − diskon) dari transaksi `PAID`; **modal** =
  Σ(qty × `costPriceAtSale`); **untung kotor** = omzet − modal; **untung bersih**
  = untung kotor − pengeluaran toko (per tanggal pengeluaran). Aset tidak ikut.
  Refund tidak dihitung. Rumusnya satu: `PrismaFinanceReadRepository`
  (`summary`, `shiftTotals`, `periodTotals`, `productBreakdown`).
- **Tutup shift** (`CloseShiftUseCase` + `GetShiftCloseSummaryUseCase`): kas
  seharusnya = kas awal + penjualan tunai shift. Setelah tutup, jendela
  menampilkan semua elemen Keuangan untuk shift ini dan untuk hari ini (WIB,
  semua kasir), untuk **semua peran**. Pengeluaran dan untung bersih hanya
  tingkat hari (pengeluaran bukan milik shift).
- **Titipan:** utang ke penitip = Σ(qty terjual × harga titip) − pembayaran.
  Dicatat otomatis saat checkout (`recordSaleLines` di transaksi checkout),
  bukan lewat refresh. Penjualan susulan (`ConsignmentSale` tanpa `saleId`)
  memotong stok tetapi tidak membuat `Sale`, jadi omzet/untung laporan tidak
  berubah. Pembayaran ke penitip bukan pengeluaran (modalnya sudah masuk lewat
  `purchasePrice`). Margin = harga jual − harga titip.
- **Cashless** idempotent lewat `Payment.idempotencyKey`.
- Promo per baris: `unitPriceAtSale` asli, `discountAmount` terpisah.

## 10. Cara agent mengecek produksi

Hanya baca (read-only) lewat Management API Supabase (lihat bagian 3). Jangan
mengubah data produksi tanpa persetujuan pemilik. Ubah skema hanya lewat migrasi
Prisma baru di `prisma/migrations` (otomatis terapkan saat deploy produksi).
Jangan mengedit migrasi yang sudah diterapkan.

## 11. Status, rencana, dan hal yang sengaja belum

- **QRIS dinamis Midtrans:** kode ada dan lolos tes offline tetapi **sengaja
  tidak di-commit** (tersimpan di stash sesi). Tidak boleh masuk GitHub/Vercel
  sebelum pemilik memutuskan. Detail di `docs/ROADMAP.md`.
- Belum diminta/dikerjakan: lencana "Titipan" di keranjang kasir (sengaja tidak),
  membatalkan entri penjualan susulan dari UI, kategori bertingkat dengan markup
  bawaan, satuan (renteng/dus → pcs), keluarga produk, chatbot RAG, versi ringkas
  thermal untuk laporan A4, kolom "rusak" di penerimaan titipan.
- Belum diverifikasi di data produksi nyata: penjualan titipan yang berasal dari
  kasir (baru ada entri susulan), tampilan jendela tutup shift dan tabel
  Transaksi di layar sungguhan.
- Tampilan layar belum pernah diuji otomatis di browser; cek manual setelah
  perubahan UI besar.

## 12. Riwayat singkat perubahan terbaru (Nov 2026)

1. Ledger titipan tercatat saat checkout; polling dihapus.
2. Penjualan susulan, lencana Titipan, harga jual + margin otomatis.
3. Semua batas periode dan tampilan jam dipindah ke WIB; filter periode di Transaksi.
4. Ringkasan omzet/untung setelah tutup shift; daftar barang+harga di Transaksi.
5. Ekspor terpadu (preview/cetak, Excel, PDF, CSV) untuk semua laporan;
   perbaikan CSS cetak yang menghasilkan halaman kosong.
