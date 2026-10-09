import { create } from 'zustand';
import { Product } from '@/types/product';

export interface CartItem {
  product: Product;
  qty: number;
  shopperNote?: string;
}

export type OrderStatus = 'active' | 'completed' | 'cancelled';

export interface PlacedOrder {
  orderId: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  infaq: number;
  grandTotal: number;
  fulfillment: 'delivery' | 'pickup';
  paymentMethod: string;
  recipientName: string;
  address: string;
  createdAt: string;
  dateStr?: string;
  status: OrderStatus;
  driverName?: string;
  driverPhone?: string;
  etaMinutes?: number;
}

const SEED_ORDERS: PlacedOrder[] = [
  {
    orderId: 'YMB-20261002-881',
    status: 'active',
    createdAt: '15:45 WIB',
    dateStr: 'Hari Ini, 02 Okt 2026',
    items: [
      {
        product: {
          id: 1,
          sku: 'BRS-RAMOS-5KG',
          name: 'Beras Ramos Setra Premium 5kg',
          description: 'Beras pulen pilihan keluarga Baiturrahman Mart, tanpa pemutih dan wangi alami.',
          price: 69500,
          promoPrice: 64900,
          promoActive: true,
          discountPercent: 7,
          category: 'sembako',
          stock: 24,
          unit: 'sak',
          barcode: '8991234567890',
          isHalal: true,
          isBestSeller: true,
          imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&q=80',
        },
        qty: 1,
      },
      {
        product: {
          id: 5,
          sku: 'SSU-ULT-1L',
          name: 'Susu UHT Ultra Milk Cokelat 1 Liter',
          description: 'Susu segar bernutrisi tinggi untuk anak dan keluarga.',
          price: 19500,
          category: 'susu',
          stock: 28,
          unit: 'kotak',
          barcode: '8994567890123',
          isHalal: true,
          isBestSeller: true,
          imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&q=80',
        },
        qty: 2,
      },
    ],
    subtotal: 103900,
    deliveryFee: 0,
    discount: 10000,
    infaq: 2000,
    grandTotal: 95900,
    fulfillment: 'delivery',
    paymentMethod: 'QRIS Baiturrahman Mart',
    recipientName: 'H. Ahmad Syarif',
    address: 'Perumahan Griya Baiturrahman Blok B2 No. 12 (Belakang Masjid), Cinere',
    driverName: 'Pak Joko (Kurir Kilat Masjid)',
    driverPhone: '+628123456789',
    etaMinutes: 12,
  },
  {
    orderId: 'YMB-20260929-419',
    status: 'completed',
    createdAt: '09:20 WIB',
    dateStr: '29 Sep 2026',
    items: [
      {
        product: {
          id: 2,
          sku: 'MYK-TRP-2L',
          name: 'Minyak Goreng Tropical 2 Liter',
          description: 'Minyak goreng 2x penyaringan, jernih dan hemat.',
          price: 38500,
          promoPrice: 33500,
          promoActive: true,
          discountPercent: 13,
          category: 'sembako',
          stock: 18,
          unit: 'pouch',
          barcode: '8999876543210',
          isHalal: true,
          isBestSeller: true,
          imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&q=80',
        },
        qty: 1,
      },
      {
        product: {
          id: 3,
          sku: 'TLR-AYM-10',
          name: 'Telur Ayam Negeri Fresh (Isi 10 Butir)',
          description: 'Telur segar pilihan langsung dari peternakan binaan masjid.',
          price: 26000,
          promoPrice: 24000,
          promoActive: true,
          discountPercent: 8,
          category: 'sembako',
          stock: 35,
          unit: 'pack',
          barcode: '8992345678901',
          isHalal: true,
          isBestSeller: true,
          imageUrl: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=500&q=80',
        },
        qty: 1,
      },
    ],
    subtotal: 57500,
    deliveryFee: 5000,
    discount: 0,
    infaq: 2500,
    grandTotal: 65000,
    fulfillment: 'delivery',
    paymentMethod: 'QRIS Baiturrahman Mart',
    recipientName: 'H. Ahmad Syarif',
    address: 'Perumahan Griya Baiturrahman Blok B2 No. 12',
  },
  {
    orderId: 'YMB-20260922-105',
    status: 'completed',
    createdAt: '18:15 WIB',
    dateStr: '22 Sep 2026',
    items: [
      {
        product: {
          id: 6,
          sku: 'MIE-IND-GRG',
          name: 'Indomie Goreng Spesial 85g (Pack 5 pcs)',
          description: 'Mi instan goreng legendaris Indonesia dengan bumbu gurih.',
          price: 15500,
          promoPrice: 14200,
          promoActive: true,
          discountPercent: 8,
          category: 'sembako',
          stock: 60,
          unit: 'pack',
          barcode: '8995678901234',
          isHalal: true,
          isBestSeller: true,
          imageUrl: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=500&q=80',
        },
        qty: 2,
      },
    ],
    subtotal: 28400,
    deliveryFee: 0,
    discount: 0,
    infaq: 1000,
    grandTotal: 29400,
    fulfillment: 'pickup',
    paymentMethod: 'Tunai di Kasir',
    recipientName: 'H. Ahmad Syarif',
    address: 'Ambil Mandiri di Toko Baiturrahman Mart',
  },
];

interface CartState {
  items: Record<number, CartItem>;
  lastOrder: PlacedOrder | null;
  orders: PlacedOrder[];
  addItem: (product: Product, qty?: number, shopperNote?: string) => void;
  updateQty: (productId: number, qty: number) => void;
  removeItem: (productId: number) => void;
  setShopperNote: (productId: number, note: string) => void;
  setLastOrder: (order: PlacedOrder) => void;
  addOrder: (order: PlacedOrder) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  getOrderById: (orderId: string) => PlacedOrder | undefined;
  reorderItems: (orderId: string) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getSubtotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: {},
  lastOrder: SEED_ORDERS[0],
  orders: SEED_ORDERS,
  setLastOrder: (order: PlacedOrder) => set({ lastOrder: order }),
  addOrder: (order: PlacedOrder) =>
    set((state) => ({
      orders: [order, ...state.orders],
      lastOrder: order,
    })),
  updateOrderStatus: (orderId: string, status: OrderStatus) =>
    set((state) => ({
      orders: state.orders.map((o) => (o.orderId === orderId ? { ...o, status } : o)),
      lastOrder: state.lastOrder?.orderId === orderId ? { ...state.lastOrder, status } : state.lastOrder,
    })),
  getOrderById: (orderId: string) => {
    return get().orders.find((o) => o.orderId === orderId) || get().lastOrder || undefined;
  },
  reorderItems: (orderId: string) => {
    const order = get().orders.find((o) => o.orderId === orderId);
    if (!order) return;
    set((state) => {
      const nextItems = { ...state.items };
      order.items.forEach((item) => {
        const existing = nextItems[item.product.id];
        const newQty = existing ? existing.qty + item.qty : item.qty;
        nextItems[item.product.id] = {
          product: item.product,
          qty: Math.min(newQty, item.product.stock),
          shopperNote: item.shopperNote || '',
        };
      });
      return { items: nextItems };
    });
  },

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
