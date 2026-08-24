export const COMPLAINT_STATUSES = [
  "OPEN",
  "IN_REVIEW",
  "RESOLVED",
  "CLOSED",
] as const;

export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];

export interface ComplaintRecord {
  id: number;
  branch_id: number;
  staff_id: number | null;
  regarding: string;
  customer_details: string;
  complaint: string;
  complaint_date: string;
  status: ComplaintStatus;
  resolution: string | null;
  manager_remarks: string | null;
  admin_remarks: string | null;
}

export interface ComplaintCreateRequest {
  staff_id?: number;
  regarding: string;
  customer_details: string;
  complaint: string;
  complaint_date?: string;
  manager_remarks?: string;
}

export interface ComplaintUpdateRequest {
  status?: ComplaintStatus;
  resolution?: string;
  manager_remarks?: string;
  admin_remarks?: string;
}
