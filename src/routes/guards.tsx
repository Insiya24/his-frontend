import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { homePath } from "@/utils/permissions";
import { FullPageLoader } from "@/components/ui/States";
import type { Role } from "@/types/auth";

export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return <FullPageLoader label="Checking your session…" />;
  }
  if (status === "unauthenticated") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  // Authenticated users (including those pending a password change) may proceed.
  return <Outlet />;
}

export function RequireReady() {
  const { status } = useAuth();
  if (status === "password-change-required") {
    return <Navigate to="/change-password" replace />;
  }
  return <Outlet />;
}

export function RequireRole({ role }: { role: Role }) {
  const { user, status } = useAuth();

  if (status === "loading") return <FullPageLoader label="Loading…" />;
  if (status === "unauthenticated") return <Navigate to="/login" replace />;
  if (status === "password-change-required") return <Navigate to="/change-password" replace />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={homePath(user.role)} replace />;
  return <Outlet />;
}
