import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/api/auth";
import { branchesApi } from "@/api/branches";
import { ROOT_KEYS } from "@/api/queryKeys";
import type { User } from "@/types/auth";
import { PageHeader } from "@/components/FilterBar";
import { DataTable, type Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Checkbox, Input, Select } from "@/components/ui/Form";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { IconPencil, IconPlus } from "@/components/icons";
import { getApiErrorMessage, getFieldErrors } from "@/utils/errors";
import { enumLabel, formatDateTime } from "@/utils/format";

interface FormState {
  full_name: string;
  email: string;
  phone: string;
  role: "ADMIN" | "MANAGER";
  branch_id: string;
  password: string;
}

const EMPTY_FORM: FormState = {
  full_name: "",
  email: "",
  phone: "",
  role: "MANAGER",
  branch_id: "",
  password: "",
};

export function UsersPage() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const usersQuery = useQuery({
    queryKey: [ROOT_KEYS.users],
    queryFn: authApi.listUsers,
  });
  const branchesQuery = useQuery({
    queryKey: [ROOT_KEYS.branches],
    queryFn: branchesApi.list,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editIsActive, setEditIsActive] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const branchNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const branch of branchesQuery.data ?? []) {
      map.set(branch.id, branch.branch_name);
    }
    return map;
  }, [branchesQuery.data]);

  const createMutation = useMutation({
    mutationFn: authApi.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ROOT_KEYS.users] });
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      toast.success("User created");
    },
    onError: (error) => {
      setErrors(getFieldErrors(error));
      setFormError(getApiErrorMessage(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      authApi.updateUser(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ROOT_KEYS.users] });
      setEditing(null);
      toast.success("User updated");
    },
    onError: (error) => {
      setErrors(getFieldErrors(error));
      setFormError(getApiErrorMessage(error));
    },
  });

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setFormError(null);
    setCreateOpen(true);
  };

  const openEdit = (user: User) => {
    setEditing(user);
    setEditIsActive(user.is_active);
    setErrors({});
    setFormError(null);
  };

  const submitCreate = (event: FormEvent) => {
    event.preventDefault();
    setErrors({});
    setFormError(null);
    const nextErrors: Record<string, string> = {};
    if (form.full_name.trim().length < 2) nextErrors.full_name = "Minimum 2 characters";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) nextErrors.email = "Enter a valid email";
    if (form.password.length < 8) nextErrors.password = "Minimum 8 characters";
    if (form.phone && !/^[\d\s+-]{6,20}$/.test(form.phone.trim())) {
      nextErrors.phone = "Enter a valid phone number";
    }
    if (form.role === "MANAGER" && !form.branch_id) {
      nextErrors.branch_id = "Managers must be assigned to a branch";
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    createMutation.mutate({
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      role: form.role,
      branch_id:
        form.role === "MANAGER" && form.branch_id ? Number(form.branch_id) : undefined,
      password: form.password,
    });
  };

  const submitEdit = (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setErrors({});
    setFormError(null);
    const payload: Record<string, unknown> = {};
    const fullName = form.full_name.trim();
    if (fullName) {
      if (fullName.length < 2) {
        setErrors({ full_name: "Minimum 2 characters" });
        return;
      }
      payload.full_name = fullName;
    }
    if (editing.role === "MANAGER") {
      // Only send branch changes for managers; admins cannot be assigned a branch.
      const branchId = form.branch_id ? Number(form.branch_id) : editing.branch_id;
      if (branchId !== null && branchId !== editing.branch_id) {
        payload.branch_id = branchId;
      }
    }
    if (editIsActive !== editing.is_active) {
      payload.is_active = editIsActive;
    }
    updateMutation.mutate({ id: editing.id, payload });
  };

  const columns: Column<User>[] = [
    { key: "id", header: "ID", render: (user) => <span className="text-slate-400">#{user.id}</span> },
    {
      key: "full_name",
      header: "Name",
      render: (user) => (
        <div>
          <p className="font-medium text-slate-800">{user.full_name}</p>
          <p className="text-xs text-slate-500">{user.email}</p>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (user) => (
        <StatusBadge
          value={user.role}
          label={user.role === "ADMIN" ? "Admin" : "Manager"}
        />
      ),
    },
    {
      key: "branch_id",
      header: "Branch",
      render: (user) =>
        user.branch_id ? (
          branchNameById.get(user.branch_id) ?? `Branch #${user.branch_id}`
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
    {
      key: "is_active",
      header: "Status",
      render: (user) => (
        <StatusBadge value={user.is_active ? "ACTIVE" : "INACTIVE"} />
      ),
    },
    {
      key: "created_at",
      header: "Created",
      render: (user) => (
        <span className="text-xs text-slate-500">{formatDateTime(user.created_at)}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-16 text-right",
      render: (user) => (
        <button
          onClick={() => openEdit(user)}
          className="rounded p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-brand-600"
          aria-label={`Edit ${user.full_name}`}
        >
          <IconPencil className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Administrators and branch managers with system access."
        actions={
          <Button onClick={openCreate}>
            <IconPlus className="h-4 w-4" />
            New user
          </Button>
        }
      />

      <DataTable
        columns={columns}
        rows={usersQuery.data ?? []}
        rowKey={(user) => user.id}
        loading={usersQuery.isLoading}
        error={usersQuery.error}
        onRetry={() => usersQuery.refetch()}
        emptyTitle="No users yet"
        emptyDescription="Create the first manager account to get started."
        emptyAction={<Button onClick={openCreate}>New user</Button>}
      />

      {/* Create modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New user"
        subtitle="Create an administrator or a branch manager."
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button loading={createMutation.isPending} type="submit" form="create-user-form">
              Create user
            </Button>
          </>
        }
      >
        <form id="create-user-form" onSubmit={submitCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
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
            label="Email"
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            error={errors.email}
            required
          />
          <Input
            label="Phone"
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
            error={errors.phone}
            hint="Optional"
          />
          <Select
            label="Role"
            value={form.role}
            onChange={(event) =>
              setForm({
                ...form,
                role: event.target.value as FormState["role"],
                branch_id: event.target.value === "ADMIN" ? "" : form.branch_id,
              })
            }
            required
          >
            {(["ADMIN", "MANAGER"] as const).map((role) => (
              <option key={role} value={role}>
                {enumLabel(role)}
              </option>
            ))}
          </Select>
          {form.role === "MANAGER" && (
            <Select
              label="Branch"
              value={form.branch_id}
              onChange={(event) => setForm({ ...form, branch_id: event.target.value })}
              error={errors.branch_id}
              hint="A branch can only have one active manager."
              required
            >
              <option value="">Select branch…</option>
              {(branchesQuery.data ?? [])
                .filter((branch) => branch.is_active)
                .map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.branch_name} ({branch.branch_code})
                  </option>
                ))}
            </Select>
          )}
          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            error={errors.password}
            hint="Minimum 8 characters."
            required
          />
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={`Edit ${editing?.full_name ?? "user"}`}
        subtitle={editing?.email}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)} disabled={updateMutation.isPending}>
              Cancel
            </Button>
            <Button loading={updateMutation.isPending} form="edit-user-form" type="submit">
              Save changes
            </Button>
          </>
        }
      >
        {editing && (
          <form id="edit-user-form" onSubmit={submitEdit} className="space-y-4" noValidate>
            {formError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Full name"
                value={form.full_name}
                onChange={(event) => setForm({ ...form, full_name: event.target.value })}
                placeholder={editing.full_name}
                hint="Leave blank to keep current"
              />
              <Select
                label="Role"
                value={editing.role}
                disabled
                hint="Role cannot be changed after creation."
              >
                <option value={editing.role}>{enumLabel(editing.role)}</option>
              </Select>
              {editing.role === "MANAGER" && (
                <Select
                  label="Branch"
                  value={
                    form.branch_id !== ""
                      ? form.branch_id
                      : editing.branch_id !== null
                        ? String(editing.branch_id)
                        : ""
                  }
                  onChange={(event) => setForm({ ...form, branch_id: event.target.value })}
                  hint="A branch can only have one active manager."
                >
                  <option value="">No branch</option>
                  {(branchesQuery.data ?? []).map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.branch_name} ({branch.branch_code})
                    </option>
                  ))}
                </Select>
              )}
            </div>
            <Checkbox
              label="Account is active"
              checked={editIsActive}
              onChange={(event) => setEditIsActive(event.target.checked)}
            />
          </form>
        )}
      </Modal>
    </div>
  );
}
