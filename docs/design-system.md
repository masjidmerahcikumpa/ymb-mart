# Design System & UI Rules — Baiturrahman Mart

Panduan gaya antarmuka (Design System) untuk memastikan konsistensi visual dan kenyamanan operasional kasir serta admin.

---

## 1. Identitas Brand & Palet Warna

### A. Warna Utama (Brand Identity)
- **Baiturrahman Maroon (Primary Accent)**:
  - Hex: `#8b1538`
  - Tailwind: `bg-[#8b1538]`, `hover:bg-[#73122e]`, `border-[#8b1538]`
  - Digunakan untuk: Header branding, tombol aksi utama (Bayar F9, Simpan, Tutup Shift), tab aktif, badge prioritas.
- **Emerald Green (Success & Financial)**:
  - Hex: `#10b981` / `#059669`
  - Tailwind: `text-emerald-400`, `bg-emerald-600`
  - Digunakan untuk: Angka rupiah, transaksi lunas, status shift aktif, selisih uang PAS.
- **Amber / Gold (Warning & Pending)**:
  - Hex: `#f59e0b`
  - Tailwind: `text-amber-400`, `bg-amber-600`
  - Digunakan untuk: Hold transaksi, pending sync, stok menipis, peringatan selisih kas.
- **Rose / Red (Danger & Expense)**:
  - Hex: `#ef4444`
  - Tailwind: `text-rose-400`, `bg-rose-600`
  - Digunakan untuk: Kas keluar (petty cash out), pembatalan, hapus produk, error validasi.

### B. Backgrounds & Dark Mode Theme
- **App Background**: `#0b1120` atau `#0f172a` (Slate 950 / 900)
- **Card / Panel Background**: `#1e293b` (Slate 800)
- **Sub-panel & Table Header**: `#334155` (Slate 700)
- **Border / Divider**: `border-slate-700/60`

---

## 2. Tipografi (Typography)

1. **Plus Jakarta Sans**:
   - Digunakan untuk judul halaman, nama toko, banner promo, label navigasi.
2. **Inter**:
   - Digunakan untuk body text, deskripsi, form input, dan tombol.
3. **Monospace / Tabular Figures** (`font-mono` / tabular):
   - Wajib digunakan pada **seluruh angka rupiah**, SKU produk, barcode scanner input, dan jam digital:
   ```html
   <span class="font-mono font-bold text-emerald-400">Rp 125.000</span>
   ```

---

## 3. Aturan Desain Komponen (UI Rules)

### A. Scrollbar Universal
- **Aturan Mutlak**: Seluruh tampilan dashboard admin dan kasir **TIDAK BOLEH** menampilkan scrollbar abu-abu browser default.
- Gunakan utility class `no-scrollbar` atau aturan CSS global:
  ```css
  * {
    scrollbar-width: none !important;
    -ms-overflow-style: none !important;
  }
  ::-webkit-scrollbar {
    display: none !important;
    width: 0 !important;
    height: 0 !important;
  }
  ```

### B. Dialog & Notifikasi (SweetAlert2)
- **Dilarang keras** menggunakan `window.alert()` atau `window.confirm()` bawaan browser.
- Gunakan utilitas terpusat di `frontend-app/src/utils/alert.ts`:
  - `showSuccessAlert(title, text)`
  - `showErrorAlert(title, text)`
  - `showWarningAlert(title, text)`
  - `showConfirmAlert({ title, text, confirmButtonText })`
  - `showShiftCloseAlert(data)`
- **Styling Modal SweetAlert2**:
  - Background: `#1e293b` (Dark Slate)
  - Color Text: `#f8fafc` (Slate 50)
  - Confirm Button Color: `#8b1538` (Maroon)
  - Cancel Button Color: `#64748b` (Slate 500)

### C. Badge Keyboard Shortcut
- Setiap tombol yang memiliki shortcut keyboard wajib menampilkan badge tombol:
  ```tsx
  <button className="...">
    <span>Bayar Cepat</span>
    <kbd className="px-2 py-0.5 text-xs font-mono bg-slate-900/60 text-amber-300 rounded border border-slate-600">F9</kbd>
  </button>
  ```

### D. Input Barcode & Search
- Kotak scan barcode kasir harus selalu memiliki auto-focus saat halaman dimuat atau setelah transaksi selesai.

