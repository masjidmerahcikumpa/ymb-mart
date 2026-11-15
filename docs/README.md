# Dokumentasi Teknis & Panduan Vibe Coding — Baiturrahman Mart

Folder ini berisi seluruh dokumen acuan teknis (*Single Source of Truth*) yang dibaca oleh pengembang dan agen AI sebelum merancang, memodifikasi, atau mengeksekusi kode pada sistem Point of Sale (POS) & Backoffice **Baiturrahman Mart**.

---

## 📚 Daftar Dokumen Panduan:

1. **[docs/prd.md](file:///c:/sites/ymb-mart/docs/prd.md)**
   - *Product Requirements Document (PRD)*: "Bintang Utara" sistem. Memuat visi produk, persona pengguna (Kasir, Admin, Pelanggan), daftar fitur in-scope (POS F1-F9, Customer Display, Presensi, E-Trans, Member Jamaah), dan batasan out-of-scope.
2. **[docs/architecture.md](file:///c:/sites/ymb-mart/docs/architecture.md)**
   - *Architecture & Implementation Plan*: Diagram arsitektur Hybrid Offline-First, alur kerja Sync Engine (SQLite lokal <-> Turso Cloud), komunikasi WebSocket dual-display, serta pemisahan folder backend Go dan frontend React.
3. **[docs/design-system.md](file:///c:/sites/ymb-mart/docs/design-system.md)**
   - *Design System & UI Rules*: Token warna brand (Maroon `#8b1538`, Emerald `#10b981`), tipografi (Plus Jakarta Sans, Inter, Monospace), aturan mutlak penghapusan scrollbar, dan standardisasi modal notifikasi SweetAlert2.
4. **[docs/database-schema.md](file:///c:/sites/ymb-mart/docs/database-schema.md)**
   - *Database Schema & Data Models*: Definisi skema lengkap tabel SQLite & Turso, relasi ERD, field `sync_status`, indeks, dan constraint foreign key.
5. **[.env.example](file:///c:/sites/ymb-mart/.env.example)**
   - Template konfigurasi variabel lingkungan untuk koneksi Turso, port server, dan deployment Vercel.
6. **[AI_RULES.md](file:///c:/sites/ymb-mart/AI_RULES.md)** & **[.cursorrules](file:///c:/sites/ymb-mart/.cursorrules)**
   - Aturan khusus AI vibe coding: keharusan build `npm run build` sebelum push, larangan `window.alert()`, aturan scrollbar, dan prioritas offline-first.
