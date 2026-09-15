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
  AttendanceTableRow,
} from "@/types/attendance";
import { ATTENDANCE_STATUSES } from "@/types/attendance";
import { FilterBar, PageHeader } from "@/components/FilterBar";
import { DataTable, type Column } from "@/components/DataTable";
import { Pagination } from "@/components/Pagination";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/Form";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { IconCheck, IconPencil, IconPlus, IconTrash, IconX } from "@/components/icons";
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
  attendance_date: string;
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

/** Shared client-side rules mirroring the backend validators. */
function validateTimes(
  status: AttendanceStatus,
  checkIn: string,
  checkOut: string,
): string | null {
  if ((status === "ABSENT" || status === "LEAVE") && (checkIn || checkOut)) {
    return "Check-in/out must be empty for Absent or Leave";
  }
  if (checkIn && checkOut && checkOut <= checkIn) {
    return "Check-out must be after check-in";
  }
  return null;
}

export function AttendancePage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { scopeBranchId, scopeBranchName } = useBranches();
  const role = user!.role;
  const markAllowed = can(role, "attendance.mark");
  const editAllowed = can(role, "attendance.edit");
  const deleteAllowed = can(role, "attendance.delete");

  const [view, setView] = useState<"records" | "mark-day">("records");

  // ---------- Records view filters ----------
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
    enabled: view === "records",
  });

  const staffParams = useMemo(
    () => ({ branch_id: scopeBranchId ?? undefined, page: 1, page_size: 100 }),
    [scopeBranchId],
  );
  const staffQuery = useQuery({
    queryKey: [ROOT_KEYS.staff, staffParams],
    queryFn: () => staffApi.list(staffParams),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [ROOT_KEYS.attendance] });
    queryClient.invalidateQueries({ queryKey: [ROOT_KEYS.adminDashboard] });
    queryClient.invalidateQueries({ queryKey: [ROOT_KEYS.managerDashboard] });
  };

  // ---------- Mark single ----------
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
    if (markForm.attendance_date > todayISO()) nextErrors.attendance_date = "Date cannot be in the future";
    const timeError = validateTimes(markForm.status, markForm.check_in, markForm.check_out);
    if (timeError) nextErrors.check_out = timeError;
    setMarkErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    const noTimes = markForm.status === "ABSENT" || markForm.status === "LEAVE";
    markMutation.mutate({
      staff_id: Number(markForm.staff_id),
      attendance_date: markForm.attendance_date,
      status: markForm.status,
      check_in: !noTimes && markForm.check_in ? markForm.check_in : undefined,
      check_out: !noTimes && markForm.check_out ? markForm.check_out : undefined,
      ...Object.fromEntries(
        UNIFORM_FIELDS.map((field) => [field.key, markForm[field.key]]),
      ) as Pick<CreateFormState, "t_shirt_checked" | "jeans_checked" | "shoes_checked" | "bath_checked" | "cleanliness_checked">,
      remarks: markForm.remarks.trim() || undefined,
    });
  };

  // ---------- Edit ----------
  const [editing, setEditing] = useState<AttendanceRecord | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({
    attendance_date: todayISO(),
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

  const openEdit = (record: AttendanceRecord) => {
    setEditing(record);
    setEditForm({
      attendance_date: record.attendance_date.slice(0, 10),
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
    if (editForm.attendance_date > todayISO()) {
      setEditErrors({ attendance_date: "Date cannot be in the future" });
      return;
    }
    const timeError = validateTimes(editForm.status, editForm.check_in, editForm.check_out);
    if (timeError) {
      setEditErrors({ check_out: timeError });
      return;
    }
    setEditErrors({});
    const noTimes = editForm.status === "ABSENT" || editForm.status === "LEAVE";
    updateMutation.mutate({
      id: editing.id,
      payload: {
        attendance_date: editForm.attendance_date,
        status: editForm.status,
        ...(noTimes ? {} : editForm.check_in ? { check_in: editForm.check_in } : {}),
        ...(noTimes ? {} : editForm.check_out ? { check_out: editForm.check_out } : {}),
        personal_hygiene_checked: editForm.personal_hygiene_checked,
        uniform_checked: editForm.uniform_checked,
        ...(editForm.remarks.trim() ? { remarks: editForm.remarks.trim() } : {}),
      },
    });
  };

  // ---------- Delete ----------
  const [deleting, setDeleting] = useState<AttendanceRecord | null>(null);
  const deleteMutation = useMutation({
    mutationFn: (id: number) => attendanceApi.remove(id),
    onSuccess: () => {
      invalidate();
      toast.success("Attendance deleted");
      setDeleting(null);
    },
    onError: (error) => toast.error("Could not delete", getApiErrorMessage(error)),
  });

  const columns: Column<AttendanceRecord>[] = [
    {
      key: "attendance_date",
      header: "Date",
      render: (row) => formatDate(row.attendance_date),
    },
    {
      key: "staff",
      header: "Staff",
      render: (row) => (
        <span className="font-medium text-slate-800">
          {row.staff_name ?? `Staff #${row.staff_id}`}
        </span>
      ),
    },
    ...(scopeBranchId === null
      ? [
          {
            key: "branch" as const,
            header: "Branch",
            render: (row: AttendanceRecord) => row.branch_name ?? `#${row.branch_id}`,
          },
        ]
      : []),
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
    ...(editAllowed || deleteAllowed
      ? [
          {
            key: "actions" as const,
            header: "",
            className: "w-20 text-right",
            render: (row: AttendanceRecord) => (
              <div className="flex items-center justify-end gap-1">
                {editAllowed && (
                  <button
                    onClick={() => openEdit(row)}
                    className="rounded p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-brand-600"
                    aria-label="Edit attendance"
                  >
                    <IconPencil className="h-4 w-4" />
                  </button>
                )}
                {deleteAllowed && (
                  <button
                    onClick={() => setDeleting(row)}
                    className="rounded p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                    aria-label="Delete attendance"
                  >
                    <IconTrash className="h-4 w-4" />
                  </button>
                )}
              </div>
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
          scopeBranchName
            ? `Daily attendance — ${scopeBranchName}.`
            : "Daily attendance across branches."
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

      <div className="mb-4 flex gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
        {(["records", "mark-day"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setView(tab)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              view === tab ? "bg-brand-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {tab === "records" ? "Records" : "Mark day"}
          </button>
        ))}
      </div>

      {view === "records" ? (
        <>
          <FilterBar className="mb-4">
            <Input
              label="Day"
              type="date"
              max={todayISO()}
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
                ? "Mark the first attendance record for this date range, or use Mark day."
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
        </>
      ) : (
        <MarkDayView onDone={invalidate} />
      )}

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
                disabled={markForm.status === "ABSENT" || markForm.status === "LEAVE"}
                onChange={(event) => setMarkForm({ ...markForm, check_in: event.target.value })}
              />
              <Input
                label="Check-out"
                type="time"
                value={markForm.check_out}
                disabled={markForm.status === "ABSENT" || markForm.status === "LEAVE"}
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
        subtitle={editing?.staff_name ?? (editing ? `Staff #${editing.staff_id}` : undefined)}
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
            <Input
              label="Date"
              type="date"
              max={todayISO()}
              value={editForm.attendance_date}
              onChange={(event) => setEditForm({ ...editForm, attendance_date: event.target.value })}
              error={editErrors.attendance_date}
              required
            />
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
            <div className="grid grid-cols-2 gap-3 sm:col-span-2">
              <Input
                label="Check-in"
                type="time"
                value={editForm.check_in}
                disabled={editForm.status === "ABSENT" || editForm.status === "LEAVE"}
                onChange={(event) => setEditForm({ ...editForm, check_in: event.target.value })}
              />
              <Input
                label="Check-out"
                type="time"
                value={editForm.check_out}
                disabled={editForm.status === "ABSENT" || editForm.status === "LEAVE"}
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

      <ConfirmDialog
        open={deleting !== null}
        title="Delete attendance"
        message={
          <>
            Delete the attendance record for{" "}
            <strong>
              {deleting?.staff_name ?? `staff #${deleting?.staff_id}`}
            </strong>{" "}
            on <strong>{deleting ? formatDate(deleting.attendance_date) : ""}</strong>? This
            cannot be undone.
          </>
        }
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

interface DayDraft {
  status: AttendanceStatus;
  check_in: string;
  check_out: string;
}

function MarkDayView({ onDone }: { onDone: () => void }) {
  const toast = useToast();
  const { scopeBranchId } = useBranches();
  const [day, setDay] = useState(todayISO());
  const [drafts, setDrafts] = useState<Record<number, DayDraft>>({});

  const tableQuery = useQuery({
    queryKey: [ROOT_KEYS.attendance, "table", scopeBranchId, day],
    queryFn: () => attendanceApi.table({ attendance_date: day, branch_id: scopeBranchId ?? undefined }),
    enabled: day !== "",
  });

  // Reset per-row drafts whenever a new table loads.
  const rows: AttendanceTableRow[] = tableQuery.data?.records ?? [];
  const unmarked = rows.filter((row) => row.status === null);

  const setDraft = (staffId: number, patch: Partial<DayDraft>) => {
    setDrafts((current) => {
      const prev: DayDraft = current[staffId] ?? {
        status: "PRESENT",
        check_in: "",
        check_out: "",
      };
      return { ...current, [staffId]: { ...prev, ...patch } };
    });
  };

  const bulkMutation = useMutation({
    mutationFn: attendanceApi.bulk,
    onSuccess: (created) => {
      onDone();
      toast.success(`${created.length} attendance records created`);
      setDrafts({});
      tableQuery.refetch();
    },
    onError: (error) => toast.error("Bulk marking failed", getApiErrorMessage(error)),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const records: {
      staff_id: number;
      attendance_date: string;
      status: AttendanceStatus;
      check_in?: string;
      check_out?: string;
    }[] = [];
    for (const row of unmarked) {
      const draft = drafts[row.staff_id] ?? { status: "PRESENT" as AttendanceStatus, check_in: "", check_out: "" };
      const noTimes = draft.status === "ABSENT" || draft.status === "LEAVE";
      const problem = validateTimes(draft.status, draft.check_in, draft.check_out);
      if (problem) {
        toast.error(`Row ${row.staff_name}: ${problem}`);
        return;
      }
      records.push({
        staff_id: row.staff_id,
        attendance_date: day,
        status: draft.status,
        check_in: !noTimes && draft.check_in ? draft.check_in : undefined,
        check_out: !noTimes && draft.check_out ? draft.check_out : undefined,
      });
    }
    if (records.length === 0) {
      toast.info("Nothing to submit", "All staff are already marked for this date.");
      return;
    }
    bulkMutation.mutate({ attendance_date: day, records });
  };

  return (
    <form onSubmit={submit}>
      <FilterBar className="mb-4">
        <Input
          label="Date"
          type="date"
          max={todayISO()}
          value={day}
          onChange={(event) => setDay(event.target.value)}
          required
          className="w-44"
        />
        {tableQuery.data && (
          <span className="self-center pb-1.5 text-xs text-slate-500">
            {tableQuery.data.branch_name} · {unmarked.length} of {rows.length} unmarked
          </span>
        )}
        <Button
          type="submit"
          size="sm"
          loading={bulkMutation.isPending}
          disabled={tableQuery.isLoading || unmarked.length === 0}
          className="ml-auto self-center"
        >
          <IconCheck className="h-4 w-4" />
          Submit day
        </Button>
      </FilterBar>

      <DataTable
        columns={[
          {
            key: "staff_name",
            header: "Staff",
            render: (row: AttendanceTableRow) => (
              <span className="font-medium text-slate-800">{row.staff_name}</span>
            ),
          },
          {
            key: "status",
            header: "Current",
            render: (row: AttendanceTableRow) =>
              row.status ? <StatusBadge value={row.status} /> : <span className="text-slate-300">Not marked</span>,
          },
          {
            key: "mark",
            header: "Mark as",
            render: (row: AttendanceTableRow) =>
              row.status ? (
                <span className="text-xs text-slate-400">—</span>
              ) : (
                <select
                  value={drafts[row.staff_id]?.status ?? "PRESENT"}
                  onChange={(event) => setDraft(row.staff_id, { status: event.target.value as AttendanceStatus })}
                  className="rounded border border-slate-300 px-1.5 py-1 text-xs outline-none focus:border-brand-500"
                >
                  {ATTENDANCE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {enumLabel(status)}
                    </option>
                  ))}
                </select>
              ),
          },
          {
            key: "check_in",
            header: "Check-in",
            render: (row: AttendanceTableRow) =>
              row.status ? (
                formatTime(row.check_in)
              ) : (
                <input
                  type="time"
                  value={drafts[row.staff_id]?.check_in ?? ""}
                  disabled={(drafts[row.staff_id]?.status ?? "PRESENT") === "ABSENT" || (drafts[row.staff_id]?.status ?? "PRESENT") === "LEAVE"}
                  onChange={(event) => setDraft(row.staff_id, { check_in: event.target.value })}
                  className="rounded border border-slate-300 px-1.5 py-1 text-xs outline-none focus:border-brand-500 disabled:bg-slate-50"
                />
              ),
          },
          {
            key: "check_out",
            header: "Check-out",
            render: (row: AttendanceTableRow) =>
              row.status ? (
                formatTime(row.check_out)
              ) : (
                <input
                  type="time"
                  value={drafts[row.staff_id]?.check_out ?? ""}
                  disabled={(drafts[row.staff_id]?.status ?? "PRESENT") === "ABSENT" || (drafts[row.staff_id]?.status ?? "PRESENT") === "LEAVE"}
                  onChange={(event) => setDraft(row.staff_id, { check_out: event.target.value })}
                  className="rounded border border-slate-300 px-1.5 py-1 text-xs outline-none focus:border-brand-500 disabled:bg-slate-50"
                />
              ),
          },
        ]}
        rows={rows}
        rowKey={(row) => row.staff_id}
        loading={tableQuery.isLoading}
        error={tableQuery.error}
        onRetry={() => tableQuery.refetch()}
        emptyTitle="No active staff"
        emptyDescription="There are no active staff at this branch to mark."
      />
    </form>
  );
}
