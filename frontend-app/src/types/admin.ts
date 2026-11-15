export interface StatsData {
  total_sales: number
  total_tx: number
  total_profit: number
  low_stock: number
  member_count: number
  top_products: {
    name: string
    total_qty: number
    total_rev: number
  }[]
  recent_tx: {
    tx_id: string
    grand_total: number
    payment: string
    cashier: string
    created_at: string
  }[]
  active_shifts: {
    id: number
    shift_name: string
    cashier: string
    opening_cash: number
    total_sales: number
  }[]
}

export interface SalesTrendPoint {
  date: string
  sales: number
  tx_count: number
}

export interface PaymentBreakdownItem {
  method: string
  count: number
  total: number
}

export interface InventoryMovement {
  id: number
  product_id: number
  movement_type: string
  quantity: number
  stock_before: number
  stock_after: number
  reference_type: string
  reference_id: string
  source: string
  reason: string
  user: string
  created_at: string
}

export interface StockOpnameSession {
  id: number
  created_at: string
  opname_date: string
  notes: string
  created_by: string
  status: 'open' | 'applied' | 'cancelled'
  closed_at?: string
  total_items: number
  counted_items: number
  difference_items: number
}

export interface StockOpnameItem {
  id: number
  session_id: number
  product_id: number
  sku: string
  barcode: string
  name: string
  category: string
  unit: string
  system_qty: number
  physical_qty: number | null
  difference: number | null
  notes?: string
}

export interface StockOpnameDetail {
  session: StockOpnameSession
  items: StockOpnameItem[]
}

export interface UserAccount {
  id: number
  username: string
  display_name: string
  role: 'admin' | 'cashier' | 'kasir'
  active: number
  password_changed: number
}

export interface LowStockProduct {
  id: number
  sku: string
  name: string
  stock: number
  category: string
}

