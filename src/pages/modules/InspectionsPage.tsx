import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { inspectionsApi } from "@/api/inspections";
import { ROOT_KEYS } from "@/api/queryKeys";
import { useAuth } from "@/hooks/useAuth";
import { useBranches } from "@/hooks/useBranches";
import { can } from "@/utils/permissions";
import type { InspectionRecord } from "@/types/inspection";
import { PageHeader } from "@/components/FilterBar";
import { DataTable, type Column } from "@/components/DataTable";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Form";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { IconPlus, IconShield } from "@/components/icons";
import { getApiErrorMessage, getFieldErrors } from "@/utils/errors";
import { formatDate, formatTime, todayISO } from "@/utils/format";

export function InspectionsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { scopeBranchName } = useBranches();
  const createAllowed = can(user!.role, "inspections.create");

  const query = useQuery({
    queryKey: [ROOT_KEYS.inspections, "list"],
    queryFn: () => inspectionsApi.list(),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [ROOT_KEYS.inspections] });
    queryClient.invalidateQueries({ queryKey: [ROOT_KEYS.managerDashboard] });
    queryClient.invalidateQueries({ queryKey: [ROOT_KEYS.adminDashboard] });
  };

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    management_name: "",
    inspected_by: "",
    inspection_date: todayISO(),
    inspection_time: "",
    manager_signature: "",
    remarks: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: inspectionsApi.create,
    onSuccess: () => {
      invalidate();
      toast.success("Inspection recorded");
      setCreateOpen(false);
    },
    onError: (error) => {
      setErrors(getFieldErrors(error));
      setFormError(getApiErrorMessage(error));
    },
  });

  const openCreate = () => {
    setForm({
      management_name: "",
      inspected_by: "",
      inspection_date: todayISO(),
      inspection_time: "",
      manager_signature: "",
      remarks: "",
    });
    setErrors({});
    setFormError(null);
    setCreateOpen(true);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const nextErrors: Record<string, string> = {};
    if (form.management_name.trim().length < 2) nextErrors.management_name = "Minimum 2 characters";
    if (form.inspected_by.trim().length < 2) nextErrors.inspected_by = "Minimum 2 characters";
    if (!form.inspection_date) nextErrors.inspection_date = "Date is required";
    if (!form.inspection_time) nextErrors.inspection_time = "Time is required";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    createMutation.mutate({
      management_name: form.management_name.trim(),
      inspected_by: form.inspected_by.trim(),
      inspection_date: form.inspection_date,
      inspection_time: form.inspection_time,
      manager_signature: form.manager_signature.trim() || undefined,
      remarks: form.remarks.trim() || undefined,
    });
  };

  const columns: Column<InspectionRecord>[] = [
    {
      key: "inspection_date",
      header: "Date",
      render: (row) => formatDate(row.inspection_date),
    },
    {
      key: "inspection_time",
      header: "Time",
      render: (row) => formatTime(row.inspection_time),
    },
    {
      key: "management_name",
      header: "Management",
      render: (row) => <span className="font-medium text-slate-800">{row.management_name}</span>,
    },
    { key: "inspected_by", header: "Inspected by" },
    {
      key: "manager_signature",
      header: "Signature",
      render: (row) => (
        <span className="block max-w-40 truncate text-slate-500" title={row.manager_signature ?? ""}>
          {row.manager_signature || <span className="text-slate-300">—</span>}
        </span>
      ),
    },
    {
      key: "remarks",
      header: "Remarks",
      render: (row) => (
        <span className="block max-w-48 truncate text-slate-500" title={row.remarks ?? ""}>
          {row.remarks || <span className="text-slate-300">—</span>}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Inspections"
        subtitle={scopeBranchName ? `Management visits — ${scopeBranchName}.` : "Management visits across branches."}
        actions={
          createAllowed && (
            <Button onClick={openCreate}>
              <IconPlus className="h-4 w-4" />
              New inspection
            </Button>
          )
        }
      />

      <DataTable
        columns={columns}
        rows={query.data ?? []}
        rowKey={(row) => row.id}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => query.refetch()}
        emptyTitle="No inspections recorded"
        emptyDescription={
          createAllowed
            ? "Record a management visit to keep an inspection trail."
            : "Inspections will appear here as they are recorded by managers."
        }
        emptyAction={
          createAllowed && (
            <Button onClick={openCreate}>
              <IconShield className="h-4 w-4" />
              New inspection
            </Button>
          )
        }
      />

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New inspection"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button loading={createMutation.isPending} type="submit" form="create-inspection-form">
              Save inspection
            </Button>
          </>
        }
      >
        <form id="create-inspection-form" onSubmit={submit} className="space-y-4" noValidate>
          {formError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Management name"
              value={form.management_name}
              onChange={(event) => setForm({ ...form, management_name: event.target.value })}
              error={errors.management_name}
              hint="Company or management entity"
              required
            />
            <Input
              label="Inspected by"
              value={form.inspected_by}
              onChange={(event) => setForm({ ...form, inspected_by: event.target.value })}
              error={errors.inspected_by}
              hint="Person who performed the inspection"
              required
            />
            <Input
              label="Inspection date"
              type="date"
              value={form.inspection_date}
              onChange={(event) => setForm({ ...form, inspection_date: event.target.value })}
              error={errors.inspection_date}
              required
            />
            <Input
              label="Inspection time"
              type="time"
              value={form.inspection_time}
              onChange={(event) => setForm({ ...form, inspection_time: event.target.value })}
              error={errors.inspection_time}
              required
            />
            <Input
              label="Manager signature"
              className="sm:col-span-2"
              maxLength={500}
              value={form.manager_signature}
              onChange={(event) => setForm({ ...form, manager_signature: event.target.value })}
              hint="Optional typed signature or note"
            />
          </div>
          <Textarea
            label="Remarks"
            rows={3}
            value={form.remarks}
            onChange={(event) => setForm({ ...form, remarks: event.target.value })}
            hint="Optional"
          />
        </form>
      </Modal>
    </div>
  );
}
