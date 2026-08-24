import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cleaningApi } from "@/api/cleaning";
import { staffApi } from "@/api/staff";
import { ROOT_KEYS } from "@/api/queryKeys";
import { useAuth } from "@/hooks/useAuth";
import { useBranches } from "@/hooks/useBranches";
import { can } from "@/utils/permissions";
import type {
  CleaningChecklist,
  CleaningItemPayload,
} from "@/types/cleaning";
import { CLEANING_ITEMS, CLEANING_ITEM_STATUSES } from "@/types/cleaning";
import { PageHeader } from "@/components/FilterBar";
import { DataTable, type Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Checkbox, Input, Textarea } from "@/components/ui/Form";
import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { IconClipboardCheck, IconEye, IconPencil, IconPlus } from "@/components/icons";
import { getApiErrorMessage } from "@/utils/errors";
import { enumLabel, formatDate, formatTime, todayISO } from "@/utils/format";

type ItemDraft = Record<
  string,
  {
    status: (typeof CLEANING_ITEM_STATUSES)[number];
    done_by_staff_id: string;
    issues_found: string;
  }
>;

function emptyItems(): ItemDraft {
  return Object.fromEntries(
    CLEANING_ITEMS.map((item) => [
      item.key,
      { status: "PENDING" as const, done_by_staff_id: "", issues_found: "" },
    ]),
  );
}

