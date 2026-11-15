import type { Product, Category } from '@/types/product'
import type { CheckoutPayload, Transaction, HoldTransaction } from '@/types/transaction'
import type { Shift, CashLog } from '@/types/shift'
import type { Member } from '@/types/member'
import type {
  StatsData,
  SalesTrendPoint,
  PaymentBreakdownItem,
  InventoryMovement,
  StockOpnameSession,
  StockOpnameDetail,
  UserAccount,
  LowStockProduct,
} from '@/types/admin'

export const API_BASE = ''

let cachedCSRF: string | null = null

export async function getCSRFToken(): Promise<string> {
  if (cachedCSRF) return cachedCSRF
  try {
    const sessionToken = getSessionToken()
    const headers: Record<string, string> = {}
    if (sessionToken) {
      headers['Authorization'] = sessionToken
    }
    const res = await fetch(`${API_BASE}/api/csrf-token`, { headers })
    if (res.ok) {
      const data = await res.json()
      const val = data.csrf_token || data.token || ''
      cachedCSRF = val
      return val
    }
  } catch (err) {
    console.warn('[API] Failed to get CSRF token:', err)
  }
  return ''
}

export function getSessionToken(): string {
  return localStorage.getItem('ymb_session_token') || ''
}

export function setSessionToken(token: string) {
  localStorage.setItem('ymb_session_token', token)
  cachedCSRF = null
}

export function clearSession() {
  localStorage.removeItem('ymb_session_token')
  localStorage.removeItem('ymb_user')
  cachedCSRF = null
}

export async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getSessionToken()
  const headers = new Headers(options.headers || {})
  
  headers.set('Content-Type', 'application/json')
  headers.set('Accept', 'application/json')
  
  if (token) {
    headers.set('Authorization', token)
  }

  // Include CSRF token for mutating requests
  if (options.method && ['POST', 'PUT', 'DELETE'].includes(options.method.toUpperCase())) {
    const csrf = await getCSRFToken()
    if (csrf) {
      headers.set('X-CSRF-Token', csrf)
    }
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    throw new Error(errorBody.error || errorBody.message || `HTTP ${response.status}: ${response.statusText}`)
  }

  return response.json()
}

