---
description: Full database schema definition for SQLite and Turso, table columns, constraints, foreign keys, and sync_status
globs: *
---

# Database Schema & Data Models — Baiturrahman Mart

Definisi skema tabel pada SQLite lokal (`ymb-mart.db`) dan Turso Cloud (libSQL).

---

## 1. Tabel Inti

### `users`
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,                -- bcrypt hash
    display_name TEXT DEFAULT '',
    role TEXT DEFAULT 'kasir',             -- 'admin' | 'kasir'
    active INTEGER DEFAULT 1,
    password_changed INTEGER DEFAULT 0,
    sync_status TEXT DEFAULT 'synced'      -- 'synced' | 'pending'
);
```

### `products`
```sql
CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    price INTEGER DEFAULT 0,               -- Harga Jual
    cost INTEGER DEFAULT 0,                -- Harga Pokok / Beli
    category TEXT DEFAULT 'Umum',
    stock INTEGER DEFAULT 0,               -- Stok Fisik
    min_stock INTEGER DEFAULT 0,           -- Batas Minimum Peringatan
    reserved_stock INTEGER DEFAULT 0,
    unit TEXT DEFAULT 'pcs',
    barcode TEXT DEFAULT '',
    promo_price INTEGER DEFAULT 0,
    promo_active INTEGER DEFAULT 0,
    tax_rate REAL DEFAULT -1,
    active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_status TEXT DEFAULT 'pending'
);
```

### `transactions` & `tx_items`
```sql
CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tx_id TEXT UNIQUE NOT NULL,            -- e.g. "TRX-20261115-001"
    shift_id INTEGER,
    total INTEGER DEFAULT 0,
    discount INTEGER DEFAULT 0,
    tax INTEGER DEFAULT 0,
    grand_total INTEGER DEFAULT 0,
    payment TEXT DEFAULT 'CASH',           -- 'CASH', 'QRIS', 'TRANSFER'
    amount_paid INTEGER DEFAULT 0,
    change_amount INTEGER DEFAULT 0,
    customer_name TEXT DEFAULT '',
    member_id INTEGER DEFAULT NULL,
    cashier TEXT DEFAULT 'kasir',
    notes TEXT DEFAULT '',
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_status TEXT DEFAULT 'pending'
);

CREATE TABLE tx_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tx_id TEXT NOT NULL,
    product_id INTEGER,
    name TEXT NOT NULL,
    qty INTEGER DEFAULT 1,
    price INTEGER DEFAULT 0,
    discount INTEGER DEFAULT 0,
    subtotal INTEGER DEFAULT 0,
    notes TEXT DEFAULT ''
);
```

### `shifts` & `cash_log`
```sql
CREATE TABLE shifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shift_name TEXT NOT NULL,
    cashier TEXT NOT NULL,
    opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP DEFAULT NULL,
    opening_cash INTEGER DEFAULT 0,        -- Modal Awal
    closing_cash INTEGER DEFAULT 0,        -- Uang Fisik Diinput Kasir
    expected_cash INTEGER DEFAULT 0,       -- Uang Seharusnya
    cash_sales INTEGER DEFAULT 0,          -- Penjualan Tunai
    cash_out INTEGER DEFAULT 0,            -- Kas Kecil Keluar
    cash_discrepancy INTEGER DEFAULT 0,    -- Selisih Uang (closing - expected)
    total_sales INTEGER DEFAULT 0,
    total_tx INTEGER DEFAULT 0,
    status TEXT DEFAULT 'open',
    sync_status TEXT DEFAULT 'pending'
);

CREATE TABLE cash_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shift_id INTEGER,
    type TEXT NOT NULL,                    -- 'IN' | 'OUT'
    amount INTEGER DEFAULT 0,
    description TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_status TEXT DEFAULT 'pending'
);
```

### `members`, `attendance`, `settings`
```sql
CREATE TABLE members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    points INTEGER DEFAULT 0,
    tier TEXT DEFAULT 'basic',
    active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_status TEXT DEFAULT 'pending'
);

CREATE TABLE attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    username TEXT NOT NULL,
    cashier_name TEXT NOT NULL,
    type TEXT NOT NULL,                    -- 'CLOCK_IN', 'CLOCK_OUT'
    date TEXT NOT NULL,                    -- 'YYYY-MM-DD'
    time TEXT NOT NULL,                    -- 'HH:MM:SS'
    notes TEXT DEFAULT '',
    device_info TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_status TEXT DEFAULT 'pending'
);

CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
```

