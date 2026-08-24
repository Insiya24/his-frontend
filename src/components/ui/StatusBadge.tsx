import { enumLabel } from "@/utils/format";

const COLORS: Record<string, string> = {
  // Attendance
  PRESENT: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  ABSENT: "bg-red-50 text-red-700 ring-red-600/20",
  LATE: "bg-amber-50 text-amber-700 ring-amber-600/20",
  LEAVE: "bg-sky-50 text-sky-700 ring-sky-600/20",
  HALF_DAY: "bg-violet-50 text-violet-700 ring-violet-600/20",
  // Product requests
  PENDING: "bg-amber-50 text-amber-700 ring-amber-600/20",
  APPROVED: "bg-blue-50 text-blue-700 ring-blue-600/20",
  PURCHASED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  REJECTED: "bg-red-50 text-red-700 ring-red-600/20",
  LOW: "bg-amber-50 text-amber-700 ring-amber-600/20",
  URGENT: "bg-red-50 text-red-700 ring-red-600/20",
  HIGH: "bg-orange-50 text-orange-700 ring-orange-600/20",
  MEDIUM: "bg-blue-50 text-blue-700 ring-blue-600/20",
  // Complaints
  OPEN: "bg-red-50 text-red-700 ring-red-600/20",
  IN_REVIEW: "bg-amber-50 text-amber-700 ring-amber-600/20",
  RESOLVED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  CLOSED: "bg-slate-100 text-slate-600 ring-slate-500/20",
  // Cleaning items
  COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  ISSUE_FOUND: "bg-rose-50 text-rose-700 ring-rose-600/20",
  NOT_APPLICABLE: "bg-slate-100 text-slate-500 ring-slate-400/30",
  // Generic
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  INACTIVE: "bg-slate-100 text-slate-500 ring-slate-400/30",
};

interface StatusBadgeProps {
  value: string | null | undefined;
  label?: string;
}

export function StatusBadge({ value, label }: StatusBadgeProps) {
  if (!value) return <span className="text-slate-400">—</span>;
  const key = value.toUpperCase();
  const color = COLORS[key] ?? "bg-brand-50 text-brand-700 ring-brand-600/20";
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${color}`}
    >
      {label ?? enumLabel(value)}
    </span>
  );
}
