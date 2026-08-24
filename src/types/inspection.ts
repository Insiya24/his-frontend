export interface InspectionRecord {
  id: number;
  branch_id: number;
  management_name: string;
  inspected_by: string;
  inspection_date: string;
  inspection_time: string;
  manager_signature: string | null;
  remarks: string | null;
  created_by_id: number;
}

export interface InspectionCreateRequest {
  management_name: string;
  inspected_by: string;
  inspection_date: string;
  inspection_time: string;
  manager_signature?: string;
  remarks?: string;
}
