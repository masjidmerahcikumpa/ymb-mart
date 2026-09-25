# 📱 YMB Mart — Konsep Aplikasi Mobile (React Native)

> **Baiturrahman Mart Online** — Belanja Kilat Kebutuhan Harian (Astro / Alfagift Model)  
> Document Version: 2.0 (React Native Best Practice Edition) | September 2026

---

## 1. Ringkasan Eksekutif & Value Proposition

Aplikasi mobile belanja kilat untuk **Baiturrahman Mart (YMB Mart)** yang terintegrasi langsung dengan ekosistem **POS Toko Fisik (Go Backend + Turso Cloud)**.

Target platform: **iOS & Android** dari satu basis kode menggunakan **React Native (Expo SDK)**.

### Pilar Utama Produk:
1. **Express Delivery 15–30 Menit**: Hyperlocal fulfillment langsung dari toko Baiturrahman Mart ke radius pemukiman sekitar.
2. **Personal Shopper**: Kasir/staf toko memilihkan produk segar (sayur, buah, daging) dengan konfirmasi foto/catatan jika barang habis/substitusi.
3. **Omnichannel Member Loyalty (YMB Gold)**: Poin belanja dan tier diskon terintegrasi sama persis antara belanja di kasir fisik toko dan di aplikasi online.
4. **Halal-First & Komunitas Masjid**: Pilihan produk terverifikasi halal, promo jumat berkah, dan fitur sedekah kembalian/infaq subuh.

---

## 2. Tech Stack Rekomendasi (Modern React Native 2026)

| Layer | Pilihan Teknologi | Alasan & Keunggulan |
|---|---|---|
| **Framework & Runtime** | **React Native + Expo SDK 51/52+** | Single codebase iOS & Android, fast refresh, native performance via New Architecture (Hermes engine). |
| **Routing / Navigasi** | **Expo Router v3+ (File-based)** | Standar resmi Expo (mirip Next.js), type-safe navigation, deep linking otomatis untuk push notif promo/pesanan. |
| **State Management** | **Zustand** (Client State) + **TanStack Query v5** (Server Cache) | Sangat ringan, zero-boilerplate, otomatis handle caching produk, revalidasi stok real-time, dan offline optimistic update. |
| **Styling & Design System** | **NativeWind v4 (Tailwind CSS)** | Konsistensi UI token, responsive styling, performa tinggi tanpa runtime overhead berlebih. |
| **Local Storage** | **react-native-mmkv** + **expo-secure-store** | MMKV hingga 30x lebih cepat dari AsyncStorage untuk cart & cache katalog; SecureStore untuk token JWT. |
| **Maps & Lokasi** | **react-native-maps** + **expo-location** | Deteksi akurat GPS alamat antar, polyline rute kurir, dan radius jangkauan delivery. |
| **Scanner Barcode** | **expo-camera** | Membaca barcode produk saat pelanggan sedang berada di toko fisik untuk cek info/promo harga. |
| **Payment Gateway** | **Midtrans Snap SDK / QRIS Dinamis** | Support QRIS (semua e-wallet & m-banking), GoPay, ShopeePay, OVO, Virtual Account (BCA, Mandiri, BRI, BSI). |
| **Push Notifications** | **expo-notifications** + **Firebase (FCM)** | Notifikasi real-time update status pesanan kurir & flash sale. |
| **Backend & DB** | **Go Backend (REST + WS) + Turso Cloud (LibSQL)** | Langsung terhubung dengan POS yang sudah berjalan tanpa perlu rewrite backend baru. |

---

## 3. Arsitektur Integrasi: POS Toko Fisik ⇄ Mobile App

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            MOBILE APP (React Native)                        │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ UI Screens (Expo Router): Home | PDP | Cart | Checkout | Tracking   │   │
│   └──────────────────────────────────┬──────────────────────────────────┘   │
│                                      │                                      │
│   ┌──────────────────────────────────┴──────────────────────────────────┐   │
│   │ State Layer: Zustand (Cart/Auth) + TanStack React Query (Products)  │   │
│   └──────────────────────────────────┬──────────────────────────────────┘   │
│                                      │ (HTTPS REST + WebSocket)             │
└──────────────────────────────────────┼──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          YMB MART BACKEND (Golang)                          │
│                                                                             │
│   ┌───────────────────────────────┐     ┌───────────────────────────────┐   │
│   │    POS Server (Local Kasir)   │     │    Mobile API Gateway (Cloud) │   │
│   │    - Barcode Scanner Fisik    │     │    - /api/v1/mobile/products  │   │
│   │    - Kiosk Thermal Printer    │     │    - /api/v1/mobile/orders    │   │
│   │    - Shift Cash Management    │     │    - /api/v1/payment/webhook  │   │
│   └───────────────┬───────────────┘     └───────────────┬───────────────┘   │
│                   │                                     │                   │
│                   ▼                                     ▼                   │
│           ┌─────────────────────────────────────────────────────┐           │
│           │               TURSO CLOUD DATABASE                  │           │
│           │         (LibSQL Distributed Cloud Database)         │           │
│           │  - products (stok shared terupdate real-time)       │           │
│           │  - members (poin & tier terintegrasi)               │           │
│           │  - orders (pesanan online masuk ke dashboard kasir) │           │
│           └─────────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Design System Tokens (Mapped to Tailwind/NativeWind)

