export interface RecentReview {
  id: number;
  rating: number;
  review: string | null;
}

export interface BranchReportRow {
  branch_id: number;
  branch_name: string;
  staff_count: number;
}

export interface AdminDashboardData {
  total_branches: number;
  active_branches: number;
  total_active_staff: number;
  today_attendance: number;
  attendance_percentage: number;
  absent_staff: number;
  late_staff: number;
  low_stock: number;
  out_of_stock: number;
  pending_product_requests: number;
  open_complaints: number;
  today_inspections: number;
  inventory_alerts: number;
  today_customers: number;
  recent_reviews: RecentReview[];
  average_rating: number;
  branch_reports: BranchReportRow[];
}

export interface ManagerDashboardData {
  today_attendance: number;
  attendance_completion: number;
  today_cleaning: boolean;
  low_stock: number;
  out_of_stock: number;
  pending_requests: number;
  open_complaints: number;
  today_inspections: number;
  inventory_alerts: number;
  today_customers: number;
  recent_reviews: RecentReview[];
}
