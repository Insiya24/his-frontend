import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "@/api/reports";
import { ROOT_KEYS } from "@/api/queryKeys";
import type { ManagerDashboardData } from "@/types/dashboard";
import type {
  AttendanceReport,
  GenericReportData,
  ReportType,
} from "@/types/reports";
import { REPORT_TYPES } from "@/types/reports";
import { useAuth } from "@/hooks/useAuth";
import { useBranches } from "@/hooks/useBranches";
import { FilterBar, PageHeader } from "@/components/FilterBar";
import { Pagination } from "@/components/Pagination";
import { Select, Input } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { KpiCard } from "@/components/KpiCard";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { IconInbox } from "@/components/icons";
import { enumLabel, formatDate, formatDateTime } from "@/utils/format";

const REPORT_LABELS: Record<ReportType | "audit", string> = {
  attendance: "Attendance",
  "branch-summary": "Branch summary",
  cleaning: "Cleaning",
  inventory: "Inventory",
  "product-requests": "Product requests",
  customers: "Customers",
  reviews: "Reviews",
  complaints: "Complaints",
  inspections: "Inspections",
  audit: "Audit logs",
};

function cellValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "string") {
    // ISO datetimes → friendlier display
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return formatDateTime(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDate(value);
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(value)) return value.slice(0, 5);
  }
  return String(value);
}

function BranchSummaryView({ data }: { data: ManagerDashboardData }) {
  const cards = [
    { label: "Attendance today", value: `${data.today_attendance}`, sub: `${data.attendance_completion}% completion` },
    { label: "Cleaning today", value: data.today_cleaning ? "Submitted" : "Pending" },
    { label: "Low stock", value: data.low_stock },
    { label: "Out of stock", value: data.out_of_stock },
    { label: "Pending requests", value: data.pending_requests },
    { label: "Open complaints", value: data.open_complaints },
    { label: "Inspections today", value: data.today_inspections },
    { label: "Customers today", value: data.today_customers },
  ];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <KpiCard key={card.label} {...card} />
      ))}
    </div>
  );
}

