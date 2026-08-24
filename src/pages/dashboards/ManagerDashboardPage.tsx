import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/api/dashboard";
import { ROOT_KEYS } from "@/api/queryKeys";
import { PageHeader } from "@/components/FilterBar";
import { KpiCard } from "@/components/KpiCard";
import {
  IconAlertTriangle,
  IconClipboardCheck,
  IconCheck,
  IconMessageSquare,
  IconPackage,
  IconShield,
  IconTruck,
  IconUsers,
  IconX,
} from "@/components/icons";
import { Skeleton, ErrorState } from "@/components/ui/States";
import { useBranches } from "@/hooks/useBranches";
import { RecentReviewsCard } from "./AdminDashboardPage";

export function ManagerDashboardPage() {
  const { scopeBranchName } = useBranches();
  const query = useQuery({
    queryKey: [ROOT_KEYS.managerDashboard],
    queryFn: dashboardApi.manager,
  });

  const data = query.data;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={scopeBranchName ? `Today at ${scopeBranchName}` : "Today's branch snapshot"}
      />

      {query.isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : query.isError ? (
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <ErrorState message={(query.error as Error)?.message} onRetry={() => query.refetch()} />
        </div>
      ) : data ? (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <KpiCard
              label="Attendance today"
              value={data.today_attendance}
              sub={`${data.attendance_completion}% completion`}
              tone="info"
              icon={<IconUsers className="h-4 w-4" />}
              to="/manager/attendance"
            />
            <KpiCard
              label="Cleaning checklist"
              value={data.today_cleaning ? "Submitted" : "Pending"}
              tone={data.today_cleaning ? "success" : "warning"}
              icon={
                data.today_cleaning ? (
                  <IconCheck className="h-4 w-4" />
                ) : (
                  <IconX className="h-4 w-4" />
                )
              }
              to="/manager/cleaning"
            />
            <KpiCard
              label="Low stock"
              value={data.low_stock}
              tone={data.low_stock > 0 ? "warning" : "default"}
              icon={<IconPackage className="h-4 w-4" />}
              to="/manager/inventory?low_stock=true"
            />
            <KpiCard
              label="Out of stock"
              value={data.out_of_stock}
              tone={data.out_of_stock > 0 ? "danger" : "default"}
              icon={<IconAlertTriangle className="h-4 w-4" />}
              to="/manager/inventory"
            />
            <KpiCard
              label="Pending requests"
              value={data.pending_requests}
              tone={data.pending_requests > 0 ? "warning" : "default"}
              icon={<IconTruck className="h-4 w-4" />}
              to="/manager/product-requests"
            />
            <KpiCard
              label="Open complaints"
              value={data.open_complaints}
              tone={data.open_complaints > 0 ? "danger" : "default"}
              icon={<IconMessageSquare className="h-4 w-4" />}
              to="/manager/complaints"
            />
            <KpiCard
              label="Inspections today"
              value={data.today_inspections}
              icon={<IconShield className="h-4 w-4" />}
              to="/manager/inspections"
            />
            <KpiCard
              label="Customers today"
              value={data.today_customers}
              icon={<IconUsers className="h-4 w-4" />}
              to="/manager/customers"
            />
          </div>

          <RecentReviewsCard reviews={data.recent_reviews} />

          <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-xs text-brand-800">
            <IconClipboardCheck className="mr-1.5 inline h-3.5 w-3.5" />
            Tip: submit the daily cleaning checklist and mark attendance every morning — both
            feed into this dashboard.
          </div>
        </div>
      ) : null}
    </div>
  );
}
