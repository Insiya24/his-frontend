export interface SpecialRemarkRecord {
  id: number;
  branch_id: number;
  remark_date: string;
  special_remarks: string | null;
  daily_reminders: string | null;
  manager_notes: string | null;
  created_by_id: number;
}

export interface SpecialRemarkCreateRequest {
  remark_date: string;
  special_remarks?: string;
  daily_reminders?: string;
  manager_notes?: string;
}
