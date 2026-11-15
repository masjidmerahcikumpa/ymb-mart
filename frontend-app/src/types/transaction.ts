import type { Product } from './product'

export interface POSCartItem {
  product: Product;
  qty: number;
  price: number;
  discount: number;
  subtotal: number;
  notes?: string;
}

export interface CheckoutPayload {
  items: {
    product_id: number;
    name: string;
    qty: number;
    price: number;
    discount: number;
    subtotal: number;
    notes?: string;
  }[];
  total: number;
  discount: number;
  tax: number;
  grand_total: number;
  payment: string; // 'CASH' | 'QRIS' | 'TRANSFER' | 'DEBIT'
  amount_paid: number;
  change_amount: number;
  customer_name?: string;
  member_id?: string;
  cashier: string;
  shift_id?: number;
  notes?: string;
}

export interface Transaction {
  id: number;
  tx_id: string;
  shift_id?: number;
  total: number;
  discount: number;
  tax: number;
  grand_total: number;
  payment: string;
  amount_paid: number;
  change_amount: number;
  customer_name: string;
  member_id?: string;
  cashier: string;
  notes: string;
  status: 'completed' | 'voided';
  created_at: string;
  items?: {
    id: number;
    product_id: number;
    name: string;
    qty: number;
    price: number;
    discount: number;
    subtotal: number;
    notes?: string;
  }[];
}

export interface HoldTransaction {
  id: number;
  hold_id: string;
  customer_name: string;
  items_json: string;
  created_at: string;
}
