import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { branchesApi } from "@/api/branches";
import { ROOT_KEYS } from "@/api/queryKeys";
import type { Branch } from "@/types/branch";
import { PageHeader } from "@/components/FilterBar";
import { DataTable, type Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Checkbox, Input, Textarea } from "@/components/ui/Form";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { IconBuilding, IconPencil, IconPlus } from "@/components/icons";
import { getApiErrorMessage, getFieldErrors } from "@/utils/errors";

interface FormState {
  branch_name: string;
  branch_code: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string;
}

const EMPTY_FORM: FormState = {
  branch_name: "",
  branch_code: "",
  address: "",
  city: "",
  state: "",
  phone: "",
  email: "",
};

function validate(form: FormState): Record<string, string> {
  const errors: Record<string, string> = {};
  if (form.branch_name.trim().length < 2) errors.branch_name = "Minimum 2 characters";
  if (form.branch_code.trim().length < 3) errors.branch_code = "Minimum 3 characters";
  if (form.address.trim().length < 5) errors.address = "Minimum 5 characters";
  if (form.city.trim().length < 2) errors.city = "Minimum 2 characters";
  if (form.state.trim().length < 2) errors.state = "Minimum 2 characters";
  if (!/^\d{10,15}$/.test(form.phone.replace(/\s/g, ""))) {
    errors.phone = "10–15 digits";
  }
  if (form.email && !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
    errors.email = "Enter a valid email";
  }
  return errors;
}

export function BranchesPage() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [ROOT_KEYS.branches],
    queryFn: branchesApi.list,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editIsActive, setEditIsActive] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: branchesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ROOT_KEYS.branches] });
      toast.success("Branch created");
      setCreateOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (error) => {
      setErrors(getFieldErrors(error));
      setFormError(getApiErrorMessage(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      branchesApi.update(id, payload as never),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ROOT_KEYS.branches] });
      toast.success("Branch updated");
      setEditing(null);
    },
    onError: (error) => {
      setErrors(getFieldErrors(error));
      setFormError(getApiErrorMessage(error));
    },
  });

  const openEdit = (branch: Branch) => {
    setEditing(branch);
    setForm({
      branch_name: branch.branch_name,
      branch_code: branch.branch_code,
      address: branch.address,
      city: branch.city,
      state: branch.state,
      phone: branch.phone,
      email: branch.email ?? "",
    });
    setEditIsActive(branch.is_active);
    setErrors({});
    setFormError(null);
  };

  const submitCreate = (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    createMutation.mutate({
      branch_name: form.branch_name.trim(),
      branch_code: form.branch_code.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      phone: form.phone.replace(/\s/g, ""),
      email: form.email.trim() || undefined,
    });
  };

  const submitEdit = (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setFormError(null);
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    updateMutation.mutate({
      id: editing.id,
      payload: {
        branch_name: form.branch_name.trim(),
        branch_code: form.branch_code.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        phone: form.phone.replace(/\s/g, ""),
        ...(form.email.trim() ? { email: form.email.trim() } : {}),
        is_active: editIsActive,
      },
    });
  };

  const columns: Column<Branch>[] = useMemo(
    () => [
      {
        key: "id",
        header: "ID",
        render: (branch) => <span className="text-slate-400">#{branch.id}</span>,
      },
      {
        key: "branch_name",
        header: "Branch",
        render: (branch) => (
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-brand-50 text-brand-600">
              <IconBuilding className="h-3.5 w-3.5" />
            </span>
            <div>
              <p className="font-medium text-slate-800">{branch.branch_name}</p>
              <p className="text-xs text-slate-500">{branch.branch_code}</p>
            </div>
          </div>
        ),
      },
      {
        key: "city",
        header: "Location",
        render: (branch) => (
          <div>
            <p>{branch.city}</p>
            <p className="text-xs text-slate-500">{branch.state}</p>
          </div>
        ),
      },
      {
        key: "address",
        header: "Address",
        render: (branch) => (
          <span className="block max-w-56 truncate" title={branch.address}>
            {branch.address}
          </span>
        ),
      },
      { key: "phone", header: "Phone", render: (branch) => branch.phone },
      {
        key: "email",
        header: "Email",
        render: (branch) => branch.email ?? <span className="text-slate-300">—</span>,
      },
      {
        key: "is_active",
        header: "Status",
        render: (branch) => <StatusBadge value={branch.is_active ? "ACTIVE" : "INACTIVE"} />,
      },
      {
        key: "actions",
        header: "",
        className: "w-16 text-right",
        render: (branch) => (
          <button
            onClick={() => openEdit(branch)}
            className="rounded p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-brand-600"
            aria-label={`Edit ${branch.branch_name}`}
          >
            <IconPencil className="h-4 w-4" />
          </button>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const formFields = (
    <>
      {formError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">
          {formError}
        </div>
      )}
      <Input
        label="Branch name"
        value={form.branch_name}
        onChange={(event) => setForm({ ...form, branch_name: event.target.value })}
        error={errors.branch_name}
        required
      />
      <Input
        label="Branch code"
        value={form.branch_code}
        onChange={(event) => setForm({ ...form, branch_code: event.target.value })}
        error={errors.branch_code}
        hint="3–20 characters, e.g. KOR01"
        required
      />
      <Input
        label="City"
        value={form.city}
        onChange={(event) => setForm({ ...form, city: event.target.value })}
        error={errors.city}
        required
      />
      <Input
        label="State"
        value={form.state}
        onChange={(event) => setForm({ ...form, state: event.target.value })}
        error={errors.state}
        required
      />
      <Input
        label="Phone"
        value={form.phone}
        onChange={(event) => setForm({ ...form, phone: event.target.value })}
        error={errors.phone}
        hint="10–15 digits"
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
      <Textarea
        label="Address"
        rows={2}
        className="sm:col-span-2"
        value={form.address}
        onChange={(event) => setForm({ ...form, address: event.target.value })}
        error={errors.address}
        required
      />
    </>
  );

  return (
    <div>
      <PageHeader
        title="Branches"
        subtitle="All salon locations in the chain."
        actions={
          <Button
            onClick={() => {
              setForm(EMPTY_FORM);
              setErrors({});
              setFormError(null);
              setCreateOpen(true);
            }}
          >
            <IconPlus className="h-4 w-4" />
            New branch
          </Button>
        }
      />

      <DataTable
        columns={columns}
        rows={query.data ?? []}
        rowKey={(branch) => branch.id}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => query.refetch()}
        emptyTitle="No branches yet"
        emptyDescription="Create your first branch to start assigning staff and managers."
        emptyAction={
          <Button onClick={() => setCreateOpen(true)}>
            <IconPlus className="h-4 w-4" />
            New branch
          </Button>
        }
      />

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New branch"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button loading={createMutation.isPending} type="submit" form="create-branch-form">
              Create branch
            </Button>
          </>
        }
      >
        <form id="create-branch-form" onSubmit={submitCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
          {formFields}
        </form>
      </Modal>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={`Edit ${editing?.branch_name ?? "branch"}`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)} disabled={updateMutation.isPending}>
              Cancel
            </Button>
            <Button loading={updateMutation.isPending} type="submit" form="edit-branch-form">
              Save changes
            </Button>
          </>
        }
      >
        <form id="edit-branch-form" onSubmit={submitEdit} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{formFields}</div>
          <Checkbox
            label="Branch is active"
            checked={editIsActive}
            onChange={(event) => setEditIsActive(event.target.checked)}
          />
        </form>
      </Modal>
    </div>
  );
}
