import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { branchesApi } from "@/api/branches";
import { ROOT_KEYS } from "@/api/queryKeys";
import { useAuth } from "./useAuth";
import type { Branch } from "@/types/branch";

const SELECTED_BRANCH_KEY = "his.branch.selected";

interface BranchContextValue {
  branches: Branch[];
  branchesLoading: boolean;
  selectedBranchId: number | null;
  setSelectedBranchId: (id: number | null) => void;
  scopeBranchId: number | null;
  scopeBranchName: string | null;
}

const BranchContext = createContext<BranchContextValue | null>(null);

export function BranchProvider({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [selectedBranchId, setSelectedBranchState] = useState<number | null>(() => {
    const raw = localStorage.getItem(SELECTED_BRANCH_KEY);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  });

  const branchesQuery = useQuery({
    queryKey: [ROOT_KEYS.branches],
    queryFn: () => branchesApi.list(),
    enabled: status === "authenticated",
    staleTime: 60_000,
  });

  const setSelectedBranchId = useCallback((id: number | null) => {
    setSelectedBranchState(id);
    if (id === null) localStorage.removeItem(SELECTED_BRANCH_KEY);
    else localStorage.setItem(SELECTED_BRANCH_KEY, String(id));
  }, []);

  // Drop a persisted selection that no longer exists in the branch list.
  useEffect(() => {
    if (!isAdmin) return;
    if (!branchesQuery.data) return;
    if (
      selectedBranchId !== null &&
      !branchesQuery.data.some((branch) => branch.id === selectedBranchId)
    ) {
      setSelectedBranchId(null);
    }
  }, [isAdmin, branchesQuery.data, selectedBranchId, setSelectedBranchId]);

  const value = useMemo<BranchContextValue>(() => {
    const branches = branchesQuery.data ?? [];
    let scopeBranchId: number | null = null;
    if (user?.role === "MANAGER") scopeBranchId = user.branch_id ?? null;
    else if (selectedBranchId !== null) scopeBranchId = selectedBranchId;
    const match = scopeBranchId !== null
      ? branches.find((branch) => branch.id === scopeBranchId)
      : undefined;
    return {
      branches,
      branchesLoading: branchesQuery.isLoading,
      selectedBranchId: isAdmin ? selectedBranchId : null,
      setSelectedBranchId,
      scopeBranchId,
      scopeBranchName:
        user?.role === "MANAGER"
          ? match?.branch_name ?? (scopeBranchId !== null ? `Branch #${scopeBranchId}` : null)
          : match?.branch_name ?? null,
    };
  }, [branchesQuery.data, branchesQuery.isLoading, user, selectedBranchId, setSelectedBranchId]);

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
}

export function useBranches(): BranchContextValue {
  const context = useContext(BranchContext);
  if (!context) throw new Error("useBranches must be used within BranchProvider");
  return context;
}