export function CleaningPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { scopeBranchId, scopeBranchName } = useBranches();
  const role = user!.role;
  const createAllowed = can(role, "cleaning.create") && role === "MANAGER";
  const updateAllowed = can(role, "cleaning.update");

  const query = useQuery({
    queryKey: [ROOT_KEYS.cleaning, scopeBranchId],
    queryFn: () => cleaningApi.list(scopeBranchId ?? undefined),
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

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [ROOT_KEYS.cleaning] });
    queryClient.invalidateQueries({ queryKey: [ROOT_KEYS.managerDashboard] });
  };

  // Create / edit form
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [checklistDate, setChecklistDate] = useState(todayISO());
  const [items, setItems] = useState<ItemDraft>(emptyItems());
  const [morningTiming, setMorningTiming] = useState("");
  const [eveningTiming, setEveningTiming] = useState("");
  const [issuesFound, setIssuesFound] = useState("");
  const [inspectionRemarks, setInspectionRemarks] = useState("");
  const [managerVerified, setManagerVerified] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number | null; payload: unknown }) =>
      id === null
        ? cleaningApi.create(payload as never)
        : cleaningApi.update(id, payload as never),
    onSuccess: (_data, variables) => {
      invalidate();
      toast.success(variables.id === null ? "Checklist submitted" : "Checklist updated");
      setFormOpen(false);
    },
    onError: (error) => setFormError(getApiErrorMessage(error)),
  });

  // Detail drawer
  const [viewing, setViewing] = useState<CleaningChecklist | null>(null);

  const openCreate = () => {
    setEditingId(null);
    setChecklistDate(todayISO());
    setItems(emptyItems());
    setMorningTiming("");
    setEveningTiming("");
    setIssuesFound("");
    setInspectionRemarks("");
    setManagerVerified(false);
    setRemarks("");
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (checklist: CleaningChecklist) => {
    setEditingId(checklist.id);
    setChecklistDate(checklist.checklist_date.slice(0, 10));
    const draft = emptyItems();
    for (const item of CLEANING_ITEMS) {
      const existing = checklist.items?.[item.key];
      if (existing) {
        draft[item.key] = {
          status:
            (existing.status as ItemDraft[string]["status"]) ?? "PENDING",
          done_by_staff_id: existing.done_by_staff_id ? String(existing.done_by_staff_id) : "",
          issues_found: existing.issues_found ?? "",
        };
      }
    }
    setItems(draft);
    setMorningTiming(checklist.morning_timing ? checklist.morning_timing.slice(0, 5) : "");
    setEveningTiming(checklist.evening_timing ? checklist.evening_timing.slice(0, 5) : "");
    setIssuesFound(checklist.issues_found ?? "");
    setInspectionRemarks(checklist.inspection_remarks ?? "");
    setManagerVerified(checklist.manager_verified);
    setRemarks(checklist.remarks ?? "");
    setFormError(null);
    setFormOpen(true);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!checklistDate) {
      setFormError("Checklist date is required");
      return;
    }
    const payloadItems: Record<string, CleaningItemPayload> = {};
    for (const item of CLEANING_ITEMS) {
      const draft = items[item.key];
      payloadItems[item.key] = {
        status: draft.status,
        done_by_staff_id: draft.done_by_staff_id ? Number(draft.done_by_staff_id) : null,
        issues_found: draft.issues_found.trim() || null,
      };
    }
    saveMutation.mutate({
      id: editingId,
      payload: {
        checklist_date: checklistDate,
        items: payloadItems,
        morning_timing: morningTiming || null,
        evening_timing: eveningTiming || null,
        issues_found: issuesFound.trim() || null,
        inspection_remarks: inspectionRemarks.trim() || null,
        manager_verified: managerVerified,
        remarks: remarks.trim() || null,
      },
    });
  };

  const markAllCompleted = () => {
    setItems((current) =>
      Object.fromEntries(
        Object.entries(current).map(([key, value]) => [key, { ...value, status: "COMPLETED" as const }]),
      ),
    );
  };

  const completedCount = (checklist: CleaningChecklist) =>
    Object.values(checklist.items ?? {}).filter((item) => item.status === "COMPLETED").length;

  const columns: Column<CleaningChecklist>[] = [
    {
      key: "checklist_date",
      header: "Date",
      render: (row) => formatDate(row.checklist_date),
    },
    {
      key: "progress",
      header: "Progress",
      render: (row) => {
        const completed = completedCount(row);
        const total = CLEANING_ITEMS.length;
        return (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${completed === total ? "bg-emerald-500" : "bg-brand-500"}`}
                style={{ width: `${(completed / total) * 100}%` }}
              />
            </div>
            <span className="text-xs text-slate-600">
              {completed}/{total}
            </span>
          </div>
        );
      },
    },
    {
      key: "manager_verified",
      header: "Verified",
      render: (row) => (
        <StatusBadge value={row.manager_verified ? "COMPLETED" : "PENDING"} label={row.manager_verified ? "Verified" : "Not verified"} />
      ),
    },
    {
      key: "morning_timing",
      header: "Morning",
      render: (row) => formatTime(row.morning_timing),
    },
    {
      key: "evening_timing",
      header: "Evening",
      render: (row) => formatTime(row.evening_timing),
    },
    {
      key: "issues_found",
      header: "Issues",
      render: (row) => (
        <span className="block max-w-48 truncate text-slate-500" title={row.issues_found ?? ""}>
          {row.issues_found || <span className="text-slate-300">—</span>}
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
            aria-label="View checklist"
          >
            <IconEye />
          </button>
          {updateAllowed && (
            <button
              onClick={() => openEdit(row)}
              className="rounded p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-brand-600"
              aria-label="Edit checklist"
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
        title="Cleaning"
        subtitle={
          scopeBranchName
            ? `Daily cleaning checklists — ${scopeBranchName}.`
            : "Daily cleaning checklists across branches."
        }
        actions={
          createAllowed && (
            <Button onClick={openCreate}>
              <IconPlus className="h-4 w-4" />
              New checklist
            </Button>
          )
        }
      />

      {!createAllowed && role === "ADMIN" && (
        <p className="mb-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-sm">
          Checklists are created by branch managers. Administrators can review and edit them.
        </p>
      )}

      <DataTable
        columns={columns}
        rows={query.data ?? []}
        rowKey={(row) => row.id}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => query.refetch()}
        emptyTitle="No cleaning checklists"
        emptyDescription={
          createAllowed
            ? "Submit the daily checklist to keep your branch audit-ready."
            : "Checklists will appear here once managers submit them."
        }
        emptyAction={
          createAllowed && (
            <Button onClick={openCreate}>
              <IconPlus className="h-4 w-4" />
              New checklist
            </Button>
          )
        }
      />

      {/* Create / Edit modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        size="xl"
        title={editingId === null ? "New cleaning checklist" : "Edit cleaning checklist"}
        subtitle="All 18 daily tasks must be reported."
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={saveMutation.isPending}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={markAllCompleted}>
              Mark all completed
            </Button>
            <Button loading={saveMutation.isPending} type="submit" form="cleaning-form">
              {editingId === null ? "Submit checklist" : "Save changes"}
            </Button>
          </>
        }
      >
        <form id="cleaning-form" onSubmit={submit} className="space-y-5" noValidate>
          {formError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input
              label="Checklist date"
              type="date"
              value={checklistDate}
              onChange={(event) => setChecklistDate(event.target.value)}
              required
            />
            <Input
              label="Overall morning timing"
              type="time"
              value={morningTiming}
              onChange={(event) => setMorningTiming(event.target.value)}
            />
            <Input
              label="Overall evening timing"
              type="time"
              value={eveningTiming}
              onChange={(event) => setEveningTiming(event.target.value)}
            />
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="overflow-x-auto">
              <table className="table-base min-w-[560px]">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th className="w-36">Status</th>
                    <th className="w-40">Done by</th>
                    <th>Issue notes</th>
                  </tr>
                </thead>
                <tbody>
                  {CLEANING_ITEMS.map((item) => (
                    <tr key={item.key}>
                      <td className="font-medium text-slate-700">{item.label}</td>
                      <td>
                        <select
                          value={items[item.key]?.status ?? "PENDING"}
                          onChange={(event) =>
                            setItems((current) => ({
                              ...current,
                              [item.key]: {
                                ...current[item.key],
                                status: event.target.value as ItemDraft[string]["status"],
                              },
                            }))
                          }
                          className="w-full rounded border border-slate-300 px-1.5 py-1 text-xs outline-none focus:border-brand-500"
                        >
                          {CLEANING_ITEM_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {enumLabel(status)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          value={items[item.key]?.done_by_staff_id ?? ""}
                          onChange={(event) =>
                            setItems((current) => ({
                              ...current,
                              [item.key]: { ...current[item.key], done_by_staff_id: event.target.value },
                            }))
                          }
                          className="w-full rounded border border-slate-300 px-1.5 py-1 text-xs outline-none focus:border-brand-500"
                        >
                          <option value="">—</option>
                          {activeStaff.map((staff) => (
                            <option key={staff.id} value={staff.id}>
                              {staff.full_name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="text"
                          maxLength={1000}
                          value={items[item.key]?.issues_found ?? ""}
                          placeholder="Optional"
                          onChange={(event) =>
                            setItems((current) => ({
                              ...current,
                              [item.key]: { ...current[item.key], issues_found: event.target.value },
                            }))
                          }
                          className="w-full rounded border border-slate-300 px-1.5 py-1 text-xs outline-none focus:border-brand-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Textarea
              label="General issues found"
              rows={2}
              value={issuesFound}
              onChange={(event) => setIssuesFound(event.target.value)}
              hint="Optional"
            />
            <Textarea
              label="Inspection remarks"
              rows={2}
              value={inspectionRemarks}
              onChange={(event) => setInspectionRemarks(event.target.value)}
              hint="Optional"
            />
            <Textarea
              label="Remarks"
              rows={2}
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              hint="Optional"
            />
            <div className="flex items-end pb-1">
              <Checkbox
                label="Manager verified this checklist"
                checked={managerVerified}
                onChange={(event) => setManagerVerified(event.target.checked)}
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Detail drawer */}
      <Drawer
        open={viewing !== null}
        onClose={() => setViewing(null)}
        title={`Checklist — ${viewing ? formatDate(viewing.checklist_date) : ""}`}
        subtitle={viewing ? `${completedCount(viewing)} of ${CLEANING_ITEMS.length} tasks completed` : undefined}
      >
        {viewing && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <StatusBadge
                value={viewing.manager_verified ? "COMPLETED" : "PENDING"}
                label={viewing.manager_verified ? "Manager verified" : "Awaiting verification"}
              />
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                Submitted by user #{viewing.completed_by_id}
              </span>
              {viewing.morning_timing && (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                  AM {formatTime(viewing.morning_timing)}
                </span>
              )}
              {viewing.evening_timing && (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                  PM {formatTime(viewing.evening_timing)}
                </span>
              )}
            </div>

            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {CLEANING_ITEMS.map((item) => {
                const detail = viewing.items?.[item.key];
                return (
                  <li key={item.key} className="flex items-start justify-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700">{item.label}</p>
                      {(detail?.done_by_staff_name || detail?.issues_found) && (
                        <p className="mt-0.5 truncate text-xs text-slate-400">
                          {[detail?.done_by_staff_name, detail?.issues_found]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                    </div>
                    <StatusBadge value={detail?.status ?? "PENDING"} />
                  </li>
                );
              })}
            </ul>

            {(viewing.issues_found || viewing.inspection_remarks || viewing.remarks) && (
              <div className="space-y-2 rounded-lg border border-slate-200 p-3 text-xs text-slate-600">
                {viewing.issues_found && (
                  <p>
                    <span className="font-semibold text-slate-700">Issues found: </span>
                    {viewing.issues_found}
                  </p>
                )}
                {viewing.inspection_remarks && (
                  <p>
                    <span className="font-semibold text-slate-700">Inspection remarks: </span>
                    {viewing.inspection_remarks}
                  </p>
                )}
                {viewing.remarks && (
                  <p>
                    <span className="font-semibold text-slate-700">Remarks: </span>
                    {viewing.remarks}
                  </p>
                )}
              </div>
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
                <IconClipboardCheck className="h-4 w-4" />
                Edit this checklist
              </Button>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
