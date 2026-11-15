import { create } from 'zustand'
import type { Product } from '@/types/product'
import type { POSCartItem } from '@/types/transaction'
import type { Member } from '@/types/member'
import { broadcastCartUpdate, broadcastResetDisplay } from '@/utils/customerDisplay'

interface POSState {
  items: POSCartItem[]
  selectedMember: Member | null
  taxRate: number // default 0%
  infaqAmount: number

  addItem: (product: Product, qty?: number) => void
  removeItem: (productId: number) => void
  updateQty: (productId: number, qty: number) => void
  setDiscount: (productId: number, discount: number) => void
  setMember: (member: Member | null) => void
  setInfaq: (amount: number) => void
  clearCart: () => void
  loadCart: (items: POSCartItem[]) => void

  getSubtotal: () => number
  getTotalDiscount: () => number
  getGrandTotal: () => number
  getTotalItems: () => number
}

export const usePOSStore = create<POSState>((set, get) => {
  const notifyCustomer = () => {
    const items = get().items
    const total = get().getGrandTotal()
    const memberName = get().selectedMember?.name || '-'
    broadcastCartUpdate(items, total, 'Kasir', memberName)
  }

  return {
    items: [],
    selectedMember: null,
    taxRate: 0,
    infaqAmount: 0,

    addItem: (product: Product, qty = 1) => {
      set((state) => {
        const existingIndex = state.items.findIndex((it) => it.product.id === product.id)
        const effectivePrice =
          product.promo_active && product.promo_price ? product.promo_price : product.price

        if (existingIndex > -1) {
          const next = [...state.items]
          const current = next[existingIndex]
          const newQty = current.qty + qty
          next[existingIndex] = {
            ...current,
            qty: newQty,
            subtotal: newQty * current.price - current.discount,
          }
          return { items: next }
        }

        const newItem: POSCartItem = {
          product,
          qty,
          price: effectivePrice,
          discount: 0,
          subtotal: qty * effectivePrice,
        }
        return { items: [newItem, ...state.items] }
      })
      notifyCustomer()
    },

    removeItem: (productId: number) => {
      set((state) => ({
        items: state.items.filter((it) => it.product.id !== productId),
      }))
      notifyCustomer()
    },

    updateQty: (productId: number, qty: number) => {
      if (qty <= 0) {
        get().removeItem(productId)
        return
      }
      set((state) => ({
        items: state.items.map((it) => {
          if (it.product.id === productId) {
            return {
              ...it,
              qty,
              subtotal: qty * it.price - it.discount,
            }
          }
          return it
        }),
      }))
      notifyCustomer()
    },

    setDiscount: (productId: number, discount: number) => {
      set((state) => ({
        items: state.items.map((it) => {
          if (it.product.id === productId) {
            return {
              ...it,
              discount,
              subtotal: Math.max(0, it.qty * it.price - discount),
            }
          }
          return it
        }),
      }))
      notifyCustomer()
    },

    setMember: (member: Member | null) => {
      set({ selectedMember: member })
      notifyCustomer()
    },

    setInfaq: (amount: number) => {
      set({ infaqAmount: amount })
      notifyCustomer()
    },

    clearCart: () => {
      set({ items: [], selectedMember: null, infaqAmount: 0 })
      broadcastResetDisplay('Kasir')
    },

    loadCart: (items: POSCartItem[]) => {
      set({ items })
      notifyCustomer()
    },

    getSubtotal: () => {
      return get().items.reduce((sum, it) => sum + it.qty * it.price, 0)
    },

    getTotalDiscount: () => {
      return get().items.reduce((sum, it) => sum + it.discount, 0)
    },

    getGrandTotal: () => {
      const sub = get().getSubtotal()
      const disc = get().getTotalDiscount()
      const infaq = get().infaqAmount
      return Math.max(0, sub - disc + infaq)
    },

    getTotalItems: () => {
      return get().items.reduce((sum, it) => sum + it.qty, 0)
    },
  }
})
