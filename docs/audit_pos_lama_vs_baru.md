# Audit & Perbandingan Komprehensif: POS Lama vs POS Baru

Dokumen ini memuat perbandingan detail fitur, arsitektur, dan checklist kesiapan antara **Aplikasi POS Lama** (`frontend/*.html`) dan **Aplikasi POS Baru Modern** (`frontend-app` React 19 SPA + Go Single Binary).

---

## 1. Perbandingan Arsitektur & Teknologi

| Aspek | POS Lama (`frontend/`) | POS Baru (`frontend-app/`) | Keunggulan POS Baru |
|---|---|---|---|
| **Framework UI** | Multi-Page Vanilla HTML5 + JS + Tailwind CDN | Single Page Application (SPA) React 19 + TypeScript + Vite | Navigasi instan tanpa refresh browser, type-safety, modular |
| **State Management** | Global JS Variables (`window.*`, `localStorage`) | Zustand Store (`useCartStore`, `useAuthStore`) | State terpusat, reaktif, persisten, minim memori leak |
| **Data Fetching** | Raw `fetch()` dengan inline `async/await` manual | TanStack React Query v5 | Auto-caching, auto-retry, background refetch, zero stale data |
| **Komunikasi Layar** | Native WebSocket manual | Dual Channel: Native WebSocket `/ws` + BroadcastChannel | Sinkronisasi instan <10ms antar-tab tanpa beban server |
| **Distribusi Binary** | Multi-file terpisah (HTML terdistribusi) | Go Single Binary (Embedded `distFS` via `//go:embed`) | 1 file executable `.exe` mandiri, siap deploy offline |

---

## 2. Perbandingan Fitur Seluruh Halaman Aplikasi

### A. Login & Autentikasi (`/login`, `/admin-login`)
* **File Lama**: `frontend/admin-login.html`
* **File Baru**: `frontend-app/src/pages/auth/LoginScreen.tsx`

| Fitur | POS Lama | POS Baru | Status | Catatan |
|---|:---:|:---:|:---:|---|
| Login Admin (Username + Password) | ✅ | ✅ | 🟢 Lengkap | Menggunakan Argon2id & JWT HTTP-only cookie |
| Login Kasir Cepat (PIN 6 Digit) | ✅ | ✅ | 🟢 Lengkap | Keyboard Numpad sentuh + keyboard fisik |
| Role-Based Access Control (RBAC) | ⚠️ Parsial | ✅ | 🟢 Lengkap | `ProtectedRoute` mencegah kasir membuka `/admin` |
| Session Expiry & Auto Redirect | ⚠️ Parsial | ✅ | 🟢 Lengkap | Auto redirect ke target awal setelah login |
| Reset PIN Kasir mandiri dari Admin | ✅ | ✅ | 🟢 Lengkap | API `/api/users/:id/reset-pin` terhubung |

---

### B. Portal Beranda / Launcher (`/`)
* **File Lama**: `frontend/index.html`
* **File Baru**: `frontend-app/src/pages/portal/PortalScreen.tsx`

| Fitur | POS Lama | POS Baru | Status | Catatan |
|---|:---:|:---:|:---:|---|
| Quick Launcher Menu | ✅ | ✅ | 🟢 Lengkap | Kartu Kasir, Admin, Customer, Presensi |
| Indikator Status Server & Database | ✅ | ✅ | 🟢 Lengkap | Live status SQLite & Cloud Sync Turso |
| Live WIB Clock & Kalender Hijriah | ✅ | ✅ | 🟢 Lengkap | Tampilan identitas masjid & tanggal |
| Shift Status Quick View | ✅ | ✅ | 🟢 Lengkap | Deteksi kasir yang sedang bertugas |

---

### C. Terminal Kasir POS (`/kasir`)
* **File Lama**: `frontend/kasir.html`
* **File Baru**: `frontend-app/src/pages/pos/POSScreen.tsx`

