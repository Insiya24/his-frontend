import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { IconArrowUpRight } from "@/components/icons";

type Tone = "default" | "success" | "warning" | "danger" | "info";

const TONES: Record<Tone, { chip: string; value: string }> = {
  default: { chip: "bg-slate-100 text-slate-600", value: "text-slate-900" },
  success: { chip: "bg-emerald-50 text-emerald-600", value: "text-slate-900" },
  warning: { chip: "bg-amber-50 text-amber-600", value: "text-slate-900" },
  danger: { chip: "bg-red-50 text-red-600", value: "text-red-700" },
  info: { chip: "bg-brand-50 text-brand-600", value: "text-slate-900" },
};

interface KpiCardProps {
  label: string;
  value: ReactNode;
  sub?: string;
  tone?: Tone;
  icon?: ReactNode;
  to?: string;
}

export function KpiCard({ label, value, sub, tone = "default", icon, to }: KpiCardProps) {
  const body = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <p className={`mt-1.5 text-xl font-semibold leading-tight ${TONES[tone].value}`}>
          {value}
        </p>
        {sub && <p className="mt-0.5 truncate text-xs text-slate-400">{sub}</p>}
      </div>
      <div className="flex items-center gap-1.5">
        {icon && (
          <span className={`rounded-md p-2 ${TONES[tone].chip}`} aria-hidden="true">
            {icon}
          </span>
        )}
        {to && (
          <IconArrowUpRight className="h-3.5 w-3.5 text-slate-300 transition group-hover:text-brand-500" />
        )}
      </div>
    </div>
  );

  const classes =
    "group block w-full rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition" +
    (to ? " cursor-pointer hover:border-brand-300 hover:shadow" : "");

  if (to) {
    return (
      <Link to={to} className={classes}>
        {body}
      </Link>
    );
  }
  return <div className={classes}>{body}</div>;
}
