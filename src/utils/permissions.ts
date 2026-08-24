import type { Role } from "@/types/auth";

export type Capability =
  | "users.manage"
  | "branches.manage"
  | "staff.manage"
  | "attendance.mark"
  | "attendance.edit"
  | "cleaning.create"
  | "cleaning.update"
  | "inventory.create"
  | "inventory.update"
  | "inventory.sheets"
  | "inventory.seed"
  | "requests.create"
  | "requests.action"
  | "customers.create"
  | "customers.edit"
  | "reviews.create"
  | "reviews.update"
  | "complaints.create"
  | "complaints.update"
  | "inspections.create"
  | "remarks.create"
  | "reports.audit";

const MATRIX: Record<Capability, Role[]> = {
  "users.manage": ["ADMIN"],
  "branches.manage": ["ADMIN"],
  "staff.manage": ["ADMIN"],
  "attendance.mark": ["ADMIN", "MANAGER"],
  "attendance.edit": ["ADMIN", "MANAGER"],
  "cleaning.create": ["MANAGER"],
  "cleaning.update": ["ADMIN", "MANAGER"],
  "inventory.create": ["ADMIN"],
  "inventory.update": ["ADMIN", "MANAGER"],
  "inventory.sheets": ["ADMIN", "MANAGER"],
  "inventory.seed": ["ADMIN"],
  "requests.create": ["MANAGER"],
  "requests.action": ["ADMIN"],
  "customers.create": ["MANAGER"],
  "customers.edit": ["ADMIN", "MANAGER"],
  "reviews.create": ["ADMIN", "MANAGER"],
  "reviews.update": ["ADMIN", "MANAGER"],
  "complaints.create": ["MANAGER"],
  "complaints.update": ["ADMIN", "MANAGER"],
  "inspections.create": ["MANAGER"],
  "remarks.create": ["MANAGER"],
  "reports.audit": ["ADMIN"],
};

export function can(role: Role, capability: Capability): boolean {
  return MATRIX[capability].includes(role);
}

export function homePath(role: Role): string {
  return role === "ADMIN" ? "/admin/dashboard" : "/manager/dashboard";
}
