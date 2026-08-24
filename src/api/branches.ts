import { httpGet, httpPatch, httpPost } from "./client";
import type { Branch, BranchCreateRequest, BranchUpdateRequest } from "@/types/branch";

export const branchesApi = {
  list(): Promise<Branch[]> {
    return httpGet<Branch[]>("/branches");
  },

  get(branchId: number): Promise<Branch> {
    return httpGet<Branch>(`/branches/${branchId}`);
  },

  create(payload: BranchCreateRequest): Promise<Branch> {
    return httpPost<Branch>("/branches", payload);
  },

  update(branchId: number, payload: BranchUpdateRequest): Promise<Branch> {
    return httpPatch<Branch>(`/branches/${branchId}`, payload);
  },
};