| Fitur | POS Lama | POS Baru | Status | Catatan |
|---|:---:|:---:|:---:|---|
| Input Barcode Scanner (F2 / Auto-focus) | ✅ | ✅ | 🟢 Lengkap | Deteksi barcode otomatis langsung masuk keranjang |
| Touch Catalog & Filter Kategori | ✅ | ✅ | 🟢 Lengkap | Tab Semua, Makanan, Minuman, Sembako, dll. |
| Keyboard Shortcuts (F1 - F10) | ✅ | ✅ | 🟢 Lengkap | F2 (Cari), F4 (Member), F8 (Parkir), F9 (Bayar) |
| Hold & Recall Cart (Parkir Keranjang) | ✅ | ✅ | 🟢 Lengkap | Menyimpan antrean belanja pembeli lain |
| Integrasi Member & Diskon Jamaah | ✅ | ✅ | 🟢 Lengkap | Pencarian member via nomor HP / Barcode kartu |
| Pilihan Pembayaran (CASH, QRIS, TRANSFER) | ✅ | ✅ | 🟢 Lengkap | Multi-metode bayar + kalkulator kembalian |
| Preset Donasi Infaq Kas Masjid (+1k, +2k, +5k) | ✅ | ✅ | 🟢 Lengkap | Infaq terpisah dari omzet murni barang |
| **Shift Guard (Blokir Transaksi Tanpa Shift)** | ❌ Rentan | ✅ Ketat | 🟢 Lebih Baik | Wajib buka shift baru sebelum transaksi diizinkan |
| Cetak Struk Otomatis (Receipt Thermal) | ✅ | ✅ | 🟢 Lengkap | Modal dialog print 58mm/80mm instan |

---

### D. Customer Display (`/customer`)
* **File Lama**: `frontend/customer.html`
* **File Baru**: `frontend-app/src/pages/customer/CustomerScreen.tsx`

| Fitur | POS Lama | POS Baru | Status | Catatan |
|---|:---:|:---:|:---:|---|
| Layout Dual Column Split (58% Left : 42% Right) | ✅ | ✅ | 🟢 Lengkap | Sesuai desain legacy Alfamart style |
| Carousel Iklan Banner & Kartu Promo | ✅ | ✅ | 🟢 Lengkap | Auto-slide 4.5s (gambar, promo diskon, banner masjid) |
| Running Text Ticker (Marquee) | ✅ | ✅ | 🟢 Lengkap | Teks berjalan info promo dari database |
| Kasir Box Merah Gradien Alfamart | ✅ | ✅ | 🟢 Lengkap | Nama kasir bertugas & status laci |
| Live Receipt Table (Item, Qty, Harga) | ✅ | ✅ | 🟢 Lengkap | Auto-scroll tabel saat barang di-scan kasir |
| Kotak Totalizer Kuning Kontras Tinggi | ✅ | ✅ | 🟢 Lengkap | Tulisan Total dan nominal angka besar |
| Rincian Pembayaran Tunai & Kembalian | ✅ | ✅ | 🟢 Lengkap | Nominal kembalian hijau tebal saat bayar |
| Modal QRIS Fullscreen Interaktif | ✅ | ✅ | 🟢 Lengkap | Muncul otomatis saat kasir memilih QRIS |

---

### E. Presensi Kasir (`/presensi`)
* **File Lama**: `frontend/presensi.html`
* **File Baru**: `frontend-app/src/pages/presensi/PresensiScreen.tsx`

| Fitur | POS Lama | POS Baru | Status | Catatan |
|---|:---:|:---:|:---:|---|
| Presensi Masuk / Pulang Kasir | ✅ | ✅ | 🟢 Lengkap | Input PIN atau nama kasir |
| Scanner Kamera QR Code | ✅ | ✅ | 🟢 Lengkap | Scan via webcam / mobile phone |
| **QR Code Dinamis (Anti-Kecurangan)** | ❌ Statis | ✅ Dinamis | 🟢 Lebih Baik | Token QR berganti otomatis tiap 30 detik |
| Log Absensi Hari Ini | ✅ | ✅ | 🟢 Lengkap | Tabel kasir hadir, jam masuk, jam pulang |
| Notifikasi Suara & Toast Masuk | ✅ | ✅ | 🟢 Lengkap | Audio chime saat presensi berhasil |

---

