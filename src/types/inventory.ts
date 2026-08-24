export const PRODUCT_CATEGORIES = [
  "HAIR",
  "SKIN",
  "NAIL",
  "CLEANING",
  "EQUIPMENT",
  "OTHER",
] as const;

export const PRODUCT_UNITS = ["PIECE", "ML", "GRAM", "LITRE", "PACK"] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
export type ProductUnit = (typeof PRODUCT_UNITS)[number];

export interface InventoryItem {
  id: number;
  product_name: string;
  size: string | null;
  current_stock: number;
  quantity: number;
  required_stock: number;
  branch_id: number;
  category: ProductCategory;
  unit: ProductUnit;
  remarks: string | null;
  updated_by_id: number | null;
}

export interface InventoryCreateRequest {
  product_name: string;
  size?: string;
  category: ProductCategory;
  unit: ProductUnit;
  current_stock: number;
  required_stock: number;
  branch_id: number;
}

export interface InventoryUpdateRequest {
  product_name?: string;
  size?: string;
  category?: ProductCategory;
  unit?: ProductUnit;
  current_stock?: number;
  required_stock?: number;
  remarks?: string;
}

export interface InventorySheet {
  id: number;
  branch_id: number;
  inventory_month: string;
  list_made_by_id: number;
  list_made_by_name: string;
  signature: string | null;
}

export interface SheetItemRequest {
  product_id: number;
  size?: string;
  quantity: number;
}

export interface SheetCreateRequest {
  branch_id: number;
  inventory_month: string;
  signature?: string;
  items: SheetItemRequest[];
}

export interface ProductMaster {
  id: number;
  name: string;
  category: ProductCategory;
  default_size: string | null;
  unit: ProductUnit;
  is_active: boolean;
}
