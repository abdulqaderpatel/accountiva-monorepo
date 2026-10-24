import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PaginationBarProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages?: number;
  label?: string;
  onPageChange: (newPage: number) => void;
}

export function PaginationBar({
  page,
  pageSize,
  total,
  totalPages: propTotalPages,
  label = "Items",
  onPageChange,
}: PaginationBarProps) {
  if (total <= 0) return null;

  const totalPages = propTotalPages ?? Math.max(1, Math.ceil(total / pageSize));
  const from = Math.min((page - 1) * pageSize + 1, total);
  const to = Math.min(page * pageSize, total);

  // Smart page numbers windowing
  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (page <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }
    if (page >= totalPages - 3) {
      return [
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }
    return [1, "...", page - 1, page, page + 1, "...", totalPages];
  };

  const pages = getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-border/70 bg-card/30">
      <div className="flex items-center gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Showing{" "}
          <span className="font-mono text-foreground font-bold">{from}</span>
          {" to "}
          <span className="font-mono text-foreground font-bold">{to}</span>
          {" of "}
          <span className="font-mono text-foreground font-bold">{total}</span>
          {" "}
          {label}
        </p>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous page"
            className="h-8 w-8 rounded-xl border-border/70 hover:bg-muted/50 shadow-2xs disabled:opacity-40 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="flex items-center gap-1">
            {pages.map((p, idx) =>
              typeof p === "number" ? (
                <Button
                  key={p}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onPageChange(p)}
                  className={`h-8 w-8 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    page === p
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {p}
                </Button>
              ) : (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-1 text-xs text-muted-foreground select-none"
                >
                  ...
                </span>
              )
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
            className="h-8 w-8 rounded-xl border-border/70 hover:bg-muted/50 shadow-2xs disabled:opacity-40 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default PaginationBar;

