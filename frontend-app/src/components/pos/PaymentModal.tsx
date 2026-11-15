import React, { useState, useMemo, useEffect } from 'react'
import { X, Check, Banknote, QrCode, CreditCard, AlertCircle, Loader2 } from 'lucide-react'
import { formatRupiah } from '@/utils/currency'
import { broadcastShowQRIS, broadcastHideQRIS, broadcastNewTransaction } from '@/utils/customerDisplay'

interface PaymentModalProps {
  isOpen: boolean;
  grandTotal: number;
  onClose: () => void;
  onSubmitPayment: (params: {
    paymentMethod: string;
    amountPaid: number;
    changeAmount: number;
    customerName: string;
  }) => Promise<void>;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  grandTotal,
  onClose,
  onSubmitPayment,
}) => {
  const [method, setMethod] = useState<'CASH' | 'QRIS' | 'TRANSFER' | 'DEBIT'>('CASH')
  const [cashInput, setCashInput] = useState<string>('')
  const [customerName, setCustomerName] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string>('')

  // Numeric cash paid calculation
  const amountPaid = useMemo(() => {
    if (method !== 'CASH') return grandTotal
    return parseInt(cashInput, 10) || 0
  }, [cashInput, method, grandTotal])

  const changeAmount = useMemo(() => {
    return Math.max(0, amountPaid - grandTotal)
  }, [amountPaid, grandTotal])

  const isCashSufficient = amountPaid >= grandTotal

  useEffect(() => {
    if (isOpen && method === 'QRIS') {
      const qrisUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=6&data=00020101021226670016ID.CO.QRIS.WWW01189360099800000123450215ID10243588921100303UMI51440014ID.LINKAJA.WWW02152002150000000005204541153033605405${grandTotal}5802ID5917BAITURRAHMAN%20MART6005DEPOK61051641562070703A016304`
      broadcastShowQRIS(grandTotal, qrisUrl, 'Baiturrahman Mart')
    } else {
      broadcastHideQRIS()
    }
    return () => {
      broadcastHideQRIS()
    }
  }, [isOpen, method, grandTotal])

  if (!isOpen) return null

  const handleNumpad = (char: string) => {
    if (char === 'C') {
      setCashInput('')
    } else if (char === 'DEL') {
      setCashInput((prev) => prev.slice(0, -1))
    } else {
      setCashInput((prev) => (prev + char).slice(0, 10))
    }
  }

  const handleQuickCash = (amount: number) => {
    setCashInput(String(amount))
  }

  const handleProcessSubmit = async () => {
    setErrorMsg('')
    if (method === 'CASH' && !isCashSufficient) {
      setErrorMsg('Nominal uang tunai yang diterima kurang dari total belanja!')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmitPayment({
        paymentMethod: method,
        amountPaid: method === 'CASH' ? amountPaid : grandTotal,
        changeAmount: method === 'CASH' ? changeAmount : 0,
        customerName: customerName.trim(),
      })
      broadcastNewTransaction({
        grand_total: grandTotal,
        payment: method,
        amount_paid: method === 'CASH' ? amountPaid : grandTotal,
        change: method === 'CASH' ? changeAmount : 0,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memproses transaksi kasir'
      setErrorMsg(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 bg-[#8b1538] text-white flex justify-between items-center select-none">
          <div>
            <h3 className="font-extrabold text-base">Pembayaran & Selesai Belanja</h3>
            <p className="text-xs text-rose-200">Pilih metode bayar dan masukkan nominal uang</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Total Banner */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
              Total Tagihan Kasir
            </span>
            <p className="text-2xl font-black text-[#8b1538] mt-0.5">{formatRupiah(grandTotal)}</p>
          </div>

          <div className="flex gap-2">
            {[
              { id: 'CASH', label: 'Tunai', icon: Banknote },
              { id: 'QRIS', label: 'QRIS', icon: QrCode },
              { id: 'TRANSFER', label: 'Transfer', icon: CreditCard },
            ].map((tab) => {
              const Icon = tab.icon
              const active = method === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMethod(tab.id as typeof method)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    active
                      ? 'bg-[#8b1538] text-white shadow-sm ring-2 ring-rose-300'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {method === 'CASH' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cash Left: Inputs & Denominations */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">
                    Uang Diterima (Rp)
                  </label>
                  <input
                    type="text"
                    value={cashInput ? formatRupiah(parseInt(cashInput, 10)) : ''}
                    placeholder="Rp 0"
                    readOnly
                    className="w-full text-xl font-black text-slate-900 px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-slate-50 text-right focus:outline-none"
                  />
                </div>

                {/* Quick Cash Buttons */}
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                    Uang Pas & Pecahan Cepat
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleQuickCash(grandTotal)}
                      className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs rounded-lg transition-colors text-center"
                    >
                      Uang Pas
                    </button>
                    {[10000, 20000, 50000, 100000, 200000].map((denom) => (
                      <button
                        key={denom}
                        type="button"
                        onClick={() => handleQuickCash(denom)}
                        className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors text-center"
                      >
                        {denom >= 1000 ? `${denom / 1000}k` : denom}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Change Box */}
                <div className={`p-4 rounded-xl border ${isCashSufficient ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-xs font-semibold text-slate-500 block">Kembalian</span>
                  <p className={`text-2xl font-black mt-0.5 ${isCashSufficient ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {formatRupiah(changeAmount)}
                  </p>
                </div>
              </div>

              {/* Cash Right: Interactive Touch Numpad */}
              <div className="grid grid-cols-3 gap-2 bg-slate-100 p-2.5 rounded-2xl select-none">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '000'].map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => handleNumpad(k)}
                    className="h-12 bg-white hover:bg-slate-50 active:bg-slate-200 rounded-xl font-black text-slate-800 text-base shadow-xs flex items-center justify-center transition-all active:scale-95"
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>
          )}

          {method === 'QRIS' && (
            <div className="flex flex-col items-center justify-center py-4 space-y-3">
              <div className="p-3 bg-white border border-slate-300 rounded-2xl shadow-sm">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=6&data=00020101021226670016ID.CO.QRIS.WWW01189360099800000123450215ID10243588921100303UMI51440014ID.LINKAJA.WWW02152002150000000005204541153033605405${grandTotal}5802ID5917BAITURRAHMAN%20MART6005DEPOK61051641562070703A016304`}
                  alt="QRIS Code"
                  className="w-48 h-48 object-contain"
                />
              </div>
              <p className="text-xs font-medium text-slate-500">
                Arahkan kamera e-wallet / m-banking pembeli ke kode QR di atas atau Customer Display
              </p>
            </div>
          )}

          {method === 'TRANSFER' && (
            <div className="p-4 bg-slate-50 rounded-xl space-y-2 border border-slate-200">
              <label className="text-xs font-bold text-slate-700 block">Bank Rekening Toko</label>
              <p className="text-sm font-semibold text-slate-800">Bank Syariah Indonesia (BSI) — 7123-456-789</p>
              <p className="text-xs text-slate-500">a.n. DKM Masjid Jami' Baiturrahman</p>
            </div>
          )}

          {/* Optional Customer Name Note */}
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">
              Nama Pembeli (Opsional)
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Contoh: Pak Haji Ahmad / Umum"
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#8b1538]"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-3 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs transition-colors"
          >
            Batal (Esc)
          </button>

          <button
            type="button"
            onClick={handleProcessSubmit}
            disabled={isSubmitting || (method === 'CASH' && !isCashSufficient)}
            className="flex-2 py-3 bg-[#8b1538] hover:bg-[#6b0f2a] disabled:opacity-50 text-white font-extrabold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memproses Transaksi...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Konfirmasi Pembayaran Selesai</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
