import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useBranches } from "@/hooks/useBranches";
import { BranchSelector } from "@/components/BranchSelector";
import { IconChevronDown, IconKey, IconLogout, IconMenu } from "@/components/icons";
import { formatDate } from "@/utils/format";

interface HeaderProps {
  onToggleSidebar: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const { user, logout } = useAuth();
  const { scopeBranchName, selectedBranchId } = useBranches();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  if (!user) return null;
  const initials = user.full_name
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 shadow-sm">
      <button
        onClick={onToggleSidebar}
        className="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100 md:hidden"
        aria-label="Toggle navigation"
      >
        <IconMenu className="h-5 w-5" />
      </button>

      <div className="hidden items-baseline gap-2 sm:flex">
        <span className="text-base font-bold tracking-tight text-brand-700">HIS</span>
        <span className="text-xs text-slate-400">Salon Chain Management</span>
      </div>

      <div className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />

      {user.role === "ADMIN" ? (
        <BranchSelector />
      ) : (
        <span className="inline-flex max-w-52 items-center gap-1.5 truncate rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
          <span className="truncate">{scopeBranchName ?? "Assigned branch"}</span>
        </span>
      )}

      <div className="ml-auto flex items-center gap-3">
        <span className="hidden text-xs text-slate-500 lg:inline">{formatDate(new Date().toISOString())}</span>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((open) => !open)}
            className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2 transition hover:bg-slate-100"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
              {initials}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block max-w-40 truncate text-sm font-medium leading-tight text-slate-800">
                {user.full_name}
              </span>
              <span className="block text-[11px] leading-tight text-slate-400">
                {user.role === "ADMIN"
                  ? selectedBranchId
                    ? "Administrator"
                    : "Administrator · All branches"
                  : "Manager"}
              </span>
            </span>
            <IconChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {menuOpen && (
            <div className="animate-scale-in absolute right-0 top-full mt-1.5 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
              <div className="border-b border-slate-100 px-3.5 py-2.5">
                <p className="truncate text-sm font-medium text-slate-800">{user.full_name}</p>
                <p className="truncate text-xs text-slate-500">{user.email}</p>
                <span className="mt-1 inline-flex rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700 ring-1 ring-inset ring-brand-600/20">
                  {user.role}
                </span>
              </div>
              <Link
                to="/change-password"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3.5 py-2.5 text-sm text-slate-600 transition hover:bg-slate-50"
              >
                <IconKey className="h-4 w-4 text-slate-400" />
                Change password
              </Link>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm text-red-600 transition hover:bg-red-50"
              >
                <IconLogout className="h-4 w-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
