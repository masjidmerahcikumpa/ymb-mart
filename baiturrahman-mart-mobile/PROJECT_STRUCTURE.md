# 📁 YMB Mart Mobile — React Native (Expo) Project Structure

Struktur folder mengadopsi standar **Feature-Driven Architecture** dengan **Expo Router (File-Based Routing)** dan **TypeScript**.

```text
ymb-mart-mobile/
├── app/                                 # 🌐 Expo Router (Pages & Routes)
│   ├── _layout.tsx                      # Root Layout (QueryClient, AuthProvider, Theme)
│   ├── index.tsx                        # Splash / Auth Gate redirect
│   │
│   ├── (auth)/                          # 🔐 Group Route: Autentikasi
│   │   ├── _layout.tsx                  # Stack layout tanpa header
│   │   ├── login.tsx                    # Login nomor HP / WhatsApp
│   │   └── otp.tsx                      # Verifikasi OTP 4/6 digit
│   │
│   ├── (tabs)/                          # 📱 Main Bottom Navigation (4 Tabs Utama)
│   │   ├── _layout.tsx                  # Custom Bottom Tab Navigator
│   │   ├── index.tsx                    # Tab 1: Beranda (Home / Flash Sale / Banner)
│   │   ├── categories.tsx               # Tab 2: Kategori Produk
│   │   ├── orders.tsx                   # Tab 3: Riwayat & Status Pesanan
│   │   └── profile.tsx                  # Tab 4: Akun, Poin YMB Gold & Pengaturan
│   │
│   ├── product/
│   │   └── [id].tsx                     # 🔍 Product Detail Page (PDP) & Catatan Shopper
│   │
│   ├── search/
│   │   ├── index.tsx                    # Pencarian teks + Filter
│   │   └── scanner.tsx                  # Barcode Scanner Kamera (In-Store Check)
│   │
│   ├── cart/
│   │   ├── index.tsx                    # Layar Keranjang Belanja
│   │   ├── address.tsx                  # Pemilihan & Penambahan Alamat Antar
│   │   └── payment.tsx                  # Checkout & Pembayaran Midtrans Snap
│   │
│   ├── order/
│   │   └── [id]/
│   │       ├── tracking.tsx             # 🛵 Live Tracking Kurir + Peta + ETA
│   │       └── success.tsx              # Konfirmasi Pesanan Sukses
│   │
│   └── member/
│       ├── loyalty.tsx                  # Kartu Member YMB Gold Digital + QR Member
│       └── infaq.tsx                    # Program Sedekah & Infaq Subuh Baiturrahman
│
├── src/                                 # 🧱 Source Code (Clean Business Logic)
│   ├── assets/                          # Static Assets
│   │   ├── icons/                       # SVG Icons
│   │   ├── images/                      # Logo YMB Mart, Banner Promo
│   │   └── fonts/                       # PlusJakartaSans & Inter
│   │
│   ├── components/                      # Reusable UI Components
│   │   ├── common/
│   │   │   ├── Header.tsx               # Top Header dengan Lokasi & Search bar
│   │   │   ├── Button.tsx               # Primary / Secondary Buttons
│   │   │   ├── Badge.tsx                # Tag Diskon / Halal / In-Stock
│   │   │   ├── PriceDisplay.tsx         # Format otomatis Rp XX.XXX
│   │   │   └── ShimmerSkeleton.tsx      # Skeleton loading placeholder
│   │   ├── home/
│   │   │   ├── BannerCarousel.tsx       # Banner promo geser
│   │   │   ├── LoyaltyRibbon.tsx        # Ringkasan poin YMB Gold
│   │   │   ├── CategoryGrid.tsx         # Grid icon kategori 4x2
│   │   │   ├── FlashSaleSection.tsx     # Hitung mundur flash sale
│   │   │   └── FloatingCartBar.tsx      # Bar ringkasan keranjang melayang di bawah
│   │   ├── product/
│   │   │   ├── ProductCard.tsx          # Card produk di katalog
│   │   │   ├── QuantityStepper.tsx      # Tombol [- 1 +]
│   │   │   └── ShopperNoteModal.tsx     # Popup catatan personal shopper
│   │   └── tracking/
│   │       ├── TrackingMap.tsx          # Render peta rute kurir
│   │       └── StatusStepper.tsx        # Indikator status (Diterima -> Dikemas -> Diantar)
│   │
│   ├── constants/                       # Konfigurasi & Token Desain
│   │   ├── colors.ts                    # Color tokens (#670024, #FED65B, #005237)
│   │   ├── endpoints.ts                 # Base API URL & endpoint list
│   │   └── layout.ts                    # Spacing, Screen Dimensions, Border Radii
│   │
│   ├── hooks/                           # Custom React Hooks
│   │   ├── useProducts.ts               # TanStack Query hook untuk list produk
│   │   ├── useProductDetail.ts          # TanStack Query hook untuk detail produk
│   │   ├── useOrders.ts                 # Query pesanan user
│   │   ├── useLocation.ts               # Hook deteksi GPS & geocoding
│   │   └── useDebounce.ts               # Hook debounce untuk search bar
│   │
│   ├── stores/                          # Client State Management (Zustand)
│   │   ├── useCartStore.ts              # Items di cart, kalkulasi total, catatan shopper
│   │   ├── useAuthStore.ts              # Token JWT member, profil aktif, status login
│   │   └── useAddressStore.ts           # Alamat terpilih saat ini
│   │
│   ├── services/                        # Integrasi Eksternal & API
│   │   ├── api.ts                       # Axios instance dengan request/response interceptor
│   │   ├── storage.ts                   # MMKV wrapper untuk persistent storage cepat
│   │   ├── notifications.ts             # Inisialisasi FCM & listener push notif
│   │   └── payment.ts                   # Helper transaksi Midtrans Snap
│   │
│   ├── types/                           # TypeScript Type Definitions
│   │   ├── product.ts                   # Product, Category, Promo interface
│   │   ├── cart.ts                      # CartItem, CheckoutPayload interface
│   │   ├── order.ts                     # OnlineOrder, OrderStatus, TrackingInfo
│   │   ├── member.ts                    # MemberProfile, LoyaltyTier
│   │   └── address.ts                   # CustomerAddress interface
│   │
│   └── utils/                           # Helper Functions
│       ├── currency.ts                  # formatRupiah(number)
│       ├── date.ts                      # Format tanggal Indonesia (WIB)
│       └── distance.ts                  # Hitung estimasi ongkir berdasarkan KM
│
├── app.json                             # Konfigurasi Expo & Plugin Native
├── tailwind.config.js                   # Setup NativeWind v4 & Color tokens
├── tsconfig.json                        # TypeScript configuration dengan path alias (@/*)
├── babel.config.js                      # Babel setup untuk Expo + NativeWind
└── package.json                         # Dependencies & Scripts
```

