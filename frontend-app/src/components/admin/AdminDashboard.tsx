import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchStats, fetchSalesTrend, fetchPaymentBreakdown } from '@/services/api'
import {
  TrendingUp,
  Receipt,
  CircleDollarSign,
  AlertTriangle,
  Users,
  CreditCard,
  ShoppingBag,
  ArrowUpRight,
  Clock,
} from 'lucide-react'

export const AdminDashboard: React.FC<{ onNavigateToProducts?: () => void }> = ({ onNavigateToProducts }) => {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: fetchStats,
    refetchInterval: 30000,
  })

  const { data: salesTrend } = useQuery({
    queryKey: ['sales-trend'],
    queryFn: fetchSalesTrend,
    refetchInterval: 60000,
  })

  const { data: paymentBreakdown } = useQuery({
    queryKey: ['payment-breakdown'],
    queryFn: fetchPaymentBreakdown,
    refetchInterval: 60000,
  })

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val)
  }

  // Calculate max sales for SVG scaling
  const maxSale = Math.max(...(salesTrend?.map((t) => t.sales) || [1]), 100000)

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Penjualan */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Omzet Hari Ini</p>
            <h3 className="text-lg font-bold text-slate-800">
              {statsLoading ? '...' : formatRupiah(stats?.total_sales || 0)}
            </h3>
            <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-0.5">
              <span>{stats?.total_tx || 0} Transaksi</span>
            </p>
          </div>
        </div>

        {/* Laba Kotor */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <CircleDollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Estimasi Laba Kotor</p>
            <h3 className="text-lg font-bold text-slate-800">
              {statsLoading ? '...' : formatRupiah(stats?.total_profit || 0)}
            </h3>
            <p className="text-[11px] text-slate-400">Margin bruto penjualan</p>
          </div>
        </div>

        {/* Transaksi Selesai */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Total Transaksi</p>
            <h3 className="text-lg font-bold text-slate-800">
              {statsLoading ? '...' : `${stats?.total_tx || 0} Struk`}
            </h3>
            <p className="text-[11px] text-slate-400">Hari ini berjalan</p>
          </div>
        </div>

        {/* Stok Menipis */}
        <div
          onClick={onNavigateToProducts}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4 cursor-pointer hover:border-amber-400 transition-colors"
        >
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Stok Menipis (&lt;10)</p>
            <h3 className="text-lg font-bold text-amber-600">
              {statsLoading ? '...' : `${stats?.low_stock || 0} Item`}
            </h3>
            <p className="text-[11px] text-amber-500 font-medium">Klik untuk restock →</p>
          </div>
        </div>

        {/* Member Terdaftar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Member Jemaah</p>
            <h3 className="text-lg font-bold text-slate-800">
              {statsLoading ? '...' : `${stats?.member_count || 0} Orang`}
            </h3>
            <p className="text-[11px] text-slate-400">Pelanggan aktif</p>
          </div>
        </div>
      </div>

      {/* Grid: Trend Penjualan (7 Hari) & Pembayaran */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend 7 Hari (SVG Bar Chart) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Tren Penjualan 7 Hari Terakhir</h3>
              <p className="text-xs text-slate-400">Total omzet dan volume transaksi harian</p>
            </div>
            <span className="text-xs bg-slate-100 text-slate-600 font-medium px-2.5 py-1 rounded-md">
              7 Hari Terakhir
            </span>
          </div>

          <div className="h-56 flex items-end gap-3 pt-6 pb-2 border-b border-slate-100">
            {salesTrend && salesTrend.length > 0 ? (
              salesTrend.map((t, idx) => {
                const heightPercent = Math.max(8, Math.round((t.sales / maxSale) * 100))
                const dateLabel = new Date(t.date).toLocaleDateString('id-ID', {
                  weekday: 'short',
                  day: 'numeric',
                })
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                    <span className="text-[10px] font-semibold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {formatRupiah(t.sales)}
                    </span>
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className="w-full bg-[#8b1538] hover:bg-[#a31a43] rounded-t-md transition-all duration-300 relative"
                    >
                      <div className="hidden group-hover:block absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded-md whitespace-nowrap z-10 shadow-lg">
                        {t.tx_count} transaksi
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium mt-1">{dateLabel}</span>
                  </div>
                )
              })
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                Memuat data grafik tren...
              </div>
            )}
          </div>
        </div>

        {/* Metode Pembayaran Hari Ini */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-slate-800 text-sm">Metode Pembayaran Hari Ini</h3>
          </div>

          <div className="space-y-3">
            {paymentBreakdown && paymentBreakdown.length > 0 ? (
              paymentBreakdown.map((pm, idx) => {
                const totalAll = paymentBreakdown.reduce((acc, curr) => acc + curr.total, 0) || 1
                const percent = Math.round((pm.total / totalAll) * 100)
                const methodBadgeColor =
                  pm.method === 'CASH'
                    ? 'bg-emerald-500'
                    : pm.method === 'QRIS'
                    ? 'bg-blue-500'
                    : 'bg-purple-500'

                return (
                  <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${methodBadgeColor}`} />
                        <span className="font-semibold text-xs text-slate-700">{pm.method}</span>
                        <span className="text-[11px] text-slate-400">({pm.count}x)</span>
                      </div>
                      <span className="font-bold text-xs text-slate-800">{formatRupiah(pm.total)}</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${methodBadgeColor} rounded-full transition-all duration-300`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                Belum ada transaksi pembayaran hari ini
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Produk Terlaris & Transaksi Terkini */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Produk Terlaris */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingBag className="w-4 h-4 text-[#8b1538]" />
            <h3 className="font-bold text-slate-800 text-sm">Top 5 Produk Terlaris Hari Ini</h3>
          </div>

          <div className="divide-y divide-slate-100">
            {stats?.top_products && stats.top_products.length > 0 ? (
              stats.top_products.map((item, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-xs text-slate-800">{item.name}</p>
                      <p className="text-[11px] text-slate-400">{item.total_qty} pcs terjual</p>
                    </div>
                  </div>
                  <span className="font-bold text-xs text-[#8b1538]">{formatRupiah(item.total_rev)}</span>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                Belum ada penjualan produk hari ini
              </div>
            )}
          </div>
        </div>

        {/* Transaksi Terkini */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-slate-800 text-sm">10 Transaksi Terakhir</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">No. Struk</th>
                  <th className="py-2.5 px-3">Kasir</th>
                  <th className="py-2.5 px-3">Metode</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats?.recent_tx && stats.recent_tx.length > 0 ? (
                  stats.recent_tx.map((tx) => (
                    <tr key={tx.tx_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-700">{tx.tx_id}</td>
                      <td className="py-2.5 px-3 text-slate-600">{tx.cashier}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {tx.payment}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                        {formatRupiah(tx.grand_total)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      Belum ada transaksi tercatat
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Active Shifts Floating Notice */}
      {stats?.active_shifts && stats.active_shifts.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <h4 className="text-xs font-bold text-emerald-900">
                Kasir Sedang Aktif Melayani: {stats.active_shifts.map((s) => `${s.shift_name} (${s.cashier})`).join(', ')}
              </h4>
              <p className="text-[11px] text-emerald-700">
                Shift terbuka dengan modal awal {formatRupiah(stats.active_shifts[0]?.opening_cash || 0)}
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full flex items-center gap-1">
            <span>Live POS</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </span>
        </div>
      )}
    </div>
  )
}

