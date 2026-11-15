import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchReceiptDetail } from '@/services/api'
import { formatRupiah } from '@/utils/currency'
import { Printer, ArrowLeft, Store, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'

export const ReceiptScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>()

  const { data: receipt, isLoading, isError, error } = useQuery({
    queryKey: ['receipt-detail', id],
    queryFn: () => (id ? fetchReceiptDetail(id) : Promise.reject('No ID')),
    enabled: !!id,
    retry: 1,
  })

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 print:p-0 print:bg-white">
      {/* Action Bar (Hidden during Print) */}
      <div className="max-w-xs w-full mb-3 flex items-center justify-between print:hidden">
        <Link
          to="/kasir"
          className="text-xs font-bold text-slate-600 hover:text-[#8b1538] flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Kasir</span>
        </Link>
        <Link
          to="/admin"
          className="text-xs font-semibold text-slate-500 hover:text-slate-800"
        >
          Menu Admin →
        </Link>
      </div>

      {isLoading ? (
        <div className="max-w-xs w-full bg-white p-8 rounded-2xl shadow-md border border-slate-200 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-[#8b1538] animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-600">Memuat data struk transaksi #{id}...</p>
        </div>
      ) : isError || !receipt ? (
        <div className="max-w-xs w-full bg-white p-6 rounded-2xl shadow-md border border-slate-200 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">Struk Tidak Ditemukan</h3>
          <p className="text-xs text-slate-500">
            {error instanceof Error ? error.message : `Transaksi ID "${id}" tidak ditemukan di database.`}
          </p>
          <div className="pt-2">
            <Link
              to="/kasir"
              className="inline-block px-4 py-2 bg-[#8b1538] text-white rounded-lg text-xs font-bold"
            >
              Kembali ke Terminal Kasir
            </Link>
          </div>
        </div>
      ) : (
        <div className="max-w-xs w-full space-y-3">
          {/* Printable Receipt Card */}
          <div
            id="printable-receipt"
            className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200 font-mono text-slate-800 text-xs space-y-3 print:shadow-none print:border-none print:p-2 print:m-0 print:w-full print:rounded-none"
          >
            {/* Store Header */}
            <div className="text-center space-y-0.5 border-b border-dashed border-slate-300 pb-3">
              <div className="flex justify-center items-center gap-1 text-[#8b1538] mb-1 print:hidden">
                <Store className="w-5 h-5" />
              </div>
              <h1 className="font-extrabold text-sm tracking-wider uppercase text-slate-900">
                {receipt.store_name || 'BAITURRAHMAN MART'}
              </h1>
              <p className="text-[11px] text-slate-500 leading-tight">
                {receipt.address || 'Komplek Masjid Jami Baiturrahman'}
              </p>
              <div className="pt-2 text-[10px] text-slate-400 flex justify-between border-t border-slate-100 mt-2">
                <span>{receipt.tx_id}</span>
                <span>{receipt.date}</span>
              </div>
              <div className="text-[10px] text-slate-400 flex justify-between">
                <span>Kasir: {receipt.cashier || 'Kasir'}</span>
                {receipt.customer_name && <span>Plg: {receipt.customer_name}</span>}
              </div>
            </div>

            {/* Items Table */}
            <div className="divide-y divide-dashed divide-slate-200 py-1 space-y-1.5">
              {receipt.items.map((it, idx) => (
                <div key={idx} className="pt-1.5 first:pt-0">
                  <div className="font-bold text-slate-800 text-[11px] leading-tight line-clamp-1">
                    {it.name}
                  </div>
                  <div className="flex justify-between items-center text-[10.5px] text-slate-600 mt-0.5">
                    <span>
                      {it.qty} x {formatRupiah(it.price)}
                      {it.discount > 0 && (
                        <span className="text-rose-600 ml-1">(-{formatRupiah(it.discount)})</span>
                      )}
                    </span>
                    <span className="font-bold text-slate-900">{formatRupiah(it.subtotal)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals Breakdown */}
            <div className="border-t border-dashed border-slate-300 pt-2 space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span>{formatRupiah(receipt.subtotal)}</span>
              </div>

              {receipt.discount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Diskon Item</span>
                  <span>-{formatRupiah(receipt.discount)}</span>
                </div>
              )}

              {receipt.tax > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>PPN</span>
                  <span>+{formatRupiah(receipt.tax)}</span>
                </div>
              )}

              <div className="flex justify-between items-baseline pt-1.5 border-t border-dashed border-slate-300 font-extrabold text-sm text-slate-900">
                <span>TOTAL</span>
                <span className="text-[#8b1538]">{formatRupiah(receipt.total)}</span>
              </div>

              <div className="flex justify-between text-slate-600 pt-1">
                <span>Metode Bayar</span>
                <span className="font-bold">{receipt.payment}</span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Bayar</span>
                <span>{formatRupiah(receipt.amount_paid)}</span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Kembali</span>
                <span className="font-bold text-slate-900">{formatRupiah(receipt.change)}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-dashed border-slate-300 pt-3 text-center text-[10px] text-slate-400 whitespace-pre-line leading-relaxed">
              {receipt.footer || 'Terima kasih atas kunjungan Anda.\nBarakallahu fiikum.'}
            </div>
          </div>

          {/* Action Buttons (Screen Only) */}
          <div className="flex gap-2 print:hidden">
            <button
              onClick={() => window.print()}
              className="flex-1 py-2.5 bg-[#8b1538] hover:bg-[#6b0f2a] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-[0.99] transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Struk Thermal</span>
            </button>
            <Link
              to="/kasir"
              className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
