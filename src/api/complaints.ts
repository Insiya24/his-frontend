import { httpGet, httpPatch, httpPost } from "./client";
import type {
  ComplaintCreateRequest,
  ComplaintRecord,
  ComplaintUpdateRequest,
} from "@/types/complaint";

export const complaintsApi = {
  list(branchId?: number): Promise<ComplaintRecord[]> {
    return httpGet<ComplaintRecord[]>("/complaints", {
      branch_id: branchId ?? undefined,
    });
  },

  create(payload: ComplaintCreateRequest): Promise<ComplaintRecord> {
    return httpPost<ComplaintRecord>("/complaints", payload);
  },

  update(
    complaintId: number,
    payload: ComplaintUpdateRequest,
  ): Promise<ComplaintRecord> {
    return httpPatch<ComplaintRecord>(`/complaints/${complaintId}`, payload);
  },
};
