import { create } from 'zustand';
import { Product } from '@/types/product';

export interface CartItem {
  product: Product;
  qty: number;
  shopperNote?: string;
}

interface CartState {
  items: Record<number, CartItem>;
  addItem: (product: Product, qty?: number, shopperNote?: string) => void;
  updateQty: (productId: number, qty: number) => void;
  removeItem: (productId: number) => void;
  setShopperNote: (productId: number, note: string) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getSubtotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: {},

  addItem: (product: Product, qty = 1, shopperNote = '') => {
    set((state) => {
      const existing = state.items[product.id];
      const newQty = existing ? existing.qty + qty : qty;
      
      // Stock boundary check
      const finalQty = Math.min(newQty, product.stock);
      if (finalQty <= 0) {
        const next = { ...state.items };
        delete next[product.id];
        return { items: next };
      }

      return {
        items: {
          ...state.items,
          [product.id]: {
            product,
            qty: finalQty,
            shopperNote: shopperNote || existing?.shopperNote || '',
          },
        },
      };
    });
  },

  updateQty: (productId: number, qty: number) => {
    set((state) => {
      if (qty <= 0) {
        const next = { ...state.items };
        delete next[productId];
        return { items: next };
      }
      const existing = state.items[productId];
      if (!existing) return state;

      return {
        items: {
          ...state.items,
          [productId]: {
            ...existing,
            qty: Math.min(qty, existing.product.stock),
          },
        },
      };
    });
  },

  removeItem: (productId: number) => {
    set((state) => {
      const next = { ...state.items };
      delete next[productId];
      return { items: next };
    });
  },

  setShopperNote: (productId: number, note: string) => {
    set((state) => {
      const existing = state.items[productId];
      if (!existing) return state;
      return {
        items: {
          ...state.items,
          [productId]: {
            ...existing,
            shopperNote: note,
          },
        },
      };
    });
  },

  clearCart: () => set({ items: {} }),

  getTotalItems: () => {
    return Object.values(get().items).reduce((acc, item) => acc + item.qty, 0);
  },

  getSubtotal: () => {
    return Object.values(get().items).reduce((acc, item) => {
      const price = item.product.promoActive && item.product.promoPrice 
        ? item.product.promoPrice 
        : item.product.price;
      return acc + price * item.qty;
    }, 0);
  },
}));
