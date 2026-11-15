# Baiturrahman Mart — Point of Sale (POS) & Backoffice

Sistem kasir dan manajemen ritel modern untuk **Baiturrahman Mart** (Masjid Jami' Baiturrahman) berbasis Go dan React (SPA), dilengkapi arsitektur **Offline-First** serta sinkronisasi otomatis ke cloud via **Turso Database (libSQL)** dan hosting **Vercel**.

---

## 📋 Prasyarat Sistem (Prerequisites)

Sebelum memulai di PC baru, pastikan perangkat telah terpasang:
- **[Git](https://git-scm.com/)**
- **[Node.js](https://nodejs.org/)** (versi 18 LTS atau lebih baru)
- **[Go](https://go.dev/)** (versi 1.22 atau lebih baru)

> **Catatan**: Project ini menggunakan driver SQLite pure-Go (`modernc.org/sqlite`), sehingga **tidak memerlukan CGO maupun compiler GCC/MinGW**.

---

## 🚀 Panduan Setup Awal (Quick Start)

### 1. Clone Repository
Buka terminal (PowerShell / Command Prompt / Bash), lalu jalankan:
```bash
git clone https://github.com/masjidmerahcikumpa/ymb-mart.git
cd ymb-mart
```

### 2. Install Dependensi Frontend
Masuk ke folder `frontend-app` dan pasang modul npm:
```bash
cd frontend-app
npm install
cd ..
```

### 3. Install Dependensi Backend
Di root folder project `ymb-mart`, unduh modul Go:
```bash
go mod tidy
```

### 4. Konfigurasi Database (Turso Cloud)
File `config.json` sudah tersedia di root repository dengan format:
```json
{
  "turso_url": "libsql://ymb-mart-masjidmerahcikumpa.aws-ap-south-1.turso.io",
  "turso_token": "<AUTH_TOKEN>"
}
```
*Jika menggunakan Vercel, nilai ini juga dapat diatur melalui Environment Variable: `TURSO_DATABASE_URL` dan `TURSO_AUTH_TOKEN`.*

---

## 💻 Menjalankan Aplikasi di Lokal

### Mode Standar (Fullstack Go Server)
Jalankan server backend Go di root direktori:
```bash
go run .
```
- Server aktif di: **`http://localhost:8070`**
- Otomatis membuat database SQLite lokal `ymb-mart.db` (*offline-first*) dan menyinkronkan data dengan Turso Cloud.

### Mode Frontend Live Reload (Vite Dev Server)
Jika ingin melakukan pengeditan UI/UX secara cepat dengan *Hot Module Replacement (HMR)*:
```bash
cd frontend-app
npm run dev
```
- Akses di browser: **`http://localhost:5173`**

---

## 🚢 Alur Build & Deploy ke Vercel

Aplikasi di Vercel terhubung otomatis melalui GitHub Actions / Git Integration pada branch `main`.

Setiap selesai melakukan perubahan pada kode frontend:

```bash
# 1. Compile React SPA ke folder frontend_dist
cd frontend-app
npm run build
cd ..

# 2. Commit dan push ke repository
git add .
git commit -m "feat: deskripsi perubahan"
git push origin main
```

Setelah di-push, Vercel akan otomatis melakukan build binary Go beserta asset `frontend_dist/` dan langsung tayang di:
👉 **`https://ymb-mart.vercel.app`**

---

## 🔐 Kredensial Awal (Default Login)

- **Portal / Login**: `/`
- **Username**: `admin`
- **Password**: `admin123`
- **Role**: `admin`

---

## 📁 Struktur Direktori Utama

```text
ymb-mart/
├── frontend-app/          # Source code React (Vite + TypeScript + Tailwind CSS)
│   ├── src/
│   │   ├── components/    # Komponen POS, Admin, Dialog, Modal
│   │   ├── pages/         # POSScreen, AdminScreen, PortalScreen, PresensiScreen
│   │   ├── services/      # API client & offline-first logic
│   │   └── utils/         # Alert (SweetAlert2), formatters, audio
│   └── package.json
├── frontend_dist/         # Hasil build production React (embedded ke Go binary)
├── config.json            # Konfigurasi koneksi Turso Cloud
├── main.go                # Inisialisasi DB, session, auth, skema tabel
├── server.go              # Router HTTP, handler API, WebSocket, static assets
├── sync_engine.go         # Mesin sinkronisasi otomatis SQLite lokal <-> Turso
└── handlers.go            # Endpoint logic bisnis ritel & kasir
```

