import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/api/dashboard";
import { ROOT_KEYS } from "@/api/queryKeys";
import { PageHeader } from "@/components/FilterBar";
import { KpiCard } from "@/components/KpiCard";
import {
  IconAlertTriangle,
  IconBuilding,
  IconCalendarCheck,
  IconClipboardCheck,
  IconInbox,
  IconMessageSquare,
  IconPackage,
  IconShield,
  IconStar,
  IconTruck,
  IconUser,
  IconUsers,
} from "@/components/icons";
import { Skeleton } from "@/components/ui/States";
import { ErrorState } from "@/components/ui/States";
import type { RecentReview } from "@/types/dashboard";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, index) => (
        <IconStar
          key={index}
          className={`h-3.5 w-3.5 ${
            index < rating ? "fill-amber-400 text-amber-400" : "text-slate-200"
          }`}
        />
      ))}
    </span>
  );
}

export function RecentReviewsCard({
  reviews,
  averageRating,
}: {
  reviews: RecentReview[];
  averageRating?: number;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-800">Recent reviews</h2>
        {averageRating !== undefined && (
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <Stars rating={Math.round(averageRating)} />
            <span className="font-medium text-slate-700">{averageRating.toFixed(1)}</span> / 5
          </span>
        )}
      </div>
      {reviews.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs text-slate-400">No reviews yet</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {reviews.map((review) => (
            <li key={review.id} className="flex items-start gap-3 px-4 py-2.5">
              <Stars rating={review.rating} />
              <p className="min-w-0 flex-1 truncate text-xs text-slate-600">
                {review.review || "No comment"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AdminDashboardPage() {
  const query = useQuery({
    queryKey: [ROOT_KEYS.adminDashboard],
    queryFn: dashboardApi.admin,
  });

  const data = query.data;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Organization-wide snapshot across all branches."
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
          {/* KPI grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <KpiCard
              label="Total branches"
              value={data.total_branches}
              sub={`${data.active_branches} active`}
              icon={<IconBuilding className="h-4 w-4" />}
              to="/admin/branches"
            />
            <KpiCard
              label="Active staff"
              value={data.total_active_staff}
              icon={<IconUsers className="h-4 w-4" />}
              to="/admin/staff"
            />
            <KpiCard
              label="Today's attendance"
              value={data.today_attendance}
              sub={`${data.attendance_percentage}% of active staff`}
              tone="info"
              icon={<IconCalendarCheck className="h-4 w-4" />}
              to="/admin/attendance"
            />
            <KpiCard
              label="Absent today"
              value={data.absent_staff}
              sub={`${data.late_staff} late`}
              tone={data.absent_staff > 0 ? "warning" : "default"}
              icon={<IconUser className="h-4 w-4" />}
              to="/admin/attendance"
            />
            <KpiCard
              label="Low stock"
              value={data.low_stock}
              tone={data.low_stock > 0 ? "warning" : "default"}
              icon={<IconPackage className="h-4 w-4" />}
              to="/admin/inventory?low_stock=true"
            />
            <KpiCard
              label="Out of stock"
              value={data.out_of_stock}
              tone={data.out_of_stock > 0 ? "danger" : "default"}
              icon={<IconAlertTriangle className="h-4 w-4" />}
              to="/admin/inventory"
            />
            <KpiCard
              label="Pending product requests"
              value={data.pending_product_requests}
              tone={data.pending_product_requests > 0 ? "warning" : "default"}
              icon={<IconTruck className="h-4 w-4" />}
              to="/admin/product-requests"
            />
            <KpiCard
              label="Open complaints"
              value={data.open_complaints}
              tone={data.open_complaints > 0 ? "danger" : "default"}
              icon={<IconMessageSquare className="h-4 w-4" />}
              to="/admin/complaints"
            />
            <KpiCard
              label="Today's inspections"
              value={data.today_inspections}
              icon={<IconShield className="h-4 w-4" />}
              to="/admin/inspections"
            />
            <KpiCard
              label="Customers today"
              value={data.today_customers}
              icon={<IconUsers className="h-4 w-4" />}
              to="/admin/customers"
            />
            <KpiCard
              label="Average rating"
              value={`${Number(data.average_rating ?? 0).toFixed(1)} / 5`}
              icon={<IconStar className="h-4 w-4" />}
              to="/admin/reviews"
            />
            <KpiCard
              label="Cleaning checklists"
              value="Daily per branch"
              icon={<IconClipboardCheck className="h-4 w-4" />}
              to="/admin/cleaning"
            />
          </div>

          {/* Bottom section */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-4 py-3">
                <h2 className="text-sm font-semibold text-slate-800">Branch performance</h2>
                <p className="mt-0.5 text-xs text-slate-500">Active staff count per branch</p>
              </div>
              {data.branch_reports.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
                  <IconInbox className="h-4 w-4" /> No branches yet
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.branch_reports.map((branch) => {
                    const max = Math.max(...data.branch_reports.map((b) => b.staff_count), 1);
                    return (
                      <li key={branch.branch_id} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="w-40 shrink-0 truncate text-sm text-slate-700">
                          {branch.branch_name}
                        </span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-brand-500"
                            style={{ width: `${(branch.staff_count / max) * 100}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-sm font-medium text-slate-700">
                          {branch.staff_count}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <RecentReviewsCard
              reviews={data.recent_reviews}
              averageRating={Number(data.average_rating ?? 0)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
