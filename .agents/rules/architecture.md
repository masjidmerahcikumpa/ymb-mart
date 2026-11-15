---
description: Technical architecture, hybrid offline-first sync engine (SQLite to Turso), WebSocket display, and code boundaries
globs: *
---

# Architecture & Implementation Plan — Baiturrahman Mart

## 1. Arsitektur Hybrid Offline-First
- **Desktop Kasir (Edge / Local)**: Berjalan sebagai single binary Go di Windows PC kasir. Database **SQLite lokal** (`ymb-mart.db`, WAL mode).
- **Cloud Central (Serverless & Turso)**: Berjalan di **Vercel** (`https://ymb-mart.vercel.app`) terhubung ke **Turso Database (libSQL)** sebagai pusat data omzet, inventaris, dan backup transaksi.
- **Frontend SPA**: React 19 + TypeScript + Vite + Tailwind CSS yang di-compile ke folder `frontend_dist/` dan di-embed langsung ke dalam binary Go (`//go:embed frontend_dist/*`).

---

## 2. Mekanisme Sync Engine (Setiap 15 Detik)
1. **Pre-check Koneksi**: Cek ping socket DNS (8.8.8.8) tanpa DNS delay.
2. **Push Local -> Cloud**:
   - Kirim `products` baru/diedit lokal.
   - Kirim `transactions` & `tx_items` lokal yang berstatus `'pending'`.
   - Kirim `shifts`, `cash_log`, `inventory_movements`, dan `attendance`.
3. **Pull Cloud -> Local**:
   - Tarik master `products` (harga, promo) dari cloud yang diupdate oleh admin via remote Vercel.
   - Tarik `settings` dan `categories`.
   - Tarik `attendance` yang disubmit kasir via QR scan mobile Vercel.

---

## 3. Komunikasi Layar Pelanggan (Customer Display WebSocket)
- Endpoint: `/ws/display` (Gorilla WebSocket).
- Setiap kali keranjang kasir berubah di `/kasir`, event dipancarkan melalui WebSocket ke `/customer` dalam waktu < 10ms.

---

## 4. Pembagian Tanggung Jawab Kode

| Folder / File | Bahasa / Stack | Tanggung Jawab |
|---|---|---|
| `frontend-app/src/` | React, TSX, Tailwind | Logika tampilan antarmuka, state keranjang kasir, form dialog, SweetAlert2 |
| `frontend-app/src/services/api.ts` | TypeScript (Axios/Fetch) | Client API, HTTP interceptors, CSRF token, session token |
| `frontend_dist/` | Static JS/CSS | Output build production Vite yang di-embed ke binary Go |
| `main.go` | Go | Inisialisasi DB, session store, auto-migration schema, seeding admin |
| `server.go` | Go | HTTP Server, API Router, WebSocket server, serving embedded static assets |
| `sync_engine.go` | Go | Logika sinkronisasi 2 arah antara SQLite lokal dan Turso Cloud |
| `handlers.go` | Go | Controller bisnis: CRUD produk, pemrosesan transaksi, shift kasir |

