import { useBranches } from "@/hooks/useBranches";

export function BranchSelector() {
  const { branches, branchesLoading, selectedBranchId, setSelectedBranchId } = useBranches();

  return (
    <label className="flex items-center gap-2">
      <span className="hidden text-xs font-medium uppercase tracking-wide text-slate-400 lg:inline">
        Branch
      </span>
      <select
        value={selectedBranchId ?? ""}
        disabled={branchesLoading}
        onChange={(event) => {
          const value = event.target.value;
          setSelectedBranchId(value === "" ? null : Number(value));
        }}
        className="max-w-56 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50"
      >
        <option value="">All branches</option>
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.branch_name}
          </option>
        ))}
      </select>
    </label>
  );
}