// === Auth ===
export async function loginUser(username: string, password: string): Promise<{
  status: string
  username: string
  display_name: string
  role: 'admin' | 'cashier'
  token: string
  password_changed: number
}> {
  return request('/api/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export async function logoutUser(): Promise<{ status: string }> {
  try {
    return await request('/api/logout', { method: 'POST' })
  } finally {
    clearSession()
  }
}

// === Products ===
export async function fetchProducts(admin = false, search = '', category = ''): Promise<Product[]> {
  const query = new URLSearchParams()
  if (admin) query.append('admin', '1')
  if (search) query.append('search', search)
  if (category && category !== 'Semua') query.append('category', category)
  const qs = query.toString() ? `?${query.toString()}` : ''
  return request<Product[]>(`/api/products${qs}`)
}

export async function fetchCategories(): Promise<Category[]> {
  return request<Category[]>('/api/categories')
}

export async function addProduct(p: Partial<Product>): Promise<{ status: string }> {
  return request('/api/products', {
    method: 'POST',
    body: JSON.stringify(p),
  })
}

export async function updateProduct(id: number, p: Partial<Product>): Promise<{ status: string }> {
  return request(`/api/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(p),
  })
}

export async function deleteProduct(id: number): Promise<{ status: string }> {
  return request(`/api/products/${id}`, {
    method: 'DELETE',
  })
}

export async function adjustStock(payload: {
  product_id: number
  quantity: number
  type: 'in' | 'out' | 'adjust'
  reason: string
  shift_id?: number
}): Promise<{ status: string; new_stock: number }> {
  return request('/api/stock-adjustment', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function fetchProductMovements(productId: number): Promise<InventoryMovement[]> {
  return request<InventoryMovement[]>(`/api/products/${productId}/movements`)
}

export async function fetchLowStockAlerts(): Promise<LowStockProduct[]> {
  return request<LowStockProduct[]>('/api/alerts/low-stock')
}

// === Checkout & Transactions ===
export async function submitCheckout(payload: CheckoutPayload): Promise<{ status: string; tx_id: string; change_amount: number }> {
  return request('/api/checkout', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function fetchTransactions(date?: string, limit = 100): Promise<Transaction[]> {
  const params = new URLSearchParams()
  if (date) params.append('date', date)
  if (limit) params.append('limit', limit.toString())
  const qs = params.toString() ? `?${params.toString()}` : ''
  return request<Transaction[]>(`/api/transactions${qs}`)
}

export async function voidTransaction(txId: string): Promise<{ status: string; message: string }> {
  return request(`/api/transactions/${txId}/void`, {
    method: 'POST',
  })
}

// === Holds ===
export async function fetchHolds(): Promise<HoldTransaction[]> {
  return request<HoldTransaction[]>('/api/hold')
}

export async function saveHold(itemsJson: string, customerName: string): Promise<{ status: string; hold_id: string }> {
  return request('/api/hold', {
    method: 'POST',
    body: JSON.stringify({ items: JSON.parse(itemsJson), customer_name: customerName }),
  })
}

export async function deleteHold(id: number): Promise<{ status: string }> {
  return request<{ status: string }>(`/api/holds/${id}`, {
    method: 'DELETE',
  })
}

// === Shifts ===
export async function fetchCurrentShift(): Promise<Shift | null> {
  try {
    return await request<Shift>('/api/shifts/current')
  } catch {
    return null
  }
}

export async function fetchActiveShifts(): Promise<Shift[]> {
  try {
    return await request<Shift[]>('/api/shifts/active')
  } catch {
    return []
  }
}

export async function fetchShifts(status?: string): Promise<Shift[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : ''
  return request<Shift[]>(`/api/shifts${qs}`)
}

export async function openShift(shiftName: string, openingCash: number): Promise<Shift> {
  return request<Shift>('/api/shifts/open', {
    method: 'POST',
    body: JSON.stringify({ shift_name: shiftName, opening_cash: openingCash }),
  })
}

export interface CloseShiftResponse {
  status: string;
  shift_id: number;
  opening: number;
  cash_sales: number;
  qris_sales: number;
  total_sales: number;
  total_tx: number;
  expected: number;
  closing: number;
  discrepancy: number;
}

export async function closeShift(closingCash: number, actualCash: number, notes?: string): Promise<CloseShiftResponse> {
  return request<CloseShiftResponse>('/api/shifts/close', {
    method: 'POST',
    body: JSON.stringify({ closing_cash: actualCash, expected_cash: closingCash, actual_cash: actualCash, notes }),
  })
}

export interface DailyReportData {
  date: string;
  is_range: boolean;
  start_date?: string;
  end_date?: string;
  total_sales: number;
  total_tx: number;
  cash_sales: number;
  qris_sales: number;
  tf_sales: number;
  total_profit: number;
  total_discount: number;
  total_tax: number;
  top_items: { name: string; qty: number; revenue: number }[];
  hourly: { hour: string; tx_count: number; sales: number }[];
  low_stock: { name: string; stock: number }[];
}

export async function fetchDailyReport(params?: {
  date?: string;
  start_date?: string;
  end_date?: string;
  month?: string;
}): Promise<DailyReportData> {
  const query = new URLSearchParams()
  if (params?.date) query.append('date', params.date)
  if (params?.start_date) query.append('start_date', params.start_date)
  if (params?.end_date) query.append('end_date', params.end_date)
  if (params?.month) query.append('month', params.month)
  const qs = query.toString() ? `?${query.toString()}` : ''
  return request<DailyReportData>(`/api/daily-report${qs}`)
}

export async function logCash(shiftId: number, type: 'in' | 'drop', amount: number, description: string): Promise<CashLog> {
  const endpoint = type === 'in' ? '/api/cash/in' : '/api/cash/drop'
  return request<CashLog>(endpoint, {
    method: 'POST',
    body: JSON.stringify({ shift_id: shiftId, amount, description }),
  })
}

export async function fetchCashLogs(shiftId?: number): Promise<CashLog[]> {
  const endpoint = shiftId && shiftId > 0 ? `/api/cash/log/${shiftId}` : '/api/cash/log'
  return request<CashLog[]>(endpoint)
}

// === Stock Opname ===
export async function fetchStockOpnameSessions(): Promise<StockOpnameSession[]> {
  return request<StockOpnameSession[]>('/api/stock-opname')
}

export async function createStockOpnameSession(payload: { opname_date: string; notes: string }): Promise<{ session_id: number; status: string }> {
  return request('/api/stock-opname', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function fetchStockOpnameSession(sessionId: number): Promise<StockOpnameDetail> {
  return request<StockOpnameDetail>(`/api/stock-opname/${sessionId}`)
}

export async function submitStockOpname(
  sessionId: number,
  items: { product_id: number; physical_qty: number }[]
): Promise<{ status: string; message: string }> {
  return request(`/api/stock-opname/submit/${sessionId}`, {
    method: 'POST',
    body: JSON.stringify({ items }),
  })
}

export async function applyStockOpname(sessionId: number): Promise<{ status: string; message: string }> {
  return request(`/api/stock-opname/apply/${sessionId}`, {
    method: 'POST',
  })
}

// === Members ===
export async function fetchMembers(search = ''): Promise<Member[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : ''
  return request<Member[]>(`/api/members${qs}`)
}

export async function fetchMemberById(memberId: string): Promise<Member> {
  return request<Member>(`/api/members/${encodeURIComponent(memberId)}`)
}

export async function addMember(payload: { name: string; phone: string; email?: string }): Promise<{ status: string; member_id: string }> {
  return request('/api/members', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// === User Management ===
export async function fetchUsers(): Promise<UserAccount[]> {
  return request<UserAccount[]>('/api/users')
}

export async function addCashier(payload: { username: string; display_name: string; pin: string }): Promise<{ status: string }> {
  return request('/api/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function toggleUserStatus(id: number): Promise<{ status: string; active: number }> {
  return request(`/api/users/${id}/toggle`, {
    method: 'POST',
  })
}

export async function resetUserPIN(id: number, pin: string): Promise<{ status: string }> {
  return request(`/api/users/${id}/reset-pin`, {
    method: 'POST',
    body: JSON.stringify({ pin }),
  })
}

// === Analytics & Stats ===
export async function fetchStats(): Promise<StatsData> {
  return request<StatsData>('/api/stats')
}

export async function fetchSalesTrend(): Promise<SalesTrendPoint[]> {
  return request<SalesTrendPoint[]>('/api/sales-trend')
}

export async function fetchPaymentBreakdown(): Promise<PaymentBreakdownItem[]> {
  return request<PaymentBreakdownItem[]>('/api/payment-breakdown')
}

// === System Settings & Sync ===
export async function fetchSettings(includeAds = false): Promise<Record<string, string>> {
  const qs = includeAds ? '?include_ads=1' : ''
  return request<Record<string, string>>(`/api/settings${qs}`)
}

export async function updateSettings(settings: Record<string, string>): Promise<{ status: string }> {
  return request('/api/settings', {
    method: 'POST',
    body: JSON.stringify(settings),
  })
}

export async function fetchSyncStatus(): Promise<{
  status: string
  pending_count: number
  last_sync: string
  cloud_connected: boolean
}> {
  return request('/api/sync/status')
}

export async function triggerSync(): Promise<{ status: string; message: string }> {
  return request('/api/sync/trigger', {
    method: 'POST',
  })
}

// === Presensi Kasir (Dynamic QR & Attendance) ===
export interface AttendanceRecord {
  id: number
  user_id?: number
  username: string
  cashier_name: string
  type: 'masuk' | 'pulang'
  date: string
  time: string
  notes?: string
  device_info?: string
  created_at: string
}

export interface PresensiQRTokenData {
  status: string
  token: string
  expires_in: number
  rotation_sec: number
  server_time: string
  public_url: string
}

export interface PresensiTodaySummary {
  status: string
  date: string
  total: number
  masuk: number
  pulang: number
  list: AttendanceRecord[]
}

export async function fetchPresensiQRToken(): Promise<PresensiQRTokenData> {
  return request<PresensiQRTokenData>('/api/presensi/qr-token')
}

export async function fetchPresensiToday(): Promise<PresensiTodaySummary> {
  return request<PresensiTodaySummary>('/api/presensi/today')
}

export async function recordPresensi(payload: {
  username: string
  pin: string
  type: 'masuk' | 'pulang'
  notes?: string
  device_info?: string
  token?: string
}): Promise<{
  status: string
  id: number
  message: string
  cashier_name: string
  username: string
  type: string
  date: string
  time: string
}> {
  return request('/api/presensi', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export interface PresensiListResponse {
  status: string
  today_date: string
  total_today: number
  masuk_today: number
  pulang_today: number
  data: AttendanceRecord[]
}

export async function fetchPresensiList(params?: {
  date?: string
  type?: string
  username?: string
}): Promise<PresensiListResponse> {
  const query = new URLSearchParams()
  if (params?.date) query.append('date', params.date)
  if (params?.type) query.append('type', params.type)
  if (params?.username) query.append('username', params.username)
  const qs = query.toString() ? `?${query.toString()}` : ''
  return request<PresensiListResponse>(`/api/presensi${qs}`)
}

// === Stock & Inventory Monitoring ===
export async function fetchStockReport(): Promise<Product[]> {
  return request<Product[]>('/api/stock-report')
}

export interface RestockCandidate {
  product_id: number
  sku: string
  name: string
  stock: number
  category: string
  price: number
  cost: number
  margin_pct: number
}

export async function fetchRestockCandidates(threshold?: number): Promise<{
  threshold: number
  count: number
  candidates: RestockCandidate[]
}> {
  const qs = threshold ? `?threshold=${threshold}` : ''
  return request(`/api/ai/restock-candidates${qs}`)
}

// === E-Transaction (PPOB) ===
export interface ETransItemReport {
  id?: number
  tx_id: string
  product: string
  category: string
  target_number: string
  cashier: string
  customer_name: string
  qty: number
  nominal: number
  admin_fee: number
  total_paid: number
  payment: string
  created_at: string
}

export interface ETransCategoryStat {
  count: number
  gmv: number
  fee: number
}

export interface ETransSummaryReport {
  total_tx: number
  total_gmv: number
  total_admin_fee: number
  total_nominal: number
  popular_category: string
  category_breakdown: Record<string, ETransCategoryStat>
  cashiers: string[]
  items: ETransItemReport[]
}

export async function fetchETransReport(params?: {
  category?: string
  cashier?: string
  q?: string
  month?: string
}): Promise<ETransSummaryReport> {
  const query = new URLSearchParams()
  if (params?.category) query.append('category', params.category)
  if (params?.cashier) query.append('cashier', params.cashier)
  if (params?.q) query.append('q', params.q)
  if (params?.month) query.append('month', params.month)
  const qs = query.toString() ? `?${query.toString()}` : ''
  return request<ETransSummaryReport>(`/api/reports/etrans${qs}`)
}

// === Database Backup & Restore ===
export async function downloadBackup(): Promise<Blob> {
  const token = getSessionToken()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API_BASE}/api/backup`, { headers })
  if (!res.ok) throw new Error('Gagal mengunduh file backup SQLite')
  return res.blob()
}

export async function uploadRestore(file: File): Promise<{ status: string; message: string }> {
  const token = getSessionToken()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${API_BASE}/api/restore`, {
    method: 'POST',
    headers,
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Gagal merestore database')
  }
  return res.json()
}

// === Receipt Detail ===
export interface ReceiptItem {
  name: string
  qty: number
  price: number
  discount: number
  subtotal: number
}

export interface ReceiptDetail {
  store_name: string
  address: string
  tx_id: string
  date: string
  cashier: string
  customer_name?: string
  items: ReceiptItem[]
  subtotal: number
  discount: number
  tax: number
  total: number
  payment: string
  amount_paid: number
  change: number
  footer: string
}

export async function fetchReceiptDetail(txId: string): Promise<ReceiptDetail> {
  return request<ReceiptDetail>(`/api/receipt/${txId}`)
}

// === Change Admin Password ===
export async function changePassword(payload: {
  username: string
  old_password: string
  new_password: string
}): Promise<{ status: string; message?: string }> {
  return request('/api/change-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// === Member Transactions History ===
export interface MemberTransaction {
  tx_id: string
  total: number
  discount: number
  tax: number
  grand_total: number
  payment: string
  created_at: string
}

export async function fetchMemberTransactions(memberId: string): Promise<MemberTransaction[]> {
  return request<MemberTransaction[]>(`/api/members/${memberId}/transactions`)
}
