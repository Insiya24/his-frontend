import type { PaginationMeta } from "./api";

export const REPORT_TYPES = [
  "attendance",
  "branch-summary",
  "cleaning",
  "inventory",
  "product-requests",
  "customers",
  "reviews",
  "complaints",
  "inspections",
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

export interface AttendanceReportRow {
  id: number;
  staff_id: number;
  branch_id: number;
  attendance_date: string;
  status: string;
}

export interface AttendanceReport {
  report_name: string;
  summary: { total: number; pagination: PaginationMeta };
  data: AttendanceReportRow[];
}

export interface GenericReportData {
  records: Record<string, unknown>[];
  pagination: PaginationMeta;
  export_ready: boolean;
}

export const AUDIT_MODULES = [
  "AUTH",
  "BRANCH",
  "STAFF",
  "ATTENDANCE",
  "CLEANING",
  "INVENTORY",
  "PRODUCT_REQUEST",
  "CUSTOMER",
  "REVIEW",
  "COMPLAINT",
  "INSPECTION",
  "SPECIAL_REMARK",
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
