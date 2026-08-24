import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { staffApi } from "@/api/staff";
import { ROOT_KEYS } from "@/api/queryKeys";
import { useAuth } from "@/hooks/useAuth";
import { useBranches } from "@/hooks/useBranches";
import { can } from "@/utils/permissions";
import type { Staff } from "@/types/staff";
import { DESIGNATIONS } from "@/types/staff";
import { PageHeader } from "@/components/FilterBar";
import { DataTable, type Column } from "@/components/DataTable";
import { Pagination } from "@/components/Pagination";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Checkbox, Input, Select } from "@/components/ui/Form";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { IconPencil, IconPlus, IconTrash } from "@/components/icons";
import { getApiErrorMessage, getFieldErrors } from "@/utils/errors";
import { enumLabel, todayISO } from "@/utils/format";

interface FormState {
  full_name: string;
  phone: string;
  email: string;
  designation: (typeof DESIGNATIONS)[number];
  joining_date: string;
  salary: string;
  branch_id: string;
}

export function StaffPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { scopeBranchId, branches } = useBranches();
  const role = user!.role;
  const manageAllowed = can(role, "staff.manage");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const params = useMemo(
    () => ({
      branch_id: scopeBranchId ?? undefined,
      page,
      page_size: pageSize,
    }),
    [scopeBranchId, page, pageSize],
  );

  const query = useQuery({
    queryKey: [ROOT_KEYS.staff, params],
    queryFn: () => staffApi.list(params),
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [deactivating, setDeactivating] = useState<Staff | null>(null);
  const [form, setForm] = useState<FormState>({
    full_name: "",
    phone: "",
    email: "",
    designation: "STYLIST",
    joining_date: todayISO(),
    salary: "",
    branch_id: scopeBranchId ? String(scopeBranchId) : "",
  });
  const [editIsActive, setEditIsActive] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const branchNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const branch of branches) map.set(branch.id, branch.branch_name);
    return map;
  }, [branches]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [ROOT_KEYS.staff] });

  const createMutation = useMutation({
    mutationFn: staffApi.create,
    onSuccess: () => {
      invalidate();
      toast.success("Staff member created", "The employee code was assigned automatically.");
      setCreateOpen(false);
    },
    onError: (error) => {
      setErrors(getFieldErrors(error));
      setFormError(getApiErrorMessage(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      staffApi.update(id, payload),
    onSuccess: () => {
      invalidate();
      toast.success("Staff updated");
      setEditing(null);
    },
    onError: (error) => {
      setErrors(getFieldErrors(error));
      setFormError(getApiErrorMessage(error));
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => staffApi.remove(id),
    onSuccess: () => {
      invalidate();
      toast.success("Staff deactivated");
      setDeactivating(null);
    },
    onError: (error) => {
      toast.error("Could not deactivate", getApiErrorMessage(error));
    },
  });

  const openCreate = () => {
    setForm({
      full_name: "",
      phone: "",
      email: "",
      designation: "STYLIST",
      joining_date: todayISO(),
      salary: "",
      branch_id: scopeBranchId ? String(scopeBranchId) : "",
    });
    setErrors({});
    setFormError(null);
    setCreateOpen(true);
  };

  const submitCreate = (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const nextErrors: Record<string, string> = {};
    if (form.full_name.trim().length < 2) nextErrors.full_name = "Minimum 2 characters";
    if (!/^\d{10,20}$/.test(form.phone.replace(/\s/g, ""))) nextErrors.phone = "10–20 digits";
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email.trim())) nextErrors.email = "Enter a valid email";
    if (!form.joining_date) nextErrors.joining_date = "Joining date is required";
    if (!form.branch_id) nextErrors.branch_id = "Select a branch";
    if (form.salary && Number(form.salary) < 0) nextErrors.salary = "Must be ≥ 0";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    createMutation.mutate({
      full_name: form.full_name.trim(),
      phone: form.phone.replace(/\s/g, ""),
      email: form.email.trim() || undefined,
      designation: form.designation,
      joining_date: form.joining_date,
      salary: form.salary === "" ? undefined : Number(form.salary),
      branch_id: Number(form.branch_id),
    });
  };

  const submitEdit = (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setFormError(null);
    const payload: Record<string, unknown> = {};
    if (form.full_name.trim()) {
      if (form.full_name.trim().length < 2) {
        setErrors({ full_name: "Minimum 2 characters" });
        return;
      }
      payload.full_name = form.full_name.trim();
    }
    if (form.phone.trim()) {
      if (!/^\d{10,20}$/.test(form.phone.replace(/\s/g, ""))) {
        setErrors({ phone: "10–20 digits" });
        return;
      }
      payload.phone = form.phone.replace(/\s/g, "");
    }
    if (form.email.trim()) payload.email = form.email.trim();
    payload.designation = form.designation;
    if (form.joining_date) payload.joining_date = form.joining_date;
    if (form.salary !== "") payload.salary = Number(form.salary);
    if (form.branch_id) payload.branch_id = Number(form.branch_id);
    payload.is_active = editIsActive;
    updateMutation.mutate({ id: editing.id, payload });
  };

  const columns: Column<Staff>[] = [
    { key: "id", header: "ID", render: (row) => <span className="text-slate-400">#{row.id}</span> },
    {
      key: "employee_code",
      header: "Code",
      render: (row) => (
        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600">
          {row.employee_code}
        </span>
      ),
    },
    {
      key: "full_name",
      header: "Name",
      render: (row) => <span className="font-medium text-slate-800">{row.full_name}</span>,
    },
    {
      key: "designation",
      header: "Designation",
      render: (row) => enumLabel(row.designation),
    },
    {
      key: "branch_id",
      header: "Branch",
      render: (row) =>
        branchNameById.get(row.branch_id) ?? `Branch #${row.branch_id}`,
    },
    {
      key: "is_active",
      header: "Status",
      render: (row) => <StatusBadge value={row.is_active ? "ACTIVE" : "INACTIVE"} />,
    },
    ...(manageAllowed
      ? [
          {
            key: "actions" as const,
            header: "",
            className: "w-20 text-right",
            render: (row: Staff) => (
              <div className="flex items-center justify-end gap-1">
                <button
                  onClick={() => {
                    setEditing(row);
                    setForm({
                      full_name: row.full_name,
                      phone: "",
                      email: "",
                      designation: row.designation,
                      joining_date: todayISO(),
                      salary: "",
                      branch_id: String(row.branch_id),
                    });
                    setEditIsActive(row.is_active);
                    setErrors({});
                    setFormError(null);
                  }}
                  className="rounded p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-brand-600"
                  aria-label={`Edit ${row.full_name}`}
                >
                  <IconPencil className="h-4 w-4" />
                </button>
                {row.is_active && (
                  <button
                    onClick={() => setDeactivating(row)}
                    className="rounded p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                    aria-label={`Deactivate ${row.full_name}`}
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

  const branchOptions = branches.filter((branch) => branch.is_active);

  return (
    <div>
      <PageHeader
        title="Staff"
        subtitle={
          manageAllowed
            ? "Employees across branches. Employee codes are generated automatically."
            : "Directory of employees at your branch."
        }
        actions={
          manageAllowed && (
            <Button onClick={openCreate}>
              <IconPlus className="h-4 w-4" />
              New staff
            </Button>
          )
        }
      />

      <DataTable
        columns={columns}
        rows={query.data?.records ?? []}
        rowKey={(row) => row.id}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => query.refetch()}
        emptyTitle="No staff found"
        emptyDescription={
          manageAllowed
            ? "Add your first employee to start tracking attendance."
            : "No employees are registered at this branch yet."
        }
        emptyAction={
          manageAllowed && (
            <Button onClick={openCreate}>
              <IconPlus className="h-4 w-4" />
              New staff
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

      {/* Create modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New staff"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button loading={createMutation.isPending} type="submit" form="create-staff-form">
              Create staff
            </Button>
          </>
        }
      >
        <form id="create-staff-form" onSubmit={submitCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
          {formError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">
              {formError}
            </div>
          )}
          <Input
            label="Full name"
            value={form.full_name}
            onChange={(event) => setForm({ ...form, full_name: event.target.value })}
            error={errors.full_name}
            required
          />
          <Input
            label="Phone"
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
            error={errors.phone}
            hint="10–20 digits"
            required
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            error={errors.email}
            hint="Optional"
          />
          <Select
            label="Designation"
            value={form.designation}
            onChange={(event) =>
              setForm({ ...form, designation: event.target.value as FormState["designation"] })
            }
            required
          >
            {DESIGNATIONS.map((designation) => (
              <option key={designation} value={designation}>
                {enumLabel(designation)}
              </option>
            ))}
          </Select>
          <Input
            label="Joining date"
            type="date"
            max={todayISO()}
            value={form.joining_date}
            onChange={(event) => setForm({ ...form, joining_date: event.target.value })}
            error={errors.joining_date}
            required
          />
          <Input
            label="Salary"
            type="number"
            min={0}
            step="0.01"
            value={form.salary}
            onChange={(event) => setForm({ ...form, salary: event.target.value })}
            error={errors.salary}
            hint="Optional"
          />
          <Select
            label="Branch"
            value={form.branch_id}
            onChange={(event) => setForm({ ...form, branch_id: event.target.value })}
            error={errors.branch_id}
            required
          >
            <option value="">Select branch…</option>
            {branchOptions.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.branch_name} ({branch.branch_code})
              </option>
            ))}
          </Select>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={`Edit ${editing?.full_name ?? "staff"}`}
        subtitle={editing ? `Employee code ${editing.employee_code}` : undefined}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)} disabled={updateMutation.isPending}>
              Cancel
            </Button>
            <Button loading={updateMutation.isPending} type="submit" form="edit-staff-form">
              Save changes
            </Button>
          </>
        }
      >
        <form id="edit-staff-form" onSubmit={submitEdit} className="space-y-4" noValidate>
          {formError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Full name"
              value={form.full_name}
              placeholder={editing?.full_name}
              onChange={(event) => setForm({ ...form, full_name: event.target.value })}
              hint="Leave blank to keep current"
            />
            <Input
              label="Phone"
              value={form.phone}
              placeholder="Not shown — enter to replace"
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              hint="Leave blank to keep current"
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              hint="Leave blank to keep current"
            />
            <Select
              label="Designation"
              value={form.designation}
              onChange={(event) =>
                setForm({ ...form, designation: event.target.value as FormState["designation"] })
              }
            >
              {DESIGNATIONS.map((designation) => (
                <option key={designation} value={designation}>
                  {enumLabel(designation)}
                </option>
              ))}
            </Select>
            <Input
              label="Joining date"
              type="date"
              value={form.joining_date}
              onChange={(event) => setForm({ ...form, joining_date: event.target.value })}
            />
            <Input
              label="Salary"
              type="number"
              min={0}
              step="0.01"
              value={form.salary}
              placeholder="Unchanged"
              onChange={(event) => setForm({ ...form, salary: event.target.value })}
            />
            <Select
              label="Branch"
              value={form.branch_id}
              onChange={(event) => setForm({ ...form, branch_id: event.target.value })}
            >
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.branch_name} ({branch.branch_code})
                </option>
              ))}
            </Select>
          </div>
          <Checkbox
            label="Staff is active"
            checked={editIsActive}
            onChange={(event) => setEditIsActive(event.target.checked)}
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={deactivating !== null}
        title="Deactivate staff"
        message={
          <>
            Deactivate <strong>{deactivating?.full_name}</strong>? They will no longer appear as
            active staff. This action cannot be undone from this screen.
          </>
        }
        confirmLabel="Deactivate"
        danger
        loading={deactivateMutation.isPending}
        onConfirm={() => deactivating && deactivateMutation.mutate(deactivating.id)}
        onCancel={() => setDeactivating(null)}
      />
    </div>
  );
}
