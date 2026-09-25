# 🗺️ YMB Mart Mobile — Screen Flow & Navigation Map (Expo Router)

Panduan navigasi layar, rute Expo Router, dan alur interaksi pengguna untuk aplikasi **YMB Mart**.

---

## 1. Peta Navigasi & Hirarki Layar (Expo Router)

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                            ROOT NAVIGATION TREE                             │
│                                                                             │
│  [ app/index.tsx ] (Splash / Session Check)                                 │
│        │                                                                    │
│        ├── Belum Login ──► [ app/(auth)/login.tsx ] ──► [ otp.tsx ]         │
│        │                                                                    │
│        └── Sudah Login / Guest Mode                                         │
│                 ▼                                                           │
│  ════════════════════════════════════════════════════════════════════════   │
│                 MAIN TAB NAVIGATOR [ app/(tabs)/_layout.tsx ]               │
│  ════════════════════════════════════════════════════════════════════════   │
│        │                 │                    │                 │           │
│        ▼                 ▼                    ▼                 ▼           │
│   [ Tab 1 ]          [ Tab 2 ]            [ Tab 3 ]         [ Tab 4 ]       │
│  (tabs)/index    (tabs)/categories     (tabs)/orders     (tabs)/profile     │
│   (Beranda)      (Katalog Produk)      (Pesanan Saya)    (Akun & Poin)      │
│        │                                      │                 │           │
│        ├─► [ search/index.tsx ] (Cari Teks)   │                 ├─► [ member/loyalty.tsx ]
│        ├─► [ search/scanner.tsx ] (Barcode)   │                 └─► [ cart/address.tsx ]
│        │                                      │
│        ▼                                      │
│   [ product/[id].tsx ] (Product Detail)       │
│        │                                      │
│        ▼ (Tambah ke Keranjang)                │
│   [ cart/index.tsx ] (Review Keranjang) ◄─────┘ (Reorder)
│        │
│        ├─► [ cart/address.tsx ] (Pilih Alamat Antar)
│        │
│        ▼
│   [ cart/payment.tsx ] (Pilih Metode & Bayar QRIS)
│        │
│        ▼
│   [ order/[id]/success.tsx ] (Pembayaran Berhasil)
│        │
│        ▼
│   [ order/[id]/tracking.tsx ] (Live Tracking Kurir Express 15-30m)
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Inventaris Layar (Screen Inventory)

| No | Nama Layar | File Path (Expo Router) | Tipe Layar | Deskripsi & Komponen Kunci |
|---|---|---|---|---|
| 1 | **Splash Screen** | `app/index.tsx` | Fullscreen | Validasi session JWT di MMKV, redirect ke Beranda atau Login. |
| 2 | **Login No. HP** | `app/(auth)/login.tsx` | Stack | Input nomor WhatsApp / HP, integrasi Google Sign-In alternatif. |
| 3 | **Verifikasi OTP** | `app/(auth)/otp.tsx` | Stack | Input 6 digit OTP otomatis detect via SMS/WhatsApp. |
| 4 | **Beranda (Home)** | `app/(tabs)/index.tsx` | Tab | Header alamat, search bar, banner promo, flash sale countdown, grid produk terlaris, floating cart bar. |
| 5 | **Kategori Produk** | `app/(tabs)/categories.tsx` | Tab | Split view kategori di kiri, daftar subkategori & produk di kanan. |
| 6 | **Pencarian** | `app/search/index.tsx` | Stack | Debounced text search, riwayat pencarian terakhir, filter kategori & harga. |
| 7 | **Barcode Scanner** | `app/search/scanner.tsx` | Modal/Camera | Kamera full untuk scan barcode fisik saat di toko, langsung membuka PDP. |
| 8 | **Product Detail (PDP)**| `app/product/[id].tsx` | Stack | Carousel foto, harga, diskon, status stok, stepper qty, **modal catatan personal shopper**. |
| 9 | **Keranjang Belanja** | `app/cart/index.tsx` | Stack | Review item, catatan per barang, opsi Delivery vs Self-Pickup, checkbox infaq subuh, voucher promo. |
| 10 | **Pilih Alamat** | `app/cart/address.tsx` | Stack | Pinpoint koordinat peta, daftar alamat tersimpan, field patokan rumah. |
| 11 | **Pembayaran (Payment)**| `app/cart/payment.tsx` | Stack | Pilihan QRIS otomatis, GoPay/ShopeePay deeplink, Virtual Account bank, countdown bayar. |
| 12 | **Order Sukses** | `app/order/[id]/success.tsx` | Stack | Animasi centang sukses (Lottie), ringkasan belanja, tombol "Lacak Pesanan". |
| 13 | **Live Tracking** | `app/order/[id]/tracking.tsx`| Stack | Peta posisi kurir (real-time), status stepper (Shopper mengemas ➔ Kurir jalan ➔ Sampai), tombol chat WA kurir. |
| 14 | **Riwayat Pesanan** | `app/(tabs)/orders.tsx` | Tab | Tab "Sedang Berjalan" dan "Selesai", tombol re-order 1 klik. |
| 15 | **Kartu Member YMB** | `app/member/loyalty.tsx` | Stack | Barcode member untuk discan di kasir toko fisik, riwayat poin, benefit tier Gold. |
| 16 | **Profil Pengguna** | `app/(tabs)/profile.tsx` | Tab | Edit data diri, bantuan CS WhatsApp, pengaturan notifikasi, tombol logout. |

