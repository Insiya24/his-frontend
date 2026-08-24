import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Header } from "./Header";
import { SidebarContent } from "./Sidebar";
import { buildNavigation, scopeForRole } from "@/routes/navigation";
import { useAuth } from "@/hooks/useAuth";

interface AppShellProps {
  scope: "admin" | "manager";
}

export function AppShell({ scope }: AppShellProps) {
  const { user } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // The route guard guarantees the role matches the scope.
  const effectiveScope =
    user?.role && scopeForRole(user.role) !== scope ? scopeForRole(user.role) : scope;
  const sections = buildNavigation(effectiveScope);

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-slate-800 bg-slate-900 md:flex">
        <div className="flex h-14 items-center gap-2.5 border-b border-slate-800 px-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-600 text-sm font-bold text-white">
            H
          </span>
          <div className="leading-tight">
            <p className="text-sm font-bold text-white">HIS</p>
            <p className="text-[10px] uppercase tracking-widest text-slate-500">
              {effectiveScope === "admin" ? "Admin Console" : "Manager Portal"}
            </p>
          </div>
        </div>
        <SidebarContent sections={sections} />
        <div className="border-t border-slate-800 px-4 py-3">
          <p className="truncate text-xs font-medium text-slate-300">{user?.full_name}</p>
          <p className="truncate text-[10px] uppercase tracking-wider text-slate-500">
            {user?.role}
          </p>
        </div>
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="animate-fade-in absolute inset-0 bg-slate-900/60"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="animate-slide-in-right absolute inset-y-0 left-0 flex w-64 flex-col bg-slate-900 shadow-2xl">
            <div className="flex h-14 items-center justify-between border-b border-slate-800 px-4">
              <span className="text-sm font-bold text-white">HIS</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded p-1 text-slate-400 hover:text-white"
                aria-label="Close navigation"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                  <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <SidebarContent sections={sections} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-h-screen flex-col md:pl-60">
        <Header onToggleSidebar={() => setMobileOpen((open) => !open)} />
        <main className="mx-auto w-full max-w-7xl flex-1 px-3 py-4 sm:px-4 md:px-6 md:py-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
