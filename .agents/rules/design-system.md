---
description: Design system, color tokens (Maroon #8b1538, Emerald #10b981), typography, SweetAlert2 modal standard, zero scrollbar rule
globs: *
---

# Design System & UI Rules — Baiturrahman Mart

## 1. Identitas Brand & Palet Warna
- **Baiturrahman Maroon (Primary Accent)**:
  - Hex: `#8b1538` | Tailwind: `bg-[#8b1538]`, `hover:bg-[#73122e]`, `border-[#8b1538]`
  - Digunakan untuk: Header branding, tombol aksi utama (Bayar F9, Simpan, Tutup Shift), tab aktif.
- **Emerald Green (Success & Financial)**:
  - Hex: `#10b981` | Tailwind: `text-emerald-400`, `bg-emerald-600`
  - Digunakan untuk: Angka rupiah, transaksi lunas, status shift aktif, selisih uang PAS.
- **Amber / Gold (Warning & Pending)**:
  - Hex: `#f59e0b` | Tailwind: `text-amber-400`, `bg-amber-600`
  - Digunakan untuk: Hold transaksi, pending sync, stok menipis, peringatan selisih kas.
- **Dark Mode Background**:
  - Base: `#0b1120` / `#0f172a` (Slate 950 / 900)
  - Card / Panel: `#1e293b` (Slate 800)
  - Sub-panel / Table Header: `#334155` (Slate 700)

---

## 2. Tipografi
- **Headings / Branding**: Plus Jakarta Sans
- **Body & Controls**: Inter
- **Angka Rupiah & Barcode**: Wajib font-mono / tabular figures (`<span class="font-mono font-bold text-emerald-400">Rp 125.000</span>`).

---

## 3. Aturan Desain Komponen (UI Rules)

### A. Scrollbar Universal
- **Aturan Mutlak**: Seluruh dashboard admin dan kasir **TIDAK BOLEH** memunculkan scrollbar browser default.
- Gunakan `no-scrollbar` dan pertahankan CSS global `scrollbar-width: none !important;` serta `::-webkit-scrollbar { display: none !important; }`.

### B. Dialog & Notifikasi (SweetAlert2)
- **Dilarang keras** menggunakan `window.alert()` atau `window.confirm()` bawaan browser.
- Gunakan utilitas terpusat di `frontend-app/src/utils/alert.ts`:
  - `showSuccessAlert(title, text)`
  - `showErrorAlert(title, text)`
  - `showWarningAlert(title, text)`
  - `showConfirmAlert({ title, text, confirmButtonText })`
  - `showShiftCloseAlert(data)`
- Styling SweetAlert2: Dark background `#1e293b`, tombol konfirmasi Maroon `#8b1538`.

### C. Badge Keyboard Shortcut
- Setiap tombol kasir yang memiliki shortcut wajib menyertakan badge:
  `<kbd className="px-2 py-0.5 text-xs font-mono bg-slate-900/60 text-amber-300 rounded border border-slate-600">F9</kbd>`

