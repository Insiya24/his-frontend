export const DESIGNATIONS = [
  "STYLIST",
  "SENIOR_STYLIST",
  "BEAUTICIAN",
  "RECEPTIONIST",
  "HOUSEKEEPING",
  "OTHER",
] as const;

export type Designation = (typeof DESIGNATIONS)[number];

export interface Staff {
  id: number;
  employee_code: string;
  full_name: string;
  designation: Designation;
  branch_id: number;
  is_active: boolean;
}

export interface StaffCreateRequest {
  full_name: string;
  phone: string;
  email?: string;
  designation: Designation;
  joining_date: string;
  salary?: number;
  branch_id: number;
}

export interface StaffUpdateRequest {
  full_name?: string;
  phone?: string;
  email?: string;
  designation?: Designation;
  joining_date?: string;
  salary?: number;
  branch_id?: number;
  is_active?: boolean;
}

export interface StaffListParams {
  branch_id?: number;
  page?: number;
  page_size?: number;
}
