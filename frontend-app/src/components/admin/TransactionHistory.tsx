import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchTransactions, voidTransaction } from '@/services/api'
import type { Transaction } from '@/types/transaction'
import { formatRupiah } from '@/utils/currency'
import Swal, { showSuccessAlert, showErrorAlert, showWarningAlert } from '@/utils/alert'
import {
  Receipt,
  Search,
  Calendar,
  Filter,
  Eye,
  Printer,
  Ban,
  CheckCircle2,
  XCircle,
  RefreshCw,
  CreditCard,
  X,
} from 'lucide-react'

export const TransactionHistory: React.FC = () => {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // Query Transactions
  const { data: transactions = [], isLoading, refetch } = useQuery({
    queryKey: ['transactions', selectedDate],
    queryFn: () => fetchTransactions(selectedDate || undefined, 150),
    refetchInterval: 30000,
  })

  // Mutation for Voiding Transaction
  const voidMutation = useMutation({
    mutationFn: voidTransaction,
    onSuccess: (res) => {
      showSuccessAlert('Transaksi Dibatalkan', `Transaksi berhasil dibatalkan (VOID): ${res.message || 'Stok telah dikembalikan'}`)
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setIsDetailOpen(false)
    },
    onError: (err: Error) => {
      showErrorAlert('Gagal Void', `Gagal membatalkan transaksi: ${err.message}`)
    },
  })

  const handleVoid = async (tx: Transaction) => {
    if (tx.status === 'voided') {
      showWarningAlert('Perhatian', 'Transaksi ini sudah berstatus VOID.')
      return
    }
    const result = await Swal.fire({
      title: `Batalkan Transaksi #${tx.tx_id}?`,
      text: `Total: ${formatRupiah(tx.grand_total)}. Ketik 'VOID' untuk konfirmasi pembatalan dan pengembalian stok:`,
      input: 'text',
      inputPlaceholder: "Ketik 'VOID' di sini...",
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Batalkan Transaksi',
      cancelButtonText: 'Batal',
      inputValidator: (value) => {
        if (value !== 'VOID') {
          return "Wajib mengetik 'VOID' dengan huruf kapital!"
        }
      },
    })
    if (result.isConfirmed) {
      voidMutation.mutate(tx.tx_id)
    }
  }

  const handlePrint = (tx: Transaction) => {
    setSelectedTx(tx)
    setIsDetailOpen(true)
    setTimeout(() => {
      window.print()
    }, 400)
  }

  // Filtered list
  const filteredTxs = useMemo(() => {
    return transactions.filter((tx) => {
      const matchSearch =
        tx.tx_id.toLowerCase().includes(search.toLowerCase()) ||
        (tx.cashier && tx.cashier.toLowerCase().includes(search.toLowerCase())) ||
        (tx.customer_name && tx.customer_name.toLowerCase().includes(search.toLowerCase()))

      const matchPayment = paymentFilter === 'ALL' || tx.payment === paymentFilter
      const matchStatus = statusFilter === 'ALL' || tx.status === statusFilter

      return matchSearch && matchPayment && matchStatus
    })
  }, [transactions, search, paymentFilter, statusFilter])

  return (
    <div className="space-y-5">
      {/* Top Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari No. Struk / Kasir / Pelanggan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-[#8b1538]"
            />
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none"
            />
            {selectedDate && (
              <button
                onClick={() => setSelectedDate('')}
                className="text-slate-400 hover:text-slate-600 text-xs px-1"
                title="Hapus filter tanggal"
              >
                ✕
              </button>
            )}
          </div>

          {/* Payment Method Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <CreditCard className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Pembayaran</option>
              <option value="CASH">Tunai (CASH)</option>
              <option value="QRIS">QRIS</option>
              <option value="TRANSFER">Transfer</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Status</option>
              <option value="completed">Selesai (Completed)</option>
              <option value="voided">Dibatalkan (Voided)</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition shadow-2xs"
          title="Perbarui data transaksi"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Transaction Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#8b1538]" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
              Buku Riwayat Transaksi Kasir
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-500">
            Total: {filteredTxs.length} Transaksi
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">No. Struk</th>
                <th className="py-3 px-4">Waktu (WIB)</th>
                <th className="py-3 px-4">Kasir</th>
                <th className="py-3 px-4">Pelanggan / Member</th>
                <th className="py-3 px-4">Metode Bayar</th>
                <th className="py-3 px-4 text-right">Total Belanja</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Memuat daftar transaksi...
                  </td>
                </tr>
              ) : filteredTxs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <p className="text-2xl mb-1">🧾</p>
                    <p className="font-bold">Tidak ada transaksi ditemukan</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Coba ganti filter tanggal atau kata kunci pencarian.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTxs.map((tx) => (
                  <tr
                    key={tx.id || tx.tx_id}
                    className={`hover:bg-slate-50 transition-colors ${
                      tx.status === 'voided' ? 'bg-rose-50/40 text-slate-400' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      #{tx.tx_id}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(tx.created_at).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {tx.cashier || '-'}
                    </td>
                    <td className="py-3 px-4">
                      {tx.customer_name ? (
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                          {tx.customer_name}
                        </span>
                      ) : (
                        <span className="text-slate-400">Umum</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          tx.payment === 'CASH'
                            ? 'bg-emerald-100 text-emerald-800'
                            : tx.payment === 'QRIS'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {tx.payment}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono">
                      {formatRupiah(tx.grand_total)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {tx.status === 'completed' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Sukses</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>VOID</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedTx(tx)
                            setIsDetailOpen(true)
                          }}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition"
                          title="Lihat Detail Struk"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handlePrint(tx)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
                          title="Cetak Ulang Struk"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {tx.status === 'completed' && (
                          <button
                            onClick={() => handleVoid(tx)}
                            disabled={voidMutation.isPending}
                            className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition"
                            title="Batalkan / Void Transaksi"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail & Reprint Struk */}
      {isDetailOpen && selectedTx && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#d4af37]" />
                <h4 className="font-bold text-xs uppercase tracking-wider">
                  Detail Transaksi #{selectedTx.tx_id}
                </h4>
              </div>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Receipt Body */}
            <div className="p-6 overflow-y-auto flex-1 font-mono text-xs text-slate-800 space-y-3 bg-slate-50">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="text-center border-b border-dashed border-slate-300 pb-3">
                  <h3 className="font-black text-sm tracking-wide">BAITURRAHMAN MART</h3>
                  <p className="text-[11px] text-slate-500">Masjid Jami' Baiturrahman</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Jl. Cikumpa, Sukmajaya, Depok
                  </p>
                </div>

                <div className="text-[11px] space-y-0.5 border-b border-dashed border-slate-300 pb-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">No. Invoice:</span>
                    <span className="font-bold">#{selectedTx.tx_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Waktu:</span>
                    <span>
                      {new Date(selectedTx.created_at).toLocaleString('id-ID', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Kasir:</span>
                    <span className="font-bold">{selectedTx.cashier || '-'}</span>
                  </div>
                  {selectedTx.customer_name && (
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>Member:</span>
                      <span>{selectedTx.customer_name}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status:</span>
                    <span
                      className={`font-black uppercase ${
                        selectedTx.status === 'completed'
                          ? 'text-emerald-700'
                          : 'text-rose-600'
                      }`}
                    >
                      {selectedTx.status}
                    </span>
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-2">
                  {(selectedTx.items || []).map((it, idx) => (
                    <div key={idx} className="flex justify-between text-[11px] leading-snug">
                      <div className="pr-2">
                        <p className="font-bold text-slate-800">{it.name}</p>
                        <p className="text-[10px] text-slate-500">
                          {it.qty} x {formatRupiah(it.price)}
                        </p>
                      </div>
                      <span className="font-bold font-mono">
                        {formatRupiah(it.subtotal || it.price * it.qty)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="space-y-1 text-[11px] pt-1">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>{formatRupiah(selectedTx.total)}</span>
                  </div>
                  {selectedTx.discount > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Diskon:</span>
                      <span>-{formatRupiah(selectedTx.discount)}</span>
                    </div>
                  )}
                  {selectedTx.tax > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Infaq Masjid:</span>
                      <span>+{formatRupiah(selectedTx.tax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black border-t border-slate-800 pt-1">
                    <span>TOTAL:</span>
                    <span>{formatRupiah(selectedTx.grand_total)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 pt-0.5">
                    <span>Metode:</span>
                    <span className="font-bold">{selectedTx.payment}</span>
                  </div>
                  {selectedTx.payment === 'CASH' && (
                    <>
                      <div className="flex justify-between text-slate-600">
                        <span>Tunai:</span>
                        <span>{formatRupiah(selectedTx.amount_paid || selectedTx.grand_total)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Kembalian:</span>
                        <span>{formatRupiah(selectedTx.change_amount || 0)}</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="text-center text-[10px] text-slate-400 border-t border-dashed border-slate-300 pt-3">
                  <p>Terima kasih atas kunjungan Anda.</p>
                  <p>Barakallahu fiikum.</p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-[#8b1538] hover:bg-[#a31a43] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Thermal</span>
              </button>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
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
