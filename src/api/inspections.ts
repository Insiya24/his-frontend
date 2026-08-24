import { httpGet, httpPost } from "./client";
import type {
  InspectionCreateRequest,
  InspectionRecord,
} from "@/types/inspection";

export const inspectionsApi = {
  list(branchId?: number): Promise<InspectionRecord[]> {
    return httpGet<InspectionRecord[]>("/inspections", {
      branch_id: branchId ?? undefined,
    });
  },

  create(payload: InspectionCreateRequest): Promise<InspectionRecord> {
    return httpPost<InspectionRecord>("/inspections", payload);
  },
};
