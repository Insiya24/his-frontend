import { httpGet, httpPatch, httpPost } from "./client";
import type { Paginated } from "@/types/api";
import type {
  InventoryCreateRequest,
  InventoryItem,
  InventorySheet,
  InventoryUpdateRequest,
  ProductMaster,
  SheetCreateRequest,
} from "@/types/inventory";

export interface SeedResult {
  products_created: number;
}

export const inventoryApi = {
  list(params: { branch_id?: number; low_stock?: boolean } = {}): Promise<InventoryItem[]> {
    return httpGet<InventoryItem[]>("/inventory", {
      branch_id: params.branch_id ?? undefined,
      low_stock: params.low_stock ? true : undefined,
    });
  },

  create(payload: InventoryCreateRequest): Promise<InventoryItem> {
    return httpPost<InventoryItem>("/inventory", payload);
  },

  update(itemId: number, payload: InventoryUpdateRequest): Promise<InventoryItem> {
    return httpPatch<InventoryItem>(`/inventory/${itemId}`, payload);
  },

  listSheets(branchId?: number): Promise<InventorySheet[]> {
    return httpGet<InventorySheet[]>("/inventory/sheets", {
      branch_id: branchId ?? undefined,
    });
  },

  createSheet(payload: SheetCreateRequest): Promise<InventorySheet> {
    return httpPost<InventorySheet>("/inventory/sheets", payload);
  },

  listMasterProducts(page = 1, pageSize = 100): Promise<Paginated<ProductMaster>> {
    return httpGet<Paginated<ProductMaster>>("/inventory/master-products", {
      page,
      page_size: pageSize,
    });
  },

  seedProductMaster(): Promise<SeedResult> {
    return httpPost<SeedResult>("/inventory/master-products/seed");
  },

  seedBranchMaster(branchId: number): Promise<SeedResult> {
    return httpPost<SeedResult>(`/inventory/seed-master/${branchId}`);
  },
};
