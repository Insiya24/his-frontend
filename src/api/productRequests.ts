import { httpGet, httpPatch, httpPost } from "./client";
import type {
  ProductRequest,
  ProductRequestCreateRequest,
} from "@/types/productRequest";

export const productRequestsApi = {
  list(): Promise<ProductRequest[]> {
    return httpGet<ProductRequest[]>("/product-requests");
  },

  create(payload: ProductRequestCreateRequest): Promise<ProductRequest> {
    return httpPost<ProductRequest>("/product-requests", payload);
  },

  approve(requestId: number): Promise<ProductRequest> {
    return httpPatch<ProductRequest>(`/product-requests/${requestId}/approve`);
  },

  reject(requestId: number, remarks?: string): Promise<ProductRequest> {
    return httpPatch<ProductRequest>(`/product-requests/${requestId}/reject`, {
      remarks: remarks ?? null,
    });
  },

  markPurchased(requestId: number, remarks?: string): Promise<ProductRequest> {
    return httpPatch<ProductRequest>(`/product-requests/${requestId}/purchased`, {
      remarks: remarks ?? null,
    });
  },
};
