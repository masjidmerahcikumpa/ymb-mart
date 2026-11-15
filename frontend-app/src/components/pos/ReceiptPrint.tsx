import React, { useEffect } from 'react'
import { Printer, CheckCircle2, ArrowRight } from 'lucide-react'
import type { POSCartItem } from '@/types/transaction'
import type { Member } from '@/types/member'
import { formatRupiah } from '@/utils/currency'

interface ReceiptPrintProps {
  isOpen: boolean;
  txId: string;
  items: POSCartItem[];
  subtotal: number;
  discount: number;
  infaq: number;
  grandTotal: number;
  amountPaid: number;
  changeAmount: number;
  paymentMethod: string;
  cashierName: string;
  customerName?: string;
  member?: Member | null;
  onNewTransaction: () => void;
}

export const ReceiptPrint: React.FC<ReceiptPrintProps> = ({
  isOpen,
  txId,
  items,
  subtotal,
  discount,
  infaq,
  grandTotal,
  amountPaid,
  changeAmount,
  paymentMethod,
  cashierName,
  customerName,
  member,
  onNewTransaction,
}) => {
  const currentDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  // Auto trigger print when modal opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        window.print()
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
        {/* Success Header banner (Screen only) */}
        <div className="p-4 bg-emerald-600 text-white flex items-center gap-3">
          <CheckCircle2 className="w-8 h-8 text-emerald-200 shrink-0" />
          <div>
            <h3 className="font-bold text-base leading-tight">Transaksi Berhasil!</h3>
            <p className="text-xs text-emerald-100">ID: #{txId}</p>
          </div>
        </div>

        {/* Printable Receipt Container */}
        <div className="p-6 overflow-y-auto max-h-[60vh] bg-slate-50 flex justify-center">
          <div
            id="printable-receipt"
            className="w-full max-w-[320px] bg-white p-4 rounded-xl shadow-xs border border-slate-200 text-slate-800 text-xs font-mono"
          >
            {/* Header */}
            <div className="text-center border-b border-dashed border-slate-300 pb-3 mb-2">
              <h2 className="font-black text-sm tracking-wider">BAITURRAHMAN MART</h2>
              <p className="text-[11px] text-slate-600">Masjid Jami' Baiturrahman</p>
              <p className="text-[10px] text-slate-500">Jl. Cikumpa, Sukmajaya, Depok</p>
              <p className="text-[10px] text-slate-400 mt-1">Telp: 0812-3456-7890</p>
            </div>

            {/* Meta */}
            <div className="text-[10px] space-y-0.5 border-b border-dashed border-slate-300 pb-2 mb-2">
              <div className="flex justify-between">
                <span>No. Transaksi</span>
                <span className="font-bold">#{txId}</span>
              </div>
              <div className="flex justify-between">
                <span>Waktu</span>
                <span>{currentDate}</span>
              </div>
              <div className="flex justify-between">
                <span>Kasir</span>
                <span>{cashierName}</span>
              </div>
              {customerName && (
                <div className="flex justify-between">
                  <span>Pelanggan</span>
                  <span>{customerName}</span>
                </div>
              )}
              {member && (
                <div className="flex justify-between font-bold text-emerald-700">
                  <span>Member ({member.tier})</span>
                  <span>{member.name}</span>
                </div>
              )}
            </div>

            {/* Line Items */}
            <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-2 mb-2">
              {items.map((it, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="font-semibold text-slate-900 truncate">{it.product.name}</div>
                  <div className="flex justify-between text-slate-600 text-[11px]">
                    <span>
                      {it.qty} x {formatRupiah(it.price)}
                    </span>
                    <span className="font-bold text-slate-800">{formatRupiah(it.subtotal)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals Breakdown */}
            <div className="space-y-1 text-[11px] border-b border-dashed border-slate-300 pb-2 mb-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatRupiah(subtotal)}</span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>Diskon</span>
                  <span>-{formatRupiah(discount)}</span>
                </div>
              )}

              {infaq > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Infaq Kas Masjid</span>
                  <span>+{formatRupiah(infaq)}</span>
                </div>
              )}

              <div className="flex justify-between font-black text-sm pt-1 border-t border-slate-200">
                <span>TOTAL AKHIR</span>
                <span>{formatRupiah(grandTotal)}</span>
              </div>

              <div className="flex justify-between pt-1">
                <span>Metode Bayar</span>
                <span className="font-bold">{paymentMethod}</span>
              </div>

              {paymentMethod === 'CASH' && (
                <>
                  <div className="flex justify-between">
                    <span>Tunai Diterima</span>
                    <span>{formatRupiah(amountPaid)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-800">
                    <span>Kembalian</span>
                    <span>{formatRupiah(changeAmount)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Footer Message */}
            <div className="text-center text-[10px] text-slate-500 pt-1 space-y-0.5">
              <p className="font-bold text-slate-700">Jazakumullahu Khairan Katsiran</p>
              <p>Belanja Anda Berkah & Beramal Jariyah</p>
              <p className="text-[9px] text-slate-400">Barang yang dibeli tidak dapat ditukar kecuali perjanjian</p>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons (Screen Only) */}
        <div className="p-4 bg-white border-t border-slate-200 flex gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Ulang Struk</span>
          </button>

          <button
            type="button"
            onClick={onNewTransaction}
            className="flex-1 py-3 bg-[#8b1538] hover:bg-[#6b0f2a] text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
          >
            <span>Transaksi Baru</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

