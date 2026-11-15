# AI Vibe Coding Guidelines & Rules — Baiturrahman Mart

File panduan ini dibaca oleh agen AI (Cursor, Windsurf, Claude, Copilot, Antigravity) sebelum membaca atau menulis kode di project **Baiturrahman Mart (YMB Mart)**.

---

## 1. Arsitektur Inti & Teknologi (Core Stack)
- **Backend**: Go (Go 1.22+), HTTP ServeMux standar, Gorilla WebSocket, modernc SQLite (pure Go, CGO-free).
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, SweetAlert2.
- **Database**: Hybrid — SQLite lokal (`ymb-mart.db`, WAL Mode) + Turso Cloud (libSQL).
- **Hosting / Deploy**: Vercel Serverless Go + Embedded React Static Assets (`distFS embed.FS`).

---

## 2. Aturan Mutlak untuk AI (Inviolable Rules)

### 🚨 Aturan 1: Single Binary & Build Synchronicity
- Seluruh kode frontend berada di `frontend-app/src/`.
- Backend Go melayani asset dari `frontend_dist/` via `embed.FS`.
- **Setiap kali mengubah kode di `frontend-app/src/`**:
  AI wajib menjalankan `npm run build` di `frontend-app` agar `frontend_dist/` ter-update sebelum commit/push ke GitHub atau menjalankan binary lokal.

### 🚨 Aturan 2: Dilarang Menggunakan `alert()` & `confirm()` Bawaan Browser
- Semua dialog notifikasi, konfirmasi hapus, atau laporan shift **WAJIB** menggunakan modul SweetAlert2 terpusat:
  `import { showSuccessAlert, showErrorAlert, showWarningAlert, showConfirmAlert, showShiftCloseAlert } from '@/utils/alert';`
- Warna tombol konfirmasi harus konsisten dengan brand Baiturrahman Mart: `#8b1538`.

### 🚨 Aturan 3: Zero Scrollbars di Admin & Kasir
- Seluruh halaman kasir dan dashboard admin tidak boleh memunculkan scrollbar abu-abu default browser.
- Gunakan utility class `no-scrollbar` dan pertahankan CSS global `scrollbar-width: none !important;` serta `::-webkit-scrollbar { display: none !important; }`.

### 🚨 Aturan 4: Offline-First Integrity
- Tidak boleh membuat query API yang gagal saat internet mati.
- Setiap mutasi data di POS (transaksi, shift, petty cash) harus tersimpan di SQLite lokal dengan kolom `sync_status = 'pending'`, lalu biarkan background sync engine (`sync_engine.go`) yang menyinkronkannya ke Turso saat online.

### 🚨 Aturan 5: Brand Colors
- **Primary Brand**: `#8b1538` (Maroon Baiturrahman) — Tombol Bayar F9, Tab Aktif, Tombol Submit Utama.
- **Financial & Success**: `#10b981` (Emerald) — Nominal Rupiah, Status Pas, Transaksi Sukses.
- **Background**: Dark Mode (`#0b1120`, `#0f172a`, `#1e293b`).

---

## 3. Struktur Referensi Dokumen (Docs Directory)
Sebelum melakukan tugas arsitektur atau penambahan fitur besar, AI wajib membaca:
1. `docs/prd.md` — Visi produk, alur transaksi, dan batasan cakupan.
2. `docs/architecture.md` — Alur sync SQLite <-> Turso dan WebSocket display.
3. `docs/design-system.md` — Token warna, font, dan komponen UI.
4. `docs/database-schema.md` — Struktur tabel, tipe data, dan relasi foreign key.
5. `README.md` — Panduan instalasi dan deployment ke Vercel.

