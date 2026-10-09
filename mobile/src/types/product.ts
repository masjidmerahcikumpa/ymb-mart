export interface Product {
  id: number;
  sku: string;
  name: string;
  description?: string;
  price: number;
  promoPrice?: number;
  promoActive?: boolean;
  category: string;
  stock: number; // available online stock
  physicalStock?: number;
  reservedStock?: number;
  onlineStock?: number;
  unit: string;
  barcode: string;
  imageUrl?: string;
  isHalal?: boolean;
  isBestSeller?: boolean;
  discountPercent?: number;
}

export interface Category {
  id: number | string;
  name: string;
  icon: string;
  color?: string;
}