### F. Receipt / Cetak Struk (`/receipt/:id`)
* **File Lama**: `frontend/receipt.html`
* **File Baru**: `frontend-app/src/pages/receipt/ReceiptScreen.tsx` + `ReceiptPrint.tsx`

| Fitur | POS Lama | POS Baru | Status | Catatan |
|---|:---:|:---:|:---:|---|
| Format Thermal Struk 58mm / 80mm | ✅ | ✅ | 🟢 Lengkap | Styling font mono & garis putus-putus |
| Auto Print saat Transaksi Selesai | ✅ | ✅ | 🟢 Lengkap | `ReceiptPrint` di POS langsung pemicu printer |
| Halaman Cetak Ulang Struk Mandiri (`/receipt/:id`) | ✅ | ⚠️ Mock | 🟡 Perlu Hubung API | Belum fetch detail invoice riil dari `/api/receipt/:id` |

---

## 3. Checklist Detail Status Modul Dashboard Admin (`/admin`)

Berikut perbandingan 14 modul yang ada pada `frontend/admin.html` terhadap implementasi di dashboard baru:

```
[14 Modul Total di admin.html]
├── 🟢 Lengkap (14 Modul — 100% Selesai):
│   ├── [01] Dashboard Utama (AdminDashboard.tsx) [LENGKAP]
│   ├── [02] Laporan & Rekap Harian (DailyReportView.tsx) [SELESAI - Batch 1]
│   ├── [03] Riwayat Transaksi & Struk (TransactionHistory.tsx) [SELESAI - Batch 1]
│   ├── [04] Layanan E-Trans PPOB (ETransReportView.tsx) [SELESAI - Batch 2]
│   ├── [05] Laporan Shift Kasir (ShiftReports.tsx) [LENGKAP]
│   ├── [06] Rekap Presensi Kasir Admin (AdminPresensiView.tsx) [SELESAI - Batch 2]
│   ├── [07] Arus Kas Laci / Petty Cash (CashFlowManagement.tsx) [SELESAI - Batch 1]
│   ├── [08] Katalog Produk (ProductManagement.tsx) [LENGKAP]
│   ├── [09] Monitoring Kartu Stok & Mutasi (StockMonitoring.tsx) [SELESAI - Batch 2]
│   ├── [10] Stock Opname (StockOpname.tsx) [LENGKAP]
│   ├── [11] Member Jamaah (MemberManagement.tsx) [LENGKAP]
│   ├── [12] Layar Iklan Customer Display (CustomerAdManager.tsx) [SELESAI - Batch 3]
│   ├── [13] Manajemen Kasir & Akun (UserManagement.tsx) [LENGKAP]
│   └── [14] Pengaturan Toko, Backup & Sync (SystemSettings.tsx) [SELESAI - Batch 3]
│
├── 🟡 Sebagian / Perlu Dilengkapi: 0 Modul
└── 🔴 Belum Ada: 0 Modul
```

---

### Rincian Lengkap per Modul Admin:

### 1. Dashboard Utama (`dashboard`) — 🟢 Lengkap
- [x] KPI Omzet Hari Ini (`total_sales`)
- [x] KPI Estimasi Laba Kotor (`total_profit`)
- [x] KPI Total Transaksi Hari Ini (`total_tx`)
- [x] KPI Stok Menipis (`low_stock`)
- [x] Grafik Tren Penjualan 7 Hari Terakhir
- [x] Breakdown Pembayaran (CASH, QRIS, TRANSFER)
- [x] Tabel Top 5 Produk Terlaris Hari Ini
- [x] Tabel 10 Transaksi Penjualan Terakhir
- [x] Floating live active shift notification & pintasan navigasi cepat

### 2. Laporan & Rekap Penjualan Harian (`daily`) — 🟢 Lengkap (Batch 1)
- [x] Filter Tanggal & Periode Laporan (Harian Tunggal atau Rentang Tanggal)
- [x] Rekap Penjualan per Kasir / Shift
- [x] Rekap Omzet Bruto, Diskon, PPN, dan Infaq Masjid
- [x] Rekap Total Pembayaran per Metode (Tunai, QRIS, Non-Tunai)
- [x] Tombol Cetak / Print Rekapitulasi Tutup Buku Harian (A4 Print-Ready)
- [x] Tombol Ekspor Laporan ke Format Excel / CSV

