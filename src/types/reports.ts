import type { PaginationMeta } from "./api";

export const REPORT_TYPES = [
  "attendance",
  "monthly-sheet",
  "branch-summary",
  "cleaning",
  "inventory",
  "product-requests",
  "reviews",
  "complaints",
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

export interface AttendanceReportRow {
  id: number;
  staff_id: number;
  staff_name: string | null;
  branch_id: number;
  branch_name: string | null;
  branch_code: string | null;
  attendance_date: string;
  status: string;
  check_in: string | null;
  check_out: string | null;
}

export interface ReportBranchInfo {
  branch_id: number;
  branch_name: string;
  branch_code: string;
}

export interface AttendanceReport {
  report_name: string;
  summary: { total: number; pagination: PaginationMeta; branch?: ReportBranchInfo | null };
  data: AttendanceReportRow[];
}

export interface MonthlySheetSummary {
  branch_id: number;
  branch_name: string;
  branch_code: string;
  year: number;
  month: number;
  total: number;
  pagination: PaginationMeta;
}

export interface MonthlySheetRow {
  id: number;
  staff_id: number;
  attendance_date: string;
  status: string;
}

export interface MonthlySheetReport {
  report_name: string;
  summary: MonthlySheetSummary;
  data: MonthlySheetRow[];
}

export interface GenericReportData {
  records: Record<string, unknown>[];
  pagination: PaginationMeta;
  export_ready: boolean;
  branch?: ReportBranchInfo | null;
}

export const AUDIT_MODULES = [
  "AUTH",
  "BRANCH",
  "STAFF",
  "ATTENDANCE",
  "CLEANING",
  "INVENTORY",
  "PRODUCT_REQUEST",
  "REVIEW",
  "COMPLAINT",
  "REPORT",
  "SYSTEM",
] as const;

export interface AuditLogEntry {
  id: number;
  module: string;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  created_at: string;
}
