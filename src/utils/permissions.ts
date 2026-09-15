import type { Role } from "@/types/auth";

export type Capability =
  | "users.manage"
  | "branches.manage"
  | "staff.manage"
  | "attendance.mark"
  | "attendance.edit"
  | "attendance.delete"
  | "cleaning.create"
  | "cleaning.update"
  | "cleaning.delete"
  | "inventory.create"
  | "inventory.update"
  | "inventory.sheets"
  | "inventory.seed"
  | "requests.create"
  | "requests.action"
  | "reviews.create"
  | "reviews.update"
  | "complaints.create"
  | "complaints.update"
  | "reports.audit";

const MATRIX: Record<Capability, Role[]> = {
  "users.manage": ["ADMIN"],
  "branches.manage": ["ADMIN"],
  "staff.manage": ["ADMIN"],
  "attendance.mark": ["ADMIN", "MANAGER"],
  "attendance.edit": ["ADMIN", "MANAGER"],
  "attendance.delete": ["ADMIN", "MANAGER"],
  "cleaning.create": ["MANAGER"],
  "cleaning.update": ["ADMIN", "MANAGER"],
  "cleaning.delete": ["ADMIN", "MANAGER"],
  "inventory.create": ["ADMIN"],
  "inventory.update": ["ADMIN", "MANAGER"],
  "inventory.sheets": ["ADMIN", "MANAGER"],
  "inventory.seed": ["ADMIN"],
  "requests.create": ["MANAGER"],
  "requests.action": ["ADMIN"],
  "reviews.create": ["MANAGER"],
  "reviews.update": ["ADMIN", "MANAGER"],
  "complaints.create": ["MANAGER"],
  "complaints.update": ["ADMIN", "MANAGER"],
  "reports.audit": ["ADMIN"],
};

export function can(role: Role, capability: Capability): boolean {
  return MATRIX[capability].includes(role);
}

export function homePath(role: Role): string {
  return role === "ADMIN" ? "/admin/dashboard" : "/manager/dashboard";
}
