import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchCashLogs, logCash, fetchActiveShifts } from '@/services/api'
import { formatRupiah } from '@/utils/currency'
import { showSuccessAlert, showErrorAlert, showWarningAlert } from '@/utils/alert'
import {
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  PlusCircle,
  MinusCircle,
  Filter,
  RefreshCw,
  Clock,
  CheckCircle2,
  X,
  Coins,
} from 'lucide-react'

export const CashFlowManagement: React.FC = () => {
  const queryClient = useQueryClient()
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'in' | 'drop'>('ALL')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalType, setModalType] = useState<'in' | 'drop'>('in')
  const [amountInput, setAmountInput] = useState('')
  const [descriptionInput, setDescriptionInput] = useState('')
  const [selectedShiftId, setSelectedShiftId] = useState<number | undefined>(undefined)

  // Query Cash Logs
  const { data: cashLogs = [], isLoading, refetch } = useQuery({
    queryKey: ['cash-logs'],
    queryFn: () => fetchCashLogs(),
    refetchInterval: 30000,
  })

  // Query Active Shifts
  const { data: activeShifts = [] } = useQuery({
    queryKey: ['active-shifts'],
    queryFn: fetchActiveShifts,
    refetchInterval: 15000,
  })

  // Active shift default
  const currentActiveShift = activeShifts[0]

  // Mutation to Log Cash
  const logCashMutation = useMutation({
    mutationFn: (payload: { shiftId: number; type: 'in' | 'drop'; amount: number; description: string }) =>
      logCash(payload.shiftId, payload.type, payload.amount, payload.description),
    onSuccess: () => {
      showSuccessAlert(
        'Sukses',
        `Catatan arus kas (${modalType === 'in' ? 'KAS MASUK' : 'KAS KELUAR'}) berhasil disimpan!`
      )
      queryClient.invalidateQueries({ queryKey: ['cash-logs'] })
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
      setIsModalOpen(false)
      setAmountInput('')
      setDescriptionInput('')
    },
    onError: (err: Error) => {
      showErrorAlert('Gagal Mencatat', `Gagal mencatat arus kas: ${err.message}`)
    },
  })

  const handleOpenModal = (type: 'in' | 'drop') => {
    if (!currentActiveShift) {
      showWarningAlert(
        'Perhatian Shift Kasir',
        'Tidak ada shift kasir yang aktif saat ini. Buka shift kasir terlebih dahulu untuk mencatat arus kas laci.'
      )
    }
    setModalType(type)
    setIsModalOpen(true)
  }

  const handleSubmitCash = (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseInt(amountInput.replace(/[^0-9]/g, ''), 10)
    if (!amount || amount <= 0) {
      showWarningAlert('Validasi Nominal', 'Masukkan nominal kas yang valid.')
      return
    }
    if (!descriptionInput.trim()) {
      showWarningAlert('Validasi Keterangan', 'Masukkan keterangan/keperluan transaksi kas ini.')
      return
    }

    const targetShiftId = selectedShiftId || currentActiveShift?.id || 1
    logCashMutation.mutate({
      shiftId: targetShiftId,
      type: modalType,
      amount,
      description: descriptionInput.trim(),
    })
  }

  // Calculate totals
  const totalIn = useMemo(
    () => cashLogs.filter((l) => l.type === 'in').reduce((acc, it) => acc + it.amount, 0),
    [cashLogs]
  )
  const totalDrop = useMemo(
    () => cashLogs.filter((l) => l.type === 'drop').reduce((acc, it) => acc + it.amount, 0),
    [cashLogs]
  )
  const netCashFlow = totalIn - totalDrop

  // Filtered list
  const filteredLogs = useMemo(() => {
    return cashLogs.filter((l) => {
      if (typeFilter !== 'ALL' && l.type !== typeFilter) return false
      return true
    })
  }, [cashLogs, typeFilter])

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-[#8b1538]" />
            <span>Manajemen Arus Kas Laci Kasir (Petty Cash)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Catat pengeluaran operasional toko/masjid (drop kas) dan kas masuk tambahan kasir.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleOpenModal('in')}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Catat Kas Masuk (In)</span>
          </button>
          <button
            onClick={() => handleOpenModal('drop')}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
          >
            <MinusCircle className="w-4 h-4" />
            <span>Catat Kas Keluar (Drop)</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Kas Masuk */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <ArrowDownRight className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Kas Masuk (In)
            </p>
            <h3 className="text-xl font-black text-emerald-700 font-mono mt-0.5">
              +{formatRupiah(totalIn)}
            </h3>
            <p className="text-[11px] text-slate-400">Modal tambahan kasir</p>
          </div>
        </div>

        {/* Total Kas Keluar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Kas Keluar (Drop)
            </p>
            <h3 className="text-xl font-black text-rose-600 font-mono mt-0.5">
              -{formatRupiah(totalDrop)}
            </h3>
            <p className="text-[11px] text-slate-400">Biaya operasional & drop</p>
          </div>
        </div>

        {/* Net Arus Kas */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-4">
          <div className={`p-3 rounded-lg ${netCashFlow >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Net Pergerakan Kas
            </p>
            <h3 className={`text-xl font-black font-mono mt-0.5 ${netCashFlow >= 0 ? 'text-blue-700' : 'text-amber-600'}`}>
              {netCashFlow >= 0 ? '+' : ''}{formatRupiah(netCashFlow)}
            </h3>
            <p className="text-[11px] text-slate-400">Selisih kas masuk vs keluar</p>
          </div>
        </div>

        {/* Status Shift Aktif */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Shift Kasir Aktif
            </p>
            <h3 className="text-sm font-bold text-slate-900 mt-0.5 truncate max-w-[160px]">
              {currentActiveShift ? (
                <span className="text-purple-700 font-extrabold">
                  {currentActiveShift.shift_name} ({currentActiveShift.cashier})
                </span>
              ) : (
                <span className="text-slate-400">Tidak ada shift aktif</span>
              )}
            </h3>
            <p className="text-[11px] text-slate-400">
              Kas awal: {formatRupiah(currentActiveShift?.opening_cash || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Cash Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-[#8b1538]" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
              Buku Mutasi Kas Laci Kasir
            </h3>
          </div>

          <div className="flex items-center gap-3">
            {/* Filter Jenis */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="ALL">Semua Jenis Kas</option>
                <option value="in">Kas Masuk (In)</option>
                <option value="drop">Kas Keluar (Drop)</option>
              </select>
            </div>

            <button
              onClick={() => refetch()}
              className="p-1.5 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg"
              title="Perbarui log kas"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Tanggal & Waktu</th>
                <th className="py-3 px-4">Shift ID</th>
                <th className="py-3 px-4">Jenis Transaksi</th>
                <th className="py-3 px-4 text-right">Nominal (Rp)</th>
                <th className="py-3 px-4">Keperluan / Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    Memuat data arus kas...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <p className="text-2xl mb-1">💸</p>
                    <p className="font-bold">Belum ada catatan arus kas</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Gunakan tombol di atas untuk mencatat kas masuk atau drop kas operasional.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {new Date(log.created_at).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-700 font-mono">
                      Shift #{log.shift_id}
                    </td>
                    <td className="py-3 px-4">
                      {log.type === 'in' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                          <ArrowDownRight className="w-3 h-3" />
                          <span>KAS MASUK</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800">
                          <ArrowUpRight className="w-3 h-3" />
                          <span>KAS KELUAR</span>
                        </span>
                      )}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-black font-mono text-sm ${
                        log.type === 'in' ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {log.type === 'in' ? '+' : '-'}
                      {formatRupiah(log.amount)}
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-medium">
                      {log.description}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Input Arus Kas (In / Drop) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div
              className={`px-5 py-4 text-white flex items-center justify-between ${
                modalType === 'in' ? 'bg-emerald-600' : 'bg-rose-600'
              }`}
            >
              <div className="flex items-center gap-2">
                {modalType === 'in' ? (
                  <PlusCircle className="w-5 h-5" />
                ) : (
                  <MinusCircle className="w-5 h-5" />
                )}
                <h4 className="font-bold text-sm uppercase tracking-wide">
                  {modalType === 'in' ? 'Catat Kas Masuk (In)' : 'Catat Kas Keluar / Drop Kas'}
                </h4>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCash} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Shift Kasir *
                </label>
                <select
                  value={selectedShiftId || currentActiveShift?.id || ''}
                  onChange={(e) => setSelectedShiftId(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-[#8b1538]"
                >
                  {activeShifts.length > 0 ? (
                    activeShifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        Shift #{s.id} - {s.shift_name} ({s.cashier})
                      </option>
                    ))
                  ) : (
                    <option value={1}>Shift #1 (Default Standby)</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nominal Kas (Rp) *
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 100.000"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-base font-black text-slate-900 focus:outline-none focus:border-[#8b1538] font-mono"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Keperluan / Keterangan *
                </label>
                <textarea
                  rows={3}
                  placeholder={
                    modalType === 'in'
                      ? 'Contoh: Tambahan modal receh pecahan kecil dari admin...'
                      : 'Contoh: Drop kas ke brankas / Pembelian galon air & sabun pembersih...'
                  }
                  value={descriptionInput}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-[#8b1538]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={logCashMutation.isPending}
                  className={`px-5 py-2 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 ${
                    modalType === 'in'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{logCashMutation.isPending ? 'Menyimpan...' : 'Simpan Transaksi Kas'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