### 3. Buku Riwayat Transaksi (`transactions`) — 🟢 Lengkap (Batch 1)
- [x] Tabel Riwayat Seluruh Transaksi Penjualan
- [x] Filter berdasarkan Tanggal, Status, Kasir, dan Metode Pembayaran
- [x] Kotak Pencarian Nomor Struk / Invoice
- [x] Modal Detail Item Belanjaan per Struk
- [x] Tombol Cetak Ulang Struk (Reprint Thermal Receipt)
- [x] Fitur Void / Pembatalan Transaksi dengan Hak Akses Admin

### 4. Layanan E-Trans / PPOB (`etrans`) — 🟢 Lengkap (Batch 2)
- [x] Rekap Transaksi Pulsa, Token PLN, dan Paket Data
- [x] Rekap Topup E-Wallet (GoPay, OVO, ShopeePay, DANA)
- [x] Laporan Pendapatan Biaya Admin Fee Toko
- [x] Filter Berdasarkan Kategori & Pencarian (No Tujuan / Struk / Kasir)
- [x] Ekspor Laporan E-Trans ke Format CSV

### 5. Laporan Shift Kasir (`shifts`) — 🟢 Lengkap
- [x] Tabel Daftar Riwayat Shift (Kasir, Jam Buka, Jam Tutup)
- [x] Modal Ringkasan Shift (Saldo Awal, Total Penjualan, Saldo Akhir)
- [x] Indikator Visual Selisih Kas (Discrepancy Alarm Merah/Hijau/Netral)
- [x] Filter Berdasarkan Status Shift (Semua, Aktif, Selesai)
- [x] Rincian Rekonsiliasi Kas Laci & Log Mutasi Pergerakan Kas per Shift

### 6. Rekap Presensi Kasir Admin (`presensi`) — 🟢 Lengkap (Batch 2)
- [x] Tabel Rekap Kehadiran Kasir Harian & Historis
- [x] Kolom Jam Masuk, Jam Pulang, dan Status Shift
- [x] Filter berdasarkan Tanggal, Jenis (Masuk / Pulang), dan Nama Kasir
- [x] Tombol Ekspor Rekap Kehadiran Karyawan ke CSV
- [x] Tautan Langsung ke Layar QR Presensi Dinamis (`/presensi`)

### 7. Arus Kas Laci / Petty Cash (`cash`) — 🟢 Lengkap (Batch 1)
- [x] Buku Catatan Kas Masuk (Modal Tambahan, Pendapatan Non-Barang)
- [x] Buku Catatan Kas Keluar (Drop Kas, Biaya Operasional, Galon, Kebersihan)
- [x] Log Mutasi Saldo Kas Berjalan per Shift
- [x] Validasi Otorisasi Admin untuk Pengeluaran Uang Laci

### 8. Katalog Master Produk (`products`) — 🟢 Lengkap
- [x] Daftar Produk & Pencarian Real-Time (Nama / SKU)
- [x] Filter Berdasarkan Kategori
- [x] Modal Tambah & Edit Produk
- [x] Hitung Otomatis Margin & Persentase Keuntungan
- [x] Pengaturan Stok Minimum & Satuan Barang
- [x] Fitur Hapus Produk & Peringatan Konfirmasi
- [x] Ekspor Katalog Produk ke CSV

### 9. Monitoring Kartu Stok & Mutasi (`stock`) — 🟢 Lengkap (Batch 2)
- [x] Kartu Stok Real-Time seluruh produk dengan valuasi aset (cost x stock)
- [x] Penyesuaian Stok Cepat Manual (`adjustStock` - Tambah, Kurang, Set Fisik)
- [x] Rekomendasi Restock Cerdas / Kandidat Restock AI
- [x] Filter kategori & produk dengan stok kritis (< 10 unit)
- [x] Ekspor Laporan Stok ke CSV

### 10. Stock Opname Fisik (`opname`) — 🟢 Lengkap
- [x] Inisiasi Sesi Stock Opname Baru
- [x] Input Stok Hitung Fisik vs Stok Sistem
- [x] Hitung Otomatis Selisih Unit & Nilai Rupiah Selisih
- [x] Submit dan Terapkan Penyesuaian Stok ke Database

