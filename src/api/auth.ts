import { api, httpGet, httpPatch, httpPost } from "./client";
import type { CreateUserRequest, LoginResult, UpdateUserRequest, User } from "@/types/auth";

export const authApi = {
  async login(email: string, password: string): Promise<LoginResult> {
    const response = await api.post<{
      success: boolean;
      message: string;
      data: LoginResult;
    }>("/auth/login", { email, password });
    return response.data.data;
  },

  me(): Promise<User> {
    return httpGet<User>("/auth/me");
  },

  logout(): Promise<void> {
    return httpPost<void>("/auth/logout");
  },

  changePassword(old_password: string, new_password: string): Promise<void> {
    return httpPost<void>("/auth/change-password", { old_password, new_password });
  },

  listUsers(): Promise<User[]> {
    return httpGet<User[]>("/auth/users");
  },

  createUser(payload: CreateUserRequest): Promise<User> {
    return httpPost<User>("/auth/users", payload);
  },

  updateUser(userId: number, payload: UpdateUserRequest): Promise<User> {
    return httpPatch<User>(`/auth/users/${userId}`, payload);
  },
};
