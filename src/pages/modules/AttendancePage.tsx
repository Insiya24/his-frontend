import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { attendanceApi } from "@/api/attendance";
import { staffApi } from "@/api/staff";
import { ROOT_KEYS } from "@/api/queryKeys";
import { useAuth } from "@/hooks/useAuth";
import { useBranches } from "@/hooks/useBranches";
import { can } from "@/utils/permissions";
import type {
  AttendanceRecord,
  AttendanceStatus,
} from "@/types/attendance";
import { ATTENDANCE_STATUSES } from "@/types/attendance";
import { FilterBar, PageHeader } from "@/components/FilterBar";
import { DataTable, type Column } from "@/components/DataTable";
import { Pagination } from "@/components/Pagination";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/Form";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { IconCheck, IconPencil, IconPlus, IconX } from "@/components/icons";
import { getApiErrorMessage, getFieldErrors } from "@/utils/errors";
import { enumLabel, formatDate, formatTime, todayISO } from "@/utils/format";

interface CreateFormState {
  staff_id: string;
  attendance_date: string;
  status: AttendanceStatus;
  check_in: string;
  check_out: string;
  t_shirt_checked: boolean;
  jeans_checked: boolean;
  shoes_checked: boolean;
  bath_checked: boolean;
  cleanliness_checked: boolean;
  remarks: string;
}

interface EditFormState {
  status: AttendanceStatus;
  check_in: string;
  check_out: string;
  personal_hygiene_checked: boolean;
  uniform_checked: boolean;
  remarks: string;
}

const UNIFORM_FIELDS = [
  { key: "t_shirt_checked" as const, label: "T-shirt" },
  { key: "jeans_checked" as const, label: "Jeans" },
  { key: "shoes_checked" as const, label: "Shoes" },
  { key: "bath_checked" as const, label: "Bath" },
  { key: "cleanliness_checked" as const, label: "Cleanliness" },
];

function CheckCross({ value }: { value: boolean }) {
  return value ? (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
      <IconCheck className="h-3 w-3" />
    </span>
  ) : (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-400">
      <IconX className="h-3 w-3" />
    </span>
  );
}

