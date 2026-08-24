import { httpGet, httpPatch, httpPost } from "./client";
import type { Paginated } from "@/types/api";
import type {
  AttendanceCreateRequest,
  AttendanceListParams,
  AttendanceRecord,
  AttendanceUpdateRequest,
} from "@/types/attendance";

export const attendanceApi = {
  list(params: AttendanceListParams = {}): Promise<Paginated<AttendanceRecord>> {
    return httpGet<Paginated<AttendanceRecord>>("/attendance", { ...params });
  },

  mark(payload: AttendanceCreateRequest): Promise<AttendanceRecord> {
    return httpPost<AttendanceRecord>("/attendance", payload);
  },

  update(
    attendanceId: number,
    payload: AttendanceUpdateRequest,
  ): Promise<AttendanceRecord> {
    return httpPatch<AttendanceRecord>(`/attendance/${attendanceId}`, payload);
  },
};
