import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchETransReport, type ETransSummaryReport } from '@/services/api'
import { formatRupiah } from '@/utils/currency'
import {
  Zap,
  Smartphone,
  CreditCard,
  Search,
  Filter,
  Download,
  RefreshCw,
  Coins,
  TrendingUp,
  Receipt,
  Sparkles,
} from 'lucide-react'

export const ETransReportView: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [selectedCashier, setSelectedCashier] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Query E-Trans Report
  const { data: report, isLoading, refetch } = useQuery<ETransSummaryReport>({
    queryKey: ['etrans-report', selectedCategory, selectedCashier, searchQuery],
    queryFn: () =>
      fetchETransReport({
        category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        cashier: selectedCashier !== 'all' ? selectedCashier : undefined,
        q: searchQuery || undefined,
      }),
    refetchInterval: 30000,
  })

  // Export CSV
  const handleExportCSV = () => {
    if (!report || report.items.length === 0) return
    const headers = [
      'No. Struk',
      'Waktu',
      'Kategori',
      'Produk E-Trans',
      'Nomor Tujuan / ID',
      'Nominal Produk',
      'Biaya Admin Toko',
      'Total Bayar (GMV)',
      'Kasir',
    ]
    const rows = report.items.map((it) => [
      `"${it.tx_id}"`,
      `"${it.created_at}"`,
      `"${it.category}"`,
      `"${it.product}"`,
      `"${it.target_number || '-'}"`,
      it.nominal,
      it.admin_fee,
      it.total_paid,
      `"${it.cashier}"`,
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `laporan_etrans_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const breakdown = report?.category_breakdown || {}

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#8b1538]" />
            <span>Rekapitulasi Layanan E-Trans (PPOB & Dompet Digital)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Laporan penjualan pulsa, paket data, token PLN, topup e-wallet, dan pendapatan admin fee toko.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            disabled={!report || report.items.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#8b1538] hover:bg-[#a31a43] text-white rounded-lg text-xs font-bold transition shadow-xs disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Total Transaksi PPOB</span>
            <Receipt className="w-4 h-4 text-slate-600" />
          </div>
          <h3 className="text-2xl font-black text-slate-800 font-mono">
            {report?.total_tx || 0} Transaksi
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Layanan digital berhasil</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Total Perputaran (GMV)</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <h3 className="text-2xl font-black text-blue-700 font-mono">
            {formatRupiah(report?.total_gmv || 0)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Total uang yang dibayar pelanggan</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Laba Admin Fee Toko</span>
            <Coins className="w-4 h-4 text-emerald-600" />
          </div>
          <h3 className="text-2xl font-black text-emerald-700 font-mono">
            +{formatRupiah(report?.total_admin_fee || 0)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Keuntungan murni biaya admin kasir</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Kategori Terpopuler</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <h3 className="text-lg font-black text-slate-800 mt-1 truncate">
            {report?.popular_category || '-'}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Paling sering ditransaksikan</p>
        </div>
      </div>

      {/* Category Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Pulsa */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase">Pulsa & Paket Data</h4>
              <p className="text-lg font-black text-slate-900 font-mono mt-0.5">
                {formatRupiah(breakdown['PULSA']?.gmv || 0)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 block">
              {breakdown['PULSA']?.count || 0}x
            </span>
            <span className="text-xs font-extrabold text-emerald-700 font-mono">
              +{formatRupiah(breakdown['PULSA']?.fee || 0)} fee
            </span>
          </div>
        </div>

        {/* PLN */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase">Token Listrik PLN</h4>
              <p className="text-lg font-black text-slate-900 font-mono mt-0.5">
                {formatRupiah(breakdown['PLN']?.gmv || 0)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 block">
              {breakdown['PLN']?.count || 0}x
            </span>
            <span className="text-xs font-extrabold text-emerald-700 font-mono">
              +{formatRupiah(breakdown['PLN']?.fee || 0)} fee
            </span>
          </div>
        </div>

        {/* E-Money */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase">Dompet Digital (E-Money)</h4>
              <p className="text-lg font-black text-slate-900 font-mono mt-0.5">
                {formatRupiah(breakdown['EMONEY']?.gmv || 0)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 block">
              {breakdown['EMONEY']?.count || 0}x
            </span>
            <span className="text-xs font-extrabold text-emerald-700 font-mono">
              +{formatRupiah(breakdown['EMONEY']?.fee || 0)} fee
            </span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Kategori E-Trans</option>
              <option value="PULSA">Pulsa & Data</option>
              <option value="PLN">Token Listrik PLN</option>
              <option value="EMONEY">Dompet Digital (E-Money)</option>
              <option value="LAINNYA">Lainnya</option>
            </select>
          </div>

          {/* Cashier Filter */}
          {report?.cashiers && report.cashiers.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
              <span className="text-[10px] font-bold text-slate-400">KASIR:</span>
              <select
                value={selectedCashier}
                onChange={(e) => setSelectedCashier(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="all">Semua Kasir</option>
                {report.cashiers.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Search Query */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari no. tujuan / produk / kasir..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-[#8b1538]"
            />
          </div>
        </div>

        <button
          onClick={() => refetch()}
          className="p-2 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg"
          title="Perbarui data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">
            Daftar Transaksi E-Trans ({report?.items.length || 0} Entri)
          </h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">No. Struk</th>
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Nama Produk</th>
                <th className="py-3 px-4">No. Tujuan / ID Pelanggan</th>
                <th className="py-3 px-4 text-right">Nominal</th>
                <th className="py-3 px-4 text-right">Admin Fee</th>
                <th className="py-3 px-4 text-right">Total Bayar</th>
                <th className="py-3 px-4 text-center">Kasir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Memuat data transaksi E-Trans...
                  </td>
                </tr>
              ) : (!report?.items || report.items.length === 0) ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <p className="text-2xl mb-1">⚡</p>
                    <p className="font-bold">Belum ada transaksi E-Trans ditemukan</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Transaksi pulsa, token PLN, dan topup e-wallet akan tampil otomatis di sini.
                    </p>
                  </td>
                </tr>
              ) : (
                report.items.map((it, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      #{it.tx_id}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(it.created_at).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          it.category === 'PLN'
                            ? 'bg-amber-100 text-amber-800'
                            : it.category === 'PULSA'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {it.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {it.product}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">
                      {it.target_number ? (
                        <span className="bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                          {it.target_number}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      {formatRupiah(it.nominal)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                      +{formatRupiah(it.admin_fee)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                      {formatRupiah(it.total_paid)}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-700">
                      {it.cashier || '-'}
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
