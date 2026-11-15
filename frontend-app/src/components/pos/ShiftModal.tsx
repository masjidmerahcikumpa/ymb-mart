import React, { useState } from 'react'
import {
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calculator,
  Coins,
  ChevronDown,
  ChevronUp,
  Printer,
  LogOut,
} from 'lucide-react'
import type { Shift } from '@/types/shift'
import { openShift, closeShift, logCash, type CloseShiftResponse } from '@/services/api'
import { formatRupiah } from '@/utils/currency'
import { showShiftCloseAlert } from '@/utils/alert'

interface ShiftModalProps {
  isOpen: boolean;
  mode: 'open' | 'close' | 'cash_in' | 'cash_drop';
  currentShift: Shift | null;
  onClose: () => void;
  onShiftUpdated: () => void;
  onLogout?: () => void;
}

const DENOMINATIONS = [
  { label: '100.000', value: 100000, key: '100k' },
  { label: '50.000', value: 50000, key: '50k' },
  { label: '20.000', value: 20000, key: '20k' },
  { label: '10.000', value: 10000, key: '10k' },
  { label: '5.000', value: 5000, key: '5k' },
  { label: '2.000', value: 2000, key: '2k' },
  { label: '1.000', value: 1000, key: '1k' },
]

export const ShiftModal: React.FC<ShiftModalProps> = ({
  isOpen,
  mode,
  currentShift,
  onClose,
  onShiftUpdated,
  onLogout,
}) => {
  const [shiftName, setShiftName] = useState<string>('Shift 1 (Pagi)')
  const [amountStr, setAmountStr] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [showDenomCalc, setShowDenomCalc] = useState<boolean>(false)
  const [closeSummaryResult, setCloseSummaryResult] = useState<CloseShiftResponse | null>(null)
  const [denomCounts, setDenomCounts] = useState<{ [key: string]: number }>({
    '100k': 0,
    '50k': 0,
    '20k': 0,
    '10k': 0,
    '5k': 0,
    '2k': 0,
    '1k': 0,
    coin: 0,
  })

  React.useEffect(() => {
    if (isOpen) {
      setErrorMsg('')
      setNotes('')
      setShowDenomCalc(false)
      setCloseSummaryResult(null)
      setDenomCounts({
        '100k': 0,
        '50k': 0,
        '20k': 0,
        '10k': 0,
        '5k': 0,
        '2k': 0,
        '1k': 0,
        coin: 0,
      })
      if (mode === 'open') {
        setAmountStr('500000')
      } else {
        setAmountStr('')
      }
    }
  }, [isOpen, mode])

  if (!isOpen) return null

  const parsedAmount = parseInt(amountStr, 10) || 0

  const handleDenomChange = (key: string, val: number) => {
    const updated = { ...denomCounts, [key]: Math.max(0, val || 0) }
    setDenomCounts(updated)
    let total = 0
    DENOMINATIONS.forEach((d) => {
      total += (updated[d.key] || 0) * d.value
    })
    total += updated.coin || 0
    setAmountStr(total.toString())
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setIsSubmitting(true)

    try {
      if (mode === 'open') {
        await openShift(shiftName, parsedAmount)
        onShiftUpdated()
        onClose()
      } else if (mode === 'close') {
        const expected = currentShift
          ? currentShift.opening_cash + currentShift.cash_sales - currentShift.cash_out
          : 0
        const res = await closeShift(expected, parsedAmount, notes)

        // Alert SweetAlert2 laporan tutup shift
        await showShiftCloseAlert({
          shiftId: res.shift_id || currentShift?.id || 0,
          opening: res.opening || 0,
          cashSales: res.cash_sales || 0,
          qrisSales: res.qris_sales || 0,
          expected: res.expected || 0,
          closing: res.closing || 0,
          discrepancy: res.discrepancy || 0,
        })

        setCloseSummaryResult(res)
        onShiftUpdated()
        return
      } else if (mode === 'cash_in' && currentShift) {
        await logCash(currentShift.id, 'in', parsedAmount, notes || 'Kas Masuk Tambahan')
        onShiftUpdated()
        onClose()
      } else if (mode === 'cash_drop' && currentShift) {
        await logCash(currentShift.id, 'drop', parsedAmount, notes || 'Setoran Tunai ke Brankas')
        onShiftUpdated()
        onClose()
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui shift'
      setErrorMsg(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const modalTitles = {
    open: 'Buka Shift Kasir Baru',
    close: 'Tutup Shift Kasir & Rekap Kas',
    cash_in: 'Input Kas Masuk (Cash In)',
    cash_drop: 'Tarik Kas ke Brankas (Cash Drop)',
  }

  const expectedClosing = currentShift
    ? currentShift.opening_cash + currentShift.cash_sales - currentShift.cash_out
    : 0
  const discrepancy = parsedAmount - expectedClosing

  if (closeSummaryResult) {
    const disc = closeSummaryResult.discrepancy || 0
    const discText =
      disc > 0
        ? `Lebih +${formatRupiah(disc)}`
        : disc < 0
        ? `Kurang -${formatRupiah(Math.abs(disc))}`
        : 'Pas (Rp 0)'

    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-5 py-4 bg-emerald-700 text-white flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-200" />
              <div>
                <h3 className="font-extrabold text-sm">Shift #{closeSummaryResult.shift_id} Berhasil Ditutup</h3>
                <p className="text-[11px] text-emerald-100">Rekapitulasi Keuangan & Arus Kas Laci</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Receipt Body */}
          <div className="p-5 space-y-3.5 bg-slate-50 overflow-y-auto no-scrollbar">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2 text-xs font-mono">
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <p className="font-bold text-slate-900 text-sm">BAITURRAHMAN MART</p>
                <p className="text-[10px] text-slate-500">BUKTI TUTUP BUKU SHIFT KASIR</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Petugas: {currentShift?.cashier_name || currentShift?.cashier || 'Kasir'} • Shift #{closeSummaryResult.shift_id}
                </p>
              </div>

              <div className="space-y-1.5 pt-1 text-slate-700">
                <div className="flex justify-between">
                  <span>Modal Awal Kasir:</span>
                  <span className="font-bold">{formatRupiah(closeSummaryResult.opening)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Penjualan Tunai:</span>
                  <span className="font-bold text-emerald-700">+{formatRupiah(closeSummaryResult.cash_sales)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Penjualan QRIS:</span>
                  <span className="font-bold text-blue-700">+{formatRupiah(closeSummaryResult.qris_sales)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Total Omzet Shift:</span>
                  <span>{formatRupiah(closeSummaryResult.total_sales)} ({closeSummaryResult.total_tx} Trx)</span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-300 pt-2 space-y-1.5 font-bold">
                <div className="flex justify-between text-slate-800">
                  <span>Uang Seharusnya:</span>
                  <span>{formatRupiah(closeSummaryResult.expected)}</span>
                </div>
                <div className="flex justify-between text-slate-900">
                  <span>Uang Fisik Diinput:</span>
                  <span>{formatRupiah(closeSummaryResult.closing)}</span>
                </div>
                <div
                  className={`flex justify-between pt-1 border-t border-slate-200 text-sm ${
                    disc === 0 ? 'text-emerald-700' : disc > 0 ? 'text-blue-700' : 'text-rose-700'
                  }`}
                >
                  <span>Selisih Kas Laci:</span>
                  <span>{discText}</span>
                </div>
              </div>
            </div>

            {/* Print Receipt Section */}
            <div id="printable-receipt" className="hidden print:block font-mono text-xs">
              <div className="text-center pb-2 border-b border-black">
                <p className="font-bold text-sm">BAITURRAHMAN MART</p>
                <p className="text-[10px]">TUTUP SHIFT KASIR #{closeSummaryResult.shift_id}</p>
                <p className="text-[10px]">Kasir: {currentShift?.cashier_name || currentShift?.cashier || 'Kasir'}</p>
                <p className="text-[10px]">Waktu: {new Date().toLocaleString('id-ID')}</p>
              </div>
              <div className="py-2 border-b border-black space-y-1">
                <div className="flex justify-between"><span>Modal Awal:</span><span>{formatRupiah(closeSummaryResult.opening)}</span></div>
                <div className="flex justify-between"><span>Penjualan Tunai:</span><span>{formatRupiah(closeSummaryResult.cash_sales)}</span></div>
                <div className="flex justify-between"><span>Penjualan QRIS:</span><span>{formatRupiah(closeSummaryResult.qris_sales)}</span></div>
                <div className="flex justify-between"><span>Total Omzet:</span><span>{formatRupiah(closeSummaryResult.total_sales)}</span></div>
                <div className="flex justify-between font-bold"><span>Total Trx:</span><span>{closeSummaryResult.total_tx}</span></div>
              </div>
              <div className="py-2 border-b border-black space-y-1 font-bold">
                <div className="flex justify-between"><span>Ekspektasi Kas:</span><span>{formatRupiah(closeSummaryResult.expected)}</span></div>
                <div className="flex justify-between"><span>Fisik Laci:</span><span>{formatRupiah(closeSummaryResult.closing)}</span></div>
                <div className="flex justify-between"><span>Selisih:</span><span>{discText}</span></div>
              </div>
              <div className="text-center pt-2 text-[10px]">
                <p>Terima Kasih Atas Amanah & Dedikasi Anda</p>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-white border-t border-slate-200 flex flex-col gap-2 shrink-0">
            <button
              type="button"
              onClick={() => window.print()}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Cetak Rekap Tutup Shift (Thermal)</span>
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Tutup Dialog
              </button>
              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    onLogout()
                  }}
                  className="flex-1 py-2.5 bg-[#8b1538] hover:bg-[#6b0f2a] text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Selesai & Logout</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-rose-300" />
            <h3 className="font-extrabold text-sm">{modalTitles[mode]}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto no-scrollbar">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {mode === 'open' && (
            <>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nama Shift</label>
                <select
                  value={shiftName}
                  onChange={(e) => setShiftName(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="Shift 1 (Pagi)">Shift 1 (Pagi: 07:00 - 15:00)</option>
                  <option value="Shift 2 (Sore)">Shift 2 (Sore: 15:00 - 22:00)</option>
                  <option value="Shift Penuh (Full Day)">Shift Penuh (Full Day)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Modal Awal Kasir / Kas Laci (Rp)
                </label>
                <input
                  type="number"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="Contoh: 500000"
                  className="w-full text-sm font-bold px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#8b1538]"
                  autoFocus
                  required
                />
                <div className="flex gap-1.5 mt-2">
                  {[200000, 300000, 500000, 1000000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmountStr(val.toString())}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                        amountStr === val.toString()
                          ? 'bg-[#8b1538] text-white border-[#8b1538]'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                      }`}
                    >
                      {val >= 1000000 ? `${val / 1000000} Jt` : `${val / 1000}rb`}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Nominal uang kembalian yang disiapkan di dalam laci kasir
                </p>
              </div>
            </>
          )}

          {mode === 'close' && currentShift && (
            <>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Modal Awal Kasir:</span>
                  <span className="font-semibold">{formatRupiah(currentShift.opening_cash)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Penjualan Tunai:</span>
                  <span className="font-semibold text-emerald-700">+{formatRupiah(currentShift.cash_sales)}</span>
                </div>
                {currentShift.cash_out > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Kas Ditarik (Drop ke Brankas):</span>
                    <span>-{formatRupiah(currentShift.cash_out)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold text-slate-800">
                  <span>Ekspektasi Total Kas Laci:</span>
                  <span className="text-[#8b1538] text-sm">
                    {formatRupiah(expectedClosing)}
                  </span>
                </div>
              </div>

              {/* Denomination Calculator Toggle */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowDenomCalc(!showDenomCalc)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between text-xs font-bold text-slate-700 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-[#8b1538]" />
                    <span>Kalkulator Pecahan Uang Fisik Laci</span>
                  </div>
                  {showDenomCalc ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {showDenomCalc && (
                  <div className="p-3 bg-white space-y-2 border-t border-slate-200">
                    <p className="text-[11px] text-slate-500 mb-2">
                      Masukkan jumlah lembar per pecahan. Total akan otomatis dihitung ke kas aktual:
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {DENOMINATIONS.map((d) => (
                        <div
                          key={d.key}
                          className="flex items-center justify-between p-1.5 bg-slate-50 rounded-lg border border-slate-200"
                        >
                          <span className="font-bold text-slate-700 text-[11px]">{d.label}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400">×</span>
                            <input
                              type="number"
                              min={0}
                              placeholder="0"
                              value={denomCounts[d.key] || ''}
                              onChange={(e) =>
                                handleDenomChange(d.key, parseInt(e.target.value, 10) || 0)
                              }
                              className="w-14 p-1 text-right text-xs font-mono font-bold bg-white border border-slate-300 rounded focus:outline-none focus:border-[#8b1538]"
                            />
                          </div>
                        </div>
                      ))}

                      {/* Koin / Logam Receh */}
                      <div className="flex items-center justify-between p-1.5 bg-slate-50 rounded-lg border border-slate-200">
                        <span className="font-bold text-slate-700 text-[11px] flex items-center gap-1">
                          <Coins className="w-3 h-3 text-amber-500" />
                          <span>Koin (Rp)</span>
                        </span>
                        <input
                          type="number"
                          min={0}
                          placeholder="Nominal"
                          value={denomCounts.coin || ''}
                          onChange={(e) =>
                            handleDenomChange('coin', parseInt(e.target.value, 10) || 0)
                          }
                          className="w-20 p-1 text-right text-xs font-mono font-bold bg-white border border-slate-300 rounded focus:outline-none focus:border-[#8b1538]"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex justify-between items-center text-xs font-bold text-slate-700 border-t border-slate-100">
                      <span>Total Pecahan:</span>
                      <span className="text-[#8b1538] font-mono text-sm">{formatRupiah(parsedAmount)}</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Hitungan Uang Fisik Aktual di Laci (Rp) *
                </label>
                <input
                  type="number"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="Total uang aktual di laci..."
                  className="w-full text-base font-black px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8b1538]"
                  autoFocus
                  required
                />
              </div>

              {/* Real-time Cash Discrepancy Status */}
              {amountStr !== '' && (
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
                    discrepancy === 0
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : discrepancy > 0
                      ? 'bg-blue-50 border-blue-200 text-blue-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {discrepancy === 0 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    <span>Status Selisih Kas:</span>
                  </div>
                  <span className="font-mono text-sm">
                    {discrepancy === 0
                      ? 'SEIMBANG (PAS)'
                      : discrepancy > 0
                      ? `LEBIH +${formatRupiah(discrepancy)}`
                      : `KURANG -${formatRupiah(Math.abs(discrepancy))}`}
                  </span>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Catatan Tutup Shift (Opsional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: uang receh pas, sisa uang dititip brankas"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-[#8b1538]"
                />
              </div>
            </>
          )}

          {(mode === 'cash_in' || mode === 'cash_drop') && (
            <>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nominal (Rp)</label>
                <input
                  type="number"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="Masukkan jumlah uang..."
                  className="w-full text-sm font-bold px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#8b1538]"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Keterangan / Alasan</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={mode === 'cash_in' ? 'Contoh: Tambahan modal uang receh' : 'Contoh: Setoran siang ke bendahara'}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
            </>
          )}

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || parsedAmount < 0}
              className="flex-1 py-2.5 bg-[#8b1538] hover:bg-[#6b0f2a] disabled:opacity-50 text-white font-extrabold rounded-xl text-xs transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>Simpan & Lanjutkan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
