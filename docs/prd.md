# Product Requirements Document (PRD) — Baiturrahman Mart POS & Backoffice

## 1. Ringkasan Produk & Visi (North Star)
**Baiturrahman Mart (YMB Mart)** adalah ekosistem Point of Sale (POS) dan manajemen ritel masjid modern untuk **Masjid Jami' Baiturrahman**. 

Tujuan utama sistem ini adalah menghadirkan operasional kasir ritel minimarket yang **cepat (< 100ms per scan)**, **tangguh terhadap gangguan internet (100% Offline-First)**, serta tersinkronisasi secara real-time ke cloud untuk monitoring omzet pengurus masjid dari mana saja.

---

## 2. Target Pengguna (User Personas)
1. **Kasir Toko (Cashier)**:
   - Fokus: Kecepatan transaksi kasir, navigasi keyboard penuh (F1-F9), barcode scanner, input pecahan uang fisik laci saat buka/tutup shift, transaksi PPOB/E-Trans, cetak struk thermal.
2. **Administrator / Pengurus Toko (Admin)**:
   - Fokus: Pengawasan keuangan, mutasi kas kecil (petty cash), katalog produk & barcode, monitoring stok & expired, stock opname fisik berkala, rekapitulasi shift kasir, manajemen member jamaah, pengaturan iklan layar pelanggan.
3. **Jamaah / Pelanggan (Customer)**:
   - Fokus: Transparansi belanja via layar kedua (Customer Display), pembayaran QRIS, poin member jamaah, pesanan online kurir masjid.

---

## 3. Cakupan Fitur Utama (In-Scope)

### A. Point of Sale (POS Kasir) — `/kasir`
- **Navigasi Keyboard Penuh**:
  - `F1`: Bantuan Shortcut
  - `F2`: Buka Laci Kasir (Kick Cash Drawer)
  - `F3`: Modal Layanan E-Trans (Pulsa, PLN, E-Wallet)
  - `F4`: Hold / Pending Transaksi Keranjang
  - `F6`: Buka Kembali Hold Transaksi
  - `F7`: Buka / Tutup Shift Kasir (dengan kalkulator uang fisik)
  - `F8`: Catat Arus Kas Laci Masuk/Keluar (Petty Cash)
  - `F9`: Buka Dialog Pembayaran (Bayar Cepat)
  - `Enter`: Tambah / Scan Barcode Produk
- **Offline-First Transaction Queue**:
  - Jika internet putus, transaksi tetap tersimpan di SQLite lokal (`sync_status = 'pending'`).
  - Saat internet tersambung kembali, otomatis di-push ke Turso Cloud.
- **Kalkulator Shift Kasir**:
  - Validasi modal awal, penjualan tunai, QRIS, uang sistem vs fisik, hitung selisih laci otomatis dengan modal SweetAlert2.

### B. Customer Facing Display — `/customer`
- Terhubung via WebSocket internal (`/ws/display`) untuk mirror keranjang kasir secara real-time.
- Menampilkan subtotal, diskon, kembalian, QRIS dinamis, running text pengumuman, dan carousel banner promo.

### C. Portal Presensi Kasir — `/presensi`
- Pencatatan kehadiran kasir (Clock In / Clock Out) berbasis perangkat kasir atau link mobile Vercel.

### D. Backoffice & Analytics Admin — `/admin`
1. **Dashboard & Omzet**: Visualisasi omzet harian, mingguan, bulanan, margin profit, dan performa kasir.
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

## 4. Batasan & Out-of-Scope (Bukan Prioritas Sekarang)
- Pembayaran kartu kredit/EDC perbankan langsung (saat ini menggunakan pencatatan non-tunai / QRIS).
- Integrasi marketplace pihak ketiga (Shopee/Tokopedia).
- Multi-cabang lintas kota (fokus tunggal pada Baiturrahman Mart).

---

## 5. Kriteria Keberhasilan (Success Metrics)
- **Latensi Scan Barcode**: < 50ms per item.
- **Downtime Toleransi**: 0 detik (tetap bisa transaksi meski internet mati total).
- **Integritas Sinkronisasi**: 100% data transaksi lokal tersinkron ke Turso saat online tanpa duplikasi (Idempotent).

