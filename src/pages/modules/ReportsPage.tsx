import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportsApi, type AttendanceSort } from "@/api/reports";
import { ROOT_KEYS } from "@/api/queryKeys";
import type { ManagerDashboardData } from "@/types/dashboard";
import type {
  AttendanceReport,
  GenericReportData,
  MonthlySheetReport,
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
import { enumLabel, formatDate, formatDateTime, formatTime } from "@/utils/format";

const REPORT_LABELS: Record<ReportType | "audit", string> = {
  attendance: "Attendance",
  "monthly-sheet": "Monthly attendance sheet",
  "branch-summary": "Branch summary",
  cleaning: "Cleaning",
  inventory: "Inventory",
  "product-requests": "Product requests",
  reviews: "Reviews",
  complaints: "Complaints",
  audit: "Audit logs",
};

function cellValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return formatDateTime(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDate(value);
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(value)) return value.slice(0, 5);
  }
  return String(value);
}

function BranchHeader({ branch }: { branch?: { branch_name: string; branch_code: string } | null }) {
  if (!branch) return null;
  return (
    <p className="mb-3 inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
      {branch.branch_name}
      <span className="text-slate-400">({branch.branch_code})</span>
    </p>
  );
}

function BranchSummaryView({ data }: { data: ManagerDashboardData }) {
  const cards = [
    { label: "Attendance today", value: `${data.today_attendance}`, sub: `${data.attendance_completion}% completion` },
    { label: "Cleaning today", value: data.today_cleaning ? "Submitted" : "Pending" },
    { label: "Low stock", value: data.low_stock },
    { label: "Out of stock", value: data.out_of_stock },
    { label: "Pending requests", value: data.pending_requests },
    { label: "Open complaints", value: data.open_complaints },
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
  const [sort, setSort] = useState<AttendanceSort>("attendance_date");
  const [sheetYear, setSheetYear] = useState(() => String(new Date().getFullYear()));
  const [sheetMonth, setSheetMonth] = useState(() => String(new Date().getMonth() + 1));
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Reset pagination when the report or its filters change
  useEffect(() => {
    setPage(1);
  }, [reportType, fromDate, toDate, sort, sheetYear, sheetMonth]);

  const options = useMemo<(ReportType | "audit")[]>(
    () => (role === "ADMIN" ? [...REPORT_TYPES, "audit"] : [...REPORT_TYPES]),
    [role],
  );

  const isAttendance = reportType === "attendance";
  const isMonthlySheet = reportType === "monthly-sheet";
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
    queryKey: [ROOT_KEYS.reports, "attendance", params, fromDate, toDate, sort],
    queryFn: () =>
      reportsApi.attendance({
        ...params,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        sort,
      }),
    enabled: isAttendance,
    placeholderData: (previous: AttendanceReport | undefined) => previous,
  });

  const monthlySheetQuery = useQuery({
    queryKey: [ROOT_KEYS.reports, "monthly-sheet", scopeBranchId, sheetYear, sheetMonth, page, pageSize],
    queryFn: () =>
      reportsApi.monthlySheet({
        branch_id: scopeBranchId ?? 0,
        year: Number(sheetYear),
        month: Number(sheetMonth),
        page,
        page_size: pageSize,
      }),
    enabled: isMonthlySheet && scopeBranchId !== null,
  });

  const genericQuery = useQuery({
    queryKey: [ROOT_KEYS.reports, reportType, params],
    queryFn: () => reportsApi.generic(reportType as string, params),
    enabled: !isAttendance && !isSummary && !isMonthlySheet && reportType !== "audit",
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
      {
        key: "staff_name",
        header: "Staff",
        render: (row) => (
          <span className="font-medium text-slate-800">
            {row.staff_name ?? `Staff #${row.staff_id}`}
          </span>
        ),
      },
      ...(role === "ADMIN"
        ? [
            {
              key: "branch_name" as const,
              header: "Branch",
              render: (row: AttendanceReport["data"][number]) =>
                row.branch_name ?? `#${row.branch_id}`,
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
      {
        key: "check_in",
        header: "Check-in",
        render: (row) => formatTime(row.check_in),
      },
      {
        key: "check_out",
        header: "Check-out",
        render: (row) => formatTime(row.check_out),
      },
    ];
    return (
      <>
        <div className="mb-3">
          <BranchHeader branch={report.summary.branch} />
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

  const renderMonthlySheet = (report: MonthlySheetReport | undefined) => {
    if (scopeBranchId === null) {
      return (
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <EmptyState
            icon={<IconInbox className="h-6 w-6" />}
            title="Select a branch"
            description="The monthly attendance sheet requires a single branch. Pick one in the header."
          />
        </div>
      );
    }
    if (!report) return null;
    return (
      <>
        <div className="mb-3">
          <BranchHeader
            branch={{ branch_name: report.summary.branch_name, branch_code: report.summary.branch_code }}
          />
          <KpiCard
            label={`Records · ${report.summary.month}/${report.summary.year}`}
            value={report.summary.total}
          />
        </div>
        <DataTable
          columns={[
            {
              key: "attendance_date",
              header: "Date",
              render: (row: MonthlySheetReport["data"][number]) => formatDate(row.attendance_date),
            },
            { key: "staff_id", header: "Staff ID" },
            {
              key: "status",
              header: "Status",
              render: (row: MonthlySheetReport["data"][number]) => <StatusBadge value={row.status} />,
            },
          ]}
          rows={report.data}
          rowKey={(row) => row.id}
          loading={monthlySheetQuery.isFetching && !report}
          emptyTitle="No records for this month"
        />
        <Pagination
          meta={report.summary.pagination}
          onPageChange={setPage}
          onPageSizeChange={(size) => setPageSize(size)}
        />
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
        <BranchHeader branch={data.branch} />
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
            <Select
              label="Sort by"
              value={sort}
              onChange={(event) => setSort(event.target.value as AttendanceSort)}
              className="w-44"
            >
              <option value="attendance_date">Date</option>
              <option value="id">ID</option>
              <option value="branch_id">Branch</option>
              <option value="staff_id">Staff</option>
            </Select>
            {(fromDate || toDate) && (
              <Button variant="ghost" onClick={() => { setFromDate(""); setToDate(""); }}>
                Clear dates
              </Button>
            )}
          </>
        )}

        {isMonthlySheet && (
          <>
            <Input
              label="Year"
              type="number"
              min={2000}
              max={2100}
              value={sheetYear}
              onChange={(event) => setSheetYear(event.target.value)}
              className="w-28"
            />
            <Select
              label="Month"
              value={sheetMonth}
              onChange={(event) => setSheetMonth(event.target.value)}
              className="w-36"
            >
              {Array.from({ length: 12 }).map((_, index) => (
                <option key={index + 1} value={String(index + 1)}>
                  {index + 1}
                </option>
              ))}
            </Select>
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
        attendanceQuery.isError ? (
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <ErrorState message={(attendanceQuery.error as Error)?.message} onRetry={() => attendanceQuery.refetch()} />
          </div>
        ) : (
          renderAttendance(attendanceQuery.data)
        )
      ) : isMonthlySheet ? (
        monthlySheetQuery.isError ? (
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <ErrorState message={(monthlySheetQuery.error as Error)?.message} onRetry={() => monthlySheetQuery.refetch()} />
          </div>
        ) : (
          renderMonthlySheet(monthlySheetQuery.data)
        )
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
      ) : reportType === "audit" ? (
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
