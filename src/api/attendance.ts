import { httpDelete, httpGet, httpPatch, httpPost } from "./client";
import type { Paginated } from "@/types/api";
import type {
  AttendanceBulkRequest,
  AttendanceCreateRequest,
  AttendanceListParams,
  AttendanceRecord,
  AttendanceTable,
  AttendanceUpdateRequest,
} from "@/types/attendance";

export const attendanceApi = {
  list(params: AttendanceListParams = {}): Promise<Paginated<AttendanceRecord>> {
    return httpGet<Paginated<AttendanceRecord>>("/attendance", { ...params });
  },

  mark(payload: AttendanceCreateRequest): Promise<AttendanceRecord> {
    return httpPost<AttendanceRecord>("/attendance", payload);
  },

  bulk(payload: AttendanceBulkRequest): Promise<AttendanceRecord[]> {
    return httpPost<AttendanceRecord[]>("/attendance/bulk", payload);
  },

  table(params: { attendance_date: string; branch_id?: number }): Promise<AttendanceTable> {
    return httpGet<AttendanceTable>("/attendance/table", { ...params });
  },

  update(
    attendanceId: number,
    payload: AttendanceUpdateRequest,
  ): Promise<AttendanceRecord> {
    return httpPatch<AttendanceRecord>(`/attendance/${attendanceId}`, payload);
  },

  remove(attendanceId: number): Promise<void> {
    return httpDelete<void>(`/attendance/${attendanceId}`);
  },
};
