import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { complaintsApi } from "@/api/complaints";
import { staffApi } from "@/api/staff";
import { ROOT_KEYS } from "@/api/queryKeys";
import { useAuth } from "@/hooks/useAuth";
import { useBranches } from "@/hooks/useBranches";
import { can } from "@/utils/permissions";
import type { ComplaintRecord, ComplaintStatus } from "@/types/complaint";
import { COMPLAINT_STATUSES } from "@/types/complaint";
import { FilterBar, PageHeader } from "@/components/FilterBar";
import { DataTable, type Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Form";
import { Modal } from "@/components/ui/Modal";
import { Drawer } from "@/components/ui/Drawer";
import { useToast } from "@/components/ui/Toast";
import { IconEye, IconPencil, IconPlus } from "@/components/icons";
import { getApiErrorMessage, getFieldErrors } from "@/utils/errors";
import { enumLabel, formatDate, todayISO } from "@/utils/format";

export function ComplaintsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { scopeBranchId } = useBranches();
  const role = user!.role;
  const createAllowed = can(role, "complaints.create");
  const updateAllowed = can(role, "complaints.update");

  const [statusFilter, setStatusFilter] = useState("");

  const query = useQuery({
    queryKey: [ROOT_KEYS.complaints, scopeBranchId],
    queryFn: () => complaintsApi.list(scopeBranchId ?? undefined),
  });

  const staffParams = useMemo(
    () => ({ branch_id: scopeBranchId ?? undefined, page: 1, page_size: 100 }),
    [scopeBranchId],
  );
  const staffQuery = useQuery({
    queryKey: [ROOT_KEYS.staff, staffParams],
    queryFn: () => staffApi.list(staffParams),
    enabled: createAllowed || updateAllowed,
  });
  const activeStaff = useMemo(
    () => (staffQuery.data?.records ?? []).filter((row) => row.is_active),
    [staffQuery.data],
  );
  const staffNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const row of staffQuery.data?.records ?? []) map.set(row.id, row.full_name);
    return map;
  }, [staffQuery.data]);

  const filtered = useMemo(() => {
    const rows = query.data ?? [];
    if (!statusFilter) return rows;
    return rows.filter((row) => row.status === statusFilter);
  }, [query.data, statusFilter]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [ROOT_KEYS.complaints] });
    queryClient.invalidateQueries({ queryKey: [ROOT_KEYS.adminDashboard] });
    queryClient.invalidateQueries({ queryKey: [ROOT_KEYS.managerDashboard] });
  };

  // Create
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    staff_id: "",
    regarding: "",
    customer_details: "",
    complaint: "",
    complaint_date: todayISO(),
    manager_remarks: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: complaintsApi.create,
    onSuccess: () => {
      invalidate();
      toast.success("Complaint recorded");
      setCreateOpen(false);
    },
    onError: (error) => {
      setErrors(getFieldErrors(error));
      setFormError(getApiErrorMessage(error));
    },
  });

  const openCreate = () => {
    setForm({
      staff_id: "",
      regarding: "",
      customer_details: "",
      complaint: "",
      complaint_date: todayISO(),
      manager_remarks: "",
    });
    setErrors({});
    setFormError(null);
    setCreateOpen(true);
  };

  const submitCreate = (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const nextErrors: Record<string, string> = {};
    if (form.regarding.trim().length < 2) nextErrors.regarding = "Minimum 2 characters";
    if (form.customer_details.trim().length < 2) nextErrors.customer_details = "Required";
    if (form.complaint.trim().length < 2) nextErrors.complaint = "Required";
    if (!form.complaint_date) nextErrors.complaint_date = "Date is required";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    createMutation.mutate({
      staff_id: form.staff_id ? Number(form.staff_id) : undefined,
      regarding: form.regarding.trim(),
      customer_details: form.customer_details.trim(),
      complaint: form.complaint.trim(),
      complaint_date: form.complaint_date,
      manager_remarks: form.manager_remarks.trim() || undefined,
    });
  };

  // Update
  const [editing, setEditing] = useState<ComplaintRecord | null>(null);
  const [editForm, setEditForm] = useState({
    status: "" as "" | ComplaintStatus,
    resolution: "",
    manager_remarks: "",
    admin_remarks: "",
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editFormError, setEditFormError] = useState<string | null>(null);

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      complaintsApi.update(id, payload),
    onSuccess: () => {
      invalidate();
      toast.success("Complaint updated");
      setEditing(null);
    },
    onError: (error) => {
      setEditErrors(getFieldErrors(error));
      setEditFormError(getApiErrorMessage(error));
    },
  });

  const openEdit = (record: ComplaintRecord) => {
    setEditing(record);
    setEditForm({
      status: record.status,
      resolution: record.resolution ?? "",
      manager_remarks: record.manager_remarks ?? "",
      admin_remarks: record.admin_remarks ?? "",
    });
    setEditErrors({});
    setEditFormError(null);
  };

  const submitEdit = (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setEditFormError(null);
    const nextErrors: Record<string, string> = {};
    const targetStatus = editForm.status || editing.status;
    if (
      (targetStatus === "RESOLVED" || targetStatus === "CLOSED") &&
      !editForm.resolution.trim() &&
      !editing.resolution
    ) {
      nextErrors.resolution = "A resolution is required before resolving or closing";
    }
    setEditErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    const payload: Record<string, unknown> = {
      resolution: editForm.resolution.trim() || undefined,
      manager_remarks: editForm.manager_remarks.trim() || undefined,
      ...(role === "ADMIN" && editForm.admin_remarks.trim()
        ? { admin_remarks: editForm.admin_remarks.trim() }
        : {}),
    };
    if (editForm.status && editForm.status !== editing.status) {
      payload.status = editForm.status;
    }
    updateMutation.mutate({ id: editing.id, payload });
  };

  // View drawer
  const [viewing, setViewing] = useState<ComplaintRecord | null>(null);

  const columns: Column<ComplaintRecord>[] = [
    {
      key: "complaint_date",
      header: "Date",
      render: (row) => formatDate(row.complaint_date),
    },
    {
      key: "regarding",
      header: "Regarding",
      render: (row) => <span className="font-medium text-slate-800">{row.regarding}</span>,
    },
    ...(role === "ADMIN"
      ? [
          {
            key: "branch_id" as const,
            header: "Branch",
            render: (row: ComplaintRecord) => `Branch #${row.branch_id}`,
          },
        ]
      : []),
    {
      key: "staff_id",
      header: "Staff involved",
      render: (row) =>
        row.staff_id ? staffNameById.get(row.staff_id) ?? `#${row.staff_id}` : <span className="text-slate-300">—</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge value={row.status} />,
    },
    {
      key: "resolution",
      header: "Resolution",
      render: (row) => (
        <span className="block max-w-40 truncate text-slate-600" title={row.resolution ?? ""}>
          {row.resolution || <span className="text-slate-300">—</span>}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-20 text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => setViewing(row)}
            className="rounded p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-brand-600"
            aria-label="View complaint"
          >
            <IconEye />
          </button>
          {updateAllowed && (
            <button
              onClick={() => openEdit(row)}
              className="rounded p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-brand-600"
              aria-label="Update complaint"
            >
              <IconPencil className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Complaints"
        subtitle={
          createAllowed
            ? "Log customer complaints against staff or services."
            : "Track complaint resolution across branches."
        }
        actions={
          createAllowed && (
            <Button onClick={openCreate} disabled={activeStaff.length === 0 && false}>
              <IconPlus className="h-4 w-4" />
              New complaint
            </Button>
          )
        }
      />

      <FilterBar className="mb-4">
        <Select
          label="Status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="w-48"
        >
          <option value="">All statuses</option>
          {COMPLAINT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {enumLabel(status)}
            </option>
          ))}
        </Select>
        <span className="ml-auto self-center pb-1.5 text-xs text-slate-500">
          {filtered.length} complaint{filtered.length === 1 ? "" : "s"}
        </span>
      </FilterBar>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(row) => row.id}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => query.refetch()}
        emptyTitle="No complaints"
        emptyDescription={
          createAllowed
            ? "Complaints you record will be tracked here until they are closed."
            : "Branch complaints will appear here."
        }
        emptyAction={
          createAllowed && (
            <Button onClick={openCreate}>
              <IconPlus className="h-4 w-4" />
              New complaint
            </Button>
          )
        }
      />

      {/* Create modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New complaint"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button loading={createMutation.isPending} type="submit" form="create-complaint-form">
              Save complaint
            </Button>
          </>
        }
      >
        <form id="create-complaint-form" onSubmit={submitCreate} className="space-y-4" noValidate>
          {formError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Staff involved"
              value={form.staff_id}
              onChange={(event) => setForm({ ...form, staff_id: event.target.value })}
              hint="Optional"
            >
              <option value="">None</option>
              {activeStaff.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.full_name} ({staff.employee_code})
                </option>
              ))}
            </Select>
            <Input
              label="Complaint date"
              type="date"
              max={todayISO()}
              value={form.complaint_date}
              onChange={(event) => setForm({ ...form, complaint_date: event.target.value })}
              error={errors.complaint_date}
              required
            />
            <Input
              label="Regarding"
              className="sm:col-span-2"
              placeholder="Short subject, e.g. Rude behaviour at billing desk"
              value={form.regarding}
              onChange={(event) => setForm({ ...form, regarding: event.target.value })}
              error={errors.regarding}
              required
            />
          </div>
          <Textarea
            label="Customer details"
            rows={2}
            placeholder="Who reported it and when"
            value={form.customer_details}
            onChange={(event) => setForm({ ...form, customer_details: event.target.value })}
            error={errors.customer_details}
            required
          />
          <Textarea
            label="Complaint"
            rows={3}
            value={form.complaint}
            onChange={(event) => setForm({ ...form, complaint: event.target.value })}
            error={errors.complaint}
            required
          />
          <Textarea
            label="Manager remarks"
            rows={2}
            value={form.manager_remarks}
            onChange={(event) => setForm({ ...form, manager_remarks: event.target.value })}
            hint="Optional"
          />
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={`Update complaint — ${editing ? editing.regarding : ""}`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)} disabled={updateMutation.isPending}>
              Cancel
            </Button>
            <Button loading={updateMutation.isPending} type="submit" form="edit-complaint-form">
              Save changes
            </Button>
          </>
        }
      >
        <form id="edit-complaint-form" onSubmit={submitEdit} className="space-y-4" noValidate>
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
                setEditForm({ ...editForm, status: event.target.value as ComplaintStatus })
              }
              hint={editing ? `Current: ${enumLabel(editing.status)}` : undefined}
            >
              <option value="">Keep current</option>
              {COMPLAINT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {enumLabel(status)}
                </option>
              ))}
            </Select>
          </div>
          <Textarea
            label="Resolution"
            rows={2}
            value={editForm.resolution}
            onChange={(event) => setEditForm({ ...editForm, resolution: event.target.value })}
            error={editErrors.resolution}
            hint="Required before a complaint can be resolved or closed."
          />
          <Textarea
            label="Manager remarks"
            rows={2}
            value={editForm.manager_remarks}
            onChange={(event) => setEditForm({ ...editForm, manager_remarks: event.target.value })}
          />
          {role === "ADMIN" && (
            <Textarea
              label="Admin remarks"
              rows={2}
              value={editForm.admin_remarks}
              onChange={(event) => setEditForm({ ...editForm, admin_remarks: event.target.value })}
              hint="Visible to admins only."
            />
          )}
        </form>
      </Modal>

      {/* View drawer */}
      <Drawer
        open={viewing !== null}
        onClose={() => setViewing(null)}
        title={viewing?.regarding ?? ""}
        subtitle={viewing ? formatDate(viewing.complaint_date) : undefined}
      >
        {viewing && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2">
              <StatusBadge value={viewing.status} />
              {viewing.staff_id && (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                  Staff: {staffNameById.get(viewing.staff_id) ?? `#${viewing.staff_id}`}
                </span>
              )}
            </div>
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customer details</h3>
              <p className="mt-1 text-slate-700">{viewing.customer_details}</p>
            </section>
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Complaint</h3>
              <p className="mt-1 whitespace-pre-wrap text-slate-700">{viewing.complaint}</p>
            </section>
            {viewing.resolution && (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Resolution</h3>
                <p className="mt-1 whitespace-pre-wrap text-slate-700">{viewing.resolution}</p>
              </section>
            )}
            {viewing.manager_remarks && (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Manager remarks</h3>
                <p className="mt-1 whitespace-pre-wrap text-slate-700">{viewing.manager_remarks}</p>
              </section>
            )}
            {viewing.admin_remarks && (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Admin remarks</h3>
                <p className="mt-1 whitespace-pre-wrap text-slate-700">{viewing.admin_remarks}</p>
              </section>
            )}
            {updateAllowed && (
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  const target = viewing;
                  setViewing(null);
                  openEdit(target);
                }}
              >
                <IconPencil className="h-4 w-4" />
                Update this complaint
              </Button>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
