import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchProducts,
  fetchCategories,
  addProduct,
  updateProduct,
  deleteProduct,
  adjustStock,
  fetchProductMovements,
} from '@/services/api'
import type { Product } from '@/types/product'
import type { InventoryMovement } from '@/types/admin'
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from '@/utils/alert'
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  SlidersHorizontal,
  History,
  AlertTriangle,
  X,
  Check,
  TrendingUp,
} from 'lucide-react'

export const ProductManagement: React.FC = () => {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Semua')
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false)

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  const [isAdjustOpen, setIsAdjustOpen] = useState(false)
  const [adjustTargetProduct, setAdjustTargetProduct] = useState<Product | null>(null)
  const [adjustType, setAdjustType] = useState<'in' | 'out' | 'adjust'>('in')
  const [adjustQty, setAdjustQty] = useState(1)
  const [adjustReason, setAdjustReason] = useState('')

  const [isMovementOpen, setIsMovementOpen] = useState(false)
  const [movementTargetProduct, setMovementTargetProduct] = useState<Product | null>(null)

  // Fetch products & categories
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['admin-products', searchTerm, selectedCategory],
    queryFn: () => fetchProducts(true, searchTerm, selectedCategory),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  })

  // Movements query
  const { data: movements = [], isLoading: movementsLoading } = useQuery({
    queryKey: ['product-movements', movementTargetProduct?.id],
    queryFn: () => (movementTargetProduct ? fetchProductMovements(movementTargetProduct.id) : Promise.resolve([])),
    enabled: !!movementTargetProduct,
  })

  // Mutations
  const productMutation = useMutation({
    mutationFn: (data: { id?: number; payload: Partial<Product> }) => {
      if (data.id) {
        return updateProduct(data.id, data.payload)
      }
      return addProduct(data.payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setIsFormOpen(false)
      setEditingProduct(null)
      showSuccessAlert('Sukses', 'Data produk berhasil disimpan!')
    },
    onError: (err: Error) => {
      showErrorAlert('Gagal Menyimpan', `Gagal menyimpan produk: ${err.message}`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      showSuccessAlert('Sukses', 'Produk berhasil dihapus!')
    },
    onError: (err: Error) => {
      showErrorAlert('Gagal Menghapus', `Gagal menghapus produk: ${err.message}`)
    },
  })

  const adjustMutation = useMutation({
    mutationFn: adjustStock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      setIsAdjustOpen(false)
      setAdjustTargetProduct(null)
      setAdjustQty(1)
      setAdjustReason('')
      showSuccessAlert('Sukses', 'Penyesuaian stok berhasil disimpan!')
    },
    onError: (err: Error) => {
      showErrorAlert('Gagal Penyesuaian', `Gagal menyesuaikan stok: ${err.message}`)
    },
  })

  // Product Form state
  const [formData, setFormData] = useState({
    sku: '',
    barcode: '',
    name: '',
    category: 'Sembako',
    cost: 0,
    price: 0,
    stock: 0,
    min_stock: 5,
    unit: 'pcs',
    promo_price: 0,
    promo_active: 0,
  })

  const openAddModal = () => {
    setEditingProduct(null)
    setFormData({
      sku: `SKU-${Date.now().toString().slice(-6)}`,
      barcode: '',
      name: '',
      category: categories[0]?.name || 'Sembako',
      cost: 0,
      price: 0,
      stock: 0,
      min_stock: 5,
      unit: 'pcs',
      promo_price: 0,
      promo_active: 0,
    })
    setIsFormOpen(true)
  }

  const openEditModal = (p: Product) => {
    setEditingProduct(p)
    setFormData({
      sku: p.sku,
      barcode: p.barcode || '',
      name: p.name,
      category: p.category,
      cost: p.cost || 0,
      price: p.price,
      stock: p.stock,
      min_stock: p.min_stock || 5,
      unit: p.unit || 'pcs',
      promo_price: p.promo_price || 0,
      promo_active: p.promo_active || 0,
    })
    setIsFormOpen(true)
  }

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.sku.trim()) {
      showErrorAlert('Validasi Form', 'Nama dan SKU wajib diisi')
      return
    }
    productMutation.mutate({
      id: editingProduct?.id,
      payload: {
        sku: formData.sku,
        barcode: formData.barcode,
        name: formData.name,
        category: formData.category,
        cost: Number(formData.cost),
        price: Number(formData.price),
        stock: Number(formData.stock),
        min_stock: Number(formData.min_stock),
        unit: formData.unit,
        promo_price: Number(formData.promo_price),
        promo_active: formData.promo_active,
      },
    })
  }

  const openAdjustModal = (p: Product) => {
    setAdjustTargetProduct(p)
    setAdjustType('in')
    setAdjustQty(1)
    setAdjustReason('')
    setIsAdjustOpen(true)
  }

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!adjustTargetProduct || adjustQty <= 0 || !adjustReason.trim()) {
      showErrorAlert('Validasi Form', 'Jumlah dan alasan penyesuaian stok wajib diisi')
      return
    }
    adjustMutation.mutate({
      product_id: adjustTargetProduct.id,
      quantity: adjustQty,
      type: adjustType,
      reason: adjustReason.trim(),
    })
  }

  const openMovementModal = (p: Product) => {
    setMovementTargetProduct(p)
    setIsMovementOpen(true)
  }

  // Filtered products
  const displayProducts = products.filter((p) => {
    if (filterLowStockOnly && p.stock >= 10) return false
    return true
  })

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val)
  }

  const marginPercent =
    formData.cost > 0 ? (((formData.price - formData.cost) / formData.cost) * 100).toFixed(1) : '0'

  return (
    <div className="space-y-4">
      {/* Action Header & Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center flex-1 min-w-[280px]">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama produk, barcode, atau SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#8b1538]"
            />
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-[#8b1538]"
          >
            <option value="Semua">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Low Stock Toggle */}
          <button
            onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
              filterLowStockOnly
                ? 'bg-amber-500 text-white border-amber-600'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Stok Menipis (&lt;10)</span>
          </button>
        </div>

        {/* Add Product Button */}
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-[#8b1538] hover:bg-[#a31a43] text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Produk Baru</span>
        </button>
      </div>

      {/* Product Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-3">Produk</th>
                <th className="py-3 px-3">SKU / Barcode</th>
                <th className="py-3 px-3">Kategori</th>
                <th className="py-3 px-3 text-right">Harga Beli</th>
                <th className="py-3 px-3 text-right">Harga Jual</th>
                <th className="py-3 px-3 text-center">Margin</th>
                <th className="py-3 px-3 text-center">Stok Toko</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Memuat katalog produk...
                  </td>
                </tr>
              ) : displayProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Tidak ada produk yang cocok dengan pencarian.
                  </td>
                </tr>
              ) : (
                displayProducts.map((p) => {
                  const cost = p.cost || 0
                  const margin = cost > 0 ? (((p.price - cost) / cost) * 100).toFixed(0) : '0'
                  const isLow = p.stock <= (p.min_stock || 10)
                  const isPromo = p.promo_active && p.promo_price && p.promo_price > 0

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">{p.name}</div>
                        {isPromo && (
                          <span className="inline-block mt-0.5 px-1.5 py-0.2 bg-red-100 text-red-700 font-bold text-[10px] rounded">
                            Promo: {formatRupiah(p.promo_price || 0)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">
                        <div>{p.sku}</div>
                        {p.barcode && <div className="text-slate-400 text-[10px]">{p.barcode}</div>}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-slate-500">
                        {formatRupiah(cost)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-800">
                        {formatRupiah(p.price)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`font-semibold text-[11px] ${
                            Number(margin) >= 20 ? 'text-emerald-600' : 'text-slate-600'
                          }`}
                        >
                          +{margin}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 font-bold px-2.5 py-1 rounded-full text-[11px] ${
                            p.stock <= 0
                              ? 'bg-red-100 text-red-700'
                              : isLow
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {p.stock} {p.unit || 'pcs'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Sesuaikan Stok */}
                          <button
                            title="Sesuaikan Stok"
                            onClick={() => openAdjustModal(p)}
                            className="p-1.5 text-slate-500 hover:text-[#8b1538] hover:bg-slate-100 rounded-md transition-colors"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                          </button>
                          {/* Mutasi Stok */}
                          <button
                            title="Kartu Stok & Riwayat Mutasi"
                            onClick={() => openMovementModal(p)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-md transition-colors"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                          {/* Edit Produk */}
                          <button
                            title="Edit Produk"
                            onClick={() => openEditModal(p)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {/* Hapus Produk */}
                          <button
                            title="Hapus Produk"
                            onClick={async () => {
                              const confirmed = await showConfirmAlert({
                                title: 'Hapus Produk',
                                text: `Yakin ingin menghapus produk "${p.name}"? Tindakan ini tidak dapat dibatalkan.`,
                                confirmButtonText: 'Ya, Hapus',
                                cancelButtonText: 'Batal',
                                icon: 'warning',
                              })
                              if (confirmed) {
                                deleteMutation.mutate(p.id)
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Tambah / Edit Produk */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-[#8b1538] text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm">
                  {editingProduct ? 'Edit Master Produk' : 'Tambah Produk Baru'}
                </h3>
                <p className="text-xs text-white/80">Katalog Baiturrahman Mart</p>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">SKU Produk *</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-medium focus:outline-none focus:border-[#8b1538]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Barcode Barcode EAN/UPC</label>
                  <input
                    type="text"
                    placeholder="Scan atau ketik barcode..."
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-[#8b1538]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Produk *</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Beras Ramos Wangi 5kg"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-[#8b1538]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kategori</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-[#8b1538]"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Satuan</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="pcs / kg / btl / dus"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#8b1538]"
                  />
                </div>
              </div>

              {/* Pricing & Profit Margin Preview */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Harga Beli (Cost) *</label>
                    <input
                      type="number"
                      min={0}
                      value={formData.cost}
                      onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-[#8b1538]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Harga Jual (Price) *</label>
                    <input
                      type="number"
                      min={0}
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-[#8b1538]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200">
                  <span className="text-slate-500 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Margin Keuntungan:</span>
                  </span>
                  <span className="font-bold text-emerald-700">
                    +{marginPercent}% ({formatRupiah(Math.max(0, formData.price - formData.cost))})
                  </span>
                </div>
              </div>

              {/* Stock Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Stok Saat Ini</label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:border-[#8b1538]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Batas Minimum Stok</label>
                  <input
                    type="number"
                    value={formData.min_stock}
                    onChange={(e) => setFormData({ ...formData, min_stock: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#8b1538]"
                  />
                </div>
              </div>

              {/* Promo Price */}
              <div className="p-3 bg-red-50/50 rounded-xl border border-red-100 flex items-center justify-between gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-red-900 mb-1">Harga Promo (Opsional)</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.promo_price}
                    onChange={(e) => setFormData({ ...formData, promo_price: Number(e.target.value) })}
                    placeholder="Contoh: 12500"
                    className="w-full p-2 bg-white border border-red-200 rounded-lg text-xs focus:outline-none focus:border-red-600"
                  />
                </div>
                <div className="pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={formData.promo_active === 1}
                      onChange={(e) => setFormData({ ...formData, promo_active: e.target.checked ? 1 : 0 })}
                      className="rounded text-red-600"
                    />
                    <span>Aktifkan Promo</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={productMutation.isPending}
                  className="px-5 py-2 bg-[#8b1538] hover:bg-[#a31a43] text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{productMutation.isPending ? 'Menyimpan...' : 'Simpan Produk'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Quick Stock Adjustment */}
      {isAdjustOpen && adjustTargetProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm">Sesuaikan Stok Fisik</h3>
                <p className="text-xs text-slate-300">{adjustTargetProduct.name}</p>
              </div>
              <button
                onClick={() => setIsAdjustOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="p-5 space-y-4">
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <span className="text-slate-500">Stok Sistem Saat Ini:</span>
                <span className="font-bold text-sm text-slate-800">
                  {adjustTargetProduct.stock} {adjustTargetProduct.unit || 'pcs'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Jenis Penyesuaian</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('in')}
                    className={`py-2 text-xs font-bold rounded-lg border transition-colors ${
                      adjustType === 'in'
                        ? 'bg-emerald-600 text-white border-emerald-700'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Stok Masuk (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('out')}
                    className={`py-2 text-xs font-bold rounded-lg border transition-colors ${
                      adjustType === 'out'
                        ? 'bg-red-600 text-white border-red-700'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Stok Keluar (-)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('adjust')}
                    className={`py-2 text-xs font-bold rounded-lg border transition-colors ${
                      adjustType === 'adjust'
                        ? 'bg-blue-600 text-white border-blue-700'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Koreksi Total (=)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {adjustType === 'adjust' ? 'Total Stok Baru *' : 'Jumlah Perubahan *'}
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:border-[#8b1538]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Alasan Penyesuaian *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Barang datang dari supplier / Rusak pecah / Opname"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#8b1538]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAdjustOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={adjustMutation.isPending}
                  className="px-5 py-2 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
                >
                  <span>{adjustMutation.isPending ? 'Memproses...' : 'Terapkan Penyesuaian'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Riwayat Mutasi Stok (Kartu Stok) */}
      {isMovementOpen && movementTargetProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-800 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm">Kartu Stok & Riwayat Mutasi</h3>
                <p className="text-xs text-slate-300">
                  {movementTargetProduct.name} ({movementTargetProduct.sku})
                </p>
              </div>
              <button
                onClick={() => setIsMovementOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-700 text-slate-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 max-h-[70vh] overflow-y-auto">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Waktu</th>
                      <th className="py-2.5 px-3">Jenis</th>
                      <th className="py-2.5 px-3 text-center">Jumlah</th>
                      <th className="py-2.5 px-3 text-center">Sebelum → Sesudah</th>
                      <th className="py-2.5 px-3">Alasan / Referensi</th>
                      <th className="py-2.5 px-3">Petugas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {movementsLoading ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          Memuat mutasi stok...
                        </td>
                      </tr>
                    ) : movements.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          Belum ada riwayat mutasi untuk produk ini.
                        </td>
                      </tr>
                    ) : (
                      movements.map((m: InventoryMovement) => (
                        <tr key={m.id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                            {m.created_at}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                m.movement_type === 'sale'
                                  ? 'bg-blue-50 text-blue-700'
                                  : m.movement_type === 'stock_in'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : m.movement_type === 'stock_out'
                                  ? 'bg-red-50 text-red-700'
                                  : 'bg-purple-50 text-purple-700'
                              }`}
                            >
                              {m.movement_type}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                            {m.quantity}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-600 font-mono">
                            {m.stock_before} → <span className="font-bold text-slate-800">{m.stock_after}</span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 max-w-[150px] truncate" title={m.reason}>
                            {m.reason || m.reference_id || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 font-medium">{m.user || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsMovementOpen(false)}
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
