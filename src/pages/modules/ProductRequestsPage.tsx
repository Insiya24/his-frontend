import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { productRequestsApi } from "@/api/productRequests";
import { inventoryApi } from "@/api/inventory";
import { ROOT_KEYS } from "@/api/queryKeys";
import { useAuth } from "@/hooks/useAuth";
import { useBranches } from "@/hooks/useBranches";
import { can } from "@/utils/permissions";
import type {
  ProductRequest,
  RequestPriority,
} from "@/types/productRequest";
import { REQUEST_PRIORITIES, REQUEST_STATUSES } from "@/types/productRequest";
import { FilterBar, PageHeader } from "@/components/FilterBar";
import { DataTable, type Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Form";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { IconCheck, IconPlus, IconX } from "@/components/icons";
import { getApiErrorMessage, getFieldErrors } from "@/utils/errors";
import { enumLabel, formatDate, todayISO } from "@/utils/format";

interface CreateFormState {
  inventory_item_id: string;
  required_quantity: string;
  reason: string;
  priority: RequestPriority;
  request_date: string;
}

export function ProductRequestsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { scopeBranchId, scopeBranchName } = useBranches();
  const role = user!.role;
  const createAllowed = can(role, "requests.create");
  const actionAllowed = can(role, "requests.action");

  const query = useQuery({
    queryKey: [ROOT_KEYS.productRequests],
    queryFn: () => productRequestsApi.list(),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [ROOT_KEYS.productRequests] });
    queryClient.invalidateQueries({ queryKey: [ROOT_KEYS.adminDashboard] });
    queryClient.invalidateQueries({ queryKey: [ROOT_KEYS.managerDashboard] });
  };

  // Status filter
  const [statusFilter, setStatusFilter] = useState<string>("");
  const filtered = useMemo(() => {
    const rows = query.data ?? [];
    if (!statusFilter) return rows;
    return rows.filter((row) => row.status === statusFilter);
  }, [query.data, statusFilter]);

  // Create form (manager)
  const inventoryQuery = useQuery({
    queryKey: [ROOT_KEYS.inventory, scopeBranchId, false],
    queryFn: () => inventoryApi.list({ branch_id: scopeBranchId ?? undefined }),
    enabled: createAllowed,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateFormState>({
    inventory_item_id: "",
    required_quantity: "",
    reason: "",
    priority: "MEDIUM",
    request_date: todayISO(),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: productRequestsApi.create,
    onSuccess: () => {
      invalidate();
      toast.success("Request submitted", "Admin will review your request.");
      setCreateOpen(false);
    },
    onError: (error) => {
      setErrors(getFieldErrors(error));
      setFormError(getApiErrorMessage(error));
    },
  });

  const selectedItem = (inventoryQuery.data ?? []).find(
    (item) => String(item.id) === form.inventory_item_id,
  );

  const openCreate = () => {
    setForm({
      inventory_item_id: "",
      required_quantity: "",
      reason: "",
      priority: "MEDIUM",
      request_date: todayISO(),
    });
    setErrors({});
    setFormError(null);
    setCreateOpen(true);
  };

  const submitCreate = (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const nextErrors: Record<string, string> = {};
    if (!form.inventory_item_id) nextErrors.product_name = "Select a product from branch inventory";
    if (!form.required_quantity || Number(form.required_quantity) <= 0) {
      nextErrors.required_quantity = "Must be greater than 0";
    }
    if (Number(form.required_quantity) > 10000) {
      nextErrors.required_quantity = "Exceeds the allowed request limit (10000)";
    }
    if (form.reason.trim().length < 2) nextErrors.reason = "Reason is required";
    if (!form.request_date) nextErrors.request_date = "Date is required";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !selectedItem) return;
    createMutation.mutate({
      product_name: selectedItem.product_name,
      available_quantity: selectedItem.current_stock,
      required_quantity: Number(form.required_quantity),
      reason: form.reason.trim(),
      priority: form.priority,
      request_date: form.request_date,
    });
  };

  // Admin actions
  const [confirming, setConfirming] = useState<{
    request: ProductRequest;
    action: "approve" | "purchased" | "reject";
  } | null>(null);
  const [actionRemarks, setActionRemarks] = useState("");

  const actionMutation = useMutation({
    mutationFn: ({ id, action, remarks }: { id: number; action: string; remarks?: string }) => {
      if (action === "approve") return productRequestsApi.approve(id);
      if (action === "purchased") return productRequestsApi.markPurchased(id, remarks);
      return productRequestsApi.reject(id, remarks);
    },
    onSuccess: (_data, variables) => {
      invalidate();
      toast.success(
        variables.action === "approve"
          ? "Request approved"
          : variables.action === "purchased"
            ? "Marked as purchased"
            : "Request rejected",
      );
      setConfirming(null);
      setActionRemarks("");
    },
    onError: (error) => toast.error("Action failed", getApiErrorMessage(error)),
  });

  const columns: Column<ProductRequest>[] = [
    {
      key: "request_date",
      header: "Date",
      render: (row) => formatDate(row.request_date),
    },
    {
      key: "product_name",
      header: "Product",
      render: (row) => (
        <div>
          <p className="font-medium text-slate-800">{row.product_name}</p>
          <p className="max-w-56 truncate text-xs text-slate-500" title={row.reason}>
            {row.reason}
          </p>
        </div>
      ),
    },
    ...(role === "ADMIN"
      ? [
          {
            key: "branch_id" as const,
            header: "Branch",
            render: (row: ProductRequest) =>
              scopeBranchName && row.branch_id === scopeBranchId
                ? scopeBranchName
                : `Branch #${row.branch_id}`,
          },
        ]
      : []),
    {
      key: "available_quantity",
      header: "Available",
    },
    {
      key: "required_quantity",
      header: "Required",
      className: "font-medium",
    },
    {
      key: "priority",
      header: "Priority",
      render: (row) => <StatusBadge value={row.priority} />,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge value={row.status} />,
    },
    ...(actionAllowed
      ? [
          {
            key: "actions" as const,
            header: "",
            className: "w-44 text-right",
            render: (row: ProductRequest) => (
              <div className="flex items-center justify-end gap-1">
                {row.status === "PENDING" && (
                  <>
                    <Button size="xs" onClick={() => setConfirming({ request: row, action: "approve" })}>
                      <IconCheck className="h-3 w-3" />
                      Approve
                    </Button>
                    <Button size="xs" variant="dangerGhost" onClick={() => setConfirming({ request: row, action: "reject" })}>
                      <IconX className="h-3 w-3" />
                      Reject
                    </Button>
                  </>
                )}
                {row.status === "APPROVED" && (
                  <Button size="xs" variant="secondary" onClick={() => setConfirming({ request: row, action: "purchased" })}>
                    Mark purchased
                  </Button>
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
        title="Product requests"
        subtitle={
          createAllowed
            ? "Raise restocking requests for admin approval."
            : "Review and action restocking requests from branches."
        }
        actions={
          createAllowed && (
            <Button onClick={openCreate}>
              <IconPlus className="h-4 w-4" />
              New request
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
          {REQUEST_STATUSES.map((status) => (
            <option key={status} value={status}>
              {enumLabel(status)}
            </option>
          ))}
        </Select>
        <span className="ml-auto self-center pb-1.5 text-xs text-slate-500">
          {filtered.length} request{filtered.length === 1 ? "" : "s"}
        </span>
      </FilterBar>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(row) => row.id}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => query.refetch()}
        emptyTitle="No product requests"
        emptyDescription={
          createAllowed
            ? "Raise a request when branch stock runs low."
            : "Branch managers' restocking requests will appear here."
        }
        emptyAction={
          createAllowed && (
            <Button onClick={openCreate}>
              <IconPlus className="h-4 w-4" />
              New request
            </Button>
          )
        }
      />

      {/* Create modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New product request"
        subtitle="The product must exist in your branch inventory; available quantity is read automatically."
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button loading={createMutation.isPending} type="submit" form="create-request-form">
              Submit request
            </Button>
          </>
        }
      >
        <form id="create-request-form" onSubmit={submitCreate} className="space-y-4" noValidate>
          {formError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}
          {(errors.product_name || !inventoryQuery.data) && !inventoryQuery.isLoading && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {(inventoryQuery.data ?? []).length === 0
                ? "Your branch has no inventory items yet — ask the admin to seed or add products first."
                : errors.product_name}
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Product (from branch inventory)"
              value={form.inventory_item_id}
              onChange={(event) => setForm({ ...form, inventory_item_id: event.target.value })}
              error={errors.product_name}
              className="sm:col-span-2"
              disabled={inventoryQuery.isLoading}
              required
            >
              <option value="">Select product…</option>
              {(inventoryQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.product_name}
                  {item.size ? ` (${item.size})` : ""}
                </option>
              ))}
            </Select>
            {selectedItem && (
              <Input
                label="Available at branch"
                value={String(selectedItem.current_stock)}
                readOnly
                hint="Read from branch inventory automatically"
              />
            )}
            <Input
              label="Required quantity"
              type="number"
              min={1}
              max={10000}
              value={form.required_quantity}
              onChange={(event) => setForm({ ...form, required_quantity: event.target.value })}
              error={errors.required_quantity}
              required
            />
            <Select
              label="Priority"
              value={form.priority}
              onChange={(event) =>
                setForm({ ...form, priority: event.target.value as RequestPriority })
              }
            >
              {REQUEST_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {enumLabel(priority)}
                </option>
              ))}
            </Select>
            <Input
              label="Request date"
              type="date"
              value={form.request_date}
              onChange={(event) => setForm({ ...form, request_date: event.target.value })}
              error={errors.request_date}
              required
            />
          </div>
          <Textarea
            label="Reason"
            rows={2}
            value={form.reason}
            onChange={(event) => setForm({ ...form, reason: event.target.value })}
            error={errors.reason}
            placeholder="Why is this stock needed?"
            required
          />
        </form>
      </Modal>

      {/* Action confirm */}
      <Modal
        open={confirming !== null}
        onClose={() => setConfirming(null)}
        title={
          confirming?.action === "approve"
            ? "Approve request"
            : confirming?.action === "reject"
              ? "Reject request"
              : "Mark as purchased"
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirming(null)} disabled={actionMutation.isPending}>
              Cancel
            </Button>
            <Button
              variant={confirming?.action === "reject" ? "danger" : "primary"}
              loading={actionMutation.isPending}
              onClick={() =>
                confirming &&
                actionMutation.mutate({
                  id: confirming.request.id,
                  action: confirming.action,
                  remarks: actionRemarks.trim() || undefined,
                })
              }
            >
              Confirm
            </Button>
          </>
        }
      >
        {confirming && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              <strong>{confirming.request.product_name}</strong> · required{" "}
              {confirming.request.required_quantity} ·{" "}
              <StatusBadge value={confirming.request.status} />
            </p>
            {confirming.action !== "approve" && (
              <Textarea
                label="Remarks"
                rows={2}
                value={actionRemarks}
                onChange={(event) => setActionRemarks(event.target.value)}
                hint="Optional note recorded with this action."
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
