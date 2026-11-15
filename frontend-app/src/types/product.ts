export interface Product {
  id: number;
  sku: string;
  name: string;
  description?: string;
  price: number;
  cost?: number;
  category: string;
  stock: number;
  reserved_stock?: number;
  online_stock?: number;
  min_stock?: number;
  unit: string;
  barcode: string;
  promo_price?: number;
  promo_active?: number;
  tax_rate?: number;
  active?: number;
}

export interface Category {
  id: number;
  name: string;
  icon?: string;
}

export interface InventoryMovement {
  id: number;
  product_id: number;
  product_name?: string;
  movement_type: 'sale' | 'online_sale' | 'restock' | 'opname_adj' | 'void_reversal' | 'damage';
  quantity: number;
  stock_before: number;
  stock_after: number;
  reference_type?: string;
  reference_id?: string;
  source?: string;
  reason?: string;
  user?: string;
  created_at: string;
}

