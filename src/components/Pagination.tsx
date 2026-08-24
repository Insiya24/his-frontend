import type { PaginationMeta } from "@/types/api";
import { IconChevronLeft, IconChevronRight } from "@/components/icons";

interface PaginationProps {
  meta?: PaginationMeta;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  disabled?: boolean;
  pageSizeOptions?: number[];
}

export function Pagination({
  meta,
  onPageChange,
  onPageSizeChange,
  disabled = false,
  pageSizeOptions = [10, 20, 50, 100],
}: PaginationProps) {
  if (!meta) return null;
  const { page, page_size: pageSize, total, pages } = meta;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3">
      <p className="text-xs text-slate-500">
        Showing <span className="font-medium text-slate-700">{from}</span>–
        <span className="font-medium text-slate-700">{to}</span> of{" "}
        <span className="font-medium text-slate-700">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        {onPageSizeChange && (
          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            Per page
            <select
              value={pageSize}
              disabled={disabled}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="rounded border border-slate-300 bg-white px-1.5 py-1 text-xs outline-none focus:border-brand-500"
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={disabled || page <= 1}
            className="rounded border border-slate-300 bg-white p-1 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Previous page"
          >
            <IconChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-1.5 text-xs text-slate-600">
            Page <span className="font-semibold">{Math.min(page, Math.max(pages, 1))}</span> of{" "}
            <span className="font-semibold">{Math.max(pages, 1)}</span>
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={disabled || page >= pages}
            className="rounded border border-slate-300 bg-white p-1 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Next page"
          >
            <IconChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
