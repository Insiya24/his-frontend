import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { auditApi } from "@/api/audit";
import { ROOT_KEYS } from "@/api/queryKeys";
import type { AuditLogEntry } from "@/types/reports";
import { PageHeader } from "@/components/FilterBar";
import { DataTable, type Column } from "@/components/DataTable";
import { Pagination } from "@/components/Pagination";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDateTime, enumLabel } from "@/utils/format";

const MODULE_BADGE: Record<string, string> = {
  AUTH: "AUTH",
  BRANCH: "ACTIVE",
  STAFF: "ACTIVE",
  ATTENDANCE: "PRESENT",
  CLEANING: "COMPLETED",
  INVENTORY: "APPROVED",
  PRODUCT_REQUEST: "PENDING",
  CUSTOMER: "LEAVE",
  REVIEW: "MEDIUM",
  COMPLAINT: "OPEN",
  INSPECTION: "IN_REVIEW",
  SPECIAL_REMARK: "NOT_APPLICABLE",
  REPORT: "RESOLVED",
  SYSTEM: "CLOSED",
};

export function AuditPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const query = useQuery({
    queryKey: [ROOT_KEYS.audit, page, pageSize],
    queryFn: () => auditApi.list(page, pageSize),
    placeholderData: (previous) => previous,
  });

  const columns: Column<AuditLogEntry>[] = [
    {
      key: "id",
      header: "ID",
      render: (row) => <span className="text-slate-400">#{row.id}</span>,
    },
    {
      key: "created_at",
      header: "When",
      render: (row) => (
        <span className="text-xs text-slate-500">{formatDateTime(row.created_at)}</span>
      ),
    },
    {
      key: "module",
      header: "Module",
      render: (row) => <StatusBadge value={MODULE_BADGE[row.module] ?? "ACTIVE"} label={enumLabel(row.module)} />,
    },
    {
      key: "action",
      header: "Action",
      render: (row) => <span className="font-mono text-xs font-medium text-slate-700">{row.action}</span>,
    },
    {
      key: "entity_type",
      header: "Entity",
      render: (row) =>
        row.entity_type ? (
          <span className="text-xs">
            {enumLabel(row.entity_type)}
            {row.entity_id !== null && (
              <span className="ml-1 text-slate-400">#{row.entity_id}</span>
            )}
          </span>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Audit logs"
        subtitle="Chronological trail of every recorded action in the system."
      />

      <DataTable
        columns={columns}
        rows={query.data?.records ?? []}
        rowKey={(row) => row.id}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => query.refetch()}
        emptyTitle="No audit entries"
        emptyDescription="Actions performed across the system will be logged here."
      />

      <Pagination
        meta={query.data?.pagination}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
    </div>
  );
}
