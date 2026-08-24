import { httpGet } from "./client";
import type {
  AdminDashboardData,
  ManagerDashboardData,
} from "@/types/dashboard";

export const dashboardApi = {
  admin(): Promise<AdminDashboardData> {
    return httpGet<AdminDashboardData>("/dashboard/admin");
  },

  manager(): Promise<ManagerDashboardData> {
    return httpGet<ManagerDashboardData>("/dashboard/manager");
  },
};