---

## 3. Detail User Flow Utama

### Alur 1: Pembelian Kilat 15–30 Menit (Express Checkout Flow)
> **Target UX: Kurang dari 4 ketukan dari buka aplikasi sampai bayar.**

1. **Beranda**: Pengguna mengetik nama barang (misal: "Telur Ayam") atau memilih dari banner Flash Sale.
2. **Katalog / PDP**: Pengguna menekan tombol hijau **`+ Tambah`**. Bar floating keranjang di bawah langsung muncul dengan animasi getar (Haptic feedback) dan update total harga.
3. **Keranjang**: Pengguna menekan floating bar ➔ Masuk layar Keranjang ➔ Alamat otomatis terisi alamat utama ➔ Menekan tombol **`Lanjut Pembayaran`**.
4. **Pembayaran**: Aplikasi menampilkan QRIS dinamis Midtrans (bisa langsung di-screenshot atau dibuka langsung ke aplikasi e-wallet).
5. **Konfirmasi**: Webhook backend mendeteksi pembayaran sukses ➔ Layar otomatis beralih ke **Live Tracking Kurir**.

---

### Alur 2: Fitur Unik "Personal Shopper"
1. Pada layar Detail Produk atau Keranjang, terdapat opsi **"Catatan untuk Personal Shopper"**.
2. Contoh: 
   - Produk: *Alpukat Mentega 1 kg*
   - Catatan: *"Tolong pilihkan yang matang 2 buah, sisanya yang masih mengkal untuk 3 hari lagi."*
3. Catatan ini tersimpan di backend dan langsung dicetak/muncul di layar dashboard kasir toko Baiturrahman Mart saat staf menyiapkan barang.

---

### Alur 3: In-Store Barcode Check (Belanja di Toko Fisik)
1. Pembeli sedang berada di dalam toko Baiturrahman Mart.
2. Membuka aplikasi YMB Mart ➔ Menekan icon **Scanner Barcode** di search bar.
3. Mengarahkan kamera ke barcode produk di rak ➔ Aplikasi langsung menampilkan ulasan, status halal, stok toko, dan promo harga member khusus.

---

## 4. Deep Link Configuration (Expo Linking)

Skema URL untuk membuka langsung layar tertentu dari Push Notification atau WhatsApp:

```text
URL Scheme: ymbmart://

ymbmart://product/105                  -> Buka Detail Produk ID 105
ymbmart://order/YMB-20260925-001/track -> Buka Live Tracking Pesanan
ymbmart://cart                         -> Buka Keranjang
ymbmart://flash-sale                   -> Buka Bagian Flash Sale
ymbmart://member                       -> Buka Kartu Member YMB Gold
```