### Color Palette
```javascript
// tailwind.config.js tokens
colors: {
  primary: {
    DEFAULT: '#670024', // Deep Burgundy (Brand Utama)
    container: '#8B1538',
    dark: '#450017',
    light: '#F8EEF1',
  },
  secondary: {
    DEFAULT: '#735C00', // Gold Accent
    container: '#FED65B', // Member YMB Gold Badge
    light: '#FFF9E6',
  },
  tertiary: {
    DEFAULT: '#003925', // Halal Emerald Green
    container: '#005237', // Tombol "+ Tambah", In-Stock
    light: '#E6F4EA',
  },
  danger: '#BA1A1A', // Diskon, Flash Sale, Urgent Countdown
  surface: '#F8F9FF', // Background Kanvas
  card: '#FFFFFF',
  text: {
    primary: '#0B1C30',
    secondary: '#536070',
    muted: '#8D99AE',
  }
}
```

### Typography
- **Headings & Price**: *Plus Jakarta Sans* (SemiBold 600, Bold 700, ExtraBold 800)
- **Body & Labels**: *Inter* (Regular 400, Medium 500, SemiBold 600)

---

## 5. Fitur Kunci & Diferensiasi (Vs Alfagift/Astro)

1. **Personal Shopper Flow**:
   - Pelanggan bisa menulis catatan spesifik per produk (contoh: *"Pilihkan pisang yang masih agak hijau"* atau *"Jika merek A habis, boleh ganti merek B"*).
   - Kasir POS dapat langsung melihat catatan ini di list pesanan belanjaan.
2. **Dual-Mode Fulfillment**:
   - **Express Delivery**: Diantar kurir toko 15–30 menit ke alamat rumah.
   - **Self-Pickup (Ambil di Toko)**: Pesanan disiapkan staf toko, pembeli tinggal mampir ke kasir tanpa perlu antre belanja.
3. **Smart Barcode Check-In**:
   - Saat pembeli berada di dalam toko Baiturrahman Mart, kamera scanner di aplikasi bisa diarahkan ke barcode rak/produk untuk melihat rincian ulasan, status kehalalan, atau kupon diskon member yang tersedia.
4. **Infaq & Zakat Terpadu**:
   - Checkbox saat checkout: *"Bulatkan total belanja untuk Infaq YMB"* (contoh: Rp 48.300 menjadi Rp 50.000, selisih Rp 1.700 masuk ke kas sosial masjid).

---

## 6. Model Data & Ekstensi Database (Sinkron POS)

Tabel tambahan yang ditambahkan ke Turso DB untuk mendukung mobile app:

```sql
-- 1. Alamat pengiriman pelanggan
CREATE TABLE IF NOT EXISTS customer_addresses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address_line TEXT NOT NULL,
    benchmark_note TEXT DEFAULT '', -- Patokan rumah (e.g. cat hijau samping musala)
    latitude REAL,
    longitude REAL,
    is_primary INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Pesanan online (dengan lifecycle tracking)
CREATE TABLE IF NOT EXISTS online_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no TEXT UNIQUE NOT NULL, -- Format: YMB-YYYYMMDD-XXXX
    member_id TEXT NOT NULL,
    address_id INTEGER,
    fulfillment_type TEXT DEFAULT 'delivery', -- 'delivery' | 'pickup'
    status TEXT DEFAULT 'pending_payment', 
    -- Status: pending_payment -> paid -> preparing (shopper) -> delivering -> completed | cancelled
    items_subtotal INTEGER NOT NULL,
    delivery_fee INTEGER DEFAULT 0,
    discount_amount INTEGER DEFAULT 0,
    infaq_amount INTEGER DEFAULT 0,
    total_amount INTEGER NOT NULL,
    payment_method TEXT DEFAULT 'qris',
    payment_reference TEXT DEFAULT '',
    shopper_notes TEXT DEFAULT '',
    courier_name TEXT DEFAULT '',
    courier_phone TEXT DEFAULT '',
    estimated_arrival TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Item dalam pesanan online
CREATE TABLE IF NOT EXISTS online_order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    product_name TEXT NOT NULL,
    product_price INTEGER NOT NULL,
    qty INTEGER NOT NULL,
    subtotal INTEGER NOT NULL,
    shopper_note TEXT DEFAULT '',
    FOREIGN KEY (order_id) REFERENCES online_orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);
```

---

## 7. Rencana Eksekusi Bertahap (Sprint Roadmap)

- **Sprint 1 (Fondasi & Setup)**: Inisialisasi Expo Router TypeScript + NativeWind tokens + Service API Client.
- **Sprint 2 (Katalog & Navigasi)**: Home Screen, Kategori, Search Barcode, Product Detail Screen.
- **Sprint 3 (Cart & Checkout)**: Manajemen Keranjang (Zustand), Pilih Alamat, Ringkasan Biaya, Infaq Checkbox.
- **Sprint 4 (Payment & Order Management)**: Integrasi Midtrans QRIS/VA, Webhook update order, Order History.
- **Sprint 5 (Tracking & Polish)**: Order Tracking Screen dengan Live Stepper & Peta Kurir, Push Notification FCM.
