import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchShifts, fetchCashLogs } from '@/services/api'
import type { Shift, CashLog } from '@/types/shift'
import {
  Banknote,
  User,
  X,
  FileSpreadsheet,
} from 'lucide-react'

export const ShiftReports: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null)

  const { data: shifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ['admin-shifts', statusFilter],
    queryFn: () => fetchShifts(statusFilter),
  })

  const { data: cashLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['cash-logs', selectedShift?.id],
    queryFn: () => (selectedShift ? fetchCashLogs(selectedShift.id) : Promise.resolve([])),
    enabled: !!selectedShift,
  })

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val)
  }

  return (
    <div className="space-y-4">
      {/* Header Banner & Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[#8b1538]" />
            <span>Laporan Riwayat Shift & Arus Kas Kasir</span>
          </h3>
          <p className="text-xs text-slate-400">
            Rekap setoran laci kasir, selisih tunai, dan log cash drop operasional
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg text-xs font-semibold">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              statusFilter === '' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Semua Shift
          </button>
          <button
            onClick={() => setStatusFilter('open')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              statusFilter === 'open' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Sedang Aktif (Open)
          </button>
          <button
            onClick={() => setStatusFilter('closed')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              statusFilter === 'closed' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Selesai (Closed)
          </button>
        </div>
      </div>

      {/* Shifts Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3">Shift ID</th>
                <th className="py-3 px-3">Nama Shift</th>
                <th className="py-3 px-3">Petugas Kasir</th>
                <th className="py-3 px-3">Waktu Buka / Tutup</th>
                <th className="py-3 px-3 text-right">Modal Awal</th>
                <th className="py-3 px-3 text-right">Penjualan Tunai</th>
                <th className="py-3 px-3 text-right">Total Omzet</th>
                <th className="py-3 px-3 text-right">Selisih Kas</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shiftsLoading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    Memuat riwayat shift kasir...
                  </td>
                </tr>
              ) : shifts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    Tidak ada catatan shift.
                  </td>
                </tr>
              ) : (
                shifts.map((s: Shift) => {
                  const isOpen = s.status === 'open'
                  const hasDiscrepancy = s.cash_discrepancy !== undefined && s.cash_discrepancy !== null && s.cash_discrepancy !== 0

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-700">#{s.id}</td>
                      <td className="py-3 px-3 font-semibold text-slate-800">{s.shift_name}</td>
                      <td className="py-3 px-3 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{s.cashier_name || s.cashier}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-[11px] text-slate-500">
                        <div>Buka: {s.opened_at || '-'}</div>
                        {s.closed_at && <div className="text-slate-400">Tutup: {s.closed_at}</div>}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-slate-600">
                        {formatRupiah(s.opening_cash)}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-emerald-700">
                        {formatRupiah(s.cash_sales || 0)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-800">
                        {formatRupiah(s.total_sales || 0)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {isOpen ? (
                          <span className="text-slate-400 text-[11px]">-</span>
                        ) : (
                          <span
                            className={`font-bold text-[11px] px-2 py-0.5 rounded-full ${
                              !hasDiscrepancy
                                ? 'bg-emerald-50 text-emerald-700'
                                : (s.cash_discrepancy || 0) < 0
                                ? 'bg-red-100 text-red-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {formatRupiah(s.cash_discrepancy || 0)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {isOpen ? 'AKTIF' : 'CLOSED'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => setSelectedShift(s)}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Rincian Kas →
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Rincian Rekonsiliasi Kas Shift */}
      {selectedShift && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-[#8b1538] text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm">Rincian Rekonsiliasi Kas Shift #{selectedShift.id}</h3>
                <p className="text-xs text-white/80">
                  {selectedShift.shift_name} ({selectedShift.cashier_name || selectedShift.cashier})
                </p>
              </div>
              <button
                onClick={() => setSelectedShift(null)}
                className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Financial Summary */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Modal Awal Kasir:</span>
                  <span className="font-bold text-slate-800">{formatRupiah(selectedShift.opening_cash)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>(+) Penjualan Tunai (Cash):</span>
                  <span className="font-bold text-emerald-700">{formatRupiah(selectedShift.cash_sales || 0)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>(-) Kas Keluar / Setoran (Cash Drop):</span>
                  <span className="font-bold text-red-600">{formatRupiah(selectedShift.cash_out || 0)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-800">
                  <span>(=) Estimasi Kas di Laci:</span>
                  <span>{formatRupiah(selectedShift.expected_cash || 0)}</span>
                </div>
                {selectedShift.status === 'closed' && (
                  <>
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>Fisik Uang Diserahkan Kasir:</span>
                      <span>{formatRupiah(selectedShift.closing_cash || 0)}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex justify-between font-bold">
                      <span>Selisih Kas (Discrepancy):</span>
                      <span
                        className={
                          (selectedShift.cash_discrepancy || 0) === 0
                            ? 'text-emerald-600'
                            : (selectedShift.cash_discrepancy || 0) < 0
                            ? 'text-red-600'
                            : 'text-blue-600'
                        }
                      >
                        {formatRupiah(selectedShift.cash_discrepancy || 0)}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Log Cash In / Cash Drop */}
              <div>
                <h4 className="font-bold text-xs text-slate-800 mb-2 flex items-center gap-1.5">
                  <Banknote className="w-4 h-4 text-slate-600" />
                  <span>Log Mutasi Kas Masuk & Kas Drop</span>
                </h4>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Waktu</th>
                        <th className="py-2 px-3">Jenis</th>
                        <th className="py-2 px-3 text-right">Nominal</th>
                        <th className="py-2 px-3">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {logsLoading ? (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-slate-400">
                            Memuat log kas...
                          </td>
                        </tr>
                      ) : cashLogs.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-slate-400">
                            Tidak ada transaksi cash drop / cash in selama shift ini.
                          </td>
                        </tr>
                      ) : (
                        cashLogs.map((log: CashLog) => (
                          <tr key={log.id}>
                            <td className="py-2 px-3 text-slate-500 text-[11px]">{log.created_at}</td>
                            <td className="py-2 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  log.type === 'in' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {log.type === 'in' ? 'CASH IN' : 'CASH DROP'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-slate-800">
                              {formatRupiah(log.amount)}
                            </td>
                            <td className="py-2 px-3 text-slate-600 text-[11px]">{log.description || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedShift(null)}
                className="px-4 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-700"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
