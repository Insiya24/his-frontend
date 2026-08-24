export const REQUEST_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export const REQUEST_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "PURCHASED",
] as const;

export type RequestPriority = (typeof REQUEST_PRIORITIES)[number];
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export interface ProductRequest {
  id: number;
  branch_id: number;
  requested_by_id: number;
  product_name: string;
  available_quantity: number;
  required_quantity: number;
  quantity: number;
  reason: string;
  priority: RequestPriority;
  request_date: string;
  status: RequestStatus;
}

export interface ProductRequestCreateRequest {
  product_name: string;
  available_quantity: number;
  required_quantity: number;
  reason: string;
  priority?: RequestPriority;
  request_date?: string;
}