export function AttendancePage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { scopeBranchId } = useBranches();
  const role = user!.role;
  const markAllowed = can(role, "attendance.mark");
  const editAllowed = can(role, "attendance.edit");

  // Filters
  const [filterDate, setFilterDate] = useState(todayISO());
  const [filterMonth, setFilterMonth] = useState("");
  const [filterStaffId, setFilterStaffId] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const params = useMemo(
    () => ({
      branch_id: scopeBranchId ?? undefined,
      attendance_date: filterDate || undefined,
      month: filterMonth || undefined,
      staff_id: filterStaffId ? Number(filterStaffId) : undefined,
      page,
      page_size: pageSize,
    }),
    [scopeBranchId, filterDate, filterMonth, filterStaffId, page, pageSize],
  );

  const query = useQuery({
    queryKey: [ROOT_KEYS.attendance, params],
    queryFn: () => attendanceApi.list(params),
    placeholderData: (previous) => previous,
  });

  const staffParams = useMemo(
    () => ({ branch_id: scopeBranchId ?? undefined, page: 1, page_size: 100 }),
    [scopeBranchId],
  );
  const staffQuery = useQuery({
    queryKey: [ROOT_KEYS.staff, staffParams],
    queryFn: () => staffApi.list(staffParams),
  });

  const staffNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const row of staffQuery.data?.records ?? []) map.set(row.id, row.full_name);
    return map;
  }, [staffQuery.data]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [ROOT_KEYS.attendance] });
    queryClient.invalidateQueries({ queryKey: [ROOT_KEYS.adminDashboard] });
    queryClient.invalidateQueries({ queryKey: [ROOT_KEYS.managerDashboard] });
  };

  // Mark form
  const [markOpen, setMarkOpen] = useState(false);
  const [markForm, setMarkForm] = useState<CreateFormState>({
    staff_id: "",
    attendance_date: todayISO(),
    status: "PRESENT",
    check_in: "",
    check_out: "",
    t_shirt_checked: false,
    jeans_checked: false,
    shoes_checked: false,
    bath_checked: false,
    cleanliness_checked: false,
    remarks: "",
  });
  const [markErrors, setMarkErrors] = useState<Record<string, string>>({});
  const [markFormError, setMarkFormError] = useState<string | null>(null);

  const markMutation = useMutation({
    mutationFn: attendanceApi.mark,
    onSuccess: () => {
      invalidate();
      toast.success("Attendance marked");
      setMarkOpen(false);
    },
    onError: (error) => {
      setMarkErrors(getFieldErrors(error));
      setMarkFormError(getApiErrorMessage(error));
    },
  });

  // Edit form
  const [editing, setEditing] = useState<AttendanceRecord | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({
    status: "PRESENT",
    check_in: "",
    check_out: "",
    personal_hygiene_checked: false,
    uniform_checked: false,
    remarks: "",
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editFormError, setEditFormError] = useState<string | null>(null);

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      attendanceApi.update(id, payload),
    onSuccess: () => {
      invalidate();
      toast.success("Attendance updated");
      setEditing(null);
    },
    onError: (error) => {
      setEditErrors(getFieldErrors(error));
      setEditFormError(getApiErrorMessage(error));
    },
  });

  const activeStaff = (staffQuery.data?.records ?? []).filter((row) => row.is_active);

  const openMark = () => {
    setMarkForm({
      staff_id: "",
      attendance_date: todayISO(),
      status: "PRESENT",
      check_in: "",
      check_out: "",
      t_shirt_checked: false,
      jeans_checked: false,
      shoes_checked: false,
      bath_checked: false,
      cleanliness_checked: false,
      remarks: "",
    });
    setMarkErrors({});
    setMarkFormError(null);
    setMarkOpen(true);
  };

  const submitMark = (event: FormEvent) => {
    event.preventDefault();
    setMarkFormError(null);
    const nextErrors: Record<string, string> = {};
    if (!markForm.staff_id) nextErrors.staff_id = "Select a staff member";
    if (!markForm.attendance_date) nextErrors.attendance_date = "Date is required";
    if (
      markForm.check_in &&
      markForm.check_out &&
      markForm.check_out < markForm.check_in
    ) {
      nextErrors.check_out = "Cannot be earlier than check-in";
    }
    setMarkErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    markMutation.mutate({
      staff_id: Number(markForm.staff_id),
      attendance_date: markForm.attendance_date,
      status: markForm.status,
      check_in: markForm.check_in || undefined,
      check_out: markForm.check_out || undefined,
      ...Object.fromEntries(
        UNIFORM_FIELDS.map((field) => [field.key, markForm[field.key]]),
      ) as Pick<CreateFormState, "t_shirt_checked" | "jeans_checked" | "shoes_checked" | "bath_checked" | "cleanliness_checked">,
      remarks: markForm.remarks.trim() || undefined,
    });
  };

  const openEdit = (record: AttendanceRecord) => {
    setEditing(record);
    setEditForm({
      status: record.status,
      check_in: record.check_in ? record.check_in.slice(0, 5) : "",
      check_out: record.check_out ? record.check_out.slice(0, 5) : "",
      personal_hygiene_checked: record.personal_hygiene_checked,
      uniform_checked: record.uniform_checked,
      remarks: record.remarks ?? "",
    });
    setEditErrors({});
    setEditFormError(null);
  };

  const submitEdit = (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setEditFormError(null);
    if (editForm.check_in && editForm.check_out && editForm.check_out < editForm.check_in) {
      setEditErrors({ check_out: "Cannot be earlier than check-in" });
      return;
    }
    setEditErrors({});
    updateMutation.mutate({
      id: editing.id,
      payload: {
        status: editForm.status,
        ...(editForm.check_in ? { check_in: editForm.check_in } : {}),
        ...(editForm.check_out ? { check_out: editForm.check_out } : {}),
        personal_hygiene_checked: editForm.personal_hygiene_checked,
        uniform_checked: editForm.uniform_checked,
        ...(editForm.remarks.trim() ? { remarks: editForm.remarks.trim() } : {}),
      },
    });
  };

  const columns: Column<AttendanceRecord>[] = [
    {
      key: "attendance_date",
      header: "Date",
      render: (row) => formatDate(row.attendance_date),
    },
    {
      key: "staff_id",
      header: "Staff",
      render: (row) =>
        staffNameById.get(row.staff_id) ?? (
          <span className="text-slate-400">
            Staff #{row.staff_id}
          </span>
        ),
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
    {
      key: "uniform_checked",
      header: "Uniform",
      render: (row) => <CheckCross value={row.uniform_checked} />,
    },
    {
      key: "personal_hygiene_checked",
      header: "Hygiene",
      render: (row) => <CheckCross value={row.personal_hygiene_checked} />,
    },
    {
      key: "management_name",
      header: "Recorded by",
      render: (row) => row.management_name ?? <span className="text-slate-300">—</span>,
    },
    {
      key: "remarks",
      header: "Remarks",
      render: (row) => (
        <span className="block max-w-40 truncate text-slate-500" title={row.remarks ?? ""}>
          {row.remarks || <span className="text-slate-300">—</span>}
        </span>
      ),
    },
    ...(editAllowed
      ? [
          {
            key: "actions" as const,
            header: "",
            className: "w-16 text-right",
            render: (row: AttendanceRecord) => (
              <button
                onClick={() => openEdit(row)}
                className="rounded p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-brand-600"
                aria-label="Edit attendance"
              >
                <IconPencil className="h-4 w-4" />
              </button>
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      <PageHeader
        title="Attendance"
        subtitle={
          scopeBranchId === null
            ? "Daily attendance across branches."
            : "Daily attendance for your branch."
        }
        actions={
          markAllowed && (
            <Button onClick={openMark}>
              <IconPlus className="h-4 w-4" />
              Mark attendance
            </Button>
          )
        }
      />

      <FilterBar className="mb-4">
        <Input
          label="Day"
          type="date"
          value={filterDate}
          onChange={(event) => {
            setFilterDate(event.target.value);
            setPage(1);
          }}
          className="w-40"
        />
        <Input
          label="…or month"
          type="month"
          value={filterMonth}
          onChange={(event) => {
            setFilterMonth(event.target.value);
            setPage(1);
          }}
          hint="Overrides the day filter"
          className="w-40"
        />
        <Select
          label="Staff"
          value={filterStaffId}
          onChange={(event) => {
            setFilterStaffId(event.target.value);
            setPage(1);
          }}
          className="w-52"
        >
          <option value="">All staff</option>
          {(staffQuery.data?.records ?? []).map((row) => (
            <option key={row.id} value={row.id}>
              {row.full_name} ({row.employee_code})
            </option>
          ))}
        </Select>
        {(filterDate || filterMonth || filterStaffId) && (
          <Button
            variant="ghost"
            onClick={() => {
              setFilterMonth("");
              setFilterStaffId("");
              setFilterDate(todayISO());
              setPage(1);
            }}
          >
            Reset filters
          </Button>
        )}
      </FilterBar>

      <DataTable
        columns={columns}
        rows={query.data?.records ?? []}
        rowKey={(row) => row.id}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => query.refetch()}
        emptyTitle="No attendance records"
        emptyDescription={
          markAllowed
            ? "Mark the first attendance record for this date range."
            : "No attendance has been recorded for this date range yet."
        }
        emptyAction={
          markAllowed && (
            <Button onClick={openMark}>
              <IconPlus className="h-4 w-4" />
              Mark attendance
            </Button>
          )
        }
      />

      <Pagination
        meta={query.data?.pagination}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />

      {/* Mark modal */}
      <Modal
        open={markOpen}
        onClose={() => setMarkOpen(false)}
        title="Mark attendance"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setMarkOpen(false)} disabled={markMutation.isPending}>
              Cancel
            </Button>
            <Button loading={markMutation.isPending} type="submit" form="mark-attendance-form">
              Save attendance
            </Button>
          </>
        }
      >
        <form id="mark-attendance-form" onSubmit={submitMark} className="space-y-4" noValidate>
          {markFormError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {markFormError}
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Staff member"
              value={markForm.staff_id}
              onChange={(event) => setMarkForm({ ...markForm, staff_id: event.target.value })}
              error={markErrors.staff_id}
              required
            >
              <option value="">Select staff…</option>
              {activeStaff.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.full_name} ({row.employee_code})
                </option>
              ))}
            </Select>
            <Input
              label="Date"
              type="date"
              max={todayISO()}
              value={markForm.attendance_date}
              onChange={(event) => setMarkForm({ ...markForm, attendance_date: event.target.value })}
              error={markErrors.attendance_date}
              required
            />
            <Select
              label="Status"
              value={markForm.status}
              onChange={(event) =>
                setMarkForm({ ...markForm, status: event.target.value as AttendanceStatus })
              }
              required
            >
              {ATTENDANCE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {enumLabel(status)}
                </option>
              ))}
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Check-in"
                type="time"
                value={markForm.check_in}
                onChange={(event) => setMarkForm({ ...markForm, check_in: event.target.value })}
              />
              <Input
                label="Check-out"
                type="time"
                value={markForm.check_out}
                onChange={(event) => setMarkForm({ ...markForm, check_out: event.target.value })}
                error={markErrors.check_out}
              />
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-slate-600">
              Grooming &amp; uniform checks
            </p>
            <div className="flex flex-wrap gap-x-5 gap-y-2 rounded-md border border-slate-200 px-3 py-2.5">
              {UNIFORM_FIELDS.map((field) => (
                <Checkbox
                  key={field.key}
                  label={field.label}
                  checked={markForm[field.key]}
                  onChange={(event) =>
                    setMarkForm({ ...markForm, [field.key]: event.target.checked })
                  }
                />
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Personal hygiene and uniform flags are computed automatically from these checks.
            </p>
          </div>

          <Textarea
            label="Remarks"
            rows={2}
            value={markForm.remarks}
            onChange={(event) => setMarkForm({ ...markForm, remarks: event.target.value })}
            hint="Optional"
          />
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={`Edit attendance — ${editing ? formatDate(editing.attendance_date) : ""}`}
        subtitle={editing ? staffNameById.get(editing.staff_id) ?? `Staff #${editing.staff_id}` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)} disabled={updateMutation.isPending}>
              Cancel
            </Button>
            <Button loading={updateMutation.isPending} type="submit" form="edit-attendance-form">
              Save changes
            </Button>
          </>
        }
      >
        <form id="edit-attendance-form" onSubmit={submitEdit} className="space-y-4" noValidate>
          {editFormError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {editFormError}
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Status"
              value={editForm.status}
              onChange={(event) =>
                setEditForm({ ...editForm, status: event.target.value as AttendanceStatus })
              }
              required
            >
              {ATTENDANCE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {enumLabel(status)}
                </option>
              ))}
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Check-in"
                type="time"
                value={editForm.check_in}
                onChange={(event) => setEditForm({ ...editForm, check_in: event.target.value })}
              />
              <Input
                label="Check-out"
                type="time"
                value={editForm.check_out}
                onChange={(event) => setEditForm({ ...editForm, check_out: event.target.value })}
                error={editErrors.check_out}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 rounded-md border border-slate-200 px-3 py-2.5">
            <Checkbox
              label="Personal hygiene checked"
              checked={editForm.personal_hygiene_checked}
              onChange={(event) =>
                setEditForm({ ...editForm, personal_hygiene_checked: event.target.checked })
              }
            />
            <Checkbox
              label="Uniform checked"
              checked={editForm.uniform_checked}
              onChange={(event) =>
                setEditForm({ ...editForm, uniform_checked: event.target.checked })
              }
            />
          </div>
          <Textarea
            label="Remarks"
            rows={2}
            value={editForm.remarks}
            onChange={(event) => setEditForm({ ...editForm, remarks: event.target.value })}
          />
        </form>
      </Modal>
    </div>
  );
}
