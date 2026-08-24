import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { reviewsApi } from "@/api/reviews";
import { customersApi } from "@/api/customers";
import { ROOT_KEYS } from "@/api/queryKeys";
import { useAuth } from "@/hooks/useAuth";
import { useBranches } from "@/hooks/useBranches";
import { can } from "@/utils/permissions";
import type { ReviewRecord } from "@/types/review";
import { PageHeader } from "@/components/FilterBar";
import { DataTable, type Column } from "@/components/DataTable";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Form";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { IconPencil, IconPlus, IconStar } from "@/components/icons";
import { getApiErrorMessage, getFieldErrors } from "@/utils/errors";
import { formatDate, todayISO } from "@/utils/format";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <IconStar
          key={index}
          className={`h-3.5 w-3.5 ${
            index < rating ? "fill-amber-400 text-amber-400" : "text-slate-200"
          }`}
        />
      ))}
    </span>
  );
}

export function ReviewsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { scopeBranchId } = useBranches();
  const createAllowed = can(user!.role, "reviews.create");
  const updateAllowed = can(user!.role, "reviews.update");

  const query = useQuery({
    queryKey: [ROOT_KEYS.reviews, scopeBranchId],
    queryFn: () => reviewsApi.list(scopeBranchId ?? undefined),
  });

  const customersParams = useMemo(
    () => ({ branch_id: scopeBranchId ?? undefined }),
    [scopeBranchId],
  );
  const customersQuery = useQuery({
    queryKey: [ROOT_KEYS.customers, customersParams],
    queryFn: () => customersApi.list(customersParams),
    enabled: createAllowed || updateAllowed,
  });

  const customerNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const customer of customersQuery.data ?? []) {
      map.set(customer.id, customer.customer_name);
    }
    return map;
  }, [customersQuery.data]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [ROOT_KEYS.reviews] });
    queryClient.invalidateQueries({ queryKey: [ROOT_KEYS.adminDashboard] });
    queryClient.invalidateQueries({ queryKey: [ROOT_KEYS.managerDashboard] });
  };

  // Create
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    customer_id: "",
    rating: "5",
    review: "",
    complaint: "",
    review_date: todayISO(),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: reviewsApi.create,
    onSuccess: () => {
      invalidate();
      toast.success("Review recorded");
      setCreateOpen(false);
    },
    onError: (error) => {
      setErrors(getFieldErrors(error));
      setFormError(getApiErrorMessage(error));
    },
  });

  const openCreate = () => {
    setForm({ customer_id: "", rating: "5", review: "", complaint: "", review_date: todayISO() });
    setErrors({});
    setFormError(null);
    setCreateOpen(true);
  };

  const submitCreate = (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const nextErrors: Record<string, string> = {};
    if (!form.customer_id) nextErrors.customer_id = "Select a customer";
    const rating = Number(form.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      nextErrors.rating = "Rating must be between 1 and 5";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    createMutation.mutate({
      customer_id: Number(form.customer_id),
      rating,
      review: form.review.trim() || undefined,
      complaint: form.complaint.trim() || undefined,
      review_date: form.review_date || undefined,
    });
  };

  // Edit
  const [editing, setEditing] = useState<ReviewRecord | null>(null);
  const [editForm, setEditForm] = useState({ rating: "5", review: "", complaint: "" });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editFormError, setEditFormError] = useState<string | null>(null);

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      reviewsApi.update(id, payload),
    onSuccess: () => {
      invalidate();
      toast.success("Review updated");
      setEditing(null);
    },
    onError: (error) => {
      setEditErrors(getFieldErrors(error));
      setEditFormError(getApiErrorMessage(error));
    },
  });

  const openEdit = (review: ReviewRecord) => {
    setEditing(review);
    setEditForm({
      rating: String(review.rating),
      review: review.review ?? "",
      complaint: review.complaint ?? "",
    });
    setEditErrors({});
    setEditFormError(null);
  };

  const submitEdit = (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setEditFormError(null);
    const rating = Number(editForm.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      setEditErrors({ rating: "Rating must be between 1 and 5" });
      return;
    }
    setEditErrors({});
    updateMutation.mutate({
      id: editing.id,
      payload: {
        rating,
        review: editForm.review.trim(),
        complaint: editForm.complaint.trim(),
      },
    });
  };

  const columns: Column<ReviewRecord>[] = [
    {
      key: "review_date",
      header: "Date",
      render: (row) => formatDate(row.review_date),
    },
    {
      key: "customer_id",
      header: "Customer",
      render: (row) =>
        customerNameById.get(row.customer_id) ?? `Customer #${row.customer_id}`,
    },
    {
      key: "rating",
      header: "Rating",
      render: (row) => <Stars rating={row.rating} />,
    },
    {
      key: "review",
      header: "Review",
      render: (row) => (
        <span className="block max-w-56 truncate text-slate-600" title={row.review ?? ""}>
          {row.review || <span className="text-slate-300">—</span>}
        </span>
      ),
    },
    {
      key: "complaint",
      header: "Complaint",
      render: (row) =>
        row.complaint ? (
          <span className="block max-w-40 truncate text-red-600" title={row.complaint}>
            {row.complaint}
          </span>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
    ...(updateAllowed
      ? [
          {
            key: "actions" as const,
            header: "",
            className: "w-16 text-right",
            render: (row: ReviewRecord) => (
              <button
                onClick={() => openEdit(row)}
                className="rounded p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-brand-600"
                aria-label="Edit review"
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
        title="Reviews"
        subtitle="Customer feedback captured at the branch."
        actions={
          createAllowed && (
            <Button onClick={openCreate} disabled={(customersQuery.data ?? []).length === 0}>
              <IconPlus className="h-4 w-4" />
              New review
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
        emptyTitle="No reviews yet"
        emptyDescription={
          createAllowed && (customersQuery.data ?? []).length === 0
            ? "Add customers first — every review is linked to a customer visit."
            : "Reviews will appear here as they are recorded."
        }
        emptyAction={
          createAllowed &&
          (customersQuery.data ?? []).length > 0 && (
            <Button onClick={openCreate}>
              <IconPlus className="h-4 w-4" />
              New review
            </Button>
          )
        }
      />

      {/* Create modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New review"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button loading={createMutation.isPending} type="submit" form="create-review-form">
              Save review
            </Button>
          </>
        }
      >
        <form id="create-review-form" onSubmit={submitCreate} className="space-y-4" noValidate>
          {formError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Customer"
              value={form.customer_id}
              onChange={(event) => setForm({ ...form, customer_id: event.target.value })}
              error={errors.customer_id}
              required
            >
              <option value="">Select customer…</option>
              {(customersQuery.data ?? []).map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.customer_name} · {customer.mobile_number}
                </option>
              ))}
            </Select>
            <Select
              label="Rating"
              value={form.rating}
              onChange={(event) => setForm({ ...form, rating: event.target.value })}
              error={errors.rating}
              required
            >
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={String(value)}>
                  {"★".repeat(value)} ({value}/5)
                </option>
              ))}
            </Select>
            <Input
              label="Review date"
              type="date"
              value={form.review_date}
              onChange={(event) => setForm({ ...form, review_date: event.target.value })}
              hint="Defaults to today"
            />
          </div>
          <Textarea
            label="Review"
            rows={2}
            value={form.review}
            onChange={(event) => setForm({ ...form, review: event.target.value })}
            hint="Optional"
          />
          <Textarea
            label="Complaint"
            rows={2}
            value={form.complaint}
            onChange={(event) => setForm({ ...form, complaint: event.target.value })}
            hint="Optional — anything negative the customer reported"
          />
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Edit review"
        subtitle={editing ? customerNameById.get(editing.customer_id) ?? `Customer #${editing.customer_id}` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)} disabled={updateMutation.isPending}>
              Cancel
            </Button>
            <Button loading={updateMutation.isPending} type="submit" form="edit-review-form">
              Save changes
            </Button>
          </>
        }
      >
        <form id="edit-review-form" onSubmit={submitEdit} className="space-y-4" noValidate>
          {editFormError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {editFormError}
            </div>
          )}
          <Select
            label="Rating"
            value={editForm.rating}
            onChange={(event) => setEditForm({ ...editForm, rating: event.target.value })}
            error={editErrors.rating}
          >
            {[5, 4, 3, 2, 1].map((value) => (
              <option key={value} value={String(value)}>
                {"★".repeat(value)} ({value}/5)
              </option>
            ))}
          </Select>
          <Textarea
            label="Review"
            rows={2}
            value={editForm.review}
            onChange={(event) => setEditForm({ ...editForm, review: event.target.value })}
          />
          <Textarea
            label="Complaint"
            rows={2}
            value={editForm.complaint}
            onChange={(event) => setEditForm({ ...editForm, complaint: event.target.value })}
          />
        </form>
      </Modal>
    </div>
  );
}
