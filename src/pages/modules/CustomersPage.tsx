import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customersApi } from "@/api/customers";
import { branchesApi } from "@/api/branches";
import { ROOT_KEYS } from "@/api/queryKeys";
import { useAuth } from "@/hooks/useAuth";
import { useBranches } from "@/hooks/useBranches";
import { can } from "@/utils/permissions";
import type { Customer, Gender } from "@/types/customer";
import { GENDERS } from "@/types/customer";
import { FilterBar, PageHeader, SearchInput } from "@/components/FilterBar";
import { DataTable, type Column } from "@/components/DataTable";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Form";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { IconPencil, IconPlus, IconTrash } from "@/components/icons";
import { getApiErrorMessage, getFieldErrors } from "@/utils/errors";
import { enumLabel, formatDate, todayISO } from "@/utils/format";

interface FormState {
  customer_name: string;
  mobile_number: string;
  gender: Gender;
  visit_date: string;
  services_taken: string;
  remarks: string;
}

const EMPTY_FORM: FormState = {
  customer_name: "",
  mobile_number: "",
  gender: "FEMALE",
  visit_date: todayISO(),
  services_taken: "",
  remarks: "",
};

export function CustomersPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { scopeBranchId } = useBranches();
  const role = user!.role;
  const createAllowed = can(role, "customers.create");
  const editAllowed = can(role, "customers.edit");

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [archiving, setArchiving] = useState<Customer | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const params = useMemo(
    () => ({
      search: search.trim() || undefined,
      branch_id: scopeBranchId ?? undefined,
    }),
    [search, scopeBranchId],
  );

  const query = useQuery({
    queryKey: [ROOT_KEYS.customers, params],
    queryFn: () => customersApi.list(params),
    placeholderData: (previous) => previous,
  });

  const branchNameById = useMemo(() => {
    // Lightweight branch names for the cross-branch admin view.
    const map = new Map<number, string>();
    return map;
  }, []);

  const branchesQuery = useQuery({
    queryKey: [ROOT_KEYS.branches],
    queryFn: branchesApi.list,
    enabled: role === "ADMIN",
    staleTime: 60_000,
  });
  for (const branch of branchesQuery.data ?? []) {
    branchNameById.set(branch.id, branch.branch_name);
  }

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [ROOT_KEYS.customers] });
    queryClient.invalidateQueries({ queryKey: [ROOT_KEYS.adminDashboard] });
    queryClient.invalidateQueries({ queryKey: [ROOT_KEYS.managerDashboard] });
  };

  const createMutation = useMutation({
    mutationFn: customersApi.create,
    onSuccess: () => {
      invalidate();
      toast.success("Visit recorded");
      setFormOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (error) => {
      setErrors(getFieldErrors(error));
      setFormError(getApiErrorMessage(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      customersApi.update(id, payload),
    onSuccess: () => {
      invalidate();
      toast.success("Customer updated");
      setEditing(null);
    },
    onError: (error) => {
      setErrors(getFieldErrors(error));
      setFormError(getApiErrorMessage(error));
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: number) => customersApi.remove(id),
    onSuccess: () => {
      invalidate();
      toast.success("Visit archived");
      setArchiving(null);
    },
    onError: (error) => toast.error("Could not archive", getApiErrorMessage(error)),
  });

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditing(customer);
    setForm({
      customer_name: customer.customer_name,
      mobile_number: customer.mobile_number,
      gender: customer.gender,
      visit_date: customer.visit_date.slice(0, 10),
      services_taken: customer.services_taken ?? "",
      remarks: customer.remarks ?? "",
    });
    setErrors({});
    setFormError(null);
  };

  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {};
    if (!form.customer_name.trim()) next.customer_name = "Name is required";
    if (!/^\d{10,15}$/.test(form.mobile_number.replace(/\s/g, ""))) {
      next.mobile_number = "10–15 digits";
    }
    if (!form.visit_date) next.visit_date = "Visit date is required";
    return next;
  };

  const submitCreate = (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    createMutation.mutate({
      customer_name: form.customer_name.trim(),
      mobile_number: form.mobile_number.replace(/\s/g, ""),
      gender: form.gender,
      visit_date: form.visit_date,
      services_taken: form.services_taken.trim() || undefined,
      remarks: form.remarks.trim() || undefined,
    });
  };

  const submitEdit = (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setFormError(null);
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    updateMutation.mutate({
      id: editing.id,
      payload: {
        customer_name: form.customer_name.trim(),
        mobile_number: form.mobile_number.replace(/\s/g, ""),
        gender: form.gender,
        visit_date: form.visit_date,
        services_taken: form.services_taken.trim(),
        remarks: form.remarks.trim(),
      },
    });
  };

  const columns: Column<Customer>[] = [
    { key: "id", header: "ID", render: (row) => <span className="text-slate-400">#{row.id}</span> },
    {
      key: "customer_name",
      header: "Customer",
      render: (row) => <span className="font-medium text-slate-800">{row.customer_name}</span>,
    },
    { key: "mobile_number", header: "Mobile" },
    {
      key: "gender",
      header: "Gender",
      render: (row) => enumLabel(row.gender),
    },
    {
      key: "visit_date",
      header: "Visit date",
      render: (row) => formatDate(row.visit_date),
    },
    ...(role === "ADMIN"
      ? [
          {
            key: "branch_id" as const,
            header: "Branch",
            render: (row: Customer) =>
              branchNameById.get(row.branch_id) ?? `Branch #${row.branch_id}`,
          },
        ]
      : []),
    {
      key: "services_taken",
      header: "Services",
      render: (row) => (
        <span className="block max-w-48 truncate text-slate-600" title={row.services_taken ?? ""}>
          {row.services_taken || <span className="text-slate-300">—</span>}
        </span>
      ),
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
            className: "w-20 text-right",
            render: (row: Customer) => (
              <div className="flex items-center justify-end gap-1">
                <button
                  onClick={() => openEdit(row)}
                  className="rounded p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-brand-600"
                  aria-label={`Edit ${row.customer_name}`}
                >
                  <IconPencil className="h-4 w-4" />
                </button>
                {createAllowed && (
                  <button
                    onClick={() => setArchiving(row)}
                    className="rounded p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                    aria-label={`Archive ${row.customer_name}`}
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

  const fields = (
    <>
      {formError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">
          {formError}
        </div>
      )}
      <Input
        label="Customer name"
        value={form.customer_name}
        onChange={(event) => setForm({ ...form, customer_name: event.target.value })}
        error={errors.customer_name}
        required
      />
      <Input
        label="Mobile number"
        inputMode="numeric"
        value={form.mobile_number}
        onChange={(event) => setForm({ ...form, mobile_number: event.target.value })}
        error={errors.mobile_number}
        hint="10–15 digits"
        required
      />
      <Select
        label="Gender"
        value={form.gender}
        onChange={(event) => setForm({ ...form, gender: event.target.value as Gender })}
        required
      >
        {GENDERS.map((gender) => (
          <option key={gender} value={gender}>
            {enumLabel(gender)}
          </option>
        ))}
      </Select>
      <Input
        label="Visit date"
        type="date"
        value={form.visit_date}
        onChange={(event) => setForm({ ...form, visit_date: event.target.value })}
        error={errors.visit_date}
        required
      />
      <Input
        label="Services taken"
        value={form.services_taken}
        onChange={(event) => setForm({ ...form, services_taken: event.target.value })}
        hint="Optional — e.g. Haircut, Facial"
      />
      <Textarea
        label="Remarks"
        rows={2}
        className="sm:col-span-2"
        value={form.remarks}
        onChange={(event) => setForm({ ...form, remarks: event.target.value })}
        hint="Optional"
      />
    </>
  );

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle={
          createAllowed
            ? "Walk-in visits at your branch."
            : "Customer visits across branches."
        }
        actions={
          createAllowed && (
            <Button onClick={openCreate}>
              <IconPlus className="h-4 w-4" />
              New visit
            </Button>
          )
        }
      />

      <FilterBar className="mb-4">
        <SearchInput
          value={search}
          onChange={(value) => setSearch(value)}
          placeholder="Search name or mobile…"
        />
        {(search || scopeBranchId !== null) && (
          <Button
            variant="ghost"
            onClick={() => setSearch("")}
            disabled={!search}
          >
            Clear search
          </Button>
        )}
        {!query.isLoading && !query.error && (
          <span className="ml-auto self-center pb-1.5 text-xs text-slate-500">
            {query.data?.length ?? 0} visit{(query.data?.length ?? 0) === 1 ? "" : "s"}
          </span>
        )}
      </FilterBar>

      <DataTable
        columns={columns}
        rows={query.data ?? []}
        rowKey={(row) => row.id}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => query.refetch()}
        emptyTitle={search ? `No matches for “${search}”` : "No customer visits"}
        emptyDescription={
          createAllowed
            ? "Record your first walk-in to start tracking customers."
            : "Visits will appear here once they are recorded."
        }
        emptyAction={
          createAllowed && (
            <Button onClick={openCreate}>
              <IconPlus className="h-4 w-4" />
              New visit
            </Button>
          )
        }
      />

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="New customer visit"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button loading={createMutation.isPending} type="submit" form="create-customer-form">
              Save visit
            </Button>
          </>
        }
      >
        <form id="create-customer-form" onSubmit={submitCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
          {fields}
        </form>
      </Modal>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={`Edit ${editing?.customer_name ?? "customer"}`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)} disabled={updateMutation.isPending}>
              Cancel
            </Button>
            <Button loading={updateMutation.isPending} type="submit" form="edit-customer-form">
              Save changes
            </Button>
          </>
        }
      >
        <form id="edit-customer-form" onSubmit={submitEdit} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
          {fields}
        </form>
      </Modal>

      <ConfirmDialog
        open={archiving !== null}
        title="Archive visit"
        message={
          <>
            Archive the visit for <strong>{archiving?.customer_name}</strong>? Archived visits no
            longer appear in the list.
          </>
        }
        confirmLabel="Archive"
        danger
        loading={archiveMutation.isPending}
        onConfirm={() => archiving && archiveMutation.mutate(archiving.id)}
        onCancel={() => setArchiving(null)}
      />
    </div>
  );
}
