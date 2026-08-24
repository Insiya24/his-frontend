export interface ReviewRecord {
  id: number;
  customer_id: number;
  branch_id: number;
  rating: number;
  review: string | null;
  complaint: string | null;
  review_date: string;
}

export interface ReviewCreateRequest {
  customer_id: number;
  rating: number;
  review?: string;
  complaint?: string;
  review_date?: string;
}

export interface ReviewUpdateRequest {
  rating?: number;
  review?: string;
  complaint?: string;
}
