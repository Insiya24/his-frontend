import { httpGet, httpPatch, httpPost } from "./client";
import type { CleaningChecklist, CleaningChecklistPayload } from "@/types/cleaning";

export const cleaningApi = {
  list(branchId?: number): Promise<CleaningChecklist[]> {
    return httpGet<CleaningChecklist[]>("/cleaning", {
      branch_id: branchId ?? undefined,
    });
  },

  create(payload: CleaningChecklistPayload): Promise<CleaningChecklist> {
    return httpPost<CleaningChecklist>("/cleaning", payload);
  },

  update(
    checklistId: number,
    payload: CleaningChecklistPayload,
  ): Promise<CleaningChecklist> {
    return httpPatch<CleaningChecklist>(`/cleaning/${checklistId}`, payload);
  },
};
