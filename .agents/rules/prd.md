---
description: Product Requirements Document (PRD), North Star, user personas, and core in-scope POS & Backoffice features
globs: *
---

# Product Requirements Document (PRD) — Baiturrahman Mart

## 1. Ringkasan Produk & Visi (North Star)
**Baiturrahman Mart (YMB Mart)** adalah ekosistem Point of Sale (POS) dan manajemen ritel masjid modern untuk **Masjid Jami' Baiturrahman**. 

Tujuan utama sistem: Menghadirkan operasional kasir ritel minimarket yang **cepat (< 100ms per scan)**, **tangguh terhadap gangguan internet (100% Offline-First)**, serta tersinkronisasi otomatis ke cloud via Turso untuk monitoring omzet pengurus masjid.

---

## 2. Target Pengguna (User Personas)
1. **Kasir Toko (Cashier)**: Kecepatan transaksi, keyboard shortcuts (F1-F9), barcode scanner, kalkulator uang fisik tutup shift, transaksi PPOB/E-Trans, cetak struk thermal.
2. **Administrator / Pengurus Toko (Admin)**: Pengawasan keuangan, arus kas laci (petty cash), katalog produk & barcode, monitoring stok & expired, stock opname fisik, audit shift kasir, manajemen member jamaah, display iklan.
3. **Jamaah / Pelanggan (Customer)**: Layar pelanggan kedua (Customer Display), pembayaran QRIS, poin member, pesanan online kurir masjid.

---

## 3. Cakupan Fitur Utama (In-Scope)

### A. Point of Sale (POS Kasir) — `/kasir`
- **Navigasi Keyboard Penuh**:
  - `F1`: Bantuan Shortcut
  - `F2`: Buka Laci Kasir (Cash Drawer)
  - `F3`: Modal Layanan E-Trans (Pulsa, PLN, E-Wallet)
  - `F4`: Hold Transaksi
  - `F6`: Buka Hold Transaksi
  - `F7`: Buka / Tutup Shift Kasir (Kalkulator Uang Fisik Lembar & Koin)
  - `F8`: Arus Kas Laci Masuk/Keluar (Petty Cash)
  - `F9`: Bayar Cepat
  - `Enter`: Tambah / Scan Barcode Produk
- **Offline-First Transaction Queue**:
  - Simpan transaksi di SQLite lokal (`sync_status = 'pending'`).
  - Auto-push ke Turso Cloud saat internet aktif.
- **Kalkulator Shift Kasir**:
  - Validasi modal awal, penjualan tunai, QRIS, uang sistem vs fisik, hitung selisih kas otomatis dengan modal SweetAlert2.

### B. Customer Facing Display — `/customer`
- Terhubung via WebSocket `/ws/display` untuk mirror keranjang kasir secara real-time.
- Subtotal, diskon, kembalian, QRIS dinamis, running text pengumuman, carousel banner promo.

### C. Portal Presensi Kasir — `/presensi`
- Pencatatan kehadiran kasir (Clock In / Clock Out) berbasis perangkat kasir atau link mobile Vercel.

### D. Backoffice & Analytics Admin — `/admin`
1. **Dashboard & Omzet**: Visualisasi omzet harian, mingguan, bulanan, margin profit, performa kasir.
2. **Laporan & Tutup Buku**: Export laporan keuangan, omzet, dan profit.
3. **Riwayat Transaksi**: Audit seluruh struk belanja, reprint, dan riwayat belanja per member.
4. **Layanan E-Trans**: Katalog produk digital (PLN, pulsa, transfer) dan admin fee.
5. **Arus Kas Laci**: Pencatatan kas masuk/keluar (operasional, uang receh, setoran).
6. **Laporan Shift Kasir**: Rekapitulasi per shift kasir dan audit selisih kas.
7. **Katalog Produk**: Manajemen SKU, nama, kategori, harga beli, harga jual, barcode, batas min-stok.
8. **Monitoring Stok & Restock**: Peringatan stok menipis (< min_stock).
9. **Stock Opname Fisik**: Sesi hitung fisik stok vs sistem dan pencatatan selisih.
10. **Member Jamaah**: Manajemen ID member, no HP, tier, poin jamaah, dan riwayat transaksi.
11. **Manajemen User**: Tambah kasir, reset PIN kasir, ganti password admin mandiri.
12. **Pengaturan Sistem & Iklan**: Edit nama toko, alamat, footer struk, URL presensi, dan banner display.

---

## 4. Batasan & Out-of-Scope
- Integrasi mesin EDC bank langsung (menggunakan pencatatan non-tunai / QRIS).
- Integrasi marketplace pihak ketiga (Shopee/Tokopedia).
- Multi-cabang ritel (fokus tunggal pada Baiturrahman Mart).

