# 🔌 YMB Mart — Panduan Integrasi Backend Go & Turso ke Mobile

Dokumen ini memandu penambahan endpoint API di backend Go POS yang sudah ada (`ymb-mart`) agar aplikasi mobile React Native dapat langsung berkomunikasi secara lancar.

---

## 1. Migrasi Database Turso / SQLite (Tambahan untuk Online Order)

Jalankan query migrasi ini pada database (atau tambahkan di fungsi `initDB()` di [`main.go`](file:///c:/Users/DELL/Desktop/ymb-mart/main.go)):

```sql
-- 1. Tabel Alamat Pengiriman Pelanggan
CREATE TABLE IF NOT EXISTS customer_addresses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address_line TEXT NOT NULL,
    benchmark_note TEXT DEFAULT '',
    latitude REAL,
    longitude REAL,
    is_primary INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabel Pesanan Online (E-Commerce)
CREATE TABLE IF NOT EXISTS online_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no TEXT UNIQUE NOT NULL,
    member_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    fulfillment_type TEXT DEFAULT 'delivery', -- 'delivery' | 'pickup'
    address_id INTEGER,
    address_text TEXT DEFAULT '',
    status TEXT DEFAULT 'pending_payment', 
    -- Status lifecycle: pending_payment -> paid -> preparing -> delivering -> completed | cancelled
    items_subtotal INTEGER NOT NULL,
    delivery_fee INTEGER DEFAULT 0,
    discount_amount INTEGER DEFAULT 0,
    infaq_amount INTEGER DEFAULT 0,
    total_amount INTEGER NOT NULL,
    payment_method TEXT DEFAULT 'qris',
    payment_reference TEXT DEFAULT '',
    payment_status TEXT DEFAULT 'unpaid',
    shopper_notes TEXT DEFAULT '',
    courier_name TEXT DEFAULT '',
    courier_phone TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_status TEXT DEFAULT 'pending'
);

-- 3. Detail Item Pesanan Online
CREATE TABLE IF NOT EXISTS online_order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    product_name TEXT NOT NULL,
    price INTEGER NOT NULL,
    qty INTEGER NOT NULL,
    subtotal INTEGER NOT NULL,
    shopper_note TEXT DEFAULT '',
    FOREIGN KEY (order_id) REFERENCES online_orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_online_orders_member ON online_orders(member_id);
CREATE INDEX IF NOT EXISTS idx_online_orders_status ON online_orders(status);
```

---

## 2. Daftar Endpoint REST API Baru untuk Mobile

Tambahkan router berikut pada fungsi `setupRouter()` di [`server.go`](file:///c:/Users/DELL/Desktop/ymb-mart/server.go):

| Method | Endpoint | Fungsi | Auth |
|---|---|---|---|
| `GET` | `/api/v1/mobile/products` | Mengambil katalog produk, flash sale, dan banner promo. | Public |
| `GET` | `/api/v1/mobile/products/:id` | Detail produk lengkap + status stok real-time. | Public |
| `GET` | `/api/v1/mobile/categories` | Mengambil daftar kategori & icon. | Public |
| `POST`| `/api/v1/mobile/auth/otp` | Kirim OTP WhatsApp login pelanggan. | Public |
| `POST`| `/api/v1/mobile/auth/verify`| Verifikasi OTP & terbitkan token JWT pelanggan. | Public |
| `GET` | `/api/v1/mobile/addresses` | Daftar alamat tersimpan pelanggan. | Bearer JWT |
| `POST`| `/api/v1/mobile/addresses` | Tambah alamat pengiriman baru (dengan GPS). | Bearer JWT |
| `POST`| `/api/v1/mobile/orders` | Buat pesanan baru & dapatkan Midtrans Snap Token. | Bearer JWT |
| `GET` | `/api/v1/mobile/orders` | Riwayat pesanan pelanggan. | Bearer JWT |
| `GET` | `/api/v1/mobile/orders/:id` | Detail pesanan + status kurir/tracking. | Bearer JWT |
| `POST`| `/api/v1/payment/webhook` | Webhook callback resmi dari Midtrans. | Signature |

---

## 3. Contoh Handler Pembuatan Order (`handleMobileCheckout`)

Struktur data request dari aplikasi React Native:
```json
{
  "member_id": "MEM-00123",
  "customer_name": "Ahmad Dani",
  "customer_phone": "08123456789",
  "fulfillment_type": "delivery",
  "address_id": 5,
  "infaq_amount": 1700,
  "shopper_notes": "Tolong telur diplastik terpisah biar tidak pecah",
  "items": [
    {
      "product_id": 12,
      "qty": 2,
      "shopper_note": "Pilih yang kemasan utuh"
    }
  ]
}
```

Format respon balik ke React Native:
```json
{
  "success": true,
  "order_no": "YMB-20260925-0042",
  "total_amount": 75000,
  "snap_token": "midtrans-snap-token-xyz-123",
  "redirect_url": "https://app.sandbox.midtrans.com/snap/v2/vtweb/..."
}
```

---

## 4. Alur Pemberitahuan ke Layar Kasir POS Toko

Ketika pesanan online berhasil dibayar:
1. Webhook Midtrans masuk ke `/api/v1/payment/webhook` ➔ Status pesanan diupdate menjadi `paid`.
2. Server Go memicu event **WebSocket** ke browser kasir POS yang sedang aktif:
   ```json
   {
     "event": "NEW_ONLINE_ORDER",
     "order_no": "YMB-20260925-0042",
     "customer": "Ahmad Dani",
     "items_count": 5,
     "total": 75000
   }
   ```
3. Layar POS kasir otomatis membunyikan suara bel notifikasi (*audio chime*) dan memunculkan modal:
   **"Pesanan Online Masuk — Segera Siapkan Belanjaan Pelanggan"**.
