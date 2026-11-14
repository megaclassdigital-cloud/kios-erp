# Changelog (untuk agent programmer)

Tambahkan entri **di atas** setiap kali ada perbaikan, penambahan, atau
penghapusan yang mengubah perilaku, aturan bisnis, rute, model data, atau cara
kerja developer. Satu entri = satu perubahan yang bisa dipahami tanpa membuka
diff: *apa berubah, kenapa, file kuncinya, dan apa yang harus diwaspadai*.
Format: `## YYYY-MM-DD — judul` lalu poin singkat. Tanggal memakai WIB.

## 2026-11-14 — Ekspor terpadu, cetak diperbaiki, dokumentasi
- Satu definisi lembar (`A4Spec`) → preview/cetak, Excel, PDF, CSV. File kunci: `src/modules/reports/domain/report-specs.ts`, `src/shared/export/export-response.ts`, `src/shared/export/a4-pdf.ts`, `src/app/(app)/laporan/export-toolbar.tsx`.
- Endpoint baru `/api/transactions/export`; `/api/reports/export` kini `tab=keuangan|produk|inventaris|kasir` dan `format=`.
- Cetak: `window.print()` pada halaman penuh menghasilkan lembar kosong (elemen tersembunyi tetap makan ruang). `globals.css` sekarang memakai `display:none` untuk elemen lain; cetak A4 lewat preview (`data-print-flow`).
- Sisa tampilan jam non-WIB diperbaiki (Laporan kasir/inventaris, audit, terminal, bilah atas, nama file ekspor, kedaluwarsa).
- Dokumentasi dipecah: `PROJECT_CONTEXT.md` (pintu masuk), `API.md`, `CHANGELOG.md`; tes `src/docs-consistency.test.ts` menjaga agar tidak melenceng.

## 2026-11-13 — WIB, filter Transaksi, ringkasan tutup shift
- Semua batas periode memakai helper WIB (`src/shared/format/wib.ts`); sebelumnya jam server UTC. `resolvePeriod` punya tes.
- `/transaksi`: filter hari/minggu/bulan/tahun/custom, kartu omzet/untung, tabel barang+harga per transaksi, paginasi 50.
- Tutup shift: `CloseShiftModal` + `GetShiftCloseSummaryUseCase`; semua elemen Keuangan untuk shift dan hari, untuk semua peran.
- Nomor transaksi memakai tanggal WIB.

## 2026-11-08..11 — Titipan
- Ledger titipan ditulis saat checkout (`ConsignmentSale`), tanpa polling.
- Penjualan susulan (`/api/consignment/catchup`), lencana "Titipan" di riwayat shift, harga jual + margin otomatis di form titip dan susulan.
- Migrasi: `20261107000000_consignment_sales`, `20261108000000_consignment_catchup`.
