import { httpGet, httpPatch, httpPost } from "./client";
import type {
  ReviewCreateRequest,
  ReviewRecord,
  ReviewUpdateRequest,
} from "@/types/review";

export const reviewsApi = {
  list(branchId?: number): Promise<ReviewRecord[]> {
    return httpGet<ReviewRecord[]>("/reviews", { branch_id: branchId ?? undefined });
  },

  create(payload: ReviewCreateRequest): Promise<ReviewRecord> {
    return httpPost<ReviewRecord>("/reviews", payload);
  },

  update(reviewId: number, payload: ReviewUpdateRequest): Promise<ReviewRecord> {
    return httpPatch<ReviewRecord>(`/reviews/${reviewId}`, payload);
  },
};
