import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchPresensiList } from '@/services/api'
import {
  UserCheck,
  Calendar,
  Filter,
  Download,
  ExternalLink,
  RefreshCw,
  Clock,
  User,
  ArrowRightCircle,
  ArrowLeftCircle,
  QrCode,
  ShieldCheck,
} from 'lucide-react'

export const AdminPresensiView: React.FC = () => {
  const todayStr = new Date().toISOString().split('T')[0]
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'masuk' | 'pulang'>('ALL')
  const [searchCashier, setSearchCashier] = useState('')

  // Query Attendance Records
  const { data: presensiResp, isLoading, refetch } = useQuery({
    queryKey: ['admin-presensi', selectedDate],
    queryFn: () => fetchPresensiList({ date: selectedDate || undefined }),
    refetchInterval: 15000,
  })

  const attendanceList = useMemo(() => presensiResp?.data || [], [presensiResp])

  // Filtered list
  const filteredList = useMemo(() => {
    return attendanceList.filter((rec) => {
      if (typeFilter !== 'ALL' && rec.type !== typeFilter) return false
      if (
        searchCashier &&
        !rec.cashier_name.toLowerCase().includes(searchCashier.toLowerCase()) &&
        !rec.username.toLowerCase().includes(searchCashier.toLowerCase())
      ) {
        return false
      }
      return true
    })
  }, [attendanceList, typeFilter, searchCashier])

  // Summary counts
  const countMasuk = useMemo(
    () => presensiResp?.masuk_today ?? attendanceList.filter((r) => r.type === 'masuk').length,
    [presensiResp, attendanceList]
  )
  const countPulang = useMemo(
    () => presensiResp?.pulang_today ?? attendanceList.filter((r) => r.type === 'pulang').length,
    [presensiResp, attendanceList]
  )

  // Export CSV
  const handleExportCSV = () => {
    if (attendanceList.length === 0) return
    const headers = ['ID', 'Tanggal', 'Jam', 'Nama Kasir', 'Username', 'Jenis', 'Keterangan', 'Device Info']
    const rows = attendanceList.map((r) => [
      r.id,
      r.date,
      r.time,
      `"${r.cashier_name}"`,
      r.username,
      r.type.toUpperCase(),
      `"${r.notes || '-'}"`,
      `"${r.device_info || '-'}"`,
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `rekap_presensi_${selectedDate || 'all'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[#8b1538]" />
            <span>Rekapitulasi Kehadiran & Presensi Staf Kasir</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Log absensi shift kerja kasir berbasis kode QR dinamis dan verifikasi PIN.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href="/presensi"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition shadow-2xs"
          >
            <QrCode className="w-3.5 h-3.5 text-[#8b1538]" />
            <span>Buka QR Presensi Kasir</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>

          <button
            onClick={handleExportCSV}
            disabled={attendanceList.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#8b1538] hover:bg-[#a31a43] text-white rounded-lg text-xs font-bold transition shadow-xs disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Log Absensi ({selectedDate || 'Hari Ini'})
            </p>
            <h3 className="text-2xl font-black text-slate-800 font-mono mt-0.5">
              {attendanceList.length}
            </h3>
            <p className="text-[11px] text-slate-400">Aktivitas presensi tercatat</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <ArrowRightCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Kasir Masuk (Shift In)
            </p>
            <h3 className="text-2xl font-black text-emerald-700 font-mono mt-0.5">
              {countMasuk}
            </h3>
            <p className="text-[11px] text-slate-400">Kasir hadir bertugas</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <ArrowLeftCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Kasir Pulang (Shift Out)
            </p>
            <h3 className="text-2xl font-black text-blue-700 font-mono mt-0.5">
              {countPulang}
            </h3>
            <p className="text-[11px] text-slate-400">Selesai jam dinas shift</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Filter */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none"
            />
            {selectedDate && (
              <button
                onClick={() => setSelectedDate('')}
                className="text-slate-400 hover:text-slate-600 text-xs px-1"
                title="Tampilkan semua tanggal"
              >
                ✕
              </button>
            )}
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Jenis (Masuk & Pulang)</option>
              <option value="masuk">Masuk (Shift In)</option>
              <option value="pulang">Pulang (Shift Out)</option>
            </select>
          </div>

          {/* Cashier Search */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama kasir..."
              value={searchCashier}
              onChange={(e) => setSearchCashier(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none"
            />
          </div>
        </div>

        <button
          onClick={() => refetch()}
          className="p-2 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg"
          title="Perbarui daftar presensi"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">
            Daftar Presensi ({filteredList.length} Entri)
          </h4>
          <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Terverifikasi Dinamis QR & PIN</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Waktu (WIB)</th>
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Nama Kasir</th>
                <th className="py-3 px-4">Username</th>
                <th className="py-3 px-4 text-center">Jenis Absensi</th>
                <th className="py-3 px-4">Keterangan / Shift</th>
                <th className="py-3 px-4">Perangkat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Memuat data presensi kasir...
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <p className="text-2xl mb-1">📋</p>
                    <p className="font-bold">Tidak ada riwayat presensi ditemukan</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Kasir dapat melakukan presensi melalui menu Terminal Kasir atau halaman /presensi.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredList.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {rec.time}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {rec.date}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {rec.cashier_name || rec.username}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      @{rec.username}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {rec.type === 'masuk' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                          <ArrowRightCircle className="w-3 h-3" />
                          <span>MASUK</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800">
                          <ArrowLeftCircle className="w-3 h-3" />
                          <span>PULANG</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {rec.notes || 'Presensi Mandiri'}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px] truncate max-w-xs">
                      {rec.device_info || 'Terminal POS / Web'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
