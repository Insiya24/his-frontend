import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { specialRemarksApi } from "@/api/specialRemarks";
import { ROOT_KEYS } from "@/api/queryKeys";
import { useAuth } from "@/hooks/useAuth";
import { can } from "@/utils/permissions";
import type { SpecialRemarkRecord } from "@/types/specialRemark";
import { PageHeader } from "@/components/FilterBar";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Form";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { IconFileText, IconPlus } from "@/components/icons";
import { getApiErrorMessage, getFieldErrors } from "@/utils/errors";
import { formatDate, todayISO } from "@/utils/format";

export function SpecialRemarksPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const createAllowed = can(user!.role, "remarks.create");

  const query = useQuery({
    queryKey: [ROOT_KEYS.specialRemarks, "list"],
    queryFn: () => specialRemarksApi.list(),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [ROOT_KEYS.specialRemarks] });
  };

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    remark_date: todayISO(),
    special_remarks: "",
    daily_reminders: "",
    manager_notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: specialRemarksApi.create,
    onSuccess: () => {
      invalidate();
      toast.success("Special remarks recorded");
      setCreateOpen(false);
    },
    onError: (error) => {
      setErrors(getFieldErrors(error));
      setFormError(getApiErrorMessage(error));
    },
  });

  const openCreate = () => {
    setForm({
      remark_date: todayISO(),
      special_remarks: "",
      daily_reminders: "",
      manager_notes: "",
    });
    setErrors({});
    setFormError(null);
    setCreateOpen(true);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!form.remark_date) {
      setErrors({ remark_date: "Date is required" });
      return;
    }
    if (
      !form.special_remarks.trim() &&
      !form.daily_reminders.trim() &&
      !form.manager_notes.trim()
    ) {
      setFormError("Fill at least one of the three fields.");
      return;
    }
    setErrors({});
    createMutation.mutate({
      remark_date: form.remark_date,
      special_remarks: form.special_remarks.trim() || undefined,
      daily_reminders: form.daily_reminders.trim() || undefined,
      manager_notes: form.manager_notes.trim() || undefined,
    });
  };

  const rows = query.data ?? [];

  return (
    <div>
      <PageHeader
        title="Special remarks"
        subtitle="Daily remarks, reminders and notes from the branch."
        actions={
          createAllowed && (
            <Button onClick={openCreate}>
              <IconPlus className="h-4 w-4" />
              New entry
            </Button>
          )
        }
      />

      {query.isLoading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-lg" />
          ))}
        </div>
      ) : query.isError ? (
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <ErrorState message={(query.error as Error)?.message} onRetry={() => query.refetch()} />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <EmptyState
            icon={<IconFileText className="h-6 w-6" />}
            title="No special remarks yet"
            description={
              createAllowed
                ? "Record day-specific remarks, reminders or notes."
                : "Entries will appear here as managers add them."
            }
            action={
              createAllowed && (
                <Button onClick={openCreate}>
                  <IconPlus className="h-4 w-4" />
                  New entry
                </Button>
              )
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {rows.map((row: SpecialRemarkRecord) => (
            <article
              key={row.id}
              className="flex flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <header className="mb-2 flex items-center justify-between">
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                  {formatDate(row.remark_date)}
                </span>
                <span className="text-xs text-slate-400">#{row.id}</span>
              </header>
              <dl className="space-y-2 text-sm">
                <RemarkField label="Special remarks" value={row.special_remarks} />
                <RemarkField label="Daily reminders" value={row.daily_reminders} />
                <RemarkField label="Manager notes" value={row.manager_notes} />
              </dl>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New special remarks entry"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button loading={createMutation.isPending} type="submit" form="create-remark-form">
              Save entry
            </Button>
          </>
        }
      >
        <form id="create-remark-form" onSubmit={submit} className="space-y-4" noValidate>
          {formError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}
          <Input
            label="Date"
            type="date"
            value={form.remark_date}
            onChange={(event) => setForm({ ...form, remark_date: event.target.value })}
            error={errors.remark_date}
            required
          />
          <Textarea
            label="Special remarks"
            rows={2}
            value={form.special_remarks}
            onChange={(event) => setForm({ ...form, special_remarks: event.target.value })}
            hint="Optional"
          />
          <Textarea
            label="Daily reminders"
            rows={2}
            value={form.daily_reminders}
            onChange={(event) => setForm({ ...form, daily_reminders: event.target.value })}
            hint="Optional"
          />
          <Textarea
            label="Manager notes"
            rows={2}
            value={form.manager_notes}
            onChange={(event) => setForm({ ...form, manager_notes: event.target.value })}
            hint="Optional — at least one field is required"
          />
        </form>
      </Modal>
    </div>
  );
}

function RemarkField({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap text-slate-700">{value}</dd>
    </div>
  );
}
