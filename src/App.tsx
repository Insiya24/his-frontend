import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth, RequireReady, RequireRole } from "@/routes/guards";
import { AppShell } from "@/layouts/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { homePath } from "@/utils/permissions";
import { LoginPage } from "@/pages/LoginPage";
import { ChangePasswordPage } from "@/pages/ChangePasswordPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { AdminDashboardPage } from "@/pages/dashboards/AdminDashboardPage";
import { ManagerDashboardPage } from "@/pages/dashboards/ManagerDashboardPage";
import { UsersPage } from "@/pages/modules/UsersPage";
import { BranchesPage } from "@/pages/modules/BranchesPage";
import { StaffPage } from "@/pages/modules/StaffPage";
import { AttendancePage } from "@/pages/modules/AttendancePage";
import { CleaningPage } from "@/pages/modules/CleaningPage";
import { InventoryPage } from "@/pages/modules/InventoryPage";
import { ProductRequestsPage } from "@/pages/modules/ProductRequestsPage";
import { CustomersPage } from "@/pages/modules/CustomersPage";
import { ReviewsPage } from "@/pages/modules/ReviewsPage";
import { ComplaintsPage } from "@/pages/modules/ComplaintsPage";
import { InspectionsPage } from "@/pages/modules/InspectionsPage";
import { SpecialRemarksPage } from "@/pages/modules/SpecialRemarksPage";
import { ReportsPage } from "@/pages/modules/ReportsPage";
import { AuditPage } from "@/pages/modules/AuditPage";

function RootRedirect() {
  const { user, status } = useAuth();
  if (status === "loading") return null;
  if (status === "unauthenticated") return <Navigate to="/login" replace />;
  if (status === "password-change-required" || !user) {
    return <Navigate to="/change-password" replace />;
  }
  return <Navigate to={homePath(user.role)} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        <Route path="/change-password" element={<ChangePasswordPage />} />

        <Route element={<RequireReady />}>
          {/* Admin */}
          <Route element={<RequireRole role="ADMIN" />}>
            <Route path="/admin" element={<AppShell scope="admin" />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="branches" element={<BranchesPage />} />
              <Route path="staff" element={<StaffPage />} />
              <Route path="attendance" element={<AttendancePage />} />
              <Route path="cleaning" element={<CleaningPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="product-requests" element={<ProductRequestsPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="reviews" element={<ReviewsPage />} />
              <Route path="complaints" element={<ComplaintsPage />} />
              <Route path="inspections" element={<InspectionsPage />} />
              <Route path="special-remarks" element={<SpecialRemarksPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="audit" element={<AuditPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Route>

          {/* Manager */}
          <Route element={<RequireRole role="MANAGER" />}>
            <Route path="/manager" element={<AppShell scope="manager" />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<ManagerDashboardPage />} />
              <Route path="staff" element={<StaffPage />} />
              <Route path="attendance" element={<AttendancePage />} />
              <Route path="cleaning" element={<CleaningPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="product-requests" element={<ProductRequestsPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="reviews" element={<ReviewsPage />} />
              <Route path="complaints" element={<ComplaintsPage />} />
              <Route path="inspections" element={<InspectionsPage />} />
              <Route path="special-remarks" element={<SpecialRemarksPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Route>
        </Route>
      </Route>

      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
