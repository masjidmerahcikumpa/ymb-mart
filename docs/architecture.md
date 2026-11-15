# Architecture & Implementation Plan — Baiturrahman Mart

## 1. Arsitektur Tingkat Tinggi (High-Level Architecture)

Aplikasi Baiturrahman Mart menggunakan arsitektur **Hybrid Offline-First**:
- **Desktop Kasir (Edge / Local)**: Berjalan sebagai single binary Go portabel di Windows PC kasir. Menggunakan database **SQLite lokal** (`ymb-mart.db`) berkecepatan tinggi dengan WAL mode.
- **Cloud Central (Serverless & Turso)**: Berjalan di **Vercel** (`https://ymb-mart.vercel.app`) dan terhubung ke **Turso Database (libSQL)** sebagai pusat data omzet, inventaris, dan backup transaksi.
- **Frontend SPA**: React 19 + TypeScript + Vite + Tailwind CSS yang di-compile ke folder `frontend_dist/` dan di-embed langsung ke dalam binary Go (`//go:embed frontend_dist/*`).

```mermaid
flowchart TD
    subgraph Kasir_Lokal["PC Kasir Lokal (Offline-First)"]
        UI_POS["React SPA (Vite / localhost:8070)"]
        GoServer["Go Backend Server (ymb-mart.exe)"]
        LocalSQLite[("SQLite Lokal (WAL Mode)\nymb-mart.db")]
        SyncWorker["Sync Engine (Background Worker)"]
        
        UI_POS <-->|HTTP / REST API| GoServer
        GoServer <--> LocalSQLite
        SyncWorker <-->|Baca/Tulis sync_status| LocalSQLite
    end

    subgraph Layar_Kedua["Layar Pelanggan (Customer Display)"]
        DisplayUI["React Customer Display (/customer)"]
        GoServer <-->|WebSocket (/ws/display)| DisplayUI
    end

    subgraph Cloud_Production["Cloud & Remote (Vercel & Turso)"]
        VercelServer["Go Serverless Handler (Vercel)"]
        TursoCloud[("Turso Cloud Database\n(libSQL Serverless)")]
        AdminWeb["Admin Mobile / Remote Access"]
        
        AdminWeb -->|HTTPS| VercelServer
        VercelServer <--> TursoCloud
        SyncWorker <-->|LibSQL Sync (Setiap 15s)| TursoCloud
    end
```

---

## 2. Mekanisme Sinkronisasi (Sync Engine)

### A. Pola Data `sync_status`
Setiap baris data transaksi, produk, shift, dan mutasi memiliki kolom `sync_status`:
- `'pending'`: Data dibuat/diedit secara offline di lokal, menunggu dikirim ke Cloud.
- `'synced'`: Data sudah tersimpan identik di Turso Cloud dan SQLite lokal.

### B. Siklus Sinkronisasi (Setiap 15 Detik):
1. **Pre-check Koneksi**: Cek ping socket DNS (8.8.8.8) tanpa overhead timeout lambat.
2. **Push Local -> Cloud**:
   - Kirim `products` baru/diedit lokal.
   - Kirim `transactions` & `tx_items` lokal yang berstatus `'pending'`.
   - Kirim `shifts`, `cash_log`, `inventory_movements`, dan `attendance`.
3. **Pull Cloud -> Local**:
   - Tarik master `products` (harga, promo) dari cloud yang diupdate oleh admin via remote Vercel.
   - Tarik `settings` dan `categories`.
   - Tarik `attendance` yang disubmit kasir via QR scan mobile Vercel.

---

## 3. Komunikasi Layar Pelanggan (Dual Display WebSocket)
- Endpoint: `/ws/display`
- Menggunakan Gorilla WebSocket di backend Go.
- Setiap kali keranjang belanja kasir berubah di `/kasir`, event dikirimkan melalui WebSocket ke `/customer` dalam waktu < 10ms.

---

## 4. Pembagian Tanggung Jawab Kode (Code Boundaries)

| Folder / File | Bahasa / Stack | Tanggung Jawab |
|---|---|---|
| `frontend-app/src/` | React, TSX, Tailwind | Logika tampilan antarmuka, state keranjang kasir, form dialog, SweetAlert2 |
| `frontend-app/src/services/api.ts` | TypeScript (Axios/Fetch) | Client API, HTTP interceptors, CSRF token, session token |
| `frontend_dist/` | Static JS/CSS | Output build production Vite yang di-embed ke binary Go |
| `main.go` | Go | Inisialisasi DB, session store, auto-migration schema, seeding admin |
| `server.go` | Go | HTTP Server, API Router, WebSocket server, serving embedded static assets |
| `sync_engine.go` | Go | Logika sinkronisasi 2 arah antara SQLite lokal dan Turso Cloud |
| `handlers.go` | Go | Controller bisnis: CRUD produk, pemrosesan transaksi, shift kasir |

