import React, { useMemo } from 'react'
import type { Product, Category } from '@/types/product'
import { ProductCard } from './ProductCard'
import { PackageOpen } from 'lucide-react'

interface ProductGridProps {
  products: Product[];
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  searchQuery: string;
  onAddProduct: (product: Product) => void;
  isLoading?: boolean;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  categories,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onAddProduct,
  isLoading,
}) => {
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category filter
      if (selectedCategory && selectedCategory !== 'Semua' && p.category !== selectedCategory) {
        return false
      }
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchName = p.name.toLowerCase().includes(q)
        const matchBarcode = p.barcode?.toLowerCase().includes(q)
        const matchSku = p.sku?.toLowerCase().includes(q)
        return matchName || matchBarcode || matchSku
      }
      return true
    })
  }, [products, selectedCategory, searchQuery])

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Category Pills Bar */}
      <div className="px-3 py-2 border-b border-slate-200 bg-white flex gap-1.5 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => onSelectCategory('Semua')}
          className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            selectedCategory === 'Semua'
              ? 'bg-[#8b1538] text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Semua ({products.length})
        </button>

        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelectCategory(c.name)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === c.name
                ? 'bg-[#8b1538] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Grid Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-36 rounded-xl bg-slate-100 animate-pulse border border-slate-200" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
            <PackageOpen className="w-12 h-12 text-slate-300 stroke-1 mb-2" />
            <p className="text-sm font-semibold text-slate-600">Tidak ada produk ditemukan</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {searchQuery ? `Hasil untuk "${searchQuery}" tidak tersedia.` : 'Belum ada produk pada kategori ini.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredProducts.map((p) => (
              <ProductCard key={p.id} product={p} onAdd={onAddProduct} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

