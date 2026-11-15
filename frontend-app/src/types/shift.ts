export interface Shift {
  id: number;
  shift_name: string;
  cashier: string;
  cashier_name?: string;
  opened_at: string;
  closed_at?: string | null;
  opening_cash: number;
  closing_cash: number;
  expected_cash: number;
  cash_sales: number;
  cash_out: number;
  cash_discrepancy: number;
  total_sales: number;
  total_tx: number;
  status: 'open' | 'closed';
}

export interface CashLog {
  id: number;
  shift_id: number;
  type: 'in' | 'drop' | 'expense';
  amount: number;
  description: string;
  created_at: string;
}