### 11. Manajemen Member Jamaah (`members`) — 🟢 Lengkap
- [x] Daftar Member & Barcode Member
- [x] Tambah, Edit, dan Hapus Data Member
- [x] Pencatatan Nomor Telepon / WhatsApp
- [x] Akumulasi Total Belanja & Poin Member

### 12. Layar Iklan Customer Display (`ads`) — 🟢 Lengkap (Batch 3)
- [x] Upload & Kelola Gambar Banner Promosi Display (Carousel berotasi otomatis)
- [x] Form Ubah Judul & Deskripsi Promo Customer
- [x] Form Ubah Running Text Ticker (Marquee)
- [x] Pengaturan Kartu Promo Produk dengan Emoji, Diskon, dan Label Badge
- [x] Tinjauan Langsung (Live Preview Simulation) Tampilan Monitor Customer

### 13. Kelola Kasir & Akun Pengguna (`users`) — 🟢 Lengkap
- [x] Daftar Akun Admin & Kasir
- [x] Tambah Kasir Baru dengan PIN 6 Digit
- [x] Toggle Status Akun (Aktif / Nonaktif)
- [x] Reset PIN Kasir Cepat
- [x] Ubah Password Admin

### 14. Sistem, Konfigurasi & Backup (`system`) — 🟢 Lengkap (Batch 3)
- [x] Ubah Nama Toko, Alamat, dan Nomor Telepon
- [x] Ubah Teks Footer Struk Belanja
- [x] Pengaturan Preset Nominal Infaq Masjid
- [x] Monitor Status Sinkronisasi Turso Cloud & Trigger Manual
- [x] Unduh File Backup Database SQLite (`/api/backup`)
- [x] Unggah File Restore Database SQLite (`/api/restore`) dengan modal konfirmasi aman
- [x] Pengaturan Tarif PPN % (Pajak Pertambahan Nilai)
- [x] Pengaturan Saldo Kas Awal Default per Shift
- [x] Pengaturan Threshold Alert Stok Menipis AI

---

## 4. Rencana Kerja Eksekusi Bertahap

```mermaid
flowchart TD
    subgraph Batch 1: Inti Transaksi & Keuangan
        B1_1["Riwayat Transaksi (transactions)"]
        B1_2["Laporan Harian (daily)"]
        B1_3["Arus Kas Laci (cash)"]
    end

    subgraph Batch 2: Operasional Staf & Stok
        B2_1["Rekap Presensi Admin (presensi)"]
        B2_2["Monitoring Kartu Stok (stock)"]
        B2_3["Layanan E-Trans (etrans)"]
    end

    subgraph Batch 3: Media Display & Backup
        B3_1["Layar Iklan POS (ads)"]
        B3_2["Backup & Restore SQLite (system)"]
        B3_3["Enhancement Dashboard & Receipt"]
    end

    Batch 1 --> Batch 2 --> Batch 3
```

1. **Batch 1 (Prioritas Tertinggi — Operasional Keuangan)**:
   - Modul `transactions`: Riwayat struk, detail modal belanja, cetak ulang struk (reprint), dan void.
   - Modul `daily`: Tutup buku harian, rekap infaq masjid, breakdown omzet, dan cetak laporan.
   - Modul `cash`: Pencatatan kas masuk / kas keluar laci (petty cash).

2. **Batch 2 (Operasional Staf & Pengawasan Stok)**:
   - Modul `presensi`: Rekapitulasi absensi kasir harian & mingguan di menu admin.
   - Modul `stock`: Kartu stok per produk, histori mutasi, dan quick adjustment stok.
   - Modul `etrans`: Rekap PPOB pulsa & fee admin.

3. **Batch 3 (Media Promosi & Keamanan Sistem)**:
   - Modul `ads`: Pengaturan banner iklan, marquee running text, dan kartu promo emoji.
   - Modul `system`: Tombol Backup & Restore database SQLite, pengaturan PPN %, saldo awal.
   - Lengkapi halaman `/receipt/:id` agar terkoneksi data riil dan cetak top 5 produk di dashboard utama.
