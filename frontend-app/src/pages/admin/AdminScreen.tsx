import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import { logoutUser } from '@/services/api'
import { showConfirmAlert } from '@/utils/alert'
import {
  LayoutDashboard,
  FileText,
  Receipt,
  Wallet,
  Zap,
  UserCheck,
  Package,
  Boxes,
  ClipboardCheck,
  FileSpreadsheet,
  Users,
  ShieldCheck,
  Settings,
  ArrowLeft,
  Store,
  Clock,
  LogOut,
  User as UserIcon,
  Tv,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'

import { AdminDashboard } from '@/components/admin/AdminDashboard'
import { TransactionHistory } from '@/components/admin/TransactionHistory'
import { DailyReportView } from '@/components/admin/DailyReportView'
import { CashFlowManagement } from '@/components/admin/CashFlowManagement'
import { ETransReportView } from '@/components/admin/ETransReportView'
import { AdminPresensiView } from '@/components/admin/AdminPresensiView'
import { ProductManagement } from '@/components/admin/ProductManagement'
import { StockMonitoring } from '@/components/admin/StockMonitoring'
import { StockOpname } from '@/components/admin/StockOpname'
import { ShiftReports } from '@/components/admin/ShiftReports'
import { MemberManagement } from '@/components/admin/MemberManagement'
import { UserManagement } from '@/components/admin/UserManagement'
import { SystemSettings } from '@/components/admin/SystemSettings'
import { CustomerAdManager } from '@/components/admin/CustomerAdManager'

type AdminTab =
  | 'dashboard'
  | 'daily'
  | 'transactions'
  | 'etrans'
  | 'cash'
  | 'shifts'
  | 'presensi'
  | 'products'
  | 'stock'
  | 'opname'
  | 'members'
  | 'users'
  | 'settings'
  | 'ads'

export const AdminScreen: React.FC = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard')
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('id-ID'))
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    return localStorage.getItem('ymb_admin_sidebar_open') !== 'false'
  })

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const next = !prev
      localStorage.setItem('ymb_admin_sidebar_open', String(next))
      return next
    })
  }

  const handleLogout = async () => {
    const confirmed = await showConfirmAlert({
      title: 'Konfirmasi Logout',
      text: 'Keluar dari sesi Administrator Backoffice Baiturrahman Mart?',
      confirmButtonText: 'Ya, Logout',
      cancelButtonText: 'Batal',
      icon: 'question',
    })
    if (confirmed) {
      await logoutUser()
      logout()
      navigate('/login', { replace: true })
    }
  }

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('id-ID'))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-800">
      {/* Sidebar Navigation */}
      <aside
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        className={`bg-slate-900 text-slate-200 flex flex-col shrink-0 transition-all duration-300 ease-in-out relative ${
          isSidebarOpen ? 'w-64' : 'w-0 overflow-hidden opacity-0 pointer-events-none'
        }`}
      >
        <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-[#8b1538] flex items-center justify-center text-white text-lg font-bold shadow-md shrink-0">
              🕌
            </div>
            <div className="truncate">
              <h1 className="font-bold text-sm text-white leading-tight truncate">YMB Mart</h1>
              <p className="text-[11px] text-slate-400 truncate">Backoffice & Analytics</p>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
            title="Sembunyikan Menu Bar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        <nav
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          className="flex-1 p-3 space-y-4 overflow-y-auto no-scrollbar"
        >
          {/* Group 1: Ringkasan Eksekutif */}
          <div>
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Ringkasan Eksekutif
            </div>
            <div className="space-y-1">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-3 w-full px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-[#8b1538] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span>Dashboard & Omzet</span>
              </button>

              <button
                onClick={() => setActiveTab('daily')}
                className={`flex items-center gap-3 w-full px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
                  activeTab === 'daily'
                    ? 'bg-[#8b1538] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <FileText className="w-4 h-4 shrink-0" />
                <span>Laporan & Tutup Buku</span>
              </button>
            </div>
          </div>

          {/* Group 2: Transaksi & Kas */}
          <div>
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Transaksi & Kas
            </div>
            <div className="space-y-1">
              <button
                onClick={() => setActiveTab('transactions')}
                className={`flex items-center gap-3 w-full px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
                  activeTab === 'transactions'
                    ? 'bg-[#8b1538] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Receipt className="w-4 h-4 shrink-0" />
                <span>Riwayat Transaksi</span>
              </button>

              <button
                onClick={() => setActiveTab('etrans')}
                className={`flex items-center gap-3 w-full px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
                  activeTab === 'etrans'
                    ? 'bg-[#8b1538] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Zap className="w-4 h-4 shrink-0" />
                <span>Layanan E-Trans (PPOB)</span>
              </button>

              <button
                onClick={() => setActiveTab('cash')}
                className={`flex items-center gap-3 w-full px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
                  activeTab === 'cash'
                    ? 'bg-[#8b1538] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Wallet className="w-4 h-4 shrink-0" />
                <span>Arus Kas Laci (Petty)</span>
              </button>

              <button
                onClick={() => setActiveTab('shifts')}
                className={`flex items-center gap-3 w-full px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
                  activeTab === 'shifts'
                    ? 'bg-[#8b1538] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 shrink-0" />
                <span>Laporan Shift Kasir</span>
              </button>

              <button
                onClick={() => setActiveTab('presensi')}
                className={`flex items-center gap-3 w-full px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
                  activeTab === 'presensi'
                    ? 'bg-[#8b1538] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <UserCheck className="w-4 h-4 shrink-0" />
                <span>Presensi Kasir</span>
              </button>
            </div>
          </div>

          {/* Group 3: Inventaris & Stok */}
          <div>
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Inventaris & Stok
            </div>
            <div className="space-y-1">
              <button
                onClick={() => setActiveTab('products')}
                className={`flex items-center gap-3 w-full px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
                  activeTab === 'products'
                    ? 'bg-[#8b1538] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Package className="w-4 h-4 shrink-0" />
                <span>Katalog Produk</span>
              </button>

              <button
                onClick={() => setActiveTab('stock')}
                className={`flex items-center gap-3 w-full px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
                  activeTab === 'stock'
                    ? 'bg-[#8b1538] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Boxes className="w-4 h-4 shrink-0" />
                <span>Monitoring Stok</span>
              </button>

              <button
                onClick={() => setActiveTab('opname')}
                className={`flex items-center gap-3 w-full px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
                  activeTab === 'opname'
                    ? 'bg-[#8b1538] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <ClipboardCheck className="w-4 h-4 shrink-0" />
                <span>Stock Opname Fisik</span>
              </button>
            </div>
          </div>

          {/* Group 4: Pelanggan */}
          <div>
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Pelanggan
            </div>
            <div className="space-y-1">
              <button
                onClick={() => setActiveTab('members')}
                className={`flex items-center gap-3 w-full px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
                  activeTab === 'members'
                    ? 'bg-[#8b1538] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Users className="w-4 h-4 shrink-0" />
                <span>Member Jamaah</span>
              </button>
            </div>
          </div>

          {/* Group 5: Pengaturan Sistem */}
          <div>
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Pengaturan Sistem
            </div>
            <div className="space-y-1">
              <button
                onClick={() => setActiveTab('users')}
                className={`flex items-center gap-3 w-full px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
                  activeTab === 'users'
                    ? 'bg-[#8b1538] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Kelola Kasir & Akun</span>
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-3 w-full px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
                  activeTab === 'settings'
                    ? 'bg-[#8b1538] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Settings className="w-4 h-4 shrink-0" />
                <span>Pengaturan & Sync</span>
              </button>

              <button
                onClick={() => setActiveTab('ads')}
                className={`flex items-center gap-3 w-full px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
                  activeTab === 'ads'
                    ? 'bg-[#8b1538] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Tv className="w-4 h-4 shrink-0" />
                <span>Iklan Customer Display</span>
              </button>
            </div>
          </div>
        </nav>

        {/* Back to POS Navigation */}
        <div className="p-3 border-t border-slate-800">
          <Link
            to="/kasir"
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-slate-800 hover:bg-[#8b1538] text-white rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Buka Layar Kasir POS</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
            {/* Sidebar Toggle Button */}
            <button
              type="button"
              onClick={toggleSidebar}
              className={`p-2 rounded-xl transition-all flex items-center gap-1.5 font-bold text-xs ${
                isSidebarOpen
                  ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                  : 'bg-rose-50 text-[#8b1538] hover:bg-rose-100 border border-rose-200 shadow-xs'
              }`}
              title={isSidebarOpen ? 'Sembunyikan Menu Bar' : 'Tampilkan Menu Bar'}
            >
              {isSidebarOpen ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <>
                  <PanelLeftOpen className="w-4 h-4 text-[#8b1538]" />
                  <span>Menu Bar</span>
                </>
              )}
            </button>

            <div className="h-4 w-px bg-slate-200" />

            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-[#8b1538] shrink-0" />
              <span className="hidden sm:inline">Baiturrahman Mart Backoffice</span>
              <span className="hidden sm:inline">/</span>
              <span className="text-slate-800 capitalize font-bold">
                {activeTab === 'dashboard'
                  ? 'Dashboard & Omzet'
                  : activeTab === 'daily'
                  ? 'Laporan Penjualan & Tutup Buku Harian'
                  : activeTab === 'transactions'
                  ? 'Buku Riwayat Transaksi Kasir'
                  : activeTab === 'etrans'
                  ? 'Laporan Layanan E-Trans (PPOB)'
                  : activeTab === 'cash'
                  ? 'Manajemen Arus Kas Laci (Petty Cash)'
                  : activeTab === 'shifts'
                  ? 'Laporan Shift Kasir'
                  : activeTab === 'presensi'
                  ? 'Rekapitulasi Presensi & Kehadiran Kasir'
                  : activeTab === 'products'
                  ? 'Katalog Master Produk'
                  : activeTab === 'stock'
                  ? 'Monitoring Kartu Stok & Inventaris'
                  : activeTab === 'opname'
                  ? 'Stock Opname Fisik Rak'
                  : activeTab === 'members'
                  ? 'Member Jemaah Masjid'
                  : activeTab === 'users'
                  ? 'Kelola Akun Petugas Kasir'
                  : activeTab === 'ads'
                  ? 'Layar Iklan & Promosi Monitor Customer'
                  : 'Konfigurasi Sistem & Turso Cloud'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{currentTime} WIB</span>
            </div>

            <div className="flex items-center gap-3 text-xs pl-2 border-l border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-600 font-bold">
                  <UserIcon className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 leading-tight">
                    {user?.displayName || 'Administrator'}
                  </p>
                  <p className="text-[10px] text-slate-400 capitalize">{user?.role || 'admin'}</p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                title="Keluar / Logout"
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable View Container */}
        <main
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          className="flex-1 overflow-y-auto p-6 no-scrollbar"
        >
          {activeTab === 'dashboard' && (
            <AdminDashboard onNavigateToProducts={() => setActiveTab('products')} />
          )}
          {activeTab === 'daily' && <DailyReportView />}
          {activeTab === 'transactions' && <TransactionHistory />}
          {activeTab === 'etrans' && <ETransReportView />}
          {activeTab === 'cash' && <CashFlowManagement />}
          {activeTab === 'shifts' && <ShiftReports />}
          {activeTab === 'presensi' && <AdminPresensiView />}
          {activeTab === 'products' && <ProductManagement />}
          {activeTab === 'stock' && <StockMonitoring />}
          {activeTab === 'opname' && <StockOpname />}
          {activeTab === 'members' && <MemberManagement />}
          {activeTab === 'users' && <UserManagement />}
          {activeTab === 'settings' && <SystemSettings />}
          {activeTab === 'ads' && <CustomerAdManager />}
        </main>
      </div>
    </div>
  )
}
