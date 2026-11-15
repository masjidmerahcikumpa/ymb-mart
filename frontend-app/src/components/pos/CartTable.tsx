import React from 'react'
import { Trash2, Plus, Minus, HeartHandshake, User, ShoppingBag, X } from 'lucide-react'
import type { POSCartItem } from '@/types/transaction'
import type { Member } from '@/types/member'
import { formatRupiah } from '@/utils/currency'

interface CartTableProps {
  items: POSCartItem[];
  selectedMember: Member | null;
  infaqAmount: number;
  subtotal: number;
  totalDiscount: number;
  grandTotal: number;
  onUpdateQty: (productId: number, qty: number) => void;
  onRemoveItem: (productId: number) => void;
  onClearCart: () => void;
  onOpenPayment: () => void;
  onOpenHoldModal: () => void;
  onOpenMemberModal: () => void;
  onToggleInfaq: (amount: number) => void;
  onRemoveMember: () => void;
  isShiftOpen?: boolean;
}

export const CartTable: React.FC<CartTableProps> = ({
  items,
  selectedMember,
  infaqAmount,
  subtotal,
  totalDiscount,
  grandTotal,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onOpenPayment,
  onOpenHoldModal,
  onOpenMemberModal,
  onToggleInfaq,
  onRemoveMember,
  isShiftOpen = true,
}) => {
  const totalItems = items.reduce((sum, it) => sum + it.qty, 0)

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none">
      {/* Member Bar */}
      <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        {selectedMember ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
              <User className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 leading-tight">
                {selectedMember.name} <span className="text-[10px] text-emerald-600 font-semibold uppercase">({selectedMember.tier})</span>
              </p>
              <p className="text-[10px] text-slate-500">Poin: {selectedMember.points} • #{selectedMember.member_id}</p>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenMemberModal}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-[#8b1538] font-semibold"
          >
            <User className="w-3.5 h-3.5" />
            <span>Pilih Member (F4)</span>
          </button>
        )}

        {selectedMember && (
          <button
            type="button"
            onClick={onRemoveMember}
            className="text-slate-400 hover:text-rose-600 p-1"
            title="Hapus Member"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
            <ShoppingBag className="w-12 h-12 text-slate-300 stroke-1 mb-2" />
            <p className="text-sm font-semibold text-slate-600">Keranjang Masih Kosong</p>
            <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
              Pindai barcode produk atau klik barang dari katalog di sebelah kiri.
            </p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.product.id} className="p-3 hover:bg-slate-50/70 transition-colors flex flex-col gap-1.5">
              <div className="flex justify-between items-start">
                <div className="flex-1 pr-2">
                  <h4 className="font-semibold text-xs text-slate-800 line-clamp-1">
                    {item.product.name}
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    {formatRupiah(item.price)} / {item.product.unit || 'pcs'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveItem(item.product.id)}
                  className="text-slate-300 hover:text-rose-600 p-1 transition-colors"
                  title="Hapus Item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Qty & Line Total Controls */}
              <div className="flex justify-between items-center pt-1">
                <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => onUpdateQty(item.product.id, item.qty - 1)}
                    className="w-6 h-6 rounded bg-white text-slate-700 flex items-center justify-center hover:bg-slate-200 transition-colors shadow-xs active:scale-95"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-8 text-center font-bold text-xs text-slate-800">
                    {item.qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => onUpdateQty(item.product.id, item.qty + 1)}
                    className="w-6 h-6 rounded bg-white text-slate-700 flex items-center justify-center hover:bg-slate-200 transition-colors shadow-xs active:scale-95"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <div className="text-right">
                  {item.discount > 0 && (
                    <span className="text-[10px] text-rose-600 line-through mr-1">
                      {formatRupiah(item.qty * item.price)}
                    </span>
                  )}
                  <span className="font-extrabold text-xs text-slate-900">
                    {formatRupiah(item.subtotal)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cart Summary & Sticky Checkout Bar */}
      <div className="border-t border-slate-200 bg-slate-50/80 p-3 space-y-2.5">
        {/* Quick Infaq Toggle */}
        <div className="flex items-center justify-between text-xs py-1 border-b border-slate-200">
          <div className="flex items-center gap-1.5 text-slate-600">
            <HeartHandshake className="w-3.5 h-3.5 text-rose-600" />
            <span className="font-medium">Infaq Kas Masjid</span>
          </div>
          <div className="flex gap-1">
            {[0, 1000, 2000, 5000].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => onToggleInfaq(infaqAmount === amt ? 0 : amt)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                  infaqAmount === amt && amt > 0
                    ? 'bg-[#8b1538] text-white'
                    : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {amt === 0 ? 'Off' : `+${amt / 1000}k`}
              </button>
            ))}
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="space-y-1 text-xs">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal ({totalItems} item)</span>
            <span className="font-semibold text-slate-700">{formatRupiah(subtotal)}</span>
          </div>

          {totalDiscount > 0 && (
            <div className="flex justify-between text-rose-600 font-semibold">
              <span>Diskon</span>
              <span>-{formatRupiah(totalDiscount)}</span>
            </div>
          )}

          {infaqAmount > 0 && (
            <div className="flex justify-between text-emerald-700 font-semibold">
              <span>Infaq Masjid</span>
              <span>+{formatRupiah(infaqAmount)}</span>
            </div>
          )}

          <div className="flex justify-between items-baseline pt-1.5 border-t border-slate-200">
            <span className="font-bold text-slate-800 text-sm">Total Tagihan</span>
            <span className="font-extrabold text-lg text-[#8b1538]">{formatRupiah(grandTotal)}</span>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onOpenHoldModal}
            className="flex-1 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-lg text-xs transition-colors shadow-xs"
          >
            Parkir (F8)
          </button>
          <button
            type="button"
            onClick={onClearCart}
            disabled={items.length === 0}
            className="px-3 py-2 bg-white border border-slate-300 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 text-slate-600 rounded-lg text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Kosongkan Keranjang"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Main Tender / Pay Button */}
        <button
          type="button"
          onClick={onOpenPayment}
          disabled={items.length === 0}
          className={`w-full py-3 text-white font-extrabold rounded-xl text-sm transition-all shadow-md active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
            !isShiftOpen
              ? 'bg-amber-600 hover:bg-amber-500'
              : 'bg-[#8b1538] hover:bg-[#6b0f2a]'
          }`}
        >
          {!isShiftOpen ? (
            <span>Buka Shift Dahulu untuk Bayar</span>
          ) : (
            <>
              <span>Bayar Sekarang (F9)</span>
              <span className="text-rose-200">•</span>
              <span>{formatRupiah(grandTotal)}</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

