import { httpGet, httpPost } from "./client";
import type {
  SpecialRemarkCreateRequest,
  SpecialRemarkRecord,
} from "@/types/specialRemark";

export const specialRemarksApi = {
  list(branchId?: number): Promise<SpecialRemarkRecord[]> {
    return httpGet<SpecialRemarkRecord[]>("/special-remarks", {
      branch_id: branchId ?? undefined,
    });
  },

  create(payload: SpecialRemarkCreateRequest): Promise<SpecialRemarkRecord> {
    return httpPost<SpecialRemarkRecord>("/special-remarks", payload);
  },
};
