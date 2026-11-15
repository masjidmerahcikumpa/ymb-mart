import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchStockReport,
  fetchRestockCandidates,
  adjustStock,
  type RestockCandidate,
} from '@/services/api'
import type { Product } from '@/types/product'
import { formatRupiah } from '@/utils/currency'
import { showSuccessAlert, showErrorAlert, showWarningAlert } from '@/utils/alert'
import {
  Boxes,
  Search,
  AlertTriangle,
  Sparkles,
  SlidersHorizontal,
  RefreshCw,
  Download,
  PlusCircle,
  TrendingDown,
  Tag,
  CheckCircle2,
  X,
} from 'lucide-react'

export const StockMonitoring: React.FC = () => {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'ALL' | 'LOW' | 'AI'>('ALL')
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false)
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null)
  const [adjustType, setAdjustType] = useState<'in' | 'out' | 'adjust'>('in')
  const [adjustQty, setAdjustQty] = useState('')
  const [adjustReason, setAdjustReason] = useState('')

  // Query All Products Stock
  const { data: products = [], isLoading: productsLoading, refetch: refetchProducts } = useQuery<Product[]>({
    queryKey: ['stock-report'],
    queryFn: fetchStockReport,
    refetchInterval: 30000,
  })

  // Query AI Restock Candidates
  const { data: aiData, isLoading: aiLoading, refetch: refetchAI } = useQuery<{
    threshold: number
    count: number
    candidates: RestockCandidate[]
  }>({
    queryKey: ['ai-restock-candidates'],
    queryFn: () => fetchRestockCandidates(10),
    refetchInterval: 60000,
  })

  // Mutation for Stock Adjustment
  const adjustMutation = useMutation({
    mutationFn: adjustStock,
    onSuccess: (res) => {
      showSuccessAlert('Stok Diperbarui', `Stok berhasil disesuaikan! Stok baru: ${res.new_stock}`)
      queryClient.invalidateQueries({ queryKey: ['stock-report'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['ai-restock-candidates'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      setIsAdjustModalOpen(false)
      setAdjustProduct(null)
      setAdjustQty('')
      setAdjustReason('')
    },
    onError: (err: Error) => {
      showErrorAlert('Gagal Menyesuaikan', `Gagal menyesuaikan stok: ${err.message}`)
    },
  })

  const handleOpenAdjust = (p: Product) => {
    setAdjustProduct(p)
    setAdjustType('in')
    setAdjustQty('')
    setAdjustReason('')
    setIsAdjustModalOpen(true)
  }

  const handleSubmitAdjust = (e: React.FormEvent) => {
    e.preventDefault()
    if (!adjustProduct) return
    const qty = parseInt(adjustQty, 10)
    if (!qty || qty <= 0) {
      showWarningAlert('Validasi Jumlah', 'Masukkan jumlah penyesuaian yang valid.')
      return
    }
    if (!adjustReason.trim()) {
      showWarningAlert('Validasi Alasan', 'Masukkan alasan penyesuaian stok.')
      return
    }

    adjustMutation.mutate({
      product_id: adjustProduct.id,
      quantity: qty,
      type: adjustType,
      reason: adjustReason.trim(),
    })
  }

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>()
    products.forEach((p) => {
      if (p.category) set.add(p.category)
    })
    return Array.from(set).sort()
  }, [products])

  // Financial Stats
  const totalValuation = useMemo(() => {
    return products.reduce((acc, p) => acc + (p.cost || 0) * (p.stock || 0), 0)
  }, [products])

  const lowStockCount = useMemo(() => {
    return products.filter((p) => (p.stock || 0) < 10).length
  }, [products])

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (activeTab === 'LOW' && (p.stock || 0) >= 10) return false
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) return false

      if (search) {
        const q = search.toLowerCase()
        const matchName = p.name.toLowerCase().includes(q)
        const matchSku = p.sku && p.sku.toLowerCase().includes(q)
        const matchBarcode = p.barcode && p.barcode.toLowerCase().includes(q)
        if (!matchName && !matchSku && !matchBarcode) return false
      }

      return true
    })
  }, [products, activeTab, selectedCategory, search])

  // Export CSV
  const handleExportCSV = () => {
    if (products.length === 0) return
    const headers = ['SKU', 'Barcode', 'Nama Produk', 'Kategori', 'Stok', 'Satuan', 'Harga Beli (Cost)', 'Harga Jual (Price)', 'Total Aset (Cost x Stock)']
    const rows = products.map((p) => [
      `"${p.sku || ''}"`,
      `"${p.barcode || ''}"`,
      `"${p.name}"`,
      `"${p.category || 'Lainnya'}"`,
      p.stock || 0,
      `"${p.unit || 'pcs'}"`,
      p.cost || 0,
      p.price || 0,
      (p.cost || 0) * (p.stock || 0),
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `monitoring_stok_${new Date().toISOString().split('T')[0]}.csv`)
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
            <Boxes className="w-4 h-4 text-[#8b1538]" />
            <span>Monitoring Kartu Stok & Inventaris Toko</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Pengawasan ketersediaan barang real-time, estimasi nilai aset, dan penyesuaian stok manual.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            disabled={products.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition shadow-2xs disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Total Item SKU Aktif
          </p>
          <h3 className="text-2xl font-black text-slate-800 font-mono mt-1">
            {products.length} SKU
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Terdaftar dalam master produk</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Total Valuasi Nilai Aset
          </p>
          <h3 className="text-2xl font-black text-blue-700 font-mono mt-1">
            {formatRupiah(totalValuation)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Berdasarkan harga pokok beli (cost)</p>
        </div>

        <div
          onClick={() => setActiveTab('LOW')}
          className={`p-4 rounded-xl border shadow-2xs cursor-pointer transition ${
            activeTab === 'LOW'
              ? 'bg-rose-50 border-rose-300'
              : 'bg-white border-slate-200 hover:border-rose-300'
          }`}
        >
          <p className="text-xs font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Stok Kritis (&lt; 10 unit)</span>
          </p>
          <h3 className="text-2xl font-black text-rose-600 font-mono mt-1">
            {lowStockCount} Produk
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Klik untuk filter produk kritis</p>
        </div>

        <div
          onClick={() => setActiveTab('AI')}
          className={`p-4 rounded-xl border shadow-2xs cursor-pointer transition ${
            activeTab === 'AI'
              ? 'bg-purple-50 border-purple-300'
              : 'bg-white border-slate-200 hover:border-purple-300'
          }`}
        >
          <p className="text-xs font-bold text-purple-600 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Rekomendasi Restock AI</span>
          </p>
          <h3 className="text-2xl font-black text-purple-700 font-mono mt-1">
            {aiData?.count || 0} Kandidat
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Klik untuk melihat saran restock</p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-bold">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1.5 rounded-md transition ${
              activeTab === 'ALL'
                ? 'bg-white shadow-2xs text-[#8b1538]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Semua Stok ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('LOW')}
            className={`px-3 py-1.5 rounded-md transition ${
              activeTab === 'LOW'
                ? 'bg-white shadow-2xs text-rose-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Stok Kritis ({lowStockCount})
          </button>
          <button
            onClick={() => setActiveTab('AI')}
            className={`px-3 py-1.5 rounded-md transition ${
              activeTab === 'AI'
                ? 'bg-white shadow-2xs text-purple-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Saran Restock AI ({aiData?.count || 0})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Category Filter */}
          {activeTab !== 'AI' && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="ALL">Semua Kategori</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Search Input */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari SKU / Nama Produk..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-[#8b1538]"
            />
          </div>

          <button
            onClick={() => {
              refetchProducts()
              refetchAI()
            }}
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg"
            title="Perbarui data stok"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${productsLoading || aiLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Stock Table */}
      {activeTab === 'AI' ? (
        /* AI Restock Candidates View */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 bg-purple-50 border-b border-purple-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-purple-900">
              <Sparkles className="w-4 h-4" />
              <h4 className="font-bold text-xs uppercase tracking-wider">
                Rekomendasi Restock Cerdas AI (Ambang Batas &lt; {aiData?.threshold || 10} Unit)
              </h4>
            </div>
            <span className="text-xs font-bold text-purple-700 font-mono">
              {aiData?.count || 0} Barang Direkomendasikan
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Nama Produk</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4 text-center">Sisa Stok</th>
                  <th className="py-3 px-4 text-right">Harga Pokok (Cost)</th>
                  <th className="py-3 px-4 text-right">Harga Jual</th>
                  <th className="py-3 px-4 text-center">Margin</th>
                  <th className="py-3 px-4 text-center">Aksi Cepat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {aiLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Menganalisis data stok dan rekomendasi restock...
                    </td>
                  </tr>
                ) : (!aiData?.candidates || aiData.candidates.length === 0) ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <p className="text-2xl mb-1">🎉</p>
                      <p className="font-bold text-slate-700">Semua stok produk dalam kondisi aman!</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Tidak ada barang yang berada di bawah ambang batas stok kritis.
                      </p>
                    </td>
                  </tr>
                ) : (
                  aiData.candidates.map((c) => (
                    <tr key={c.product_id} className="hover:bg-purple-50/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {c.sku}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {c.name}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                          {c.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full font-black text-rose-700 bg-rose-100 font-mono text-xs">
                          {c.stock}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500">
                        {formatRupiah(c.cost)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatRupiah(c.price)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-bold text-emerald-700 text-[11px]">
                          +{c.margin_pct}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            const found = products.find((p) => p.id === c.product_id)
                            if (found) handleOpenAdjust(found)
                          }}
                          className="px-2.5 py-1 bg-[#8b1538] hover:bg-[#a31a43] text-white rounded-md text-[11px] font-bold shadow-2xs"
                        >
                          + Tambah Stok
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Regular Products Stock Table */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">
              Daftar Stok Produk ({filteredProducts.length} Item)
            </h4>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">SKU / Barcode</th>
                  <th className="py-3 px-4">Nama Produk</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4 text-center">Sisa Stok</th>
                  <th className="py-3 px-4 text-right">Harga Beli</th>
                  <th className="py-3 px-4 text-right">Harga Jual</th>
                  <th className="py-3 px-4 text-right">Total Nilai Aset</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {productsLoading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      Memuat data stok produk...
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <p className="text-2xl mb-1">📦</p>
                      <p className="font-bold">Tidak ada produk ditemukan</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Coba periksa kata kunci pencarian atau kategori yang dipilih.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const isCritical = (p.stock || 0) < 10
                    const isOut = (p.stock || 0) <= 0
                    return (
                      <tr
                        key={p.id}
                        className={`hover:bg-slate-50 transition-colors ${
                          isOut ? 'bg-rose-50/30' : isCritical ? 'bg-amber-50/20' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          <div>{p.sku}</div>
                          {p.barcode && p.barcode !== p.sku && (
                            <div className="text-[10px] text-slate-400">{p.barcode}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">
                          {p.name}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                            {p.category || 'Lainnya'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-black font-mono text-xs ${
                              isOut
                                ? 'bg-rose-100 text-rose-800'
                                : isCritical
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {p.stock} {p.unit || 'pcs'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-500">
                          {formatRupiah(p.cost)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {formatRupiah(p.price)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-blue-700">
                          {formatRupiah((p.cost || 0) * (p.stock || 0))}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isOut ? (
                            <span className="text-[10px] font-black text-rose-600 uppercase">
                              Habis
                            </span>
                          ) : isCritical ? (
                            <span className="text-[10px] font-black text-amber-600 uppercase">
                              Menipis
                            </span>
                          ) : (
                            <span className="text-[10px] font-black text-emerald-700 uppercase">
                              Aman
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleOpenAdjust(p)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition shadow-2xs flex items-center gap-1 mx-auto"
                            title="Penyesuaian stok manual"
                          >
                            <SlidersHorizontal className="w-3 h-3 text-[#8b1538]" />
                            <span>Adjust</span>
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
      )}

      {/* Modal Quick Stock Adjustment */}
      {isAdjustModalOpen && adjustProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 bg-[#8b1538] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#d4af37]" />
                <h4 className="font-bold text-sm uppercase tracking-wide">
                  Penyesuaian Stok Manual
                </h4>
              </div>
              <button onClick={() => setIsAdjustModalOpen(false)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdjust} className="p-6 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Produk Terpilih</p>
                <h4 className="font-bold text-slate-900 text-sm mt-0.5">{adjustProduct.name}</h4>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  SKU: {adjustProduct.sku} • Sisa Stok Sistem: <b className="text-slate-800">{adjustProduct.stock} {adjustProduct.unit || 'pcs'}</b>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Jenis Penyesuaian *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('in')}
                    className={`py-2 px-2 rounded-lg border text-xs font-bold flex flex-col items-center gap-1 transition ${
                      adjustType === 'in'
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <PlusCircle className="w-4 h-4 text-emerald-600" />
                    <span>Tambah (+)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('out')}
                    className={`py-2 px-2 rounded-lg border text-xs font-bold flex flex-col items-center gap-1 transition ${
                      adjustType === 'out'
                        ? 'bg-rose-50 border-rose-400 text-rose-800'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <TrendingDown className="w-4 h-4 text-rose-600" />
                    <span>Kurang (-)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('adjust')}
                    className={`py-2 px-2 rounded-lg border text-xs font-bold flex flex-col items-center gap-1 transition ${
                      adjustType === 'adjust'
                        ? 'bg-blue-50 border-blue-400 text-blue-800'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                    <span>Set Fisik (=)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Jumlah Kuantitas (Unit) *
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="Contoh: 10"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-base font-black text-slate-900 focus:outline-none focus:border-[#8b1538] font-mono"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Alasan / Keterangan Penyesuaian *
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Barang masuk kiriman supplier / Barang kadaluarsa / Kemasan bocor..."
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-[#8b1538]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={adjustMutation.isPending}
                  className="px-5 py-2 bg-[#8b1538] hover:bg-[#a31a43] text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{adjustMutation.isPending ? 'Menyimpan...' : 'Terapkan Stok'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
