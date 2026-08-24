export const GENDERS = ["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"] as const;

export type Gender = (typeof GENDERS)[number];

export interface Customer {
  id: number;
  customer_name: string;
  mobile_number: string;
  gender: Gender;
  visit_date: string;
  branch_id: number;
  services_taken: string | null;
  remarks: string | null;
}

export interface CustomerListParams {
  search?: string;
  branch_id?: number;
}

export interface CustomerCreateRequest {
  customer_name: string;
  mobile_number: string;
  gender: Gender;
  visit_date: string;
  services_taken?: string;
  remarks?: string;
}

export interface CustomerUpdateRequest {
  customer_name?: string;
  mobile_number?: string;
  gender?: Gender;
  visit_date?: string;
  services_taken?: string;
  remarks?: string;
}
