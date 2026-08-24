import { httpDelete, httpGet, httpPatch, httpPost } from "./client";
import type { Paginated } from "@/types/api";
import type {
  Staff,
  StaffCreateRequest,
  StaffListParams,
  StaffUpdateRequest,
} from "@/types/staff";

export const staffApi = {
  list(params: StaffListParams = {}): Promise<Paginated<Staff>> {
    return httpGet<Paginated<Staff>>("/staff", { ...params });
  },

  create(payload: StaffCreateRequest): Promise<Staff> {
    return httpPost<Staff>("/staff", payload);
  },

  update(staffId: number, payload: StaffUpdateRequest): Promise<Staff> {
    return httpPatch<Staff>(`/staff/${staffId}`, payload);
  },

  remove(staffId: number): Promise<void> {
    return httpDelete<void>(`/staff/${staffId}`);
  },
};
