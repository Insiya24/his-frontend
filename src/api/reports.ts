import { api, httpGet } from "./client";
import type {
  AttendanceReport,
  GenericReportData,
  MonthlySheetReport,
} from "@/types/reports";

export type AttendanceSort = "attendance_date" | "id" | "branch_id" | "staff_id";

export interface AttendanceReportParams {
  branch_id?: number;
  from_date?: string;
  to_date?: string;
  page?: number;
  page_size?: number;
  sort?: AttendanceSort;
}

export interface MonthlySheetParams {
  branch_id: number;
  year: number;
  month: number;
  page?: number;
  page_size?: number;
}

export interface GenericReportParams {
  branch_id?: number;
  page?: number;
  page_size?: number;
}

export const reportsApi = {
  async attendance(params: AttendanceReportParams): Promise<AttendanceReport> {
    // This endpoint returns the report envelope directly (no success/message wrapper).
    const response = await api.get<AttendanceReport>("/reports/attendance", { params });
    return response.data;
  },

  monthlySheet(params: MonthlySheetParams): Promise<MonthlySheetReport> {
    return httpGet<MonthlySheetReport>("/reports/monthly-sheet", { ...params });
  },

  generic(reportType: string, params: GenericReportParams): Promise<GenericReportData> {
    return httpGet<GenericReportData>(`/reports/${reportType}`, { ...params });
  },

  branchSummary(branchId?: number): Promise<unknown> {
    return httpGet<unknown>("/reports/branch-summary", {
      branch_id: branchId ?? undefined,
    });
  },

  auditReport(params: GenericReportParams): Promise<GenericReportData> {
    return httpGet<GenericReportData>("/reports/audit", { ...params });
  },
};