---

## 📦 Rekomendasi Dependencies Utama (`package.json`)

```json
{
  "name": "ymb-mart-mobile",
  "version": "1.0.0",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web"
  },
  "dependencies": {
    "expo": "~51.0.0",
    "expo-router": "~3.5.0",
    "expo-status-bar": "~1.12.1",
    "react": "18.2.0",
    "react-native": "0.74.5",
    "react-native-safe-area-context": "4.10.5",
    "react-native-screens": "3.31.1",
    
    "@tanstack/react-query": "^5.50.0",
    "zustand": "^4.5.4",
    "axios": "^1.7.2",
    "react-native-mmkv": "^2.12.2",
    
    "nativewind": "^4.0.1",
    "tailwindcss": "^3.4.0",
    
    "react-native-maps": "1.14.0",
    "expo-location": "~17.0.1",
    "expo-camera": "~15.0.13",
    "expo-image": "~1.12.12",
    "expo-secure-store": "~13.0.2",
    "expo-notifications": "~0.28.9",
    "expo-haptics": "~13.0.1",
    
    "lucide-react-native": "^0.400.0",
    "lottie-react-native": "6.7.0"
  },
  "devDependencies": {
    "@babel/core": "^7.20.0",
    "@types/react": "~18.2.45",
    "typescript": "~5.3.3"
  }
}
```

---

## ⚙️ Path Alias TypeScript (`tsconfig.json`)

Untuk kemudahan import file agar bersih dan tidak berantakan:
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@stores/*": ["src/stores/*"],
      "@hooks/*": ["src/hooks/*"],
      "@types/*": ["src/types/*"]
    }
  }
}
```
Contoh penggunaan di dalam kode:
```typescript
import { Button } from '@components/common/Button';
import { useCartStore } from '@stores/useCartStore';
import { Product } from '@types/product';
```