export function ReportsPage() {
  const { user } = useAuth();
  const { scopeBranchId, branches } = useBranches();
  const role = user!.role;

  const [reportType, setReportType] = useState<ReportType | "audit">("attendance");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Reset pagination when the report changes
  useEffect(() => {
    setPage(1);
  }, [reportType, fromDate, toDate]);

  const options = useMemo<(ReportType | "audit")[]>(
    () =>
      role === "ADMIN"
        ? [...REPORT_TYPES, "audit"]
        : [...REPORT_TYPES],
    [role],
  );

  const isAttendance = reportType === "attendance";
  const isSummary = reportType === "branch-summary";

  const params = useMemo(
    () => ({
      branch_id: scopeBranchId ?? undefined,
      page,
      page_size: pageSize,
    }),
    [scopeBranchId, page, pageSize],
  );

  const attendanceQuery = useQuery({
    queryKey: [ROOT_KEYS.reports, "attendance", params, fromDate, toDate],
    queryFn: () =>
      reportsApi.attendance({
        ...params,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      }),
    enabled: isAttendance,
    placeholderData: (previous: AttendanceReport | undefined) => previous,
  });

  const genericQuery = useQuery({
    queryKey: [ROOT_KEYS.reports, reportType, params],
    queryFn: () => reportsApi.generic(reportType as string, params),
    enabled: !isAttendance && !isSummary && reportType !== "audit",
    placeholderData: (previous: GenericReportData | undefined) => previous,
  });

  const summaryQuery = useQuery({
    queryKey: [ROOT_KEYS.reports, "branch-summary", scopeBranchId ?? user!.branch_id],
    queryFn: () => reportsApi.branchSummary(scopeBranchId ?? user!.branch_id ?? undefined),
    enabled: isSummary,
  });

  const auditReportQuery = useQuery({
    queryKey: [ROOT_KEYS.reports, "audit", params],
    queryFn: () => reportsApi.auditReport(params),
    enabled: reportType === "audit" && role === "ADMIN",
    placeholderData: (previous: GenericReportData | undefined) => previous,
  });

  // ---- Render helpers ----

  const renderAttendance = (report: AttendanceReport | undefined) => {
    if (!report) return null;
    const columns: Column<AttendanceReport["data"][number]>[] = [
      { key: "id", header: "ID", render: (row) => <span className="text-slate-400">#{row.id}</span> },
      { key: "staff_id", header: "Staff ID" },
      ...(role === "ADMIN"
        ? [
            {
              key: "branch_id" as const,
              header: "Branch",
              render: (row: AttendanceReport["data"][number]) => {
                const match = branches.find((b) => b.id === row.branch_id);
                return match?.branch_name ?? `#${row.branch_id}`;
              },
            },
          ]
        : []),
      {
        key: "attendance_date",
        header: "Date",
        render: (row) => formatDate(row.attendance_date),
      },
      {
        key: "status",
        header: "Status",
        render: (row) => <StatusBadge value={row.status} />,
      },
    ];
    return (
      <>
        <div className="mb-3">
          <KpiCard label="Total records in range" value={report.summary.total} />
        </div>
        <DataTable
          columns={columns}
          rows={report.data}
          rowKey={(row) => row.id}
          loading={attendanceQuery.isFetching && !report}
          emptyTitle="No attendance records in this range"
        />
        <Pagination meta={report.summary.pagination} onPageChange={setPage} onPageSizeChange={(s) => setPageSize(s)} />
      </>
    );
  };

  const renderGeneric = (data: GenericReportData | undefined) => {
    if (!data) return null;
    const records = data.records ?? [];
    const keys =
      records.length > 0
        ? Object.keys(records[0]).filter((key) => !["password_hash"].includes(key))
        : [];
    const columns: Column<Record<string, unknown>>[] = keys.map((key) => ({
      key,
      header: enumLabel(key),
      render: (row) => <CellValue value={row[key]} />,
    }));
    return (
      <>
        {records.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <EmptyState
              icon={<IconInbox className="h-6 w-6" />}
              title="No records for this report"
              description="Try widening your filters or choose another report."
            />
          </div>
        ) : (
          <DataTable columns={columns} rows={records} rowKey={(_row, index) => index} />
        )}
        <Pagination
          meta={data.pagination}
          onPageChange={setPage}
          onPageSizeChange={(size) => setPageSize(size)}
        />
      </>
    );
  };

  return (
    <div>
      <PageHeader title="Reports" subtitle="Operational and analytical exports per module." />

      <FilterBar className="mb-4">
        <Select
          label="Report"
          value={reportType}
          onChange={(event) => setReportType(event.target.value as ReportType | "audit")}
          className="w-56"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {REPORT_LABELS[option]}
            </option>
          ))}
        </Select>

        {isAttendance && (
          <>
            <Input
              label="From date"
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="w-44"
            />
            <Input
              label="To date"
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="w-44"
            />
            {(fromDate || toDate) && (
              <Button variant="ghost" onClick={() => { setFromDate(""); setToDate(""); }}>
                Clear dates
              </Button>
            )}
          </>
        )}

        {!isSummary && (
          <p className="ml-auto self-center pb-1.5 text-xs text-slate-500">
            {role === "MANAGER"
              ? "Scoped to your assigned branch."
              : scopeBranchId
                ? branches.find((b) => b.id === scopeBranchId)?.branch_name
                : "All branches"}
          </p>
        )}
      </FilterBar>

      {/* Content */}
      {isAttendance ? (
        renderAttendance(attendanceQuery.data)
      ) : isSummary ? (
        summaryQuery.isError ? (
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <ErrorState
              message={(summaryQuery.error as Error)?.message}
              onRetry={() => summaryQuery.refetch()}
            />
          </div>
        ) : summaryQuery.isLoading || !summaryQuery.data ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 shadow-sm">
            Loading summary…
          </div>
        ) : Array.isArray(summaryQuery.data) ? (
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <EmptyState
              icon={<IconInbox className="h-6 w-6" />}
              title="No branch selected"
              description="Choose a branch in the header to view its summary."
            />
          </div>
        ) : (
          <BranchSummaryView data={summaryQuery.data as ManagerDashboardData} />
        )
      ) : reportType === "audit" && role !== "ADMIN" ? null : reportType === "audit" ? (
        renderGeneric(auditReportQuery.data)
      ) : genericQuery.isError ? (
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <ErrorState message={(genericQuery.error as Error)?.message} onRetry={() => genericQuery.refetch()} />
        </div>
      ) : (
        renderGeneric(genericQuery.data)
      )}
    </div>
  );
}

function CellValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <span className="text-slate-300">—</span>;
  if (typeof value === "string" && ["OPEN", "CLOSED", "PENDING", "APPROVED", "PURCHASED", "REJECTED", "PRESENT", "ABSENT", "LATE", "LEAVE", "HALF_DAY", "IN_REVIEW", "RESOLVED", "COMPLETED", "ISSUE_FOUND", "NOT_APPLICABLE", "ACTIVE", "INACTIVE"].includes(value.toUpperCase())) {
    return <StatusBadge value={value} />;
  }
  if (value instanceof Object) return <span className="text-xs">{cellValue(value)}</span>;
  return <span>{cellValue(value)}</span>;
}
