import { Category, Product } from '@/types/product';
import { MOCK_CATEGORIES, MOCK_PRODUCTS } from '@/constants/mockData';

// Configurable API URL. Defaults to live cloud backend, fallback to localhost.
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'https://ymb-mart.vercel.app'
    : 'https://ymb-mart.vercel.app');

const REQUEST_TIMEOUT_MS = 8000;

interface BackendProductRaw {
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

interface BackendCategoryRaw {
  id: number;
  name: string;
  icon: string;
}

// Curated grocery images mapping by category / keyword for visual excellence
function resolveProductImage(name: string, category: string): string {
  const n = name.toLowerCase();
  const c = category.toLowerCase();

  if (n.includes('le mineral') || n.includes('mineral') || n.includes('aqua') || n.includes('air')) {
    return 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=500&q=80';
  }
  if (n.includes('beras') || c.includes('sembako')) {
    return 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&q=80';
  }
  if (n.includes('minyak') || n.includes('goreng')) {
    return 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&q=80';
  }
  if (n.includes('telur')) {
    return 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=500&q=80';
  }
  if (n.includes('ayam') || c.includes('daging')) {
    return 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=500&q=80';
  }
  if (n.includes('susu') || c.includes('susu')) {
    return 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&q=80';
  }
  if (n.includes('mie') || n.includes('indomie')) {
    return 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=500&q=80';
  }
  if (c.includes('snack') || c.includes('camilan')) {
    return 'https://images.unsplash.com/photo-1621996346565-e3d5d6281729?w=500&q=80';
  }
  if (c.includes('minuman')) {
    return 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&q=80';
  }
  return 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&q=80';
}

function mapBackendProductToFrontend(raw: BackendProductRaw): Product {
  const promoActive = raw.promo_active === 1;
  const promoPrice = promoActive && raw.promo_price && raw.promo_price > 0 ? raw.promo_price : undefined;
  let discountPercent: number | undefined;

  if (promoPrice && raw.price > 0 && promoPrice < raw.price) {
    discountPercent = Math.round(((raw.price - promoPrice) / raw.price) * 100);
  }

  // Differentiate physical stock vs online display stock to prevent race condition
  const reservedStock = raw.reserved_stock || 0;
  const minStock = raw.min_stock || 0;
  const onlineStock = raw.online_stock !== undefined
    ? raw.online_stock
    : Math.max(0, raw.stock - reservedStock - minStock);

  return {
    id: raw.id,
    sku: raw.sku,
    name: raw.name,
    description: raw.description || `${raw.name} kualitas terbaik tersedia di Baiturrahman Mart.`,
    price: raw.price,
    promoPrice,
    promoActive,
    discountPercent,
    category: raw.category || 'Umum',
    stock: onlineStock,
    physicalStock: raw.stock,
    reservedStock,
    onlineStock,
    unit: raw.unit || 'pcs',
    barcode: raw.barcode || '',
    imageUrl: resolveProductImage(raw.name, raw.category),
    isHalal: true,
    isBestSeller: onlineStock > 5,
  };
}

async function fetchWithTimeout(
  url: string,
  timeoutMs = REQUEST_TIMEOUT_MS,
  init?: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(init?.headers || {}),
      },
    });
    return response;
  } finally {
    clearTimeout(id);
  }
}

export async function fetchCategories(): Promise<Category[]> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/categories`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: Failed to fetch categories`);
    }
    const data: BackendCategoryRaw[] = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return data.map((cat) => ({
        id: cat.name.toLowerCase(),
        name: cat.name,
        icon: cat.icon || '📦',
      }));
    }
    return MOCK_CATEGORIES;
  } catch (error) {
    console.warn('[API] fetchCategories fallback to mock:', error);
    return MOCK_CATEGORIES;
  }
}

export async function fetchProducts(options?: {
  category?: string;
  search?: string;
}): Promise<Product[]> {
  try {
    const params = new URLSearchParams();
    if (options?.category && options.category !== 'Semua' && options.category !== 'all') {
      params.append('category', options.category);
    }
    if (options?.search) {
      params.append('search', options.search);
    }

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/products${query}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: Failed to fetch products`);
    }
    const data: BackendProductRaw[] = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const backendProducts = data.map(mapBackendProductToFrontend);
      const existingIds = new Set(backendProducts.map((p) => p.id));
      const remainingMocks = MOCK_PRODUCTS.filter((p) => !existingIds.has(p.id));
      return [...backendProducts, ...remainingMocks];
    }
    return MOCK_PRODUCTS;
  } catch (error) {
    console.warn('[API] fetchProducts fallback to mock:', error);
    return MOCK_PRODUCTS;
  }
}

export async function fetchProductById(id: number): Promise<Product | null> {
  try {
    const all = await fetchProducts();
    const found = all.find((p) => p.id === id);
    if (found) return found;

    const mockFound = MOCK_PRODUCTS.find((p) => p.id === id);
    return mockFound || null;
  } catch (error) {
    console.warn('[API] fetchProductById fallback to mock:', error);
    return MOCK_PRODUCTS.find((p) => p.id === id) || null;
  }
}

// ==========================================
// Mobile Order & Stock Reservation APIs
// ==========================================

export interface CreateOrderItemPayload {
  product_id: number;
  qty: number;
  shopper_note?: string;
}

export interface CreateOrderPayload {
  member_id?: string;
  customer_name: string;
  customer_phone: string;
  fulfillment_type: 'delivery' | 'pickup';
  address_text: string;
  infaq_amount?: number;
  voucher_discount?: number;
  delivery_fee?: number;
  payment_method?: 'qris' | 'va' | 'cod';
  shopper_notes?: string;
  items: CreateOrderItemPayload[];
}

export interface CreateOrderResponse {
  success: boolean;
  order_no?: string;
  order_id?: number;
  total_amount?: number;
  expires_at?: string;
  message?: string;
  error?: string;
  out_of_stock_item?: string;
  available_online?: number;
}

export interface PayOrderResponse {
  success: boolean;
  order_no?: string;
  status?: string;
  message?: string;
  error?: string;
}

export async function createMobileOrder(payload: CreateOrderPayload): Promise<CreateOrderResponse> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/mobile/orders`, 10000, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: data.error || `HTTP error ${res.status}`,
        out_of_stock_item: data.out_of_stock_item,
        available_online: data.available_online,
      };
    }
    return data;
  } catch (err: any) {
    console.warn('[API] createMobileOrder failed:', err);
    return {
      success: false,
      error: err.message || 'Gagal terhubung ke server',
    };
  }
}

export async function payMobileOrder(orderNo: string): Promise<PayOrderResponse> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/mobile/orders/pay`, 10000, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ order_no: orderNo }),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: data.error || `HTTP error ${res.status}`,
      };
    }
    return data;
  } catch (err: any) {
    console.warn('[API] payMobileOrder failed:', err);
    return {
      success: false,
      error: err.message || 'Gagal terhubung ke server',
    };
  }
}

export async function cancelMobileOrder(orderNo: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/mobile/orders/cancel`, 10000, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ order_no: orderNo }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal batalkan pesanan' };
  }
}

