export interface Branch {
  id: number;
  branch_name: string;
  branch_code: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string | null;
  is_active: boolean;
  created_at: string;
}

export interface BranchCreateRequest {
  branch_name: string;
  branch_code: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email?: string;
}

export interface BranchUpdateRequest {
  branch_name?: string;
  branch_code?: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  is_active?: boolean;
}
