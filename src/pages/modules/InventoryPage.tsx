import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { inventoryApi } from "@/api/inventory";
import { ROOT_KEYS } from "@/api/queryKeys";
import { useAuth } from "@/hooks/useAuth";
import { useBranches } from "@/hooks/useBranches";
import { can } from "@/utils/permissions";
import type {
  InventoryItem,
  ProductCategory,
  ProductMaster,
  ProductUnit,
  SheetItemRequest,
} from "@/types/inventory";
import { PRODUCT_CATEGORIES, PRODUCT_UNITS } from "@/types/inventory";
import { FilterBar, PageHeader } from "@/components/FilterBar";
import { DataTable, type Column } from "@/components/DataTable";
import { Pagination } from "@/components/Pagination";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Form";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { IconPackage, IconPlus, IconTrash } from "@/components/icons";
import { getApiErrorMessage, getFieldErrors } from "@/utils/errors";
import { enumLabel, monthLabel } from "@/utils/format";

type Tab = "items" | "sheets" | "master";

function stockStatus(item: InventoryItem) {
  if (item.current_stock <= 0) return "ABSENT" as const; // out of stock
  if (item.required_stock > 0 && item.current_stock <= item.required_stock) return "LOW" as const;
  return "PRESENT" as const;
}

export function InventoryPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { scopeBranchId, branches, selectedBranchId } = useBranches();
  const role = user!.role;

  const createAllowed = can(role, "inventory.create");
  const updateAllowed = can(role, "inventory.update");
  const sheetsAllowed = can(role, "inventory.sheets");
  const seedAllowed = can(role, "inventory.seed");

  const [searchParams, setSearchParams] = useSearchParams();
  const lowStockOnly = searchParams.get("low_stock") === "true";

  // Keep tab in URL (?tab=sheets)
  const initialTab = searchParams.get("tab");
  const [tab, setTab] = useState<Tab>(
    initialTab === "sheets" ? "sheets" : initialTab === "master" ? "master" : "items",
  );
  const selectTab = (next: Tab) => {
    setTab(next);
    setSearchParams(
      (current) => {
        const nextParams = new URLSearchParams(current);
        if (next === "items") nextParams.delete("tab");
        else nextParams.set("tab", next);
        return nextParams;
      },
      { replace: true },
    );
  };

  const toggleLowStock = () => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (next.get("low_stock") === "true") next.delete("low_stock");
        else next.set("low_stock", "true");
        return next;
      },
      { replace: true },
    );
  };

  const itemsQuery = useQuery({
    queryKey: [ROOT_KEYS.inventory, scopeBranchId, lowStockOnly],
    queryFn: () =>
      inventoryApi.list({ branch_id: scopeBranchId ?? undefined, low_stock: lowStockOnly }),
    enabled: tab === "items",
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [ROOT_KEYS.inventory] });
    queryClient.invalidateQueries({ queryKey: [ROOT_KEYS.adminDashboard] });
    queryClient.invalidateQueries({ queryKey: [ROOT_KEYS.managerDashboard] });
    queryClient.invalidateQueries({ queryKey: [ROOT_KEYS.productRequests] });
  };

  // ---- Item create / edit ----
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [itemForm, setItemForm] = useState({
    product_name: "",
    size: "",
    category: "OTHER" as ProductCategory,
    unit: "PIECE" as ProductUnit,
    current_stock: "",
    required_stock: "",
    branch_id: selectedBranchId ? String(selectedBranchId) : "",
    remarks: "",
  });
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});
  const [itemFormError, setItemFormError] = useState<string | null>(null);

  const createItemMutation = useMutation({
    mutationFn: inventoryApi.create,
    onSuccess: () => {
      invalidate();
      toast.success("Inventory item created");
      setItemModalOpen(false);
    },
    onError: (error) => {
      setItemErrors(getFieldErrors(error));
      setItemFormError(getApiErrorMessage(error));
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      inventoryApi.update(id, payload),
    onSuccess: () => {
      invalidate();
      toast.success("Inventory updated");
      setEditingItem(null);
    },
    onError: (error) => {
      setItemErrors(getFieldErrors(error));
      setItemFormError(getApiErrorMessage(error));
    },
  });

  const openCreateItem = () => {
    setItemForm({
      product_name: "",
      size: "",
      category: "OTHER",
      unit: "PIECE",
      current_stock: "0",
      required_stock: "0",
      branch_id: selectedBranchId ? String(selectedBranchId) : "",
      remarks: "",
    });
    setItemErrors({});
    setItemFormError(null);
    setItemModalOpen(true);
  };

  const openEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setItemForm({
      product_name: item.product_name,
      size: item.size ?? "",
      category: item.category,
      unit: item.unit,
      current_stock: String(item.current_stock),
      required_stock: String(item.required_stock),
      branch_id: String(item.branch_id),
      remarks: item.remarks ?? "",
    });
    setItemErrors({});
    setItemFormError(null);
  };

  const submitItemCreate = (event: FormEvent) => {
    event.preventDefault();
    setItemFormError(null);
    const nextErrors: Record<string, string> = {};
    if (itemForm.product_name.trim().length < 2) nextErrors.product_name = "Minimum 2 characters";
    if (!itemForm.branch_id) nextErrors.branch_id = "Select a branch";
    if (Number(itemForm.current_stock) < 0 || itemForm.current_stock === "") {
      nextErrors.current_stock = "Must be ≥ 0";
    }
    if (Number(itemForm.required_stock) < 0 || itemForm.required_stock === "") {
      nextErrors.required_stock = "Must be ≥ 0";
    }
    setItemErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    createItemMutation.mutate({
      product_name: itemForm.product_name.trim(),
      size: itemForm.size.trim() || undefined,
      category: itemForm.category,
      unit: itemForm.unit,
      current_stock: Number(itemForm.current_stock),
      required_stock: Number(itemForm.required_stock),
      branch_id: Number(itemForm.branch_id),
    });
  };

  const submitItemEdit = (event: FormEvent) => {
    event.preventDefault();
    if (!editingItem) return;
    setItemFormError(null);
    const nextErrors: Record<string, string> = {};
    if (itemForm.product_name.trim().length < 2) nextErrors.product_name = "Minimum 2 characters";
    if (Number(itemForm.current_stock) < 0 || itemForm.current_stock === "") {
      nextErrors.current_stock = "Must be ≥ 0";
    }
    if (Number(itemForm.required_stock) < 0 || itemForm.required_stock === "") {
      nextErrors.required_stock = "Must be ≥ 0";
    }
    setItemErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    updateItemMutation.mutate({
      id: editingItem.id,
      payload: {
        product_name: itemForm.product_name.trim(),
        size: itemForm.size.trim() || undefined,
        category: itemForm.category,
        unit: itemForm.unit,
        current_stock: Number(itemForm.current_stock),
        required_stock: Number(itemForm.required_stock),
        remarks: itemForm.remarks.trim() || null,
      },
    });
  };

  // ---- Seeds ----
  const seedProductMasterMutation = useMutation({
    mutationFn: inventoryApi.seedProductMaster,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [ROOT_KEYS.masterProducts] });
      toast.success("Product master seeded", `${result.products_created} products created.`);
    },
    onError: (error) => toast.error("Seeding failed", getApiErrorMessage(error)),
  });

  const [confirmSeedBranch, setConfirmSeedBranch] = useState(false);
  const seedBranchMutation = useMutation({
    mutationFn: () => inventoryApi.seedBranchMaster(scopeBranchId!),
    onSuccess: (result) => {
      invalidate();
      toast.success("Branch master seeded", `${result.products_created} products added.`);
      setConfirmSeedBranch(false);
    },
    onError: (error) => {
      toast.error("Seeding failed", getApiErrorMessage(error));
      setConfirmSeedBranch(false);
    },
  });

  // ---- Sheets ----
  const sheetsQuery = useQuery({
    queryKey: [ROOT_KEYS.sheets, scopeBranchId],
    queryFn: () => inventoryApi.listSheets(scopeBranchId ?? undefined),
    enabled: tab === "sheets",
  });
  const masterQuery = useQuery({
    queryKey: [ROOT_KEYS.masterProducts, 1],
    queryFn: () => inventoryApi.listMasterProducts(1, 100),
    enabled: tab === "master" || tab === "sheets",
  });
  const masterProducts: ProductMaster[] = masterQuery.data?.records ?? [];

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMonth, setSheetMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [sheetSignature, setSheetSignature] = useState("");
  const [sheetItems, setSheetItems] = useState<SheetItemRequest[]>([
    { product_id: masterProducts[0]?.id ?? 0, quantity: 0 },
  ]);
  const [sheetError, setSheetError] = useState<string | null>(null);

  const sheetMutation = useMutation({
    mutationFn: inventoryApi.createSheet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ROOT_KEYS.sheets] });
      toast.success("Monthly sheet created");
      setSheetOpen(false);
    },
    onError: (error) => setSheetError(getApiErrorMessage(error)),
  });

  const openSheet = () => {
    setSheetMonth(new Date().toISOString().slice(0, 7));
    setSheetSignature("");
    setSheetError(null);
    setSheetItems([{ product_id: masterProducts[0]?.id ?? 0, quantity: 0 }]);
    setSheetOpen(true);
  };

  const submitSheet = (event: FormEvent) => {
    event.preventDefault();
    setSheetError(null);
    const targetBranch = role === "MANAGER" ? user!.branch_id : selectedBranchId;
    if (!targetBranch) {
      setSheetError(role === "ADMIN" ? "Select a branch first" : "No assigned branch");
      return;
    }
    const validItems = sheetItems.filter((row) => row.product_id > 0);
    if (validItems.length < 1) {
      setSheetError("Add at least one product row.");
      return;
    }
    sheetMutation.mutate({
      branch_id: targetBranch,
      inventory_month: `${sheetMonth}-01`,
      signature: sheetSignature.trim() || undefined,
      items: validItems.map((row) => ({ ...row, size: row.size?.trim() || undefined })),
    });
  };

  const itemColumns: Column<InventoryItem>[] = [
    {
      key: "product_name",
      header: "Product",
      render: (row) => (
        <div>
          <p className="font-medium text-slate-800">{row.product_name}</p>
          {row.size && <p className="text-xs text-slate-500">Size: {row.size}</p>}
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (row) => enumLabel(row.category),
    },
    { key: "unit", header: "Unit", render: (row) => enumLabel(row.unit) },
    { key: "current_stock", header: "Current", className: "font-medium" },
    { key: "required_stock", header: "Required" },
    {
      key: "status",
      header: "Status",
      render: (row) => {
        const status = stockStatus(row);
        if (status === "ABSENT") return <StatusBadge value="ISSUE_FOUND" label="Out of stock" />;
        if (status === "LOW") return <StatusBadge value="PENDING" label="Low stock" />;
        return <StatusBadge value="COMPLETED" label="OK" />;
      },
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
    ...(updateAllowed
      ? [
          {
            key: "actions" as const,
            header: "",
            className: "w-16 text-right",
            render: (row: InventoryItem) => (
              <button
                onClick={() => openEditItem(row)}
                className="text-xs font-medium text-brand-600 transition hover:text-brand-700"
              >
                Update
              </button>
            ),
          },
        ]
      : []),
  ];

  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: "items", label: "Stock items", show: true },
    { id: "sheets", label: "Monthly sheets", show: sheetsAllowed },
    { id: "master", label: "Master products", show: true },
  ];

  const adminNeedsBranch =
    role === "ADMIN" && ["items"].includes(tab) && !scopeBranchId;

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle={
          role === "MANAGER"
            ? "Track consumables and equipment at your branch."
            : "Track consumables and equipment across branches."
        }
        actions={
          <>
            {seedAllowed && tab === "master" && (
              <Button
                variant="secondary"
                loading={seedProductMasterMutation.isPending}
                onClick={() => seedProductMasterMutation.mutate()}
              >
                Seed product master
              </Button>
            )}
            {seedAllowed && tab === "items" && (
              <Button
                variant="secondary"
                disabled={!scopeBranchId}
                onClick={() => setConfirmSeedBranch(true)}
              >
                Seed master list to branch
              </Button>
            )}
            {createAllowed && tab === "items" && (
              <Button onClick={openCreateItem}>
                <IconPlus className="h-4 w-4" />
                New item
              </Button>
            )}
            {sheetsAllowed && tab === "sheets" && (
              <Button onClick={openSheet}>
                <IconPlus className="h-4 w-4" />
                New monthly sheet
              </Button>
            )}
          </>
        }
      />

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
        {tabs
          .filter((entry) => entry.show)
          .map((entry) => (
            <button
              key={entry.id}
              onClick={() => selectTab(entry.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                tab === entry.id
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {entry.label}
            </button>
          ))}
      </div>

      {role === "ADMIN" && tab !== "master" && (
        <FilterBar className="mb-4">
          {!selectedBranchId && (
            <label className="flex items-center gap-2 pb-1.5 text-xs text-slate-500">
              Showing all branches — pick a branch above for focused operations.
            </label>
          )}
          {tab === "items" && (
            <button
              onClick={toggleLowStock}
              className={`ml-auto inline-flex items-center gap-1.5 self-center rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition ${
                lowStockOnly
                  ? "bg-amber-50 text-amber-700 ring-amber-600/30"
                  : "bg-white text-slate-600 ring-slate-300 hover:bg-slate-50"
              }`}
            >
              Low stock only
            </button>
          )}
        </FilterBar>
      )}

      {adminNeedsBranch && (
        <p className="mb-3 rounded-md border border-brand-200 bg-brand-50 px-3 py-2 text-xs text-brand-800">
          Tip: select a branch in the header, then use “Seed master list to branch” to bootstrap
          its inventory with the standard product catalogue.
        </p>
      )}

      {tab === "items" && (
        <DataTable
          columns={itemColumns}
          rows={itemsQuery.data ?? []}
          rowKey={(row) => row.id}
          loading={itemsQuery.isLoading}
          error={itemsQuery.error}
          onRetry={() => itemsQuery.refetch()}
          emptyTitle="No inventory items"
          emptyDescription={
            seedAllowed
              ? "Seed the standard master list to this branch or add items manually."
              : "Items will appear here once the administrator sets up this branch."
          }
          emptyAction={
            createAllowed && (
              <Button onClick={openCreateItem}>
                <IconPlus className="h-4 w-4" />
                New item
              </Button>
            )
          }
        />
      )}

      {tab === "sheets" && (
        <DataTable
          columns={[
            {
              key: "inventory_month",
              header: "Month",
              render: (row: Awaited<ReturnType<typeof inventoryApi.listSheets>>[number]) =>
                monthLabel(row.inventory_month),
            },
            {
              key: "list_made_by_name",
              header: "Prepared by",
              render: (row) => row.list_made_by_name,
            },
            {
              key: "signature",
              header: "Signature / notes",
              render: (row) => row.signature ?? <span className="text-slate-300">—</span>,
            },
            {
              key: "branch_id",
              header: "Branch ID",
              render: (row) => <span className="text-slate-400">#{row.branch_id}</span>,
              ...(role === "ADMIN" ? {} : { className: "hidden" }),
            },
          ]}
          rows={sheetsQuery.data ?? []}
          rowKey={(row) => row.id}
          loading={sheetsQuery.isLoading}
          error={sheetsQuery.error}
          onRetry={() => sheetsQuery.refetch()}
          emptyTitle="No monthly sheets"
          emptyDescription="Monthly sheets snapshot product quantities per branch."
          emptyAction={
            sheetsAllowed && (
              <Button onClick={openSheet}>
                <IconPlus className="h-4 w-4" />
                New monthly sheet
              </Button>
            )
          }
        />
      )}

      {tab === "master" && (
        <>
          <DataTable
            columns={[
              { key: "id", header: "ID", render: (row: ProductMaster) => `#${row.id}` },
              {
                key: "name",
                header: "Product",
                render: (row: ProductMaster) => (
                  <div className="flex items-center gap-2">
                    <IconPackage className="h-3.5 w-3.5 text-slate-400" />
                    <span className="font-medium text-slate-800">{row.name}</span>
                  </div>
                ),
              },
              {
                key: "category",
                header: "Category",
                render: (row: ProductMaster) => enumLabel(row.category),
              },
              {
                key: "default_size",
                header: "Default size",
                render: (row: ProductMaster) => row.default_size ?? <span className="text-slate-300">—</span>,
              },
              {
                key: "unit",
                header: "Unit",
                render: (row: ProductMaster) => enumLabel(row.unit),
              },
              {
                key: "is_active",
                header: "Status",
                render: (row: ProductMaster) => (
                  <StatusBadge value={row.is_active ? "ACTIVE" : "INACTIVE"} />
                ),
              },
            ]}
            rows={masterQuery.data?.records ?? []}
            rowKey={(row) => row.id}
            loading={masterQuery.isLoading}
            error={masterQuery.error}
            onRetry={() => masterQuery.refetch()}
            emptyTitle="No master products"
            emptyDescription={
              seedAllowed
                ? "Seed the built-in product catalogue to get started."
                : "The administrator has not seeded the product catalogue yet."
            }
            emptyAction={
              seedAllowed && (
                <Button
                  variant="secondary"
                  loading={seedProductMasterMutation.isPending}
                  onClick={() => seedProductMasterMutation.mutate()}
                >
                  Seed product master
                </Button>
              )
            }
          />
          <Pagination meta={masterQuery.data?.pagination} onPageChange={() => undefined} disabled />
        </>
      )}

      {/* Item create modal */}
      <Modal
        open={itemModalOpen}
        onClose={() => setItemModalOpen(false)}
        title="New inventory item"
        footer={
          <>
            <Button variant="secondary" onClick={() => setItemModalOpen(false)} disabled={createItemMutation.isPending}>
              Cancel
            </Button>
            <Button loading={createItemMutation.isPending} type="submit" form="create-item-form">
              Create item
            </Button>
          </>
        }
      >
        <form id="create-item-form" onSubmit={submitItemCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
          {itemFormError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">
              {itemFormError}
            </div>
          )}
          <Input
            label="Product name"
            value={itemForm.product_name}
            onChange={(event) => setItemForm({ ...itemForm, product_name: event.target.value })}
            error={itemErrors.product_name}
            required
          />
          <Select
            label="Branch"
            value={itemForm.branch_id}
            onChange={(event) => setItemForm({ ...itemForm, branch_id: event.target.value })}
            error={itemErrors.branch_id}
            required
          >
            <option value="">Select branch…</option>
            {branches
              .filter((branch) => branch.is_active)
              .map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.branch_name} ({branch.branch_code})
                </option>
              ))}
          </Select>
          <Select
            label="Category"
            value={itemForm.category}
            onChange={(event) =>
              setItemForm({ ...itemForm, category: event.target.value as ProductCategory })
            }
            required
          >
            {PRODUCT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {enumLabel(category)}
              </option>
            ))}
          </Select>
          <Select
            label="Unit"
            value={itemForm.unit}
            onChange={(event) => setItemForm({ ...itemForm, unit: event.target.value as ProductUnit })}
            required
          >
            {PRODUCT_UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {enumLabel(unit)}
              </option>
            ))}
          </Select>
          <Input
            label="Size"
            value={itemForm.size}
            placeholder='e.g. "5 Ltr"'
            onChange={(event) => setItemForm({ ...itemForm, size: event.target.value })}
            hint="Optional"
          />
          <Input
            label="Current stock"
            type="number"
            min={0}
            value={itemForm.current_stock}
            onChange={(event) => setItemForm({ ...itemForm, current_stock: event.target.value })}
            error={itemErrors.current_stock}
            required
          />
          <Input
            label="Required stock"
            type="number"
            min={0}
            value={itemForm.required_stock}
            onChange={(event) => setItemForm({ ...itemForm, required_stock: event.target.value })}
            error={itemErrors.required_stock}
            hint="Threshold used for low-stock alerts"
            required
          />
        </form>
      </Modal>

      {/* Item edit modal */}
      <Modal
        open={editingItem !== null}
        onClose={() => setEditingItem(null)}
        title={`Update ${editingItem?.product_name ?? "item"}`}
        subtitle={
          editingItem && editingItem.current_stock <= editingItem.required_stock
            ? "This item is currently at or below its required stock."
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditingItem(null)} disabled={updateItemMutation.isPending}>
              Cancel
            </Button>
            <Button loading={updateItemMutation.isPending} type="submit" form="edit-item-form">
              Save changes
            </Button>
          </>
        }
      >
        <form id="edit-item-form" onSubmit={submitItemEdit} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
          {itemFormError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">
              {itemFormError}
            </div>
          )}
          <Input
            label="Product name"
            value={itemForm.product_name}
            onChange={(event) => setItemForm({ ...itemForm, product_name: event.target.value })}
            error={itemErrors.product_name}
            required
          />
          <Input
            label="Size"
            value={itemForm.size}
            onChange={(event) => setItemForm({ ...itemForm, size: event.target.value })}
            hint="Optional"
          />
          <Input
            label="Current stock"
            type="number"
            min={0}
            value={itemForm.current_stock}
            onChange={(event) => setItemForm({ ...itemForm, current_stock: event.target.value })}
            error={itemErrors.current_stock}
            required
          />
          <Input
            label="Required stock"
            type="number"
            min={0}
            value={itemForm.required_stock}
            onChange={(event) => setItemForm({ ...itemForm, required_stock: event.target.value })}
            error={itemErrors.required_stock}
            required
          />
          <Select
            label="Category"
            value={itemForm.category}
            onChange={(event) =>
              setItemForm({ ...itemForm, category: event.target.value as ProductCategory })
            }
          >
            {PRODUCT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {enumLabel(category)}
              </option>
            ))}
          </Select>
          <Select
            label="Unit"
            value={itemForm.unit}
            onChange={(event) => setItemForm({ ...itemForm, unit: event.target.value as ProductUnit })}
          >
            {PRODUCT_UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {enumLabel(unit)}
              </option>
            ))}
          </Select>
          <Textarea
            label="Remarks"
            rows={2}
            className="sm:col-span-2"
            value={itemForm.remarks}
            onChange={(event) => setItemForm({ ...itemForm, remarks: event.target.value })}
            hint="Optional"
          />
        </form>
      </Modal>

      {/* Sheet builder */}
      <Modal
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="New monthly sheet"
        subtitle="Snapshot product quantities for a month."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSheetOpen(false)} disabled={sheetMutation.isPending}>
              Cancel
            </Button>
            <Button loading={sheetMutation.isPending} type="submit" form="create-sheet-form">
              Create sheet
            </Button>
          </>
        }
      >
        <form id="create-sheet-form" onSubmit={submitSheet} className="space-y-4" noValidate>
          {sheetError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {sheetError}
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Month"
              type="month"
              value={sheetMonth}
              onChange={(event) => setSheetMonth(event.target.value)}
              required
            />
            <Input
              label="Signature / prepared-by note"
              value={sheetSignature}
              maxLength={500}
              onChange={(event) => setSheetSignature(event.target.value)}
              hint="Optional"
            />
          </div>
          {role === "ADMIN" && (
            <Select
              label="Branch"
              value={selectedBranchId ? String(selectedBranchId) : ""}
              disabled
              hint="Change the branch using the selector in the header."
            >
              <option value="">All branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.branch_name}
                </option>
              ))}
            </Select>
          )}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Products
              </p>
              <Button
                variant="secondary"
                size="xs"
                disabled={masterProducts.length === 0 || sheetItems.length >= masterProducts.length}
                onClick={() =>
                  setSheetItems((rows) => [
                    ...rows,
                    {
                      product_id:
                        masterProducts.find((p) => !rows.some((r) => r.product_id === p.id))?.id ?? 0,
                      quantity: 0,
                    },
                  ])
                }
              >
                <IconPlus className="h-3 w-3" />
                Add row
              </Button>
            </div>
            <div className="space-y-2">
              {sheetItems.map((row, index) => (
                <div key={index} className="flex items-center gap-2">
                  <select
                    value={row.product_id}
                    onChange={(event) =>
                      setSheetItems((rows) =>
                        rows.map((entry, i) =>
                          i === index ? { ...entry, product_id: Number(event.target.value) } : entry,
                        ),
                      )
                    }
                    className="input-base flex-1"
                  >
                    <option value={0}>Select product…</option>
                    {masterProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                        {product.default_size ? ` (${product.default_size})` : ""}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={0}
                    value={row.quantity}
                    onChange={(event) =>
                      setSheetItems((rows) =>
                        rows.map((entry, i) =>
                          i === index ? { ...entry, quantity: Math.max(0, Number(event.target.value)) } : entry,
                        ),
                      )
                    }
                    className="input-base w-24"
                    aria-label="Quantity"
                  />
                  <button
                    onClick={() => setSheetItems((rows) => rows.filter((_, i) => i !== index))}
                    className="rounded p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                    aria-label="Remove row"
                  >
                    <IconTrash className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            {masterQuery.isLoading && (
              <p className="mt-2 text-xs text-slate-400">Loading master products…</p>
            )}
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmSeedBranch}
        title="Seed branch inventory"
        message={
          <>
            Add the standard master product list to{" "}
            <strong>{branches.find((b) => b.id === scopeBranchId)?.branch_name ?? "this branch"}</strong>{" "}
            with zero stock? Existing products are skipped.
          </>
        }
        confirmLabel="Seed now"
        loading={seedBranchMutation.isPending}
        onConfirm={() => seedBranchMutation.mutate()}
        onCancel={() => setConfirmSeedBranch(false)}
      />
    </div>
  );
}
