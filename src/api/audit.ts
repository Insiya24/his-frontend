import { httpGet } from "./client";
import type { Paginated } from "@/types/api";
import type { AuditLogEntry } from "@/types/reports";

export const auditApi = {
  list(page = 1, pageSize = 20): Promise<Paginated<AuditLogEntry>> {
    return httpGet<Paginated<AuditLogEntry>>("/audit", { page, page_size: pageSize });
  },
};
