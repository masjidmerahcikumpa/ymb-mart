import React from 'react'
import type { Product } from '@/types/product'
import { formatRupiah } from '@/utils/currency'
import { Plus } from 'lucide-react'

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAdd }) => {
  const isPromo = product.promo_active === 1 && product.promo_price && product.promo_price > 0
  const effectivePrice = isPromo ? product.promo_price! : product.price
  const isOutOfStock = product.stock <= 0
  const isLowStock = product.min_stock ? product.stock <= product.min_stock : product.stock <= 5

  return (
    <button
      type="button"
      onClick={() => !isOutOfStock && onAdd(product)}
      disabled={isOutOfStock}
      className={`group relative text-left p-3 rounded-xl border transition-all duration-150 flex flex-col justify-between select-none ${
        isOutOfStock
          ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
          : 'bg-white border-slate-200 hover:border-[#8b1538] hover:shadow-md active:scale-[0.98]'
      }`}
    >
      <div>
        {/* Top Badges */}
        <div className="flex justify-between items-start gap-1 mb-1.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
            {product.category || 'Umum'}
          </span>
          {isPromo && (
            <span className="text-[10px] font-extrabold bg-rose-100 text-[#8b1538] px-1.5 py-0.5 rounded">
              PROMO
            </span>
          )}
        </div>

        {/* Product Name */}
        <h3 className="font-semibold text-slate-800 text-xs sm:text-sm line-clamp-2 leading-tight group-hover:text-[#8b1538]">
          {product.name}
        </h3>

        {/* SKU / Barcode Subtext */}
        <p className="text-[10px] text-slate-400 mt-0.5 truncate">
          {product.barcode || product.sku}
        </p>
      </div>

      {/* Bottom: Price and Stock */}
      <div className="mt-3 pt-2 border-t border-slate-100 flex items-end justify-between">
        <div>
          {isPromo && (
            <p className="text-[10px] text-slate-400 line-through">
              {formatRupiah(product.price)}
            </p>
          )}
          <p className="font-extrabold text-sm sm:text-base text-[#8b1538]">
            {formatRupiah(effectivePrice)}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`text-[10px] font-medium px-1.5 py-0.2 rounded-full ${
                isOutOfStock
                  ? 'bg-rose-100 text-rose-700'
                  : isLowStock
                  ? 'bg-amber-100 text-amber-700 font-bold'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              Stok: {product.stock} {product.unit || 'pcs'}
            </span>
            {Boolean(product.reserved_stock && product.reserved_stock > 0) && (
              <span className="text-[9px] text-amber-600 bg-amber-50 px-1 rounded" title="Reserved Online Order">
                🔒{product.reserved_stock}
              </span>
            )}
          </div>
        </div>

        <div className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-[#8b1538] group-hover:text-white flex items-center justify-center text-slate-600 transition-colors">
          <Plus className="w-4 h-4" />
        </div>
      </div>
    </button>
  )
}

