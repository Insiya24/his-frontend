export const ROLES = ["ADMIN", "MANAGER"] as const;

export type Role = (typeof ROLES)[number];

export interface User {
  id: number;
  full_name: string;
  email: string;
  role: Role;
  branch_id: number | null;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginResult {
  access_token: string;
  token_type: string;
  must_change_password?: boolean;
  user: User;
}

export interface CreateUserRequest {
  full_name: string;
  email: string;
  phone?: string;
  role: Role;
  branch_id?: number;
  password: string;
}

export interface UpdateUserRequest {
  full_name?: string;
  phone?: string;
  branch_id?: number;
  is_active?: boolean;
}
