import axios from "axios";
import type { ApiEnvelope } from "@/types/api";

export const AUTH_STORAGE_KEY = "his.auth";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "",
  headers: { "Content-Type": "application/json" },
  timeout: 45000,
});

export interface StoredAuth {
  token: string;
  user: import("@/types/auth").User;
}

export function readStoredAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAuth;
    if (!parsed?.token) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeStoredAuth(auth: StoredAuth | null): void {
  if (auth) localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
  else localStorage.removeItem(AUTH_STORAGE_KEY);
}

api.interceptors.request.use((config) => {
  const stored = readStoredAuth();
  if (stored?.token) {
    config.headers.Authorization = `Bearer ${stored.token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status: number | undefined = error?.response?.status;
    const detail = error?.response?.data?.detail;
    if (status === 401) {
      window.dispatchEvent(new CustomEvent("his:session-expired"));
    } else if (
      status === 403 &&
      typeof detail === "string" &&
      detail.toLowerCase().includes("password change")
    ) {
      window.dispatchEvent(new CustomEvent("his:password-change-required"));
    }
    return Promise.reject(error);
  },
);

async function request<T>(promise: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  const response = await promise;
  return response.data.data;
}

export function httpGet<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  return request<T>(api.get<ApiEnvelope<T>>(url, { params }));
}

export function httpPost<T>(url: string, body?: unknown): Promise<T> {
  return request<T>(api.post<ApiEnvelope<T>>(url, body ?? {}));
}

export function httpPatch<T>(url: string, body?: unknown): Promise<T> {
  return request<T>(api.patch<ApiEnvelope<T>>(url, body ?? {}));
}

export function httpDelete<T>(url: string): Promise<T> {
  return request<T>(api.delete<ApiEnvelope<T>>(url));
}
