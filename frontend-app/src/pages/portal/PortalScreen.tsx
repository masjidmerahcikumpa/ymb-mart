import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import { logoutUser } from '@/services/api'
import { showConfirmAlert } from '@/utils/alert'
import {
  ShoppingCart,
  LayoutDashboard,
  Monitor,
  UserCheck,
  ArrowRight,
  Database,
  Cloud,
  Clock,
  Sparkles,
  User,
  LogOut,
  LogIn,
} from 'lucide-react'

export const PortalScreen: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuthStore()
  const [currentTime, setCurrentTime] = useState<string>(new Date().toLocaleTimeString('id-ID'))

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('id-ID'))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const handleLogout = async () => {
    const confirmed = await showConfirmAlert({
      title: 'Konfirmasi Logout',
      text: 'Keluar dari sesi portal login?',
      confirmButtonText: 'Ya, Keluar',
      cancelButtonText: 'Batal',
      icon: 'question',
    })
    if (confirmed) {
      await logoutUser()
      logout()
    }
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-white font-sans flex flex-col justify-between p-6 sm:p-10 relative overflow-x-hidden selection:bg-[#8b1538] selection:text-white">
      {/* Background Architectural Glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#8b1538]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-6xl w-full mx-auto relative z-10 my-auto py-8">
        {/* Top User Status Bar */}
        <div className="flex justify-end mb-4">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2.5 bg-slate-900/80 border border-[#d4af37]/30 px-3.5 py-1.5 rounded-full text-xs backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#d4af37]" />
                <span className="text-slate-300 font-medium">{user.displayName || user.username}</span>
                <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-slate-400 uppercase font-bold">
                  {user.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                title="Keluar"
                className="ml-1 p-1 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-2 bg-slate-900/80 hover:bg-[#8b1538]/30 border border-slate-700 hover:border-[#8b1538] px-4 py-1.5 rounded-full text-xs font-bold text-slate-300 hover:text-white transition-all backdrop-blur-md"
            >
              <LogIn className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>Login Akun Petugas</span>
            </Link>
          )}
        </div>

        {/* Header */}
        <header className="text-center mb-12">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#8b1538]/25 border border-[#d4af37]/30 backdrop-blur-md mb-4 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#22c55e]" />
            <span className="text-[11px] font-bold tracking-widest uppercase text-[#d4af37]">
              Sistem Kasir & Ritel Modern v2.2
            </span>
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white flex items-center justify-center gap-3">
            <span>🕌</span>
            <span className="bg-gradient-to-r from-white via-slate-100 to-[#d4af37] bg-clip-text text-transparent">
              Baiturrahman Mart
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto mt-3 leading-relaxed">
            Portal terintegrasi kasir POS, backoffice admin & analytics, layar ganda pelanggan, dan sistem presensi staf Masjid Jami' Baiturrahman.
          </p>
        </header>

        {/* 4 Main Portal Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Kasir POS */}
          <Link
            to="/kasir"
            className="group relative bg-slate-900/60 border border-[#d4af37]/20 hover:border-[#d4af37]/60 rounded-2xl p-6 flex flex-col justify-between backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_-15px_rgba(212,175,55,0.15)]"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#d4af37] to-amber-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-2xl" />
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/40 text-[#d4af37] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <ShoppingCart className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded bg-white/5 text-slate-400">
                  POS KASIR
                </span>
              </div>
              <h2 className="text-lg font-bold text-white group-hover:text-[#d4af37] transition-colors mb-2">
                Layar Kasir POS
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Transaksi cepat, scanner barcode USB/HID, tender tunai, QRIS dinamis, dan cetak struk thermal 58/80mm.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#d4af37] pt-3 border-t border-white/5 group-hover:gap-3 transition-all">
              <span>Buka Layar Kasir</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* Card 2: Backoffice Admin */}
          <Link
            to="/admin"
            className="group relative bg-slate-900/60 border border-[#8b1538]/30 hover:border-[#8b1538] rounded-2xl p-6 flex flex-col justify-between backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_-15px_rgba(139,21,56,0.3)]"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#8b1538] to-rose-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-2xl" />
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-xl bg-[#8b1538]/20 border border-[#8b1538]/60 text-rose-400 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <LayoutDashboard className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded bg-white/5 text-slate-400">
                  BACKOFFICE
                </span>
              </div>
              <h2 className="text-lg font-bold text-white group-hover:text-rose-400 transition-colors mb-2">
                Backoffice Admin
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Dashboard omzet real-time, master produk, margin laba, audit stok opname, dan rekap shift kasir.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-rose-400 pt-3 border-t border-white/5 group-hover:gap-3 transition-all">
              <span>Buka Backoffice</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* Card 3: Layar Pelanggan */}
          <Link
            to="/customer"
            className="group relative bg-slate-900/60 border border-sky-500/20 hover:border-sky-500/60 rounded-2xl p-6 flex flex-col justify-between backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_-15px_rgba(14,165,233,0.2)]"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-2xl" />
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-xl bg-sky-500/15 border border-sky-500/40 text-sky-400 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <Monitor className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded bg-white/5 text-slate-400">
                  DUAL SCREEN
                </span>
              </div>
              <h2 className="text-lg font-bold text-white group-hover:text-sky-400 transition-colors mb-2">
                Layar Pelanggan
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Dual-screen monitor belanja real-time, scan QRIS dinamis di hadapan pembeli, dan slideshow promo masjid.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-sky-400 pt-3 border-t border-white/5 group-hover:gap-3 transition-all">
              <span>Buka Customer Display</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* Card 4: Presensi Staf */}
          <Link
            to="/presensi"
            className="group relative bg-slate-900/60 border border-emerald-500/20 hover:border-emerald-500/60 rounded-2xl p-6 flex flex-col justify-between backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_-15px_rgba(16,185,129,0.2)]"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-2xl" />
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <UserCheck className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded bg-white/5 text-slate-400">
                  PRESENSI
                </span>
              </div>
              <h2 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors mb-2">
                Presensi Staf
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Pencatatan absensi kehadiran shift kerja kasir dan staf operasional toko Masjid Baiturrahman.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 pt-3 border-t border-white/5 group-hover:gap-3 transition-all">
              <span>Buka Presensi</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        </div>

        {/* System Status Indicators Bar */}
        <div className="mt-10 bg-slate-900/40 border border-white/5 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2 text-slate-400">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Database: <strong className="text-slate-200">Local SQLite (Offline-First)</strong></span>
            </div>

            <div className="flex items-center gap-2 text-slate-400">
              <Cloud className="w-4 h-4 text-sky-400" />
              <span>Cloud Sync: <strong className="text-slate-200">Turso Cloud Engine</strong></span>
            </div>

            <div className="flex items-center gap-2 text-slate-400">
              <Sparkles className="w-4 h-4 text-[#d4af37]" />
              <span>Dual-Screen: <strong className="text-slate-200">WebSocket & BroadcastChannel</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono font-bold text-slate-300 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{currentTime} WIB</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto relative z-10 pt-6 border-t border-white/5 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-4">
        <p>© 2026 Baiturrahman Mart • Komplek Masjid Jami' Baiturrahman, Sukmajaya</p>
        <p className="font-mono text-[11px]">Single Portable Binary Architecture (React 19 + Go)</p>
      </footer>
    </div>
  )
}

